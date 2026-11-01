(() => {
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const KEY = 'meiyigen.v1';
const MIN = 60e3, HOUR = 36e5, DAY = 864e5;
const LIFE_PER_CIG = 11; // minutes, Shaw et al. BMJ 2000
// 旧版本曾把云端 AI 的 API Key 存在浏览器里，启动时一律清除
try{['meiyigen.ai','meiyigen.apikey'].forEach(k=>localStorage.removeItem(k))}catch(e){}

// 参考包装标示（焦油 / 烟气烟碱 / 一氧化碳 mg），不同批次略有差异
// 每行：品牌|拼音|标识|规格 焦油 烟碱 CO;…（规格写 - 表示只有品牌名；只写规格名则用 10/1.0/11）
const BRAND_DATA = `
中华|zhonghua||硬 11 1.0 12;软 11 1.0 13;双中支 10 0.9 11;金中支 10 0.9 11;细支 8 0.8 9
荷花|hehua||- 10 1.0 11;细支 8 0.8 9;中支 10 0.9 11
黄鹤楼|huanghelou||软蓝 10 1.0 11;硬金砂 10 1.0 11;1916 10 1.0 11;天下名楼 10 1.0 11;硬峡谷柔情 8 0.8 9;雅香 8 0.8 9;视窗 10 1.0 11
南京|nanjing||煊赫门 8 0.8 9;红 10 1.0 11;雨花石 10 1.0 11;九五 10 1.0 11;十二钗 6 0.6 6;炫赫门 8 0.8 9
玉溪|yuxi||软 11 1.0 12;硬 11 1.0 12;硬和谐 10 1.0 11;初心 10 1.0 11;细支 8 0.8 9
芙蓉王|furongwang||硬 11 1.0 12;蓝 10 1.0 11;钻石 10 1.0 11;细支 8 0.8 9
利群|liqun||新版 11 1.0 12;阳光 10 1.0 11;休闲 10 1.0 11;软长嘴 10 1.0 11;夜西湖 10 1.0 11
云烟|yunyan||软珍品 11 1.1 12;紫 11 1.0 12;印象 10 1.0 11;细支 8 0.8 9
红塔山|hongtashan||经典 11 1.0 13;硬经典 11 1.0 13;软经典 11 1.0 13
苏烟|suyan||五星红杉树 10 1.0 11;铂晶 10 1.0 11;软金砂 10 1.0 11
白沙|baisha||精品 11 1.0 12;和天下 11 1.0 12;硬新精品 11 1.0 12
双喜|shuangxi||硬经典 11 1.0 12;红 11 1.0 12;莲香 10 1.0 11;春天 10 1.0 11
红双喜|hongshuangxi||上海 11 1.0 12;硬 11 1.0 12
七匹狼|qipilang||白 10 1.0 11;红 10 1.0 11;灰 10 1.0 11;软蓝 10 1.0 11
娇子|jiaozi||宽窄 10 0.9 11;X 10 0.9 11;蓝 10 0.9 11
宽窄|kuanzhai||- 10 0.9 11
泰山|taishan||红将军 11 1.0 12;华贵 10 1.0 11;望岳 10 1.0 11
长白山|changbaishan||777 10 0.9 11;红 10 0.9 11
熊猫|xiongmao||- 11 1.0 12
中南海|zhongnanhai||8mg 8 0.7 9;5mg 5 0.5 5;蓝 10 0.9 11
红金龙|hongjinlong||硬 10 1.0 11;软 10 1.0 11
黄金叶|huangjinye||天叶 10 1.0 11;乐途 10 1.0 11;红旗渠 10 1.0 11;百年浓香 10 1.0 11
红旗渠|hongqiqu||-
红河|honghe||-;道 10 1.0 11
真龙|zhenlong||-;起源 10 1.0 11;娇子 10 1.0 11
钻石|zuanshi||-
牡丹|mudan||- 11 1.0 12;红 11 1.0 12
大前门|daqianmen||- 11 1.0 12
红梅|hongmei||- 11 1.0 12
红山茶|hongshancha||-
阿诗玛|ashima||-
石林|shilin||-
大重九|dazhongjiu||- 11 1.0 12
贵烟|guiyan||跨越 10 1.0 11;国酒香 10 1.0 11;萃 10 1.0 11
黄果树|huangguoshu||-
黄山|huangshan||徽商 10 1.0 11;红方印 10 1.0 11;新一品 10 1.0 11
迎客松|yingkesong||-
好猫|haomao||-
帝豪|dihao||-
兰州|lanzhou||-
金圣|jinsheng||-
哈德门|hademen||-
都宝|dubao||-
大红鹰|dahongying||-
人民大会堂|renmindahuitang||-
钓鱼台|diaoyutai||-
椰树|yeshu||-
金桥|jinqiao||-
散花|sanhua||-
将军|jiangjun||-
猴王|houwang||-
延安|yanan||-
红玫|hongmei||-
五叶神|wuyeshen||-
天子|tianzi||-
冬虫夏草|dongchongxiacao||-
好日子|haorizi||-
双叶|shuangye||-
金丝猴|jinsihou||-
龙凤呈祥|longfengchengxiang||-
红杉树|hongshanshu||-
大丰收|dafengshou||-
白塔|baita||-
黄金叶|huangjinye||-
红云|hongyun||-
红旗|hongqi||-
恒大|hengda||-
雄狮|xiongshi||-
三沙|sansha||-
石狮|shishi||-
金叶|jinye||-
福|fu||-
乐富门|lefumen||-
万宝路|wanbaolu marlboro|MARLBORO|红 10 0.8 10;白 6 0.5 6;冰爆 6 0.5 6
骆驼|luotuo camel|CAMEL|- 10 0.8 10
七星|qixing mevius|MEVIUS|- 8 0.7 8
爱喜|aixi esse|ESSE|- 5 0.5 5
登喜路|dengxilu dunhill|DUNHILL|- 8 0.7 8
健牌|jianpai kent|KENT|- 6 0.5 6
三五|sanwu 555|555|- 10 0.8 10
希尔顿|xierdun hilton|HILTON|- 10 0.8 10
好彩|haocai lucky strike|LUCKY|- 10 0.8 10
云斯顿|yunsidun winston|WINSTON|- 10 0.8 10
寿百年|shoubainian sobranie|SOBRANIE|- 6 0.5 6
`;
const BRANDS = {};
BRAND_DATA.trim().split('\n').forEach(line=>{
  const [fam,py,mark,specs]=line.split('|');
  specs.split(';').forEach(sp=>{
    const [spec,tar=10,nic=1.0,co=11]=sp.trim().split(/\s+/);
    const name = spec==='-' ? fam : `${fam}(${spec})`;
    if(!BRANDS[name]) BRANDS[name]={name, mark:mark||fam, alias:py, tar:+tar, nic:+nic, co:+co};
  });
});
const CUSTOM = '__custom';
const QUICK_BRANDS = ['万宝路(红)','中华(硬)','荷花'];
const brandFoot = b => (b.custom
    ? `「${b.name}」暂无收录的标示数据，按国内卷烟常见标示估算：焦油 ${b.tar}mg / 尼古丁 ${b.nic}mg / 一氧化碳 ${b.co}mg。`
    : `${b.name}参考包装标示：焦油 ${b.tar}mg / 尼古丁 ${b.nic}mg / 一氧化碳 ${b.co}mg，不同批次略有差异。`)
  + (b.tar<=8 ? '"细支/低焦油"机器测量值更低，但吸烟者常会吸得更深更频繁，实际危害并不更低。' : '');
const TRIGGERS = ['压力','饭后','咖啡/茶','喝酒','社交','无聊','起床','开车'];
const STRATEGY = {
  '压力':   ['4-7-8 呼吸三轮','把压力源写成一句话，再写下第一步','起身走到窗边 2 分钟'],
  '饭后':   ['吃完立刻刷牙或嚼无糖口香糖','饭后散步 10 分钟再回座位','换一个饭后小仪式：泡一杯茶'],
  '咖啡/茶':['这周把咖啡换个地方喝','咖啡配一小把坚果，让手有事做','改喝温水或气泡水试试'],
  '喝酒':   ['提前告诉朋友你在戒烟','喝酒时手里一直拿着饮料杯','这周减少喝酒场合'],
  '社交':   ['朋友递烟时准备好一句话："在戒，谢啦"','烟歇时跟着下楼，但手里拿水','约朋友做不抽烟的活动'],
  '无聊':   ['手边准备解压玩具或吸管','打开一局 3 分钟的小游戏','做 20 个深蹲'],
  '起床':   ['起床先喝一大杯水','把第一件事换成洗澡','烟和打火机别放床头'],
  '开车':   ['车里清空烟和打火机','准备无糖薄荷糖','开车时听一期播客']
};
// WHO / CDC quit timeline
const MILES = [
  {t:20*MIN, ic:'❤️', label:'20 分钟', d:'心率和血压开始回落'},
  {t:12*HOUR, ic:'🩸', label:'12 小时', d:'血液中一氧化碳水平降至正常'},
  {t:2*DAY,  ic:'👃', label:'48 小时', d:'嗅觉和味觉开始改善'},
  {t:3*DAY,  ic:'🫁', label:'72 小时', d:'支气管放松，呼吸变得轻松'},
  {t:14*DAY, ic:'🏃', label:'2 – 12 周', d:'血液循环改善，肺功能提升'},
  {t:30*DAY, ic:'🌬️', label:'1 – 9 个月', d:'咳嗽和气短减少'},
  {t:365*DAY,ic:'💪', label:'1 年', d:'冠心病风险约降至吸烟者的一半'},
  {t:5*365*DAY, ic:'🧠', label:'5 年', d:'中风风险逐步接近不吸烟者'},
  {t:10*365*DAY, ic:'🎗️', label:'10 年', d:'肺癌死亡风险约为吸烟者的一半'},
  {t:15*365*DAY, ic:'🌳', label:'15 年', d:'冠心病风险接近从不吸烟者'}
];

// 烟瘾急救方法库：fit = 适合的场景（'*' 为通用），lv = 适合的渴求强度区间，sec = 建议时长（秒）
const METHODS = {
  breath:{name:'慢呼吸 5 轮', desc:'吸气 4 秒、屏住 4 秒、呼气 6 秒，跟着圆圈做 5 轮。呼气比吸气长，身体会慢下来。', sec:70, fit:'*', lv:[1,5]},
  surf:  {name:'冲动冲浪', desc:'不和它对抗：留意渴求在身体哪里，给它打个分，看着它像浪一样升起、到顶、再退下去。', sec:120, fit:'*', lv:[3,5]},
  delay: {name:'推迟 10 分钟', desc:'对自己说"10 分钟后再决定"，先去做手边的一件事。很多时候 10 分钟后就没那么想了。', sec:600, fit:'*', lv:[1,2]},
  water: {name:'慢慢喝一杯冷水', desc:'小口喝完一整杯冷水，感受它流过喉咙。让嘴和手都有事做。', sec:60, fit:['饭后','咖啡/茶','起床','压力','无聊'], lv:[1,4]},
  walk:  {name:'离开现场走 3 分钟', desc:'站起来，走到看不到烟和打火机的地方。换个环境，诱因的提示就弱了。', sec:180, fit:['压力','社交','饭后','喝酒','无聊'], lv:[2,5]},
  brush: {name:'刷牙或漱口', desc:'清新的口腔会让烟味变得不那么诱人，也给"饭后一根"换一个收尾动作。', sec:120, fit:['饭后','起床','咖啡/茶'], lv:[1,4]},
  mint:  {name:'含一颗无糖薄荷糖', desc:'让嘴有事做，替代点烟的那个动作。', sec:90, fit:['开车','饭后','咖啡/茶','无聊'], lv:[1,3]},
  hands: {name:'让手忙起来', desc:'捏解压球、转笔，或把一根吸管夹在指间，替代拿烟的手感。', sec:90, fit:['无聊','开车','咖啡/茶','社交'], lv:[1,3]},
  squats:{name:'做 20 个深蹲', desc:'短时间的剧烈动作能快速打断渴求，心跳上来后冲动通常会下降。', sec:90, fit:['压力','无聊','起床'], lv:[3,5]},
  script:{name:'说出你的拒绝句', desc:'默念或说出来："我在戒，谢了。"然后把手里换成一杯饮料。', sec:45, fit:['社交','喝酒'], lv:[1,5]},
  text:  {name:'给一个人发消息', desc:'告诉朋友或家人"我现在想抽，陪我聊两句"。说出来，冲动就没那么大了。', sec:120, fit:['压力','喝酒','无聊','社交'], lv:[3,5]}
};
const RATING = {good:'有帮助', ok:'一般', bad:'没帮助'};

/* ---------- state ---------- */
let S = load();
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7)}
function blank(){return {v:2,setup:false,demo:false,name:'',mode:'quit',base:15,price:25,brand:'万宝路(红)',why:[],consent:true,start:Date.now(),events:[],sos:[],plan:null,checkins:{},chat:[],theme:'auto',aiOn:false,aiAsked:false}}
function load(){
  let r=null;
  try{r=JSON.parse(localStorage.getItem(KEY))}catch(e){}
  if(!r||!r.setup) return blank();
  const s=Object.assign(blank(),r);
  // 旧版数据迁移：事件补 id，去掉不准确的"采纳计数"
  s.events=s.events.map(e=>e.id?e:Object.assign({id:uid()},e));
  s.sos=s.sos||[];
  s.chat=(s.chat||[]).filter(m=>!m.typing);
  delete s.adopted; delete s.suggested; delete s.customKey;
  return s;
}
function save(){try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}}

const dayKey = t => {const d=new Date(t);return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate()};
const dayStart = (t,offset=0) => {const d=new Date(t);return new Date(d.getFullYear(),d.getMonth(),d.getDate()+offset).getTime()};
const smokes = () => S.events.filter(e=>e.type==='smoke');
const resists = () => S.events.filter(e=>e.type==='resist');
const inRange = (e,a,b) => e.t>=a && e.t<b;
const lastSmoke = () => Math.max(S.start, ...smokes().map(e=>e.t));
const brand = () => S.brand===CUSTOM && S.customBrand
  ? {name:S.customBrand, mark:S.customBrand.slice(0,4), tar:10, nic:1.0, co:11, custom:true}
  : BRANDS[S.brand] || BRANDS['万宝路(红)'];
const perCig = () => S.price/20;
// 少抽的烟（估算）= 基线 × 天数 − 实际记录。首页累计和周报共用这一个公式，数字才对得上
function avoidedBetween(a,b){
  a=Math.max(a,S.start); b=Math.min(b,Date.now());
  if(b<=a) return 0;
  return Math.max(0, S.base*(b-a)/DAY - smokes().filter(e=>inRange(e,a,b)).length);
}
const avoided = () => avoidedBetween(S.start, Date.now());
const dayNo = () => Math.floor((dayStart(Date.now())-dayStart(S.start))/DAY)+1;
// 减量模式：每满一周，每日目标比基线再降 20%；戒烟模式目标为 0
function targetFor(t){
  if(S.mode!=='reduce') return 0;
  const w=Math.max(0,Math.floor((t-dayStart(S.start))/(7*DAY)));
  return Math.max(0,Math.round(S.base*(1-0.2*(w+1))));
}
function topTriggers(since=0){
  const c={}; S.events.forEach(e=>{if(e.trigger&&e.t>=since)c[e.trigger]=(c[e.trigger]||0)+1});
  return Object.entries(c).sort((a,b)=>b[1]-a[1]);
}
function personalTrigger(){
  if(!S.consent) return null;
  const top=topTriggers()[0]; return top?top[0]:null;
}
function fmtLife(min){
  if(min<60) return [Math.floor(min),'分钟'];
  if(min<1440) return [(min/60).toFixed(1),'小时'];
  return [(min/1440).toFixed(1),'天'];
}
function fmtDur(ms){
  const d=Math.floor(ms/DAY), h=Math.floor(ms%DAY/HOUR), m=Math.floor(ms%HOUR/MIN), s=Math.floor(ms%MIN/1000);
  const p=n=>String(n).padStart(2,'0');
  return `${d}<small>天</small> ${p(h)}:${p(m)}:${p(s)}`;
}
const fmtTime = t => {const d=new Date(t);return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`};
function esc(s){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
function toast(msg,action){
  const t=$('#toast');
  t.innerHTML=esc(msg)+(action?`<button class="toast-act">${esc(action.label)}</button>`:'');
  if(action) t.querySelector('button').onclick=()=>{t.classList.remove('show');action.fn()};
  t.classList.toggle('actionable',!!action);
  t.classList.add('show');clearTimeout(toast._t);
  toast._t=setTimeout(()=>t.classList.remove('show'),action?5000:2400);
}
function floatAt(el,txt){const r=el.getBoundingClientRect();const f=document.createElement('div');f.className='float';f.textContent=txt;f.style.left=(r.left+r.width/2-30)+'px';f.style.top=(r.top-10)+'px';document.body.appendChild(f);setTimeout(()=>f.remove(),1300)}

/* ---------- events：记录、撤销 ---------- */
function addEvent(e){e.id=uid();S.events.push(e);S.events.sort((a,b)=>a.t-b.t);save();return e}
function removeEvent(id){
  const i=S.events.findIndex(e=>e.id===id); if(i<0) return null;
  const [e]=S.events.splice(i,1);
  if(e.sosId){const s=S.sos.find(x=>x.id===e.sosId);if(s)s.outcome=null}
  save(); return e;
}
function undoable(e,msg){
  toast(msg,{label:'撤销',fn:()=>{removeEvent(e.id);renderAll();toast('已撤销')}});
}

/* ---------- theme ---------- */
function applyTheme(){
  if(S.theme==='auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme',S.theme);
  $$('#themeSeg button').forEach(b=>b.classList.toggle('on',b.dataset.v===S.theme));
}

/* ---------- tabs ---------- */
function goTab(name){
  $$('nav.tabbar button').forEach(x=>x.classList.toggle('on',x.dataset.tab===name));
  $$('.tab').forEach(t=>t.classList.toggle('active',t.id==='tab-'+name));
  window.scrollTo({top:0});
  if(name==='heal') renderHeal();
  if(name==='buddy') renderBuddy();
}
$$('nav.tabbar button').forEach(b=>b.onclick=()=>goTab(b.dataset.tab));

/* ---------- sheets ---------- */
let openSheet=null;
function show(id){
  if(openSheet&&openSheet!==$(id)){openSheet.classList.remove('show');if(openSheet.id==='sos')stopTimers()}
  openSheet=$(id);$('#scrim').classList.add('show');openSheet.classList.add('show');openSheet.scrollTop=0;
}
function hide(force){
  if(!openSheet)return;
  if(openSheet.id==='welcome'&&!S.setup&&force!==true)return;
  openSheet.classList.remove('show');$('#scrim').classList.remove('show');
  if(openSheet.id==='sos')stopTimers();
  openSheet=null;
}
$('#scrim').onclick=hide;
document.addEventListener('keydown',e=>{if(e.key==='Escape')hide()});

function chipGroup(el,list,multi){
  el.innerHTML=list.map(v=>`<button class="chip" data-v="${esc(v)}">${esc(v)}</button>`).join('');
  el.onclick=e=>{const c=e.target.closest('.chip');if(!c)return;
    if(!multi)[...el.children].forEach(x=>x!==c&&x.classList.remove('on'));
    c.classList.toggle('on');el.dispatchEvent(new Event('change'))};
}
const chipVal = el => [...el.querySelectorAll('.chip.on')].map(c=>c.dataset.v);
function chipSet(el,v){[...el.children].forEach(c=>c.classList.toggle('on',c.dataset.v===v))}
function segBind(el,cb){el.onclick=e=>{const b=e.target.closest('button');if(!b)return;[...el.children].forEach(x=>x.classList.toggle('on',x===b));cb&&cb(b.dataset.v)}}

/* ---------- welcome / 设定目标 ---------- */
function openWelcome(form){
  $('#wIntro').hidden=!!form; $('#wForm').hidden=!form;
  show('#welcome');
}
$('#wSelf').onclick=()=>{$('#wIntro').hidden=true;$('#wForm').hidden=false;$('#welcome').scrollTop=0};
$('#oBack').onclick=()=>{$('#wIntro').hidden=false;$('#wForm').hidden=true};
$('#wAbout').onclick=hide;
segBind($('#oMode'),v=>{$('#oModeHint').textContent=v==='quit'?'从现在开始不抽。抽了也没关系，记下来就好。':'每周把每日上限降低基线的 20%，一步步减到 0。'});
$('#oStart').onclick=()=>{
  S=Object.assign(blank(),{theme:S.theme,aiOn:S.aiOn,aiAsked:S.aiAsked},{
    setup:true,
    name:$('#oName').value.trim(),
    mode:$('#oMode .on').dataset.v,
    base:Math.min(80,Math.max(1,Math.round(+$('#oBase').value)||15)),
    price:Math.max(1,+$('#oPrice').value||25),
    consent:$('#oConsent').checked,
    start:Date.now()
  });
  S.chat=[{r:'ai',x:welcomeMsg()}];
  save(); hide(); setBrand(S.brand); renderAll(); renderChat(); goTab('today');
  toast('开始了。想抽的时候，点右下角「想抽了」');
};

/* ---------- today ---------- */
function tick(){
  $('#clock').innerHTML=fmtDur(Date.now()-lastSmoke());
  const a=avoided();
  $('#sAvoided').innerHTML=`${Math.floor(a)}<small>根</small>`;
  $('#sMoney').textContent='¥'+(a*perCig()).toFixed(a*perCig()<100?1:0);
  const [lv,lu]=fmtLife(a*LIFE_PER_CIG); $('#sLife').innerHTML=`+${lv}<small>${lu}</small>`;
  const tar=a*brand().tar; $('#sTar').innerHTML= tar<1000?`${Math.floor(tar)}<small>mg</small>`:`${(tar/1000).toFixed(2)}<small>g</small>`;
}
function renderToday(){
  const h=new Date().getHours();
  const hi=h<6?'夜深了':h<11?'早上好':h<14?'中午好':h<18?'下午好':'晚上好';
  $('#greet').textContent=`${hi}${S.name?'，'+S.name:''}`;
  const d=new Date();
  $('#todayLabel').textContent=`${d.getMonth()+1}月${d.getDate()}日 · 第 ${dayNo()} 天 · ${S.mode==='quit'?'戒烟':'减量'}`;
  $('#heroSub').textContent=`已经坚持到第 ${dayNo()} 天，累计忍住 ${resists().length} 次。抽了一根，只会重置这个计时，累计进度不变。`;
  $('#estNote').textContent=`估算方式：按你的基线（每天 ${S.base} 根、每包 ¥${S.price}）与实际记录之差计算；寿命按每根约 11 分钟的人群统计值。`;
  const t0=dayStart(Date.now()), today=S.events.filter(e=>e.t>=t0);
  const sc=today.filter(e=>e.type==='smoke').length, rc=today.length-sc;
  const tgt=targetFor(Date.now());
  $('#dayBar').innerHTML=`<span>今天抽了 <b>${sc}</b> 根</span><span>忍住 <b>${rc}</b> 次</span><span>${S.mode==='reduce'?`目标 ≤ <b>${tgt}</b> 根`:'目标 <b>0</b> 根'}</span>`;
  $('#dayBar').classList.toggle('over',sc>tgt);
  $('#todayLog').innerHTML=today.length?today.slice().reverse().map(e=>`
    <div class="logrow is-${e.type}">
      <span class="tm">${fmtTime(e.t)}</span>
      <span class="what">${e.type==='smoke'?'抽了一根':'忍住了'}${e.trigger?` · ${esc(e.trigger)}`:''}${e.via==='sos'?' · 急救':''}</span>
      <button data-del="${e.id}" aria-label="删除这条记录">✕</button>
    </div>`).join(''):'<p class="hint" style="margin-top:10px">今天还没有记录。</p>';
  renderCheckin(); renderPlan(); tick();
}
$('#todayLog').onclick=e=>{
  const id=e.target.dataset.del; if(!id) return;
  const ev=removeEvent(id); if(!ev) return;
  renderAll();
  toast('已删除这条记录',{label:'撤销',fn:()=>{S.events.push(ev);S.events.sort((a,b)=>a.t-b.t);save();renderAll();toast('已恢复')}});
};
$('#btnResist').onclick=e=>{
  const ev=addEvent({type:'resist',t:Date.now(),via:'quick'});
  floatAt(e.currentTarget,`+${LIFE_PER_CIG} 分钟`);
  renderAll();
  undoable(ev,`记下了：忍住 1 次（累计 ${resists().length} 次）`);
};
$('#btnSmoke').onclick=()=>openLog('smoke',false);
$('#btnBackfill').onclick=()=>openLog('smoke',true);

/* ---------- 记录 / 补记 ---------- */
const WHEN=[['刚刚',0],['30 分钟前',30],['1 小时前',60],['2 小时前',120],['更早…',-1]];
function openLog(type,backfill){
  $('#lForm').hidden=false;$('#lAfter').hidden=true;
  $('#lTitle').textContent=backfill?'补记一条':'抽了一根，记下来就好';
  [...$('#lType').children].forEach(b=>b.classList.toggle('on',b.dataset.v===type));
  $('#lType').parentElement.hidden=!backfill;
  chipGroup($('#lWhen'),WHEN.map(w=>w[0]));
  chipSet($('#lWhen'),backfill?'30 分钟前':'刚刚');
  $('#lAt').hidden=true;
  const pad=n=>String(n).padStart(2,'0'), loc=t=>{const d=new Date(t);return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`};
  $('#lAt').min=loc(S.start); $('#lAt').max=loc(Date.now()); $('#lAt').value=loc(Date.now()-HOUR*3>S.start?Date.now()-HOUR*3:S.start);
  $('#lWhen').onchange=()=>{$('#lAt').hidden=chipVal($('#lWhen'))[0]!=='更早…'};
  chipGroup($('#lTrig'),TRIGGERS);
  show('#logSheet');
}
segBind($('#lType'));
$('#lSave').onclick=()=>{
  const type=$('#lType .on').dataset.v, w=chipVal($('#lWhen'))[0]||'刚刚', trigger=chipVal($('#lTrig'))[0];
  let t=w==='更早…'?new Date($('#lAt').value).getTime():Date.now()-WHEN.find(x=>x[0]===w)[1]*MIN;
  if(!t||isNaN(t)) t=Date.now();
  t=Math.min(Date.now(),Math.max(S.start,t));
  const ev=addEvent({type,t,trigger,via:w==='刚刚'?'quick':'backfill'});
  renderAll();
  if(type==='resist'){hide();undoable(ev,'已补记：忍住 1 次');return}
  // 抽了之后：不评判，展示仍然有效的进度和下一步
  $('#lKeep').innerHTML=`<div><b>${Math.floor(avoided())}</b><span>累计少抽（估算）</span></div><div><b>${resists().length}</b><span>累计忍住</span></div><div><b>${dayNo()}</b><span>坚持天数</span></div>`;
  $('#lNext').innerHTML=`<b>下一步</b>${esc(nextAfterSmoke(trigger))}`;
  $('#lSos').onclick=()=>openSOS(trigger);
  $('#lForm').hidden=true;$('#lAfter').hidden=false;$('#logSheet').scrollTop=0;
  undoable(ev,'已记录这一根');
};
$('#lDone').onclick=hide;
function nextAfterSmoke(trigger){
  const r=recommend(trigger,3)[0], m=METHODS[r.id];
  const tgt=targetFor(Date.now()), sc=smokes().filter(e=>e.t>=dayStart(Date.now())).length;
  const today=S.mode==='reduce'?(sc<=tgt?`今天还在目标之内（${sc}/${tgt}）。`:`今天超过了目标（${sc}/${tgt}），明天重新来过就好。`):'';
  return `${today}${trigger?`下次在「${trigger}」时想抽，先试试「${m.name}」`:`下次想抽时，先点「想抽了」，试试「${m.name}」`}${r.good?`，它对你有帮助过 ${r.good} 次。`:'。'}`;
}

/* ---------- 今天的预案 ---------- */
function renderPlan(){
  const h=new Date().getHours();
  const fallback = h<10?'起床':h<14?'饭后':h<19?'压力':'社交';
  const trig = (S.plan&&S.plan.trigger) || personalTrigger() || fallback;
  const id = S.plan&&S.plan.trigger===trig ? S.plan.method : recommend(trig,3)[0].id;
  const m=METHODS[id];
  $('#planSource').textContent = S.plan ? '来自你的周计划' : personalTrigger() ? '基于你的记录' : (S.consent?'记录越多越准':'个性化已关闭');
  $('#planBody').innerHTML=`<p class="plan-line">如果今天在「<b>${esc(trig)}</b>」时想抽，先做：</p>
    <div class="tip plan-card"><b>${m.name}</b>${m.desc}</div>
    <button class="btn ghost small" id="planGo" style="margin-top:10px">现在就用</button>`;
  $('#planGo').onclick=()=>openSOS(trig);
}

/* ---------- 每日打卡 ---------- */
function renderCheckin(){
  const k=dayKey(Date.now()), c=S.checkins[k];
  if(c){
    $('#checkinHint').textContent='今天已打卡 ✓';
    $('#checkinBody').innerHTML=`<div class="kpis" style="margin-top:0"><div><b>${['😣','😕','😐','🙂','😄'][c.mood]}</b><span>心情</span></div><div><b>${c.crave}/5</b><span>渴求强度</span></div><div><b>${streak()}</b><span>连续打卡</span></div></div>`;
    return;
  }
  $('#checkinHint').textContent='花 10 秒记录今天的状态';
  $('#checkinBody').innerHTML=`
    <div class="hint" style="margin:0 0 6px">心情</div>
    <div class="seg" id="ciMood">${['😣','😕','😐','🙂','😄'].map((m,i)=>`<button data-v="${i}" ${i===2?'class="on"':''}>${m}</button>`).join('')}</div>
    <div class="hint" style="margin:12px 0 6px">渴求强度</div>
    <div class="seg" id="ciCrave">${[1,2,3,4,5].map(i=>`<button data-v="${i}" ${i===3?'class="on"':''}>${i}</button>`).join('')}</div>
    <button class="btn primary" style="margin-top:14px" id="ciSave">完成打卡</button>`;
  segBind($('#ciMood'));segBind($('#ciCrave'));
  $('#ciSave').onclick=()=>{
    S.checkins[k]={mood:+$('#ciMood .on').dataset.v,crave:+$('#ciCrave .on').dataset.v};save();
    toast(`打卡成功 · 连续 ${streak()} 天`);renderToday();
    if(S.checkins[k].crave>=4) agentSay('看到你今天渴求比较强。把「想抽了」当成急救键，我会陪你撑过那几分钟。');
  };
}
function streak(){let n=0,t=Date.now();while(S.checkins[dayKey(t)]){n++;t=dayStart(t,-1)+HOUR*12}return n}

/* ---------- cigarette lab ---------- */
const STAGES=[
  {p:.04,o:'throat',t:'点燃：燃烧产生 7000+ 种化学物质，其中至少 70 种已知致癌',g:'口腔和咽喉少接触一次高温烟雾'},
  {p:.16,o:'brain',t:'尼古丁约 10 秒抵达大脑，释放多巴胺——成瘾正是从这里开始',g:'大脑的尼古丁受体多一次"脱敏"的机会'},
  {p:.36,o:'blood',t:'一氧化碳与血红蛋白的结合力是氧气的 200 倍以上，血液携氧下降',g:'血液保住满格携氧能力'},
  {p:.56,o:'heart',t:'心率加快、血压升高、血管收缩，心脏负担加重',g:'心脏少一次被迫加速'},
  {p:.76,o:'lungs',t:'焦油附着在气道和肺泡，纤毛的清扫功能受损',g:'肺里的纤毛继续安心清扫'},
  {p:.995,o:null,t:`这一根结束：按统计估算，预期寿命约减少 ${LIFE_PER_CIG} 分钟`,g:''}
];
let P=0, holding=false, raf=0, lastT=0, done=false, putDownUsed=false;
function setBrand(k){
  if(!BRANDS[k] && !(k===CUSTOM && S.customBrand)) k='万宝路(红)';
  S.brand=k; save();
  const keys=QUICK_BRANDS.includes(k)?QUICK_BRANDS:[...QUICK_BRANDS,k];
  $('#brandSeg').innerHTML=keys.map(kk=>`<button data-v="${kk}" class="${kk===k?'on':''}">${kk===CUSTOM?brand().name:BRANDS[kk].name}</button>`).join('');
  $('#brandMark').textContent=brand().mark;
  $('#brandFoot').textContent=brandFoot(brand());
  resetLab();
}
$('#brandSeg').onclick=e=>{const b=e.target.closest('button');if(b)setBrand(b.dataset.v)};
const norm = t => t.toLowerCase().replace(/[\s()（）·]/g,'');
function searchBrands(q){
  q=norm(q); if(!q) return [];
  return Object.entries(BRANDS)
    .filter(([k,b])=>norm(b.name).includes(q) || norm(b.alias).includes(q))
    .sort((a,b)=>(norm(b[1].name).startsWith(q)-norm(a[1].name).startsWith(q)));
}
function renderBrandResults(){
  const q=$('#brandQ').value.trim(), list=searchBrands(q), box=$('#brandResults');
  if(!q){box.hidden=true;return}
  box.hidden=false;
  box.innerHTML=list.slice(0,40).map(([k,b])=>`<button data-v="${esc(k)}"><b>${b.name}</b><span>焦油 ${b.tar} · 尼古丁 ${b.nic} · CO ${b.co} mg</span></button>`).join('')
    + (list.length ? '' : `<button data-custom="${esc(q)}"><b>${esc(q)}</b><span>暂未收录 · 按常见标示估算</span></button>`);
}
$('#brandQ').oninput=renderBrandResults;
$('#brandQ').onkeydown=e=>{if(e.key==='Enter'){const q=e.target.value.trim(), r=searchBrands(q);if(r.length)pickBrand(r[0][0]);else if(q)pickCustom(q)}};
$('#brandResults').onclick=e=>{const b=e.target.closest('button');if(!b)return;b.dataset.custom?pickCustom(b.dataset.custom):pickBrand(b.dataset.v)};
function pickCustom(name){S.customBrand=name.slice(0,12);pickBrand(CUSTOM)}
function pickBrand(k){$('#brandQ').value='';$('#brandResults').hidden=true;$('#brandQ').blur();setBrand(k)}
$('#events').innerHTML=STAGES.map(s=>`<li>${s.t}</li>`).join('');

function drawLab(){
  const b=brand(), burn=240*P, tip=326-burn;
  $('#paper').setAttribute('width',Math.max(0,240-burn));
  const ashW=Math.min(18,burn);
  $('#ash').setAttribute('x',tip);
  $('#ash').setAttribute('width',ashW);
  $('#emberDot').setAttribute('cx',tip);
  $('#emberDot').setAttribute('r',P>0&&P<1?(holding?11:7):0);
  $('#holdFill').style.width=(P*100)+'%';
  $('#mTar').innerHTML=`${(b.tar*P).toFixed(1)}<small>mg</small>`;
  $('#mNic').innerHTML=`${(b.nic*P).toFixed(2)}<small>mg</small>`;
  $('#mCo').innerHTML=`${(b.co*P).toFixed(1)}<small>mg</small>`;
  $('#mLife').innerHTML=`-${(LIFE_PER_CIG*P).toFixed(1)}<small>分钟</small>`;
  $('#mChem').innerHTML=`${Math.round(7000*Math.min(1,P*4))}<small>种</small>`;
  $('#mCost').textContent='¥'+(perCig()*P).toFixed(2);
  const lis=$$('#events li');
  STAGES.forEach((s,i)=>{
    const on=P>=s.p; lis[i].classList.toggle('on',on);
    if(s.o) $$(`.organ[data-o="${s.o}"]`).forEach(o=>o.classList.toggle('on',on));
  });
}
function puff(){
  const st=$('#cigStage'), svg=st.querySelector('svg'), r=svg.getBoundingClientRect(), sr=st.getBoundingClientRect();
  const x=(326-240*P-18)/340*r.width + (r.left-sr.left);
  const s=document.createElement('i');s.className='smoke';s.style.left=x+'px';s.style.top=(r.top-sr.top+10)+'px';s.style.setProperty('--dx',(Math.random()*40-20)+'px');
  st.appendChild(s);setTimeout(()=>s.remove(),2300);
}
function loop(t){
  if(!holding)return;
  const dt=lastT?t-lastT:16;lastT=t;
  P=Math.min(1,P+dt/7000);
  if(Math.random()<.18)puff();
  drawLab();
  if(P>=1){finish();return}
  raf=requestAnimationFrame(loop);
}
function startHold(e){
  if(done)return; e.preventDefault();
  holding=true;lastT=0;$('#holdText').textContent='正在燃烧… 松手可停下';
  raf=requestAnimationFrame(loop);
}
function endHold(){
  if(!holding)return;holding=false;cancelAnimationFrame(raf);drawLab();
  if(!done&&P>0)$('#holdText').textContent=`已燃烧 ${Math.round(P*100)}% · 继续按住`;
}
const hb=$('#holdBtn');
hb.addEventListener('pointerdown',startHold);
['pointerup','pointerleave','pointercancel'].forEach(ev=>hb.addEventListener(ev,endHold));
hb.addEventListener('keydown',e=>{if((e.key===' '||e.key==='Enter')&&!e.repeat)startHold(e)});
hb.addEventListener('keyup',e=>{if(e.key===' '||e.key==='Enter')endHold()});
hb.addEventListener('contextmenu',e=>e.preventDefault());

function finish(){
  holding=false;done=true;drawLab();
  $('#holdText').textContent='这一根抽完了';
  const b=brand(), daily=S.base;
  $('#gainList').innerHTML=`
    <div class="gain"><b>+${LIFE_PER_CIG} 分钟</b><span>预期寿命（统计估算）</span></div>
    <div class="gain"><b>¥${perCig().toFixed(2)}</b><span>留在口袋里</span></div>
    <div class="gain"><b>${b.tar} mg</b><span>焦油不进入肺部</span></div>
    <div class="gain"><b>${b.co} mg</b><span>一氧化碳不进入血液</span></div>`;
  $('#result').classList.add('show');
  $('#result .hint').textContent=`同样一根烟的时间，你的身体可以换来——按你每天 ${daily} 根算，每天少抽一根，一年就是 ${(LIFE_PER_CIG*365/1440).toFixed(1)} 天寿命。`;
}
function resetLab(){
  P=0;done=false;holding=false;cancelAnimationFrame(raf);putDownUsed=false;
  $('#events').innerHTML=STAGES.map(s=>`<li>${s.t}</li>`).join('');
  $('#labBody').classList.remove('healed');$('#bodySvg').classList.remove('healed');
  $('#result').classList.remove('show');$('#holdText').textContent='按住 点燃这一根';
  drawLab();
}
$('#relight').onclick=resetLab;
$('#putDown').onclick=e=>{
  if(putDownUsed)return;putDownUsed=true;
  const ev=addEvent({type:'resist',t:Date.now(),via:'lab'});
  floatAt(e.currentTarget,`+${LIFE_PER_CIG} 分钟`);
  $('#labBody').classList.add('healed');$('#bodySvg').classList.add('healed');
  // rewind animation to show the body "un-smoking"
  const from=P, t0=performance.now();
  (function rew(t){const k=Math.min(1,(t-t0)/1600);P=from*(1-k);drawLab();
    $$('#events li').forEach((li,i)=>{li.classList.add('on');li.textContent=STAGES[i].g||`寿命 +${LIFE_PER_CIG} 分钟，已计入你的成就`});
    $$('.organ').forEach(o=>o.classList.add('on'));
    if(k<1)requestAnimationFrame(rew);else{$('#holdText').textContent='你放下了这一根 🌱';done=true}
  })(t0);
  renderAll();undoable(ev,'已记为忍住 1 次');
};

/* calculator */
function calc(){
  const n=+$('#lessRange').value, b=brand();
  $('#lessN').textContent=n;
  const [lv,lu]=fmtLife(n*365*LIFE_PER_CIG);
  $('#cLife').textContent=`${lv} ${lu}`;
  $('#cMoney').textContent='¥'+Math.round(n*365*perCig()).toLocaleString();
  $('#cTar').textContent=(n*365*b.tar/1000).toFixed(1)+' g';
  $('#cCount').textContent=(n*365).toLocaleString()+' 根';
}
$('#lessRange').oninput=calc;

/* ---------- heal ---------- */
function renderHeal(){
  const since=Date.now()-lastSmoke();
  $('#healLead').textContent=`距离上一根烟 ${fmtLife(since/MIN).join(' ')}，已解锁 ${MILES.filter(m=>since>=m.t).length}/${MILES.length} 个恢复节点。`;
  $('#timeline').innerHTML=MILES.map(m=>{
    const pct=Math.min(100,since/m.t*100);
    return `<div class="mile ${pct>=100?'done':''}"><div class="ic">${m.ic}</div><div style="flex:1"><div class="t">${m.label}${pct>=100?' · 已达成':''}</div><div class="d">${m.d}</div><div class="bar"><i style="width:${pct.toFixed(1)}%"></i></div></div></div>`;
  }).join('');
  const a=avoided(), r=resists().length;
  const B=[
    ['🌅','无烟 24h',since>=DAY],['🔥','无烟 3 天',since>=3*DAY],['🏅','无烟 1 周',since>=7*DAY],['🏆','无烟 1 月',since>=30*DAY],
    ['✋','忍住 1 次',r>=1],['🛡️','忍住 10 次',r>=10],['💰','省下 ¥100',a*perCig()>=100],['⏳','夺回 1 天',a*LIFE_PER_CIG>=1440]
  ];
  $('#badges').innerHTML=B.map(([i,l,g])=>`<div class="badge ${g?'got':''}"><div class="b">${i}</div>${l}</div>`).join('');
}

/* ---------- 急救方法推荐 ---------- */
// 个人效果：有帮助 +2、一般 +0.5、没帮助 −1.5；挺过去 +0.5、抽了 −0.5；同一场景的记录权重 ×1.5
function methodStats(id,trigger){
  let score=0,good=0,n=0;
  S.sos.forEach(s=>{
    if(s.method!==id||!s.rating) return;
    const w=trigger&&s.trigger===trigger?1.5:1;
    score+=w*({good:2,ok:.5,bad:-1.5}[s.rating]+(s.outcome==='resist'?.5:s.outcome==='smoke'?-.5:0));
    if(s.rating==='good') good++; n++;
  });
  return {score,good,n};
}
function recommend(trigger,intensity=3){
  return Object.entries(METHODS).map(([id,m])=>{
    const fitTrig=m.fit==='*'?1:(trigger&&m.fit.includes(trigger)?3:0);
    const fitLv=intensity>=m.lv[0]&&intensity<=m.lv[1]?2:-2;
    const st=S.consent?methodStats(id,trigger):{score:0,good:0,n:0};
    const reason = st.good ? `对你有帮助过 ${st.good} 次`+(fitTrig===3?` · 适合「${trigger}」`:'')
      : fitTrig===3 ? `适合「${trigger}」的场景` : `适合渴求 ${intensity}/5 的时候`;
    return {id,score:fitTrig+fitLv+st.score,reason,good:st.good};
  }).sort((a,b)=>b.score-a.score);
}

/* ---------- SOS：场景和强度 → 动作 → 结果 → 评价 ---------- */
let bTimer=0,cdTimer=0,sosCur=null;
function sosStep(s){$('#sosAsk').hidden=s!=='ask';$('#sosDo').hidden=s!=='do';$('#sosDone').hidden=s!=='done';$('#sos').scrollTop=0}
function openSOS(trig){
  chipGroup($('#sosTrig'),TRIGGERS);
  const pre=trig||personalTrigger();
  if(pre) chipSet($('#sosTrig'),pre);
  $('#sosLv').innerHTML=[1,2,3,4,5].map(i=>`<button data-v="${i}" ${i===3?'class="on"':''}>${i}</button>`).join('');
  segBind($('#sosLv'));
  sosStep('ask');show('#sos');
}
$('#sosBtn').onclick=()=>openSOS();
$('#sosGo').onclick=()=>{
  const trigger=chipVal($('#sosTrig'))[0]||null, intensity=+$('#sosLv .on').dataset.v;
  sosCur={trigger,intensity,list:recommend(trigger,intensity).slice(0,4),idx:0};
  runMethod();sosStep('do');
};
$('#sosSwap').onclick=()=>{sosCur.idx=(sosCur.idx+1)%sosCur.list.length;runMethod()};
function runMethod(){
  stopTimers();
  const r=sosCur.list[sosCur.idx], m=METHODS[r.id];
  $('#sosCtx').textContent=`${sosCur.trigger||'未选场景'} · 渴求 ${sosCur.intensity}/5 · 办法 ${sosCur.idx+1}/${sosCur.list.length}`;
  $('#sosName').textContent=m.name;
  $('#sosWhy').textContent=r.reason;
  $('#sosDesc').textContent=m.desc;
  $('#sosBreath').hidden=r.id!=='breath';
  if(r.id==='breath') startBreath();
  let left=m.sec;
  const cd=()=>{
    $('#sosLeft').textContent=left>0?`${Math.floor(left/60)}:${String(left%60).padStart(2,'0')}`:'时间到';
    $('#sosBar').style.width=((m.sec-left)/m.sec*100)+'%';
    if(left--<=0){clearTimeout(bTimer);$('#breathTxt').innerHTML='做完了<small>现在感觉怎么样？</small>';return}
    cdTimer=setTimeout(cd,1000);
  };
  cd();
}
function startBreath(){
  const orb=$('#orb'),txt=$('#breathTxt');
  const phases=[['吸气',4,1],['屏住',4,1],['呼气',6,.55]];
  let i=0;
  const step=()=>{const [l,s,sc]=phases[i%3];txt.innerHTML=`${l}<small>${s} 秒</small>`;orb.style.transitionDuration=s+'s';orb.style.transform=`scale(${sc})`;i++;bTimer=setTimeout(step,s*1000)};
  step();
}
function stopTimers(){clearTimeout(bTimer);clearTimeout(cdTimer)}
function sosEnd(outcome){
  stopTimers();
  const r=sosCur.list[sosCur.idx];
  const rec={id:uid(),t:Date.now(),trigger:sosCur.trigger,intensity:sosCur.intensity,method:r.id,outcome,rating:null};
  S.sos.push(rec);
  addEvent({type:outcome,t:rec.t,trigger:sosCur.trigger,intensity:sosCur.intensity,via:'sos',sosId:rec.id});
  sosCur.rec=rec;
  $('#sosDoneTitle').textContent=outcome==='resist'?'你挺过去了 🎉':'没关系，这一根已经记下';
  $('#sosDoneSub').textContent=outcome==='resist'
    ?`又一次证明这股冲动会过去。累计忍住 ${resists().length} 次。`
    :`一次复吸不会让你从零开始：累计少抽约 ${Math.floor(avoided())} 根、忍住 ${resists().length} 次，这些都还在。`;
  $('#sosRateQ').textContent=`刚才的「${METHODS[r.id].name}」对你有帮助吗？`;
  $$('#sosRate button').forEach(b=>b.classList.remove('on'));
  $('#sosNext').hidden=true;
  sosStep('done');renderAll();
}
$('#sosWin').onclick=()=>sosEnd('resist');
$('#sosLose').onclick=()=>sosEnd('smoke');
$('#sosRate').onclick=e=>{
  const b=e.target.closest('button'); if(!b||!sosCur||!sosCur.rec) return;
  $$('#sosRate button').forEach(x=>x.classList.toggle('on',x===b));
  sosCur.rec.rating=b.dataset.v; save();
  $('#sosNext').innerHTML=`<b>下一步</b>${esc(sosNextStep(sosCur.rec))}`;
  $('#sosNext').hidden=false; renderBuddy();
};
function sosNextStep(rec){
  const m=METHODS[rec.method].name, where=rec.trigger?`「${rec.trigger}」`:'想抽';
  const alt=recommend(rec.trigger,rec.intensity).find(x=>x.id!==rec.method);
  const altName=alt?METHODS[alt.id].name:'慢呼吸 5 轮';
  if(rec.outcome==='resist') return rec.rating==='good'
    ?`记住它：下次${where}时，直接用「${m}」。我会优先推荐它。`
    :`能挺过去已经很好。下次${where}时可以试试「${altName}」，看看哪个更适合你。`;
  return rec.rating==='bad'
    ?`这个办法这次没用，下次换「${altName}」试试。也可以想想，能不能在${where}之前就提前避开？`
    :`计时会重新开始，但你的累计记录不变。下次${where}时，提前 5 分钟做「${m}」，别等冲动到顶。`;
}
$('#sosFinish').onclick=hide;

/* ---------- 陪伴：周报 ---------- */
function weekDays(){
  return [...Array(7)].map((_,i)=>{
    const d0=dayStart(Date.now(),i-6), d1=dayStart(Date.now(),i-5);
    return {d0,d1,active:d1>S.start,
      smoke:smokes().filter(e=>inRange(e,d0,d1)).length,
      resist:resists().filter(e=>inRange(e,d0,d1)).length,
      target:targetFor(d0)};
  });
}
function renderBuddy(){
  const days=weekDays(), w0=days[0].d0;
  const max=Math.max(S.base,...days.map(d=>d.smoke),1);
  const y=v=>v/max*100;
  $('#weekLegend').innerHTML=`<i class="lg base"></i>基线 ${S.base}`+(S.mode==='reduce'?` <i class="lg tgt"></i>目标`:'');
  $('#week').innerHTML=`<div class="plot">
      <div class="ref base" style="bottom:${y(S.base)}%"></div>
      ${days.map(d=>{
        const dd=new Date(d.d0), ok=d.smoke<=d.target;
        const tgt=S.mode==='reduce'&&d.active?`<i class="ref tgt" style="bottom:${y(d.target)}%"></i>`:'';
        return `<div class="col${d.active?'':' off'}">${tgt}<em style="bottom:calc(${y(d.smoke)}% + 2px)">${d.active?d.smoke:''}</em><i class="b ${ok?'ok':''}" style="height:${d.active?Math.max(1.5,y(d.smoke)):0}%"></i></div>`;
      }).join('')}
    </div>
    <div class="xlab">${days.map(d=>{const dd=new Date(d.d0);return `<span>${dayKey(d.d0)===dayKey(Date.now())?'今天':'周'+'日一二三四五六'[dd.getDay()]}</span>`}).join('')}</div>`;
  const wk=days.reduce((a,d)=>a+d.smoke,0), wr=days.reduce((a,d)=>a+d.resist,0);
  const sosW=S.sos.filter(s=>s.t>=w0&&s.outcome), sosOk=sosW.filter(s=>s.outcome==='resist').length;
  const less=avoidedBetween(w0,Date.now());
  $('#kpis').innerHTML=`<div><b>${wk}</b><span>抽了（根）</span></div><div><b>${Math.floor(less)}</b><span>比基线少（估算）</span></div><div><b>${wr}</b><span>忍住（次）</span></div><div><b>${sosW.length?sosOk+'/'+sosW.length:'—'}</b><span>急救挺过去</span></div>`;
  const activeDays=days.filter(d=>d.active).length;
  const metDays=days.filter(d=>d.active&&d.smoke<=d.target).length;
  $('#weekNote').textContent=`统计范围：最近 ${activeDays} 天（${new Date(days.find(d=>d.active)?.d0||w0).getMonth()+1}月${new Date(days.find(d=>d.active)?.d0||w0).getDate()}日起）。`
    +(S.mode==='reduce'?`其中 ${metDays} 天在目标之内；`:`其中 ${metDays} 天无烟；`)
    +`"比基线少"= 基线 ${S.base} 根/天 × 天数 − 实际记录。`;
  renderNextWeek(); renderMethods(); renderTriggers();
}
function renderNextWeek(){
  const box=$('#nextWeek');
  if(S.plan){
    const p=S.plan, m=METHODS[p.method];
    const used=S.sos.filter(s=>s.t>=p.t&&s.method===p.method), ok=used.filter(s=>s.outcome==='resist').length;
    box.innerHTML=`<p class="plan-line">当前计划：在「<b>${esc(p.trigger)}</b>」时先做「<b>${m.name}</b>」</p>
      <div class="kpis" style="margin-top:8px"><div><b>${Math.floor((Date.now()-p.t)/DAY)+1}</b><span>计划第几天</span></div><div><b>${used.length}</b><span>用过（次）</span></div><div><b>${used.length?ok+'/'+used.length:'—'}</b><span>用后挺过去</span></div></div>
      <button class="link" id="planClear">换一个计划</button>`;
    $('#planClear').onclick=()=>{S.plan=null;save();renderNextWeek();renderPlan()};
    return;
  }
  if(!S.consent){box.innerHTML='<p class="hint">个性化已关闭，可在设置中开启。</p>';return}
  const since=Date.now()-14*DAY;
  const tt=topTriggers(since); const smokeT={};
  smokes().forEach(e=>{if(e.trigger&&e.t>=since)smokeT[e.trigger]=(smokeT[e.trigger]||0)+1});
  const trig=(Object.entries(smokeT).sort((a,b)=>b[1]-a[1])[0]||tt[0]||[])[0];
  if(!trig){box.innerHTML='<p class="hint">记录几次抽烟或急救的场景后，这里会给出一条具体的建议。</p>';return}
  const n=smokeT[trig]||0;
  const lvs=S.sos.filter(s=>s.trigger===trig).map(s=>s.intensity);
  const lv=lvs.length?Math.round(lvs.reduce((a,b)=>a+b,0)/lvs.length):3;
  const r=recommend(trig,lv)[0], m=METHODS[r.id];
  box.innerHTML=`<p class="plan-line">${n?`最近两周，「<b>${esc(trig)}</b>」是你抽烟最多的场景（${n} 次）。`:`「<b>${esc(trig)}</b>」是你最常想抽的场景。`}下周每次${esc(trig)}想抽时，先做：</p>
    <div class="tip plan-card"><b>${m.name}</b>${m.desc}<span class="why">${r.reason}</span></div>
    <button class="btn primary small" id="planAdd" style="margin-top:10px">加入下周计划</button>`;
  $('#planAdd').onclick=()=>{S.plan={t:Date.now(),trigger:trig,method:r.id};save();renderNextWeek();renderPlan();toast('已加入计划，今天的预案也会跟着更新')};
}
function renderMethods(){
  const rows=Object.keys(METHODS).map(id=>{
    const xs=S.sos.filter(s=>s.method===id&&s.rating);
    return {id,n:xs.length,good:xs.filter(s=>s.rating==='good').length,ok:xs.filter(s=>s.rating==='ok').length};
  }).filter(r=>r.n).sort((a,b)=>b.good/b.n-a.good/a.n||b.n-a.n);
  $('#methodBars').innerHTML=rows.length?rows.slice(0,6).map(r=>`
    <div class="mrow"><span class="mname">${METHODS[r.id].name}</span>
      <div class="track"><i class="g" style="width:${r.good/r.n*100}%"></i><i class="o" style="width:${r.ok/r.n*100}%"></i></div>
      <span class="n">${r.good}/${r.n}</span></div>`).join('')
    +'<p class="foot" style="margin:8px 0 0">绿色 = 评价"有帮助"，灰色 = "一般"；右侧为 有帮助/评价次数。</p>'
    :'<p class="hint">完成几次「想抽了」急救并评价后，这里会显示对你最有效的方法。</p>';
}
function renderTriggers(){
  const tt=topTriggers();
  $('#triggerBars').innerHTML = !S.consent ? '<p class="hint">你关闭了个性化分析，可在设置中开启。</p>' :
    tt.length ? tt.slice(0,6).map(([k,n])=>`<div class="hbar"><span>${esc(k)}</span><div class="track"><i style="width:${n/tt[0][1]*100}%"></i></div><span class="n">${n}</span></div>`).join('')
    +'<p class="foot" style="margin:8px 0 0">统计全部记录中带场景的抽烟和忍住次数。</p>'
    : '<p class="hint">还没有足够的记录。记录时选上场景，我会帮你归纳。</p>';
}

/* ---------- 陪伴：本地规则对话 ---------- */
const QUICK=['我现在很想抽','我压力好大','我又抽了','我的进度怎么样','戒烟后身体会怎样','能推荐戒烟药吗'];
$('#quick').innerHTML=QUICK.map(q=>`<button>${q}</button>`).join('');
$('#quick').onclick=e=>{if(e.target.tagName==='BUTTON')userSay(e.target.textContent)};
$('#composer').onsubmit=e=>{e.preventDefault();const v=$('#chatInput').value.trim();if(!v)return;$('#chatInput').value='';userSay(v)};
function renderChat(){
  $('#chat').innerHTML=S.chat.map(m=>`<div class="msg ${m.r}${m.warn?' warn':''}${m.typing?' typing':''}">${esc(m.x)}${m.act?`<br><button class="act" data-act="${m.act}">${m.actLabel}</button>`:''}</div>`).join('');
  $('#chat').scrollTop=1e6;
}
$('#chat').onclick=e=>{const a=e.target.dataset.act;if(a==='sos')openSOS();if(a==='log')openLog('smoke',false);if(a==='lab')goTab('cig');if(a==='heal')goTab('heal')};
function agentSay(x,opt={}){S.chat.push(Object.assign({r:'ai',x},opt));S.chat=S.chat.slice(-60);save();renderChat()}
function userSay(x){
  const r=reply(x);
  const history=aiHistory();   // 发送给 AI 的上下文不含这条，下面单独追加
  S.chat.push({r:'me',x});renderChat();
  if(r.warn||!aiActive()){setTimeout(()=>agentSay(r.x,r),400);return}
  aiSay(r,[...history,{role:'user',content:x}]);
}
function welcomeMsg(){
  return `你好${S.name?'，'+S.name:''}！我是你的戒烟伙伴。\n你的目标是「${S.mode==='quit'?'彻底戒烟':'逐步减量'}」，基线每天 ${S.base} 根。\n想抽的时候点右下角「想抽了」；抽了也没关系，记下来，我们一起找规律。`;
}
function reply(x){
  const has=re=>re.test(x);
  // safety boundaries first
  if(has(/自杀|不想活|轻生|结束生命|想死|活着没意思|活不下去|伤害自己|自残|割腕/)) return {x:'听到你这么说我很担心你。你不需要一个人扛着——请现在联系身边信任的人，或拨打全国心理援助热线 12356；如有紧急危险请拨打 120 / 110。我会一直在这里。',warn:true};
  if(has(/胸痛|胸闷|胸口.{0,4}(痛|疼|闷|紧|压)|心口.{0,3}(痛|疼)|心脏.{0,3}(痛|疼|难受)|呼吸困难|喘不上|喘不过|透不过气|晕倒|昏|心悸|咳血|吐血/)) return {x:'这些症状需要专业判断，我不能替你做诊断。如果症状严重或突然出现，请立即拨打 120 或前往急诊。',warn:true};
  if(has(/药|贴片|尼古丁贴|口香糖|伐尼克兰|安非他酮|电子烟|加热烟/)) return {x:'戒烟药物和尼古丁替代疗法确实能提高成功率，但是否适合你、怎么用、用多少，需要医生根据你的情况判断，我不提供用药建议。你可以去医院戒烟门诊，或拨打 12320 卫生热线咨询。\n另外，电子烟和加热烟并非无害，不建议当作戒烟手段自行替代。',warn:true};
  if(has(/保证|一定能|多久能戒|会不会得癌|得癌|能活多久/)) return {x:'我没法承诺结果，每个人情况不同。我能确定的是：从停下的那一刻起，身体就开始修复，越早越好。要不要看看你已经解锁的恢复节点？',act:'heal',actLabel:'查看恢复进度'};
  // intents
  const trig=personalTrigger();
  if(has(/想抽|好想|忍不住|馋|渴|受不了/)) return {x:`这股冲动通常几分钟内就会减弱。我们一起做一轮呼吸，好吗？${trig?`\n我注意到你常在「${trig}」时想抽，这次也是吗？`:''}`,act:'sos',actLabel:'开始 1 分钟呼吸'};
  if(has(/压力|焦虑|烦|累|崩溃|加班/)) return {x:`压力大时想抽烟很正常——尼古丁让人"感觉"放松，其实是在缓解戒断本身。\n试试：${STRATEGY['压力'].join('；')}。\n想要我陪你做呼吸练习吗？`,act:'sos',actLabel:'陪我呼吸'};
  if(has(/又抽|抽了|复吸|没忍住|失败/)) return {x:'没关系，一次不等于失败。大多数成功戒烟的人都经历过几次反复。\n记下这一根和当时的场景，它不会清零你的累计进度。我会帮你找出规律，下次提前准备。',act:'log',actLabel:'记录这一根'};
  if(has(/进度|怎么样|多少|成绩|统计/)){const a=avoided();return {x:`目前的成果：\n· 比基线少抽约 ${Math.floor(a)} 根（估算）\n· 省下 ¥${(a*perCig()).toFixed(0)}\n· 夺回约 ${fmtLife(a*LIFE_PER_CIG).join(' ')}（统计估算）\n· 成功抵抗 ${resists().length} 次\n${trig?`你的高频诱因是「${trig}」。`:''}继续保持！`}}
  if(has(/身体|好处|改善|恢复|变化/)){const nx=MILES.find(m=>m.t>Date.now()-lastSmoke());return {x:`${nx?`你的下一个恢复节点是「${nx.label}：${nx.d}」。`:''}想直观看看一根烟对身体做了什么、少抽一根又换来什么吗？`,act:'lab',actLabel:'打开「一根烟」'}}
  if(has(/饭|吃完/)) return {x:'饭后一根是最常见的习惯之一。试试：'+STRATEGY['饭后'].join('；')+'。'};
  if(has(/酒|喝/)) return {x:'酒精会降低自控力，是复吸的高风险场景。'+STRATEGY['喝酒'].join('；')+'。'};
  if(has(/咖啡|茶/)) return {x:STRATEGY['咖啡/茶'].join('；')+'。'};
  if(has(/朋友|同事|递烟|聚会|社交/)) return {x:STRATEGY['社交'].join('；')+'。'};
  if(has(/无聊|没事/)) return {x:STRATEGY['无聊'].join('；')+'。'};
  if(has(/胖|体重/)) return {x:'戒烟后体重增加比较常见。可以准备低热量零食（黄瓜、小番茄），多走动。如果担心体重，建议咨询营养或医生，我不做具体的饮食处方。'};
  if(has(/谢|好的|嗯|ok/i)) return {x:'随时在。每一根没点燃的烟，都算数。'};
  return {x:`我在听。能说说此刻是什么场景吗？比如${TRIGGERS.slice(0,4).join('、')}……知道场景后我能给你更具体的办法。`};
}


/* ---------- AI 陪伴 ----------
 * 两种来源：本机直连（js/config.local.js 里的 Key，已被 .gitignore 忽略）优先；
 * 否则走线上转发服务（js/ai-config.js 里的地址，Key 只存在云函数里）。 */
const AI = (()=>{
  const c=window.MEIYIGEN_AI;
  if(c&&c.key&&!/填/.test(c.key)) return Object.assign({mode:'local'},c);
  const p=window.MEIYIGEN_PROXY;
  return p&&p.url?Object.assign({mode:'proxy'},p):null;
})();
function aiProfile(){
  const best=Object.keys(METHODS).map(id=>({id,...methodStats(id,null)})).filter(m=>m.good).sort((a,b)=>b.good-a.good)[0];
  return {mode:S.mode,base:S.base,target:targetFor(Date.now()),day:dayNo(),avoided:Math.floor(avoided()),resists:resists().length,
    trigger:S.consent?personalTrigger():null,best:S.consent&&best?METHODS[best.id].name:null};
}
// AI 默认开启；用户在设置里关掉后记住这个选择
const aiActive = () => !!(AI&&(S.aiAsked?S.aiOn:true));
function aiSystemPrompt(){
  const trig=personalTrigger(), best=Object.keys(METHODS).map(id=>({id,...methodStats(id,null)})).filter(m=>m.good).sort((a,b)=>b.good-a.good)[0];
  const ck=S.checkins[dayKey(Date.now())];
  return `你是「每一根」戒烟 App 里的陪伴伙伴，用简体中文聊天。
风格：温暖、具体、不说教，像懂行的朋友。每次 2–4 句，口语化，不用 Markdown 标题和列表符号。
原则：
- 用户想抽时，先接住情绪，再给一个马上能做的小动作；可以提醒他点右下角「想抽了」做急救。
- 用户抽了，不批评。强调累计进度不会清零，帮他看清当时的场景和下次怎么提前准备。
- 不做医学诊断，不给药物或尼古丁替代品的用法用量，建议去戒烟门诊或拨打 12320。
- 不承诺"一定能戒掉"，不推荐电子烟、加热烟作为替代。
- 如果用户提到身体不适（胸痛、呼吸困难等），请他立即就医或拨打 120；提到自伤或不想活，请他联系身边的人或拨打心理援助热线 12356，紧急时拨打 120 / 110。
用户情况（自然地用，不要逐条复述）：
- 目标：${S.mode==='quit'?'彻底戒烟':'逐步减量'}，基线每天 ${S.base} 根；今天目标 ≤ ${targetFor(Date.now())} 根
- 第 ${dayNo()} 天；累计比基线少抽约 ${Math.floor(avoided())} 根；忍住 ${resists().length} 次
${S.consent&&trig?`- 最常见的诱因：${trig}\n`:''}${S.consent&&best?`- 对他最有效的急救方法：${METHODS[best.id].name}（有帮助 ${best.good} 次）\n`:''}${ck?`- 今天打卡：心情 ${ck.mood+1}/5，渴求 ${ck.crave}/5\n`:''}`;
}
function aiHistory(){
  const msgs=[];
  for(const m of S.chat.filter(m=>!m.typing).slice(-16)){
    const role=m.r==='me'?'user':'assistant';
    if(!msgs.length&&role!=='user') continue;
    const last=msgs[msgs.length-1];
    if(last&&last.role===role) last.content+='\n'+m.x; else msgs.push({role,content:m.x});
  }
  return msgs;
}
let aiBusy=false, aiFailNoted=false;
async function aiSay(local,messages){
  if(aiBusy){setTimeout(()=>agentSay(local.x,local),400);return}
  aiBusy=true;
  const m={r:'ai',x:'正在输入…',typing:true};
  S.chat.push(m);renderChat();
  try{
    // 线上转发只发聊天内容和几项统计数字，系统提示词由服务端拼
    const req=AI.mode==='proxy'
      ? {headers:{'content-type':'application/json'},body:{messages:messages.slice(-10),profile:aiProfile()}}
      : {headers:{'content-type':'application/json','authorization':'Bearer '+AI.key},
         body:Object.assign({model:AI.model,stream:true,max_tokens:800,messages:[{role:'system',content:aiSystemPrompt()},...messages]},AI.extra||{})};
    let res;
    try{res=await fetch(AI.url,{method:'POST',headers:req.headers,body:JSON.stringify(req.body)})}
    catch(e){throw new Error('连不上 AI 服务，请检查网络')}
    if(!res.ok){
      const t=await res.text().catch(()=>''); let msg='';
      try{const j=JSON.parse(t);msg=j.error||j.Message}catch(e){}
      if(typeof msg!=='string') msg=msg&&msg.message||'';
      throw new Error(msg||`HTTP ${res.status}`+(/api.?key|invalid|unauth/i.test(t)?'，Key 无效或已撤销':''));
    }
    const reader=res.body.getReader(), dec=new TextDecoder();
    let buf='', text='';
    for(;;){
      const {done,value}=await reader.read(); if(done) break;
      buf+=dec.decode(value,{stream:true});
      const lines=buf.split('\n'); buf=lines.pop();
      for(const line of lines){
        if(!line.startsWith('data:')) continue;
        const data=line.slice(5).trim(); if(data==='[DONE]') continue;
        let ev; try{ev=JSON.parse(data)}catch(e){continue}
        const d=ev.choices&&ev.choices[0]&&ev.choices[0].delta&&ev.choices[0].delta.content;
        if(d){text+=d;m.x=text.replace(/^\s+/,'');m.typing=false;renderChat()}
      }
    }
    if(!text.trim()) throw new Error('没有收到回复');
    m.x=text.trim();
    // 本地意图识别出的快捷按钮（呼吸练习、记录这一根等）继续挂在 AI 回复后面
    if(local.act){m.act=local.act;m.actLabel=local.actLabel}
  }catch(e){
    // AI 连不上时安静地用本地回复；每次打开页面最多提示一次
    Object.assign(m,{x:local.x+(aiFailNoted?'':'\n\n（AI 暂时连不上，先用本地回复）'),act:local.act,actLabel:local.actLabel});
    aiFailNoted=true;
    console.warn('AI 回复失败：',e.message);
  }finally{
    delete m.typing; aiBusy=false; S.chat=S.chat.slice(-60); save(); renderChat();
  }
}

/* ---------- 设置与隐私 ---------- */
function renderSettings(){
  $('#sConsent').checked=S.consent;
  $('#sAiRow').hidden=!AI;
  if(AI){$('#sAi').checked=aiActive();$('#sAiTag').textContent=AI.mode==='local'?'仅本机':'Beta';$('#sAiSub').textContent=`使用 ${AI.name} 生成聊天回复。开启后，聊天内容和你的统计摘要会${AI.mode==='proxy'?'经本项目的服务器转发':'发送'}给 ${AI.name}`}
  $('#demoTitle').textContent=S.demo?'重置演示数据':'载入演示数据';
  $('#demoSub').textContent=S.demo?'恢复到初始的模拟数据':'用模拟数据替换当前记录';
  renderPrivacy(); armReset(false); applyTheme();
}
function renderPrivacy(){
  const ai=aiActive();
  $('#pIcon').classList.toggle('ai',ai);
  $('#pTitle').textContent=ai?'记录在本机，聊天会发送给 AI':'数据只保存在这台设备上';
  $('#pSub').textContent=ai?`已开启 AI 陪伴，聊天内容会发送给 ${AI.name}`:'不注册、不上传，应用不会把记录发送出去';
  $('#pAiLine').textContent=ai
    ?`AI 陪伴已开启：你在「陪伴」里发的消息，以及统计摘要（坚持天数、少抽支数、常见诱因），会${AI.mode==='proxy'?'经本项目的服务器（不记录聊天内容）转发':'发送'}给 ${AI.name} 生成回复。其他记录不会发送。关闭后立即停止。`
    :'陪伴对话由本地规则生成，不经过任何服务器。';
  $('#chatHint').textContent=ai?`AI 回复（${AI.name}）· 消息会${AI.mode==='proxy'?'经本项目服务器转发':'发送'}给 ${AI.name} · 可在设置中关闭 · 不做诊断`:'本地规则回复 · 对话不会发送到任何服务器 · 不做诊断';
}
$('#openSettings').onclick=()=>{renderSettings();show('#settings')};
$('#sClose').onclick=hide;
segBind($('#themeSeg'),v=>{S.theme=v;save();applyTheme()});
$('#sConsent').onchange=e=>{S.consent=e.target.checked;save();renderAll()};
$('#sAi').onchange=e=>{S.aiOn=e.target.checked;S.aiAsked=true;save();renderPrivacy();toast(S.aiOn?`已开启 AI 陪伴（${AI.name}）`:'已关闭 AI 陪伴，改用本地回复')};
$('#sAbout').onclick=hide;
// 页面里不能用 confirm()，危险操作改为"再点一次确认"
let resetArmed=0;
function armReset(on){
  clearTimeout(resetArmed); const b=$('#resetBtn');
  b.querySelector('b').textContent=on?'再点一次，确认清除':'清除全部数据';
  b.querySelector('small').textContent=on?'4 秒内再点一次才会执行':'删除这台设备上的所有记录，无法恢复';
  b.classList.toggle('armed',on);
  resetArmed=on?setTimeout(()=>armReset(false),4000):0;
}
$('#resetBtn').onclick=()=>{
  if(!$('#resetBtn').classList.contains('armed')){armReset(true);return}
  armReset(false);
  try{localStorage.removeItem(KEY)}catch(e){}
  const theme=S.theme; S=blank(); S.theme=theme; applyTheme();
  hide(); renderAll(); openWelcome(true); toast('已清除这台设备上的全部数据');
};
let demoArmed=0;
$('#demoBtn').onclick=()=>{
  if(!S.demo&&S.setup&&S.events.length&&!demoArmed){
    $('#demoTitle').textContent='再点一次，用演示数据替换';$('#demoSub').textContent='你现在的记录会被覆盖';
    demoArmed=setTimeout(()=>{demoArmed=0;renderSettings()},4000);return;
  }
  clearTimeout(demoArmed);demoArmed=0; loadDemo(); hide(); toast('已载入演示数据');
};
$('#demoReset').onclick=()=>{loadDemo();toast('演示数据已重置')};
$('#demoExit').onclick=()=>openWelcome(true);

/* ---------- 演示数据（确定性生成，可重置） ---------- */
function rng(seed){return ()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function loadDemo(){
  const R=rng(20261029), pick=a=>a[Math.floor(R()*a.length)], now=Date.now();
  const keep={theme:S.theme,aiOn:S.aiOn,aiAsked:S.aiAsked};
  S=Object.assign(blank(),keep,{setup:true,demo:true,name:'小林',mode:'reduce',base:15,price:25,brand:'中华(硬)',why:['健康','家人']});
  const D=12; S.start=dayStart(now,-D)+8*HOUR;
  S.plan={t:dayStart(now,-5)+20*HOUR,trigger:'饭后',method:'brush'};
  const trigW=['饭后','饭后','饭后','压力','压力','压力','咖啡/茶','社交','喝酒','无聊','起床'];
  const best={'饭后':'brush','压力':'breath','咖啡/茶':'mint','社交':'script','喝酒':'script','无聊':'hands','起床':'water'};
  const others={'饭后':['water','walk'],'压力':['walk','surf'],'咖啡/茶':['water','hands'],'社交':['walk'],'喝酒':['text','walk'],'无聊':['squats','water'],'起床':['breath','walk']};
  for(let d=D;d>=0;d--){
    const d0=dayStart(now,-d);
    const tgt=targetFor(d0);
    let n=Math.max(0,Math.round(tgt-3.2+R()*3));
    if(d===0) n=Math.min(n,2);
    for(let i=0;i<n;i++){
      const t=d0+(8.5+R()*14)*HOUR; if(t>now||t<S.start) continue;
      addEvent({type:'smoke',t,trigger:pick(trigW),via:'quick'});
    }
    const k=d===0?1:1+Math.floor(R()*3);
    for(let j=0;j<k;j++){
      const t=d0+(9+R()*13)*HOUR; if(t>now-20*MIN||t<S.start) continue;
      const trig=pick(trigW), intensity=2+Math.floor(R()*4);
      const useBest=R()<.6||(trig==='饭后'&&t>=S.plan.t), method=useBest?best[trig]:pick(others[trig]);
      const outcome=R()<(useBest?.8:.5)+(d<6?.05:0)?'resist':'smoke';
      const rating=useBest?(R()<.8?'good':'ok'):pick(['ok','bad','good','ok']);
      const rec={id:uid(),t,trigger:trig,intensity,method,outcome,rating};
      S.sos.push(rec);
      addEvent({type:outcome,t,trigger:trig,intensity,via:'sos',sosId:rec.id});
    }
    if(R()<.3) {const t=d0+(10+R()*10)*HOUR; if(t<now&&t>S.start) addEvent({type:'resist',t,trigger:pick(trigW),via:'quick'})}
    if(d%5!==3) S.checkins[dayKey(d0)]={mood:Math.min(4,1+Math.floor(R()*3)+(d<6?1:0)),crave:Math.max(1,5-Math.floor((D-d)/4)-Math.floor(R()*2))};
  }
  S.sos.sort((a,b)=>a.t-b.t);
  S.chat=[
    {r:'ai',x:welcomeMsg()},
    {r:'me',x:'昨天加班又抽多了'},
    {r:'ai',x:'压力大时想抽烟很正常。昨天超了也没关系，你这周累计还是比基线少了不少。\n这周你在「压力」时用「慢呼吸」挺过去的次数最多，下次加班前可以先做一轮。',act:'sos',actLabel:'开始 1 分钟呼吸'}
  ];
  save(); setBrand(S.brand); renderAll(); renderChat(); goTab('today');
}

/* ---------- 项目介绍（#about） ---------- */
function route(){
  const about=location.hash==='#about';
  document.body.classList.toggle('about-mode',about);
  $('#aboutView').hidden=!about;
  if(about){hide(true);window.scrollTo({top:0})}
}
$$('#aboutView a[href="#"]').forEach(a=>a.onclick=e=>{e.preventDefault();history.replaceState(null,'',location.pathname);route();if(!S.setup)openWelcome(false)});
window.addEventListener('hashchange',route);

/* ---------- boot ---------- */
function renderAll(){
  $('#demoBar').hidden=!S.demo;
  renderToday(); renderHeal(); renderBuddy(); calc();
}
applyTheme();
// 首次打开：背后是空白的正式版界面，弹出欢迎卡片设定目标；演示数据只在设置里手动载入
const firstVisit=!S.setup;
setBrand(S.brand); renderAll(); renderChat();
setInterval(tick,1000);
renderPrivacy();
route();
if(firstVisit && location.hash!=='#about') setTimeout(()=>openWelcome(false),350);
})();
