// ===== 浮生牌 · AI 接口层 =====
import { API_PROVIDERS } from './data.js';

function buildRequest(provider, model, messages, options = {}) {
  const { temperature = 0.7, maxTokens = 2000 } = options;
  const openaiCompatible = ['deepseek', 'qwen', 'openai', 'kimi', 'zhipu', 'custom'];

  if (openaiCompatible.includes(provider)) {
    const info = API_PROVIDERS[provider];
    return {
      url: info.endpoint,
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${info.apiKey}` },
      body: { model: model || info.model, messages, max_tokens: maxTokens, temperature },
    };
  }
  if (provider === 'claude') {
    const info = API_PROVIDERS.claude;
    const systemMsg = messages.find(m => m.role === 'system');
    const userMessages = messages.filter(m => m.role !== 'system');
    return {
      url: info.endpoint,
      headers: { 'Content-Type': 'application/json', 'x-api-key': `${info.apiKey}`, 'anthropic-version': '2023-06-01' },
      body: { model: model || info.model, system: systemMsg?.content || '', messages: userMessages.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })), max_tokens: maxTokens },
    };
  }
  if (provider === 'gemini') {
    const info = API_PROVIDERS.gemini;
    const combinedText = messages.map(m => `${m.role}: ${m.content}`).join('\n\n');
    return {
      url: `${info.endpoint}?key=${info.apiKey}`,
      headers: { 'Content-Type': 'application/json' },
      body: { contents: [{ parts: [{ text: combinedText }] }], generationConfig: { maxOutputTokens: maxTokens, temperature } },
    };
  }
  throw new Error(`不支持的 AI 厂商: ${provider}`);
}

function parseResponse(provider, responseData) {
  if (['deepseek', 'qwen', 'openai', 'kimi', 'zhipu', 'custom'].includes(provider)) {
    if (!responseData.choices || !responseData.choices[0]) throw new Error('AI 返回了空的响应');
    return responseData.choices[0].message?.content || '';
  }
  if (provider === 'claude') {
    if (!responseData.content || !responseData.content[0]) throw new Error('AI 返回了空的响应');
    return responseData.content[0].text || '';
  }
  if (provider === 'gemini') {
    if (!responseData.candidates || !responseData.candidates[0]) {
      if (responseData.promptFeedback?.blockReason) throw new Error(`请求被安全策略拦截: ${responseData.promptFeedback.blockReason}`);
      throw new Error('AI 返回了空的响应');
    }
    const parts = responseData.candidates[0].content?.parts;
    if (!parts || parts.length === 0) throw new Error('AI 返回了空的响应');
    return parts.map(p => p.text || '').join('');
  }
  throw new Error(`不支持的 AI 厂商: ${provider}`);
}

function buildSystemPrompt(style = 'guide') {
  const base = `你是浮生牌占卜体系的解读者。你遵循以下原则：

1. 话不说死。卦不敢算尽，畏天道无常。永远给解读留有余地。
2. 不替人做决定。你只呈现可能性与视角，选择权永远在用户手中。
3. 不恐吓、不贩卖焦虑。即使牌面显示阻滞，也只如实描述，不夸大为灾祸。
4. 使用性别中立的语言。用"对方""伴侣"而非"男朋友/女朋友"，不做异性恋预设。
5. 不使用封建压迫词汇。不说"克夫""旺夫""命格高低"等词语。
6. 保持冷眼热心的调性：冷静分析，真诚关怀，不逢迎，不说车轱辘话。
7. 解读扎根于五行生克和九宫洛书体系，不引入星座、生命灵数等异文化符号。`;
  const styleAdditions = {
    guide: '\n\n你以温和引导者的口吻回应。多用"或许""不妨""值得留意"等留有余地的表达。',
    analyst: '\n\n你以冷静分析师的口吻回应。逻辑清晰、层次分明，直接给出多角度的结构化分析。',
    sharp: '\n\n你以犀利直言者的口吻回应。不绕弯子，直指核心，但在尖锐中保留善意。',
  };
  return base + (styleAdditions[style] || '');
}

export async function requestReading(config) {
  const { provider = 'deepseek', apiKey, endpoint, model, style = 'guide', prompt, temperature = 0.7, maxTokens = 2000 } = config;
  if (!apiKey && provider !== 'custom') throw new Error('请先在 AI 设置中填入 API Key');
  if (!prompt || prompt.trim() === '') throw new Error('解读数据不能为空');
  const providerConfig = { ...API_PROVIDERS[provider] };
  if (apiKey) providerConfig.apiKey = apiKey;
  if (endpoint && provider === 'custom') providerConfig.endpoint = endpoint;
  const systemPrompt = buildSystemPrompt(style);
  const messages = [{ role: 'system', content: systemPrompt }, { role: 'user', content: prompt }];
  const request = buildRequest(provider, model || providerConfig.model, messages, { temperature, maxTokens });

  let response;
  try { response = await fetch(request.url, { method: 'POST', headers: request.headers, body: JSON.stringify(request.body) }); }
  catch (e) { throw new Error(e.message === 'Failed to fetch' ? '网络请求失败，请检查网络连接或 API 地址是否正确。' : `请求发送失败: ${e.message}`); }

  if (!response.ok) {
    let errorDetail = '';
    try { errorDetail = (await response.text()).slice(0, 200); } catch (e) {}
    const statusMessages = { 401: 'API Key 无效或已过期，请检查设置。', 403: 'API 访问被拒绝，请检查 Key 权限或账户状态。', 429: '请求过于频繁，请稍后再试。', 500: 'AI 服务商服务器异常，请稍后重试。', 503: 'AI 服务暂时不可用，请稍后重试。' };
    throw new Error(statusMessages[response.status] || `AI 服务返回错误 (${response.status})` + (errorDetail ? ` 详细信息: ${errorDetail}` : ''));
  }

  let responseData;
  try { responseData = await response.json(); } catch (e) { throw new Error('无法解析 AI 返回的数据，请重试。'); }

  try { const text = parseResponse(provider, responseData); if (!text.trim()) throw new Error('AI 返回了空内容'); return text; }
  catch (e) { if (e.message.includes('安全策略') || e.message.includes('拦截')) throw e; throw new Error(`解读生成失败: ${e.message}`); }
}

export async function requestFollowUp(config) {
  const { history, provider = 'deepseek', apiKey, endpoint, model, temperature = 0.7, maxTokens = 1500 } = config;
  if (!apiKey && provider !== 'custom') throw new Error('请先在 AI 设置中填入 API Key');
  if (!history || history.length === 0) throw new Error('对话历史不能为空');
  const providerConfig = { ...API_PROVIDERS[provider] };
  if (apiKey) providerConfig.apiKey = apiKey;
  if (endpoint && provider === 'custom') providerConfig.endpoint = endpoint;
  const request = buildRequest(provider, model || providerConfig.model, history, { temperature, maxTokens });

  let response;
  try { response = await fetch(request.url, { method: 'POST', headers: request.headers, body: JSON.stringify(request.body) }); }
  catch (e) { throw new Error(e.message === 'Failed to fetch' ? '网络请求失败' : `请求发送失败: ${e.message}`); }

  if (!response.ok) {
    const statusMessages = { 401: 'API Key 无效或已过期。', 429: '请求过于频繁，请稍后再试。' };
    throw new Error(statusMessages[response.status] || `AI 服务返回错误 (${response.status})`);
  }

  let responseData;
  try { responseData = await response.json(); } catch (e) { throw new Error('无法解析 AI 返回的数据。'); }

  try { return parseResponse(provider, responseData); } catch (e) { throw new Error(`追问失败: ${e.message}`); }
}

export async function testApiConnection(config) {
  const { provider = 'deepseek', apiKey, endpoint, model } = config;
  if (!apiKey && provider !== 'custom') throw new Error('请先填写 API Key');
  const providerConfig = { ...API_PROVIDERS[provider] };
  if (apiKey) providerConfig.apiKey = apiKey;
  if (endpoint && provider === 'custom') providerConfig.endpoint = endpoint;
  const messages = [{ role: 'user', content: '请回复 OK' }];
  const request = buildRequest(provider, model || providerConfig.model, messages, { temperature: 0, maxTokens: 5 });

  let response;
  try { response = await fetch(request.url, { method: 'POST', headers: request.headers, body: JSON.stringify(request.body) }); }
  catch (e) { throw new Error(e.message === 'Failed to fetch' ? '网络请求失败，请检查网络或 API 地址。' : `请求发送失败: ${e.message}`); }

  if (!response.ok) {
    let errorDetail = '';
    try { errorDetail = (await response.text()).slice(0, 100); } catch (e) {}
    const statusMessages = { 401: 'API Key 无效或已过期。', 403: 'API 访问被拒绝。', 429: '请求过于频繁，请稍后再试。' };
    throw new Error(statusMessages[response.status] || `服务返回错误 (${response.status})` + (errorDetail ? ' ' + errorDetail : ''));
  }

  try { await response.json(); return '连接成功！API Key 有效。'; }
  catch (e) { throw new Error('无法解析响应，请检查 API 地址。'); }
}