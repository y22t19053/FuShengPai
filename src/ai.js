// ===== src/ai.js · AI请求层（OpenAI兼容协议 + 高级参数透传） =====
import { UI_TEXTS } from './texts/index.js';

const DEFAULT_TIMEOUT_MS = 60000;
const DEFAULT_RETRIES = 2;
const DEFAULT_MAX_TOKENS = 4096;

// AI 响应内容异常（空内容 / 截断），带 truncated 标记以便自动恢复
class AIResponseError extends Error {
  constructor(message, truncated = false) {
    super(message);
    this.truncated = truncated;
  }
}

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
  const baseTokens = maxTokens || DEFAULT_MAX_TOKENS;

  const callOnce = async (mt) => {
    const body = {
      model: model || 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: buildSystemPrompt(style) },
        { role: 'user', content: prompt }
      ],
      temperature: temperature !== undefined ? temperature : 0.7,
      max_tokens: mt,
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
  };

  return callWithRecovery(callOnce, baseTokens);
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
  const baseTokens = maxTokens || DEFAULT_MAX_TOKENS;

  const callOnce = async (mt) => {
    const body = {
      model: model || 'gpt-3.5-turbo',
      messages: history,
      temperature: temperature !== undefined ? temperature : 0.7,
      max_tokens: mt,
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
  };

  return callWithRecovery(callOnce, baseTokens);
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

// ---------- 内容提取（兼容字符串 / parts 数组 / 推理模型） ----------
function extractText(data) {
  const choice = data?.choices?.[0];
  const msg = choice?.message;
  let text = '';
  if (msg) {
    const c = msg.content;
    if (typeof c === 'string') text = c;
    else if (Array.isArray(c)) text = c.map(p => (typeof p === 'string' ? p : p?.text || '')).join('');
    else if (c && typeof c === 'object') text = c.text || '';
  }
  return {
    text: text.trim(),
    finishReason: choice?.finish_reason || '',
    reasoning: typeof msg?.reasoning_content === 'string' ? msg.reasoning_content : ''
  };
}

// ---------- 空内容 / 截断自动恢复 ----------
async function callWithRecovery(callOnce, maxTokens) {
  try {
    return await callOnce(maxTokens);
  } catch (e) {
    if (!(e instanceof AIResponseError)) throw e;
    if (e.truncated) {
      // 输出被截断（推理模型常见）：自动把最大输出翻倍再试一次（上限 32K）
      const bigger = Math.min((maxTokens || DEFAULT_MAX_TOKENS) * 2, 32768);
      try {
        return await callOnce(bigger);
      } catch (e2) {
        // 翻倍后仍截断：退回第一次的部分内容，避免用户白等
        if (e2 instanceof AIResponseError && e2.truncated && e.partialText) return e.partialText;
        throw e2;
      }
    }
    // 空内容：可能是瞬时抖动，原样再试一次
    return await callOnce(maxTokens || DEFAULT_MAX_TOKENS);
  }
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
  const { text, finishReason, reasoning } = extractText(data);
  if (!text || finishReason === 'length') {
    if (finishReason === 'length') {
      // 输出被截断（推理模型常见，可能正文为空或只有半截）：翻倍重试
      const err = new AIResponseError('回答被截断（达到最大输出上限），已自动放大输出重试', true);
      err.partialText = text;
      throw err;
    }
    if (reasoning) {
      throw new AIResponseError('模型只输出了思考过程、未输出正式回答，请在 AI 设置中增大「最大输出」或换用非推理模型');
    }
    throw new AIResponseError('AI 返回内容为空：服务商未返回正文，请检查模型名或稍后重试');
  }
  return text;
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

// ---------- 系统提示词（结构化：角色 + 铁律，借鉴 mingyu 的结构化提示词与反幻觉思路） ----------
function buildSystemPrompt(style) {
  const roles = {
    guide: '你是一个温和的浮生牌占卜师。说话含蓄、留有余地，不制造恐惧，尊重用户自主判断。',
    analyst: '你是一个冷静的牌局分析师。客观描述牌面能量，不评价对错，只陈述可能。',
    sharp: '你是一个直言不讳的牌局观察者。不绕弯，直接点破关键，但不说伤害性的话。'
  };
  const rules = `

硬性规则（每条都必须遵守）：
1. 不预测“必然发生的未来”，不给出确定性断言；只描述当下能量的倾向与可能的走向，选择权永远留给用户。
2. 不恐吓、不制造焦虑；就算说坏消息，也一定给出可执行的出口。
3. 全程白话，禁用任何命理术语（五行生克、旺衰、宫位、大凶大吉等），一律把术语翻成人话。
4. 每次解读必须落到“对用户当下处境的帮助”：至少给出一条具体、可执行的建议。
5. 保持克制与留白：不堆砌信息、不长篇大论，像镜子一样点到为止。
6. 不用 Markdown 符号（#、*、-、序号列表等），用自然语言分段。`;
  return `${roles[style] || roles.guide}${rules}`;
}