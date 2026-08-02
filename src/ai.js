// ===== src/ai.js · AI请求层（OpenAI兼容协议 + 高级参数透传） =====
import { UI_TEXTS } from './texts/index.js';

const DEFAULT_TIMEOUT_MS = 30000;
const DEFAULT_RETRIES = 2;

async function fetchWithRetry(url, options = {}, { timeoutMs = DEFAULT_TIMEOUT_MS, retries = DEFAULT_RETRIES } = {}) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const resp = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timer);
      return resp;
    } catch (error) {
      clearTimeout(timer);
      lastError = error;
      if (attempt >= retries) throw error;
    }
  }
  throw lastError;
}

// ---------- 基础请求 ----------
export async function requestReading({
  provider, apiKey, endpoint, model, style = 'guide', prompt,
  temperature, maxTokens, topP, headers
}) {
  if (!apiKey) throw new Error('未配置 API Key');
  if (!endpoint) throw new Error('未配置 API 地址');

  const url = buildUrl(endpoint, provider);
  const body = {
    model: model || 'gpt-3.5-turbo',
    messages: [
      { role: 'system', content: buildSystemPrompt(style) },
      { role: 'user', content: prompt }
    ],
    temperature: temperature !== undefined ? temperature : 0.7,
    max_tokens: maxTokens || 2048,
    top_p: topP !== undefined ? topP : 0.9,
    stream: false
  };

  const requestHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`
  };

  // 自定义请求头合并
  if (headers && typeof headers === 'object') {
    Object.assign(requestHeaders, headers);
  }

  if (provider === 'gemini') {
    const url2 = buildGeminiUrl(endpoint, provider, body.model, apiKey);
    const body2 = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: body.temperature,
        maxOutputTokens: body.max_tokens,
        topP: body.top_p
      }
    };
    const resp = await fetchWithRetry(url2, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body2)
    });
    return handleGeminiResponse(resp);
  }

  const resp = await fetchWithRetry(url, {
    method: 'POST',
    headers: requestHeaders,
    body: JSON.stringify(body)
  });

  return handleResponse(resp);
}

// ---------- 追问 ----------
export async function requestFollowUp({
  history, provider, apiKey, endpoint, model,
  temperature, maxTokens, topP, headers
}) {
  if (!history || !history.length) throw new Error('没有对话历史');
  if (!apiKey) throw new Error('未配置 API Key');

  const providerName = provider || 'deepseek';
  let ep = endpoint || '';
  if (ep.endsWith('/v1')) ep = ep.slice(0, -3);
  if (ep.endsWith('/')) ep = ep.slice(0, -1);

  const url = buildUrl(ep, providerName);
  const body = {
    model: model || 'gpt-3.5-turbo',
    messages: history,
    temperature: temperature !== undefined ? temperature : 0.7,
    max_tokens: maxTokens || 2048,
    top_p: topP !== undefined ? topP : 0.9,
    stream: false
  };

  const requestHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`
  };
  if (headers && typeof headers === 'object') {
    Object.assign(requestHeaders, headers);
  }

  if (providerName === 'gemini') {
    const url2 = buildGeminiUrl(ep, providerName, body.model, apiKey);
    const text = history.map(m => (m.role === 'user' ? '用户：' : 'AI：') + m.content).join('\n\n');
    const body2 = {
      contents: [{ parts: [{ text }] }],
      generationConfig: {
        temperature: body.temperature,
        maxOutputTokens: body.max_tokens,
        topP: body.top_p
      }
    };
    const resp = await fetchWithRetry(url2, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body2)
    });
    return handleGeminiResponse(resp);
  }

  const resp = await fetchWithRetry(url, {
    method: 'POST',
    headers: requestHeaders,
    body: JSON.stringify(body)
  });

  return handleResponse(resp);
}

// ---------- 测试连接 ----------
export async function testApiConnection({
  provider, apiKey, endpoint, model,
  temperature, maxTokens, topP, headers
}) {
  try {
    const providerName = provider || 'deepseek';
    let ep = endpoint || '';
    if (ep.endsWith('/v1')) ep = ep.slice(0, -3);
    if (ep.endsWith('/')) ep = ep.slice(0, -1);

    const testModel = model || 'gpt-3.5-turbo';
    const url = buildUrl(ep, providerName);
    const body = {
      model: testModel,
      messages: [{ role: 'user', content: '你好' }],
      max_tokens: 8,
      temperature: temperature !== undefined ? temperature : 0.7,
      top_p: topP !== undefined ? topP : 0.9,
      stream: false
    };

    const requestHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    };
    if (headers && typeof headers === 'object') {
      Object.assign(requestHeaders, headers);
    }

    if (providerName === 'gemini') {
      const url2 = buildGeminiUrl(ep, providerName, testModel, apiKey);
      const body2 = {
        contents: [{ parts: [{ text: '你好' }] }],
        generationConfig: { maxOutputTokens: 8 }
      };
      const resp = await fetchWithRetry(url2, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body2)
      });
      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error?.message || `HTTP ${resp.status}`);
      }
      return '✅ 连接成功，API 可用';
    }

    const resp = await fetchWithRetry(url, {
      method: 'POST',
      headers: requestHeaders,
      body: JSON.stringify(body)
    });
    if (!resp.ok) {
      const errData = await resp.json().catch(() => ({}));
      throw new Error(errData.error?.message || `HTTP ${resp.status}`);
    }
    return '✅ 连接成功，API 可用';
  } catch (e) {
    throw new Error(e.message || '连接失败');
  }
}

// ---------- 构建 URL ----------
export function buildGeminiUrl(endpoint, provider, model, apiKey) {
  const base = (endpoint || '').replace(/\/$/, '');
  if (provider === 'gemini' && base) {
    return `${base}/models/${encodeURIComponent(model || 'gemini-2.0-flash')}:generateContent?key=${encodeURIComponent(apiKey || '')}`;
  }
  return `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model || 'gemini-2.0-flash')}:generateContent?key=${encodeURIComponent(apiKey || '')}`;
}

function buildUrl(endpoint, provider) {
  if (!endpoint) throw new Error('API 地址不能为空');
  let ep = endpoint;
  if (provider === 'claude') {
    // Claude 使用不同的端点结构
    if (!ep.includes('/v1/messages')) {
      ep = ep + (ep.endsWith('/') ? '' : '/') + 'v1/messages';
    }
    return ep;
  }
  // OpenAI 兼容方式
  if (ep.endsWith('/v1')) return ep + '/chat/completions';
  if (ep.endsWith('/chat/completions')) return ep;
  if (ep.endsWith('/')) return ep + 'v1/chat/completions';
  return ep + '/v1/chat/completions';
}

// ---------- 处理响应 ----------
async function handleResponse(resp) {
  if (!resp.ok) {
    let msg = `HTTP ${resp.status}`;
    try {
      const err = await resp.json();
      msg = err.error?.message || err.message || msg;
    } catch (e) {
      // ignore
    }
    if (resp.status === 401) msg = 'API Key 无效或已过期';
    if (resp.status === 429) msg = '请求过于频繁，请稍后再试';
    throw new Error(msg);
  }
  const data = await resp.json();
  const text = data.choices?.[0]?.message?.content || '';
  if (!text) throw new Error('AI 返回内容为空');
  return text.trim();
}

// ---------- Gemini 响应处理 ----------
async function handleGeminiResponse(resp) {
  if (!resp.ok) {
    let msg = `HTTP ${resp.status}`;
    try {
      const err = await resp.json();
      msg = err.error?.message || msg;
    } catch (e) {}
    throw new Error(msg);
  }
  const data = await resp.json();
  const text = data.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '';
  if (!text) throw new Error('AI 返回内容为空');
  return text.trim();
}

// ---------- 系统提示词 ----------
function buildSystemPrompt(style) {
  const prompts = {
    guide: '你是一个温和的浮生牌占卜师。说话含蓄、留有余地，不制造恐惧，尊重用户自主判断。',
    analyst: '你是一个冷静的牌局分析师。客观描述牌面能量，不评价对错，只陈述可能。',
    sharp: '你是一个直言不讳的牌局观察者。不绕弯，直接点破关键，但不说伤害性的话。'
  };
  return prompts[style] || prompts.guide;
}