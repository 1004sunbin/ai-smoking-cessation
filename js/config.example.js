// AI 陪伴配置示例。使用方法：复制本文件为 js/config.local.js，把 key 换成你自己的。
// js/config.local.js 已被 .gitignore 忽略，不会提交到 GitHub；线上版没有这个文件，会自动使用本地规则回复。
// 任何 OpenAI 兼容接口都可以（需要允许浏览器直接调用），默认是 Google Gemini 的免费模型。
window.MEIYIGEN_AI = {
  name: 'Gemini',
  url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
  model: 'gemini-2.5-flash',
  key: '在这里填你的 API Key',
  extra: { reasoning_effort: 'none' }   // 关掉思考，回复更快
};
