// ===== src/ai.js · AI请求层（OpenAI兼容协议 + 高级参数透传） =====
import { UI_TEXTS } from './texts/index.js';

const DEFAULT_TIMEOUT_MS = 60000;
const DEFAULT_RETRIES = 2;
const DEFAULT_MAX_TOKENS = 4096;

// ---------- 本地 / 局域网推理服务（Ollama、LM Studio、vLLM、llama.cpp server…） ----------
// 这类服务一般不校验 API Key，允许留空；云端服务则必须填。密钥一律不发给本机地址。
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]']);
const PRIVATE_IP_RE = /^(10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})$/;

export function getEndpointHost(endpoint) {
  const raw = String(endpoint || '').trim();
  if (!raw) return '';
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `http://${raw}`);
    return url.hostname.toLowerCase();
  } catch (e) {
    return '';
  }
}

export function isLocalEndpoint(endpoint) {
  const host = getEndpointHost(endpoint);
  if (!host) return false;
  return LOCAL_HOSTS.has(host) || PRIVATE_IP_RE.test(host) || host.endsWith('.local');
}

// 要不要强制填 API Key：本机 / 局域网地址放行，其余（含 gemini）照旧
export function needsApiKey(provider, endpoint) {
  if (provider === 'gemini') return true;
  return !isLocalEndpoint(endpoint);
}

// 是否已经"能发请求"：云端要 Key，本机只要有地址
export function hasApiConfig(settings, providers = {}) {
  if (!settings || typeof settings !== 'object') return false;
  const provider = settings.provider || 'deepseek';
  const endpoint = settings.endpoint || providers?.[provider]?.endpoint || '';
  return Boolean(settings.apiKey) || !needsApiKey(provider, endpoint);
}

// 问本机服务要模型清单：先试 OpenAI 兼容口 /models，再回落 Ollama 原生 /api/tags
// 返回模型名数组；连不上返回 null；连上但一个模型都没有返回 []
export async function listLocalModels(endpoint) {
  const raw = String(endpoint || '').trim().replace(/\/+$/, '');
  if (!raw) return null;
  const base = raw.replace(/\/v1$/i, '');
  const urls = [`${raw}/models`, `${base}/api/tags`];
  for (const url of urls) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) continue;
      const data = await res.json();
      const rows = Array.isArray(data?.data) ? data.data : Array.isArray(data?.models) ? data.models : null;
      if (!rows) continue;
      return rows
        .map((row) => (typeof row === 'string' ? row : row?.id || row?.name || row?.model || ''))
        .filter(Boolean);
    } catch (e) {
      // 换下一个地址试
    }
  }
  return null;
}

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
  if (!apiKey && needsApiKey(provider, endpoint)) throw new Error('未配置 API Key');
  if (!endpoint) throw new Error('未配置 API 地址');

  const url = buildUrl(endpoint, provider);
  const baseTokens = maxTokens || DEFAULT_MAX_TOKENS;
  // 本机模型一律先关思考：小模型在思考上耗掉的时间远超回答本身（实测 28s → 1s）
  const localFirst = isLocalEndpoint(endpoint);

  const callOnce = async (mt, options = {}) => {
    const noThink = options.noThink || localFirst;
    const body = {
      model: model || 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: buildSystemPrompt(style) },
        { role: 'user', content: options.noThink ? `${prompt} /no_think` : prompt }
      ],
      temperature: temperature !== undefined ? temperature : 0.7,
      max_tokens: mt,
      top_p: topP !== undefined ? topP : 0.9,
      stream: false
    };
    // 推理型模型（qwen3、deepseek-r1 之类）会把输出预算全烧在思考上。
    // reasoning_effort:"none" 是 OpenAI 兼容口最通用的关思考开关（Ollama 实测有效；think:false 在 /v1 下会被忽略）
    if (noThink) body.reasoning_effort = 'none';

    const requestHeaders = { 'Content-Type': 'application/json' };
    if (apiKey) requestHeaders.Authorization = `Bearer ${apiKey}`;

    // 自定义请求头合并
    if (headers && typeof headers === 'object') {
      Object.assign(requestHeaders, headers);
    }

    if (provider === 'gemini') {
      const url2 = buildGeminiUrl(endpoint, provider, body.model);
      const body2 = {
        systemInstruction: { parts: [{ text: buildSystemPrompt(style) }] },
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: body.temperature,
          maxOutputTokens: body.max_tokens,
          topP: body.top_p
        }
      };
      const resp = await fetchWithRetry(url2, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
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
  if (!apiKey && needsApiKey(provider, endpoint)) throw new Error('未配置 API Key');

  const providerName = provider || 'deepseek';
  const ep = normalizeEndpoint(endpoint);

  const url = buildUrl(ep, providerName);
  const baseTokens = maxTokens || DEFAULT_MAX_TOKENS;
  const localFirst = isLocalEndpoint(ep);

  const callOnce = async (mt, options = {}) => {
    const noThink = options.noThink || localFirst;
    const messages = noThink
      ? history.map((m, i) => (i === history.length - 1 && m.role === 'user'
        ? { ...m, content: `${m.content} /no_think` }
        : m))
      : history;
    const body = {
      model: model || 'gpt-3.5-turbo',
      messages,
      temperature: temperature !== undefined ? temperature : 0.7,
      max_tokens: mt,
      top_p: topP !== undefined ? topP : 0.9,
      stream: false
    };
    if (noThink) body.reasoning_effort = 'none';

    const requestHeaders = { 'Content-Type': 'application/json' };
    if (apiKey) requestHeaders.Authorization = `Bearer ${apiKey}`;
    if (headers && typeof headers === 'object') {
      Object.assign(requestHeaders, headers);
    }

    if (providerName === 'gemini') {
      const url2 = buildGeminiUrl(ep, providerName, body.model);
      const text = history.map(m => (m.role === 'user' ? '用户：' : 'AI：') + m.content).join('\n\n');
      const body2 = {
        systemInstruction: { parts: [{ text: buildSystemPrompt('guide') }] },
        contents: [{ parts: [{ text }] }],
        generationConfig: {
          temperature: body.temperature,
          maxOutputTokens: body.max_tokens,
          topP: body.top_p
        }
      };
      const resp = await fetchWithRetry(url2, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
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
    const ep = normalizeEndpoint(endpoint);
    if (!apiKey && needsApiKey(providerName, ep)) throw new Error('请先填写 API Key');

    const local = isLocalEndpoint(ep);
    const testModel = model || 'gpt-3.5-turbo';
    const url = buildUrl(ep, providerName);
    const body = {
      model: testModel,
      messages: [{ role: 'user', content: local ? '只回答两个字：可用' : '你好' }],
      max_tokens: local ? 64 : 8,
      temperature: temperature !== undefined ? temperature : 0.7,
      top_p: topP !== undefined ? topP : 0.9,
      stream: false
    };
    // 本机服务多半是推理型小模型，不关思考会连"可用"两个字都吐不出来
    if (local) body.reasoning_effort = 'none';

    const requestHeaders = { 'Content-Type': 'application/json' };
    if (apiKey) requestHeaders.Authorization = `Bearer ${apiKey}`;
    if (headers && typeof headers === 'object') {
      Object.assign(requestHeaders, headers);
    }

    if (providerName === 'gemini') {
      const url2 = buildGeminiUrl(ep, providerName, testModel);
      const body2 = {
        contents: [{ parts: [{ text: '你好' }] }],
        generationConfig: { maxOutputTokens: 8 }
      };
      const resp = await fetchWithRetry(url2, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
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
    if (local) {
      const data = await resp.json().catch(() => ({}));
      const { text, reasoning } = extractText(data);
      if (!text && reasoning) {
        return '⚠️ 已连上本机服务，但这个模型只回了思考、没有正文。换个模型（如 qwen2.5:7b）或把「最大输出」调大再试。';
      }
      if (!text) {
        return '⚠️ 已连上本机服务，但没拿到正文——确认模型名拼对了（ollama list 里的名字）且已经 pull 下来。';
      }
      return '✅ 连接成功，本机模型可用';
    }
    return '✅ 连接成功，API 可用';
  } catch (e) {
    throw new Error(e.message || '连接失败');
  }
}

// ---------- 构建 URL ----------
// 统一归一化：去空格、去末尾斜杠、去掉结尾的 /v1，
// 避免用户粘贴 "https://api.deepseek.com/v1/" 时拼出 /v1/v1/chat/completions
export function normalizeEndpoint(endpoint) {
  let ep = String(endpoint || '').trim().replace(/\/+$/, '');
  if (ep.endsWith('/v1')) ep = ep.slice(0, -3);
  return ep;
}

export function buildGeminiUrl(endpoint, provider, model) {
  const base = String(endpoint || '').trim().replace(/\/+$/, '');
  if (provider === 'gemini' && base) {
    return `${base}/models/${encodeURIComponent(model || 'gemini-2.0-flash')}:generateContent`;
  }
  return `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model || 'gemini-2.0-flash')}:generateContent`;
}

export function buildUrl(endpoint, provider) {
  const ep = normalizeEndpoint(endpoint);
  if (!ep) throw new Error('API 地址不能为空');
  if (provider === 'claude') {
    // Claude 使用不同的端点结构（默认 https://api.anthropic.com/v1）
    if (ep.endsWith('/v1/messages')) return ep;
    return ep + '/v1/messages';
  }
  // OpenAI 兼容方式
  if (ep.endsWith('/chat/completions')) return ep;
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

// ---------- 空内容 / 截断 / 推理型模型自动恢复 ----------
async function callWithRecovery(callOnce, maxTokens) {
  try {
    return await callOnce(maxTokens);
  } catch (e) {
    if (!(e instanceof AIResponseError)) throw e;
    // 输出预算全花在思考上（qwen3 / deepseek-r1 这类）：关掉思考再来一次
    if (e.needNoThink) {
      try {
        return await callOnce(maxTokens || DEFAULT_MAX_TOKENS, { noThink: true });
      } catch (e2) {
        if (e2 instanceof AIResponseError && e2.needNoThink) {
          throw new Error('这个模型把回答全花在思考上了，没有正文。换一个非推理模型（如 qwen2.5:7b / gpt-4o-mini / deepseek-chat），或把「最大输出」调到 8192 以上。');
        }
        throw e2;
      }
    }
    if (e.truncated) {
      // 输出被截断：自动把最大输出翻倍再试一次（上限 32K）
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

// ---------- 去掉模型爱写的 Markdown（本项目的文案标准：不用 #、*、-、分隔线） ----------
// 只清"噪音符号"，不动行首序号——序号被抹掉后分点解读会糊成一段，反而更难读
export function stripLightMarkdown(text) {
  if (!text) return '';
  return String(text)
    .replace(/```[a-zA-Z]*\n?/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s{0,3}([-*_])\1{2,}\s*$/gm, '')
    .replace(/^\s{0,3}[-*+]\s+/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
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

  if (!text) {
    // 只有思考没有正文：先关思考重试（这一步比盲目翻倍 max_tokens 有效得多）
    if (reasoning) {
      const err = new AIResponseError('模型只输出了思考过程、未输出正式回答');
      err.needNoThink = true;
      throw err;
    }
    if (finishReason === 'length') {
      const err = new AIResponseError('回答被截断（达到最大输出上限），已自动放大输出重试', true);
      err.partialText = '';
      throw err;
    }
    throw new AIResponseError('AI 返回内容为空：服务商未返回正文，请检查模型名或稍后重试');
  }

  if (finishReason === 'length') {
    // 输出被截断（推理模型常见，可能正文只有半截）：翻倍重试
    const err = new AIResponseError('回答被截断（达到最大输出上限），已自动放大输出重试', true);
    err.partialText = text;
    throw err;
  }
  return stripLightMarkdown(text);
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
  return stripLightMarkdown(text);
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