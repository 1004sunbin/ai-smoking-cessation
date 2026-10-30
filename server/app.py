"""每一根 · AI 陪伴转发服务

浏览器 -> 本服务（API Key 只存在服务端环境变量里）-> 智谱 GLM。
只用 Python 标准库，可直接部署为阿里云函数计算 / 腾讯云云函数的「Web 函数」（监听 9000 端口）。

环境变量：
  ZHIPU_API_KEY    必填，智谱开放平台的 API Key
  ALLOWED_ORIGINS  允许调用的网页来源，逗号分隔（默认：GitHub Pages 站点 + 本地打开）
  PER_IP_DAILY     每个访客每天最多几条（默认 20）
  DAILY_CAP        整个服务每天最多几条（默认 500）
"""
import json
import os
import time
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from threading import Lock

ZHIPU_URL = "https://open.bigmodel.cn/api/paas/v4/chat/completions"
# 先用效果更好的 4.7，免费模型高峰期限流（429）时自动换下一个
MODELS = ["glm-4.7-flash", "glm-4-flash-250414"]
# 控制台粘贴时常带进空格、换行、引号或 "Bearer "，统一去掉
API_KEY = os.environ.get("ZHIPU_API_KEY", "").strip().strip("'\"").strip()
if API_KEY.lower().startswith("bearer "):
    API_KEY = API_KEY[7:].strip()
ALLOWED = [o.strip() for o in os.environ.get(
    "ALLOWED_ORIGINS", "https://1004sunbin.github.io,null").split(",") if o.strip()]
PER_IP_DAILY = int(os.environ.get("PER_IP_DAILY", "20"))
DAILY_CAP = int(os.environ.get("DAILY_CAP", "500"))
MAX_MSG_CHARS = 300
MAX_TURNS = 10

TRIGGERS = {"压力", "饭后", "咖啡/茶", "喝酒", "社交", "无聊", "起床", "开车"}

# 计数只在内存里：实例重启会清零，对演示足够；要更严格可换成云数据库
_lock = Lock()
_day = ""
_per_ip = {}
_total = 0


def take_quota(ip):
    """扣一次额度，返回 (是否允许, 原因)"""
    global _day, _per_ip, _total
    today = time.strftime("%Y-%m-%d", time.gmtime(time.time() + 8 * 3600))
    with _lock:
        if today != _day:
            _day, _per_ip, _total = today, {}, 0
        if _total >= DAILY_CAP:
            return False, "今天的 AI 总额度用完了"
        if _per_ip.get(ip, 0) >= PER_IP_DAILY:
            return False, f"你今天已经用了 {PER_IP_DAILY} 次 AI 回复"
        _per_ip[ip] = _per_ip.get(ip, 0) + 1
        _total += 1
        return True, ""


def num(v, lo, hi, default=0):
    try:
        return max(lo, min(hi, int(float(v))))
    except (TypeError, ValueError):
        return default


def system_prompt(p):
    """系统提示词在服务端拼，浏览器只传几项数字和枚举值，防止接口被拿去当通用聊天机器人"""
    p = p if isinstance(p, dict) else {}
    mode = "逐步减量" if p.get("mode") == "reduce" else "彻底戒烟"
    lines = [
        f"- 目标：{mode}，基线每天 {num(p.get('base'), 1, 80, 15)} 根；今天目标 ≤ {num(p.get('target'), 0, 80)} 根",
        f"- 第 {num(p.get('day'), 1, 3650, 1)} 天；累计比基线少抽约 {num(p.get('avoided'), 0, 100000)} 根；忍住 {num(p.get('resists'), 0, 100000)} 次",
    ]
    if p.get("trigger") in TRIGGERS:
        lines.append(f"- 最常见的诱因：{p['trigger']}")
    best = str(p.get("best") or "")[:12]
    if best:
        lines.append(f"- 对他最有效的急救方法：{best}")
    return (
        "你是「每一根」戒烟 App 里的陪伴伙伴，用简体中文聊天。\n"
        "风格：温暖、具体、不说教，像懂行的朋友。每次 2–4 句，口语化，不用 Markdown 标题和列表符号。\n"
        "原则：\n"
        "- 用户想抽时，先接住情绪，再给一个马上能做的小动作；可以提醒他点右下角「想抽了」做急救。\n"
        "- 用户抽了，不批评。强调累计进度不会清零，帮他看清当时的场景和下次怎么提前准备。\n"
        "- 不做医学诊断，不给药物或尼古丁替代品的用法用量，建议去戒烟门诊或拨打 12320。\n"
        "- 不承诺\"一定能戒掉\"，不推荐电子烟、加热烟作为替代。\n"
        "- 用户提到身体不适（胸痛、呼吸困难等），请他立即就医或拨打 120；提到自伤或不想活，请他联系身边的人或拨打心理援助热线 12356，紧急时拨打 120 / 110。\n"
        "- 只聊和戒烟、情绪、健康习惯有关的话题；其他请求（写代码、写作业等）礼貌拒绝并拉回戒烟。\n"
        "用户情况（自然地用，不要逐条复述）：\n" + "\n".join(lines)
    )


def clean_messages(raw):
    msgs = []
    for m in (raw if isinstance(raw, list) else [])[-MAX_TURNS:]:
        if not isinstance(m, dict) or m.get("role") not in ("user", "assistant"):
            continue
        text = str(m.get("content") or "").strip()[:MAX_MSG_CHARS]
        if not text:
            continue
        if msgs and msgs[-1]["role"] == m["role"]:
            msgs[-1]["content"] += "\n" + text
        else:
            msgs.append({"role": m["role"], "content": text})
    while msgs and msgs[0]["role"] != "user":
        msgs.pop(0)
    return msgs if msgs and msgs[-1]["role"] == "user" else []


def open_upstream(messages):
    """依次尝试 MODELS，返回 (响应流, 模型名)；全部失败时抛出最后一个错误"""
    last = None
    for model in MODELS:
        body = {"model": model, "stream": True, "max_tokens": 600, "temperature": 0.7,
                "thinking": {"type": "disabled"}, "messages": messages}
        req = urllib.request.Request(ZHIPU_URL, data=json.dumps(body).encode(), method="POST", headers={
            "Authorization": "Bearer " + API_KEY, "Content-Type": "application/json"})
        try:
            return urllib.request.urlopen(req, timeout=20), model
        except urllib.error.HTTPError as e:
            last = e
            if e.code not in (429, 500, 502, 503):
                break
        except OSError as e:  # 超时、网络抖动：换下一个模型再试
            last = e
    raise last


class Handler(BaseHTTPRequestHandler):
    def _cors(self):
        origin = self.headers.get("Origin", "")
        if origin in ALLOWED or origin.startswith(("http://localhost", "http://127.0.0.1")):
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Max-Age", "86400")

    def _json(self, code, obj):
        data = json.dumps(obj, ensure_ascii=False).encode()
        self.send_response(code)
        self._cors()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_GET(self):
        self._json(200, {"ok": bool(API_KEY), "service": "meiyigen-ai"})

    def do_POST(self):
        origin = self.headers.get("Origin", "")
        if origin not in ALLOWED and not origin.startswith(("http://localhost", "http://127.0.0.1")):
            return self._json(403, {"error": "这个网页没有权限调用 AI 接口"})
        if not API_KEY:
            return self._json(500, {"error": "服务端没有配置 ZHIPU_API_KEY"})
        try:
            size = int(self.headers.get("Content-Length") or 0)
            if size > 20000:
                return self._json(413, {"error": "消息太长了"})
            payload = json.loads(self.rfile.read(size) or b"{}")
        except (ValueError, json.JSONDecodeError):
            return self._json(400, {"error": "请求格式不对"})
        messages = clean_messages(payload.get("messages"))
        if not messages:
            return self._json(400, {"error": "没有可发送的消息"})
        ip = (self.headers.get("X-Forwarded-For") or self.client_address[0]).split(",")[0].strip()
        ok, why = take_quota(ip)
        if not ok:
            return self._json(429, {"error": why})
        try:
            upstream, model = open_upstream([{"role": "system", "content": system_prompt(payload.get("profile"))}] + messages)
        except urllib.error.HTTPError as e:
            hint = "，请检查 ZHIPU_API_KEY" if e.code == 401 else ""
            return self._json(502, {"error": f"AI 服务暂时不可用（{e.code}{hint}）"})
        except Exception as e:  # 只返回错误类型，不含 Key 和聊天内容
            return self._json(502, {"error": f"连不上 AI 服务（{type(e).__name__}）"})
        # 把智谱的 SSE 流原样转给浏览器（OpenAI 兼容格式）
        self.send_response(200)
        self._cors()
        self.send_header("Content-Type", "text/event-stream; charset=utf-8")
        self.send_header("Cache-Control", "no-cache")
        self.send_header("X-Model", model)
        self.end_headers()
        try:
            with upstream:
                for line in upstream:
                    self.wfile.write(line)
                    self.wfile.flush()
        except (BrokenPipeError, ConnectionResetError):
            pass

    def log_message(self, fmt, *args):  # 不记录聊天内容
        pass


if __name__ == "__main__":
    port = int(os.environ.get("FC_SERVER_PORT", os.environ.get("PORT", "9000")))
    print(f"meiyigen-ai listening on :{port}", flush=True)
    ThreadingHTTPServer(("0.0.0.0", port), Handler).serve_forever()
