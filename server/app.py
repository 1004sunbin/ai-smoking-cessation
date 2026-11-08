"""每一根 · AI 陪伴转发服务

浏览器 -> 本服务（API Key 只存在服务端环境变量里）-> 智谱 GLM。
两种请求：
  普通陪伴  {messages, profile}            -> 流式文字回复
  Agent     {agent: true, messages, profile} -> 一步模型决策（文字或工具调用）
Agent 的工具在浏览器里执行（记录只存在用户设备上），本服务只转发；
系统提示词和工具清单都固定在服务端，接口不能被拿去当通用聊天机器人。不需要数据库。
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
# Agent 要靠函数调用：4-flash 基本不调工具，所以在它前面加一个同样免费、工具调用更可靠的 4.5-flash
AGENT_MODELS = ["glm-4.7-flash", "glm-4.5-flash", "glm-4-flash-250414"]
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
TRIGGER_LIST = ["压力", "饭后", "咖啡/茶", "喝酒", "社交", "无聊", "起床", "开车"]
METHOD_IDS = ["breath", "surf", "delay", "water", "walk", "brush", "mint", "hands", "squats", "script", "text"]
AGENT_MAX_STEPS = 4  # 一条用户消息最多几轮工具调用


def _fn(name, desc, props=None, required=None):
    return {"type": "function", "function": {"name": name, "description": desc, "parameters": {
        "type": "object", "properties": props or {}, "required": required or []}}}


_TRIG = {"type": "string", "enum": TRIGGER_LIST, "description": "想抽烟的场景"}
_LV = {"type": "integer", "minimum": 1, "maximum": 5, "description": "渴求强度 1-5"}
_METHOD = {"type": "string", "enum": METHOD_IDS, "description": "急救方法 id，来自 recommend_methods 的结果"}
# 工具由浏览器执行：前三个只读用户本机记录的统计结果，offer_* 只是生成卡片，用户点了才会生效
AGENT_TOOLS = [
    _fn("get_progress", "查看用户的目标、今天抽了几根、今日目标、累计少抽、忍住次数和坚持天数。"),
    _fn("find_patterns", "分析最近的记录：最容易抽烟的场景和时段、急救成功率、哪些办法对这个用户有效。",
        {"days": {"type": "integer", "minimum": 3, "maximum": 30, "description": "分析最近几天，默认 14"}}),
    _fn("recommend_methods", "按场景和渴求强度，从急救方法库挑出最适合这个用户的 3 个办法，会参考他过去的评价。",
        {"trigger": _TRIG, "intensity": _LV}, ["intensity"]),
    _fn("offer_sos", "在对话里给用户一张「开始急救」卡片，点了才开始带计时的急救动作。用户此刻想抽时使用。",
        {"trigger": _TRIG, "intensity": _LV, "method": _METHOD}, ["method"]),
    _fn("offer_plan", "建议把「某个场景下先做某个动作」加入用户的下周计划，生成卡片由用户确认。",
        {"trigger": _TRIG, "method": _METHOD}, ["trigger", "method"]),
    _fn("offer_reminder", "建议若干分钟后提醒用户一件事（如饭后、下班前做某个动作），生成卡片由用户确认。",
        {"minutes": {"type": "integer", "minimum": 5, "maximum": 720},
         "note": {"type": "string", "description": "提醒内容，20 字以内"}}, ["minutes", "note"]),
    _fn("offer_log", "用户说自己刚抽了烟时，生成「记下这一根」卡片，由用户确认后记录。", {"trigger": _TRIG}),
]
AGENT_TOOL_NAMES = {t["function"]["name"] for t in AGENT_TOOLS}
AGENT_RULES = (
    "\n你现在是能调用工具的戒烟助手（Agent）。工作方式：\n"
    "- 先判断用户需要什么。需要了解情况时调用 get_progress、find_patterns，不要凭空猜数字。\n"
    "- 用户此刻想抽：先 recommend_methods，再用 offer_sos 给出排第一的办法（场景不明确时可以不填场景）。\n"
    "- 用户说抽了：不批评，用 offer_log 让他记下，再结合 find_patterns 说一句下次怎么提前准备。\n"
    "- 同一个场景反复失守时，可以用 offer_plan 建议固定应对；用户提到之后某个时间点时可以用 offer_reminder。\n"
    "- 工具结果是用户的真实记录，引用数字要准确；没有记录就如实说还没有数据。\n"
    "- 一次回复最多给 2 张卡片。最终回复 2–4 句，口语化，不要提工具名称、id 或「卡片」以外的技术词。\n"
    "- 闲聊或简单问题直接回答，不必调用工具。\n"
    "- 不要让用户自己去点「想抽了」或让他报数据：需要数据就调工具查，需要行动就直接给卡片。"
)

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


def clean_agent_messages(raw):
    """Agent 对话：允许 assistant 的工具调用和 tool 结果，但结构必须对得上，否则整体拒绝"""
    msgs, pending = [], set()
    for m in (raw if isinstance(raw, list) else [])[-24:]:
        if not isinstance(m, dict):
            return []
        role = m.get("role")
        if role == "user":
            text = str(m.get("content") or "").strip()[:MAX_MSG_CHARS]
            if text:
                msgs.append({"role": "user", "content": text})
            pending = set()
        elif role == "assistant":
            out = {"role": "assistant", "content": str(m.get("content") or "")[:600]}
            calls = []
            for c in (m.get("tool_calls") or [])[:4]:
                fn = c.get("function") if isinstance(c, dict) else None
                if not isinstance(fn, dict) or fn.get("name") not in AGENT_TOOL_NAMES:
                    return []
                cid = str(c.get("id") or "")[:64]
                args = fn.get("arguments")
                args = args if isinstance(args, str) else json.dumps(args or {}, ensure_ascii=False)
                calls.append({"id": cid, "type": "function", "function": {"name": fn["name"], "arguments": args[:500]}})
                pending.add(cid)
            if calls:
                out["tool_calls"] = calls
            elif not out["content"].strip():
                continue
            msgs.append(out)
        elif role == "tool":
            cid = str(m.get("tool_call_id") or "")[:64]
            if cid not in pending:
                return []
            pending.discard(cid)
            msgs.append({"role": "tool", "tool_call_id": cid, "content": str(m.get("content") or "")[:2000]})
        else:
            return []
    while msgs and msgs[0]["role"] != "user":
        msgs.pop(0)
    if not msgs or pending:
        return []
    last_user = max(i for i, m in enumerate(msgs) if m["role"] == "user")
    steps = sum(1 for m in msgs[last_user:] if m.get("tool_calls"))
    if steps > AGENT_MAX_STEPS or msgs[-1]["role"] == "assistant":
        return []
    return msgs


def agent_step(messages):
    """非流式调用一次模型，返回 (清理后的 assistant 消息, 模型名)"""
    last = None
    for model in AGENT_MODELS:
        body = {"model": model, "stream": False, "max_tokens": 600, "temperature": 0.4,
                "thinking": {"type": "disabled"}, "messages": messages,
                "tools": AGENT_TOOLS, "tool_choice": "auto"}
        req = urllib.request.Request(ZHIPU_URL, data=json.dumps(body, ensure_ascii=False).encode(), method="POST", headers={
            "Authorization": "Bearer " + API_KEY, "Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=20) as r:
                msg = json.loads(r.read().decode())["choices"][0]["message"]
            calls = [{"id": c.get("id") or f"call_{i}", "type": "function",
                      "function": {"name": c["function"]["name"], "arguments": c["function"].get("arguments") or "{}"}}
                     for i, c in enumerate(msg.get("tool_calls") or [])
                     if c.get("function", {}).get("name") in AGENT_TOOL_NAMES][:4]
            out = {"role": "assistant", "content": (msg.get("content") or "").strip()}
            if calls:
                out["tool_calls"] = calls
            return out, model
        except urllib.error.HTTPError as e:
            last = e
            if e.code == 401:  # Key 不对，换模型也没用
                break
        except (OSError, ValueError, KeyError, IndexError, TypeError) as e:
            last = e
    raise last


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
            if size > 40000:
                return self._json(413, {"error": "消息太长了"})
            payload = json.loads(self.rfile.read(size) or b"{}")
        except (ValueError, json.JSONDecodeError):
            return self._json(400, {"error": "请求格式不对"})
        agent = payload.get("agent") is True
        messages = (clean_agent_messages if agent else clean_messages)(payload.get("messages"))
        if not messages:
            return self._json(400, {"error": "没有可发送的消息"})
        ip = (self.headers.get("X-Forwarded-For") or self.client_address[0]).split(",")[0].strip()
        # 只有用户新发一条消息才扣额度；同一条消息里的工具往返不重复计算
        if messages[-1]["role"] == "user":
            ok, why = take_quota(ip)
            if not ok:
                return self._json(429, {"error": why})
        if agent:
            system = {"role": "system", "content": system_prompt(payload.get("profile")) + AGENT_RULES}
            try:
                message, model = agent_step([system] + messages)
            except urllib.error.HTTPError as e:
                hint = "，请检查 ZHIPU_API_KEY" if e.code == 401 else ""
                return self._json(502, {"error": f"AI 服务暂时不可用（{e.code}{hint}）"})
            except Exception as e:
                return self._json(502, {"error": f"连不上 AI 服务（{type(e).__name__}）"})
            return self._json(200, {"message": message, "model": model})
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
