// ===== 浮生牌 · AI 接口层 =====
// 封装各 AI 厂商的请求格式差异，对外暴露统一的调用接口。
// 所有请求从浏览器直连厂商，API Key 由调用方传入。

import { API_PROVIDERS } from './data.js';
import { READING_TEXTS } from './texts.js';

// ===== 内部工具函数 =====

/**
 * 根据厂商类型构建请求体
 * @param {string} provider - 厂商标识：deepseek/qwen/openai/claude/gemini/kimi/zhipu/custom
 * @param {string} model - 模型名称
 * @param {Array<{role: string, content: string}>} messages - 对话历史
 * @param {Object} options - { temperature, maxTokens }
 * @returns {{ url: string, headers: Object, body: Object }}
 */
function buildRequest(provider, model, messages, options = {}) {
  const { temperature = 0.7, maxTokens = 2000 } = options;

  // OpenAI 兼容格式（DeepSeek、千问、Kimi、智谱、自定义均走此格式）
  const openaiCompatible = ['deepseek', 'qwen', 'openai', 'kimi', 'zhipu', 'custom'];

  if (openaiCompatible.includes(provider)) {
    const info = API_PROVIDERS[provider];
    return {
      url: info.endpoint,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${info.apiKey}`,
      },
      body: {
        model: model || info.model,
        messages,
        max_tokens: maxTokens,
        temperature,
      },
    };
  }

  // Claude 使用 Anthropic 专用格式
  if (provider === 'claude') {
    const info = API_PROVIDERS.claude;
    // 提取 system 消息和普通消息
    const systemMsg = messages.find(m => m.role === 'system');
    const userMessages = messages.filter(m => m.role !== 'system');

    return {
      url: info.endpoint,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': `${info.apiKey}`,
        'anthropic-version': '2023-06-01',
      },
      body: {
        model: model || info.model,
        system: systemMsg?.content || '',
        messages: userMessages.map(m => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content,
        })),
        max_tokens: maxTokens,
      },
    };
  }

  // Gemini 使用 Google 专用格式
  if (provider === 'gemini') {
    const info = API_PROVIDERS.gemini;
    // 拼接所有消息为单个文本
    const combinedText = messages.map(m => `${m.role}: ${m.content}`).join('\n\n');
    const modelName = model || info.model;

    return {
      url: `${info.endpoint}?key=${info.apiKey}`,
      headers: {
        'Content-Type': 'application/json',
      },
      body: {
        contents: [
          {
            parts: [{ text: combinedText }],
          },
        ],
        generationConfig: {
          maxOutputTokens: maxTokens,
          temperature,
        },
      },
    };
  }

  throw new Error(`不支持的 AI 厂商: ${provider}`);
}

/**
 * 根据厂商类型解析响应
 * @param {string} provider
 * @param {Object} responseData - 厂商返回的 JSON
 * @returns {string} 解析后的文本内容
 */
function parseResponse(provider, responseData) {
  // OpenAI 兼容格式
  if (['deepseek', 'qwen', 'openai', 'kimi', 'zhipu', 'custom'].includes(provider)) {
    if (!responseData.choices || !responseData.choices[0]) {
      throw new Error('AI 返回了空的响应');
    }
    return responseData.choices[0].message?.content || '';
  }

  // Claude 格式
  if (provider === 'claude') {
    if (!responseData.content || !responseData.content[0]) {
      throw new Error('AI 返回了空的响应');
    }
    return responseData.content[0].text || '';
  }

  // Gemini 格式
  if (provider === 'gemini') {
    if (!responseData.candidates || !responseData.candidates[0]) {
      // Gemini 可能在安全过滤时返回空 candidates
      if (responseData.promptFeedback?.blockReason) {
        throw new Error(`请求被安全策略拦截: ${responseData.promptFeedback.blockReason}`);
      }
      throw new Error('AI 返回了空的响应');
    }
    const parts = responseData.candidates[0].content?.parts;
    if (!parts || parts.length === 0) {
      throw new Error('AI 返回了空的响应');
    }
    return parts.map(p => p.text || '').join('');
  }

  throw new Error(`不支持的 AI 厂商: ${provider}`);
}

/**
 * 构建解读的系统提示词
 * @param {string} style - 风格：guide/analyst/sharp
 * @returns {string}
 */
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

// ===== 公开接口 =====

/**
 * 向 AI 发起解读请求
 * @param {Object} config - 配置对象
 * @param {string} config.provider - 厂商标识
 * @param {string} config.apiKey - 用户填入的 API Key
 * @param {string} config.endpoint - 自定义 API 地址（可选，用于 custom 厂商）
 * @param {string} config.model - 模型名称（可选，不填则使用默认模型）
 * @param {string} config.style - 解读风格：guide/analyst/sharp
 * @param {string} config.prompt - 要解读的完整排盘数据
 * @param {number} [config.temperature] - 温度参数，默认 0.7
 * @param {number} [config.maxTokens] - 最大输出 token，默认 2000
 * @returns {Promise<string>} AI 返回的解读文本
 */
export async function requestReading(config) {
  const {
    provider = 'deepseek',
    apiKey,
    endpoint,
    model,
    style = 'guide',
    prompt,
    temperature = 0.7,
    maxTokens = 2000,
  } = config;

  // 参数校验
  if (!apiKey && provider !== 'custom') {
    throw new Error('请先在 AI 设置中填入 API Key');
  }
  if (!prompt || prompt.trim() === '') {
    throw new Error('解读数据不能为空');
  }

  // 构建厂商配置（临时注入 apiKey 和自定义 endpoint）
  const providerConfig = { ...API_PROVIDERS[provider] };
  if (apiKey) providerConfig.apiKey = apiKey;
  if (endpoint && provider === 'custom') providerConfig.endpoint = endpoint;

  // 构建系统提示和用户消息
  const systemPrompt = buildSystemPrompt(style);
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: prompt },
  ];

  // 构建请求
  const request = buildRequest(provider, model || providerConfig.model, messages, {
    temperature,
    maxTokens,
  });

  // 发送请求
  let response;
  try {
    response = await fetch(request.url, {
      method: 'POST',
      headers: request.headers,
      body: JSON.stringify(request.body),
    });
  } catch (e) {
    // 网络错误
    if (e.message === 'Failed to fetch') {
      throw new Error('网络请求失败，请检查网络连接或 API 地址是否正确。');
    }
    throw new Error(`请求发送失败: ${e.message}`);
  }

  // 处理 HTTP 错误
  if (!response.ok) {
    let errorDetail = '';
    try {
      const errorBody = await response.text();
      errorDetail = errorBody.slice(0, 200); // 截取前200字符避免过长
    } catch (e) { /* 忽略解析错误 */ }

    const statusMessages = {
      401: 'API Key 无效或已过期，请检查设置。',
      403: 'API 访问被拒绝，请检查 Key 权限或账户状态。',
      429: '请求过于频繁，请稍后再试。',
      500: 'AI 服务商服务器异常，请稍后重试。',
      503: 'AI 服务暂时不可用，请稍后重试。',
    };

    const baseMsg = statusMessages[response.status] || `AI 服务返回错误 (${response.status})`;
    const detail = errorDetail ? ` 详细信息: ${errorDetail}` : '';
    throw new Error(baseMsg + detail);
  }

  // 解析响应
  let responseData;
  try {
    responseData = await response.json();
  } catch (e) {
    throw new Error('无法解析 AI 返回的数据，请重试。');
  }

  // 提取文本
  try {
    const text = parseResponse(provider, responseData);
    if (!text.trim()) {
      throw new Error('AI 返回了空内容');
    }
    return text;
  } catch (e) {
    if (e.message.includes('安全策略') || e.message.includes('拦截')) {
      throw e; // 保留安全拦截的具体信息
    }
    throw new Error(`解读生成失败: ${e.message}`);
  }
}

/**
 * 向 AI 发送追问（多轮对话）
 * @param {Object} config - 配置对象
 * @param {Array<{role: string, content: string}>} config.history - 完整对话历史
 * @param {string} config.provider - 厂商标识
 * @param {string} config.apiKey - API Key
 * @param {string} config.endpoint - 自定义 API 地址（可选）
 * @param {string} config.model - 模型名称（可选）
 * @param {number} [config.temperature]
 * @param {number} [config.maxTokens]
 * @returns {Promise<string>}
 */
export async function requestFollowUp(config) {
  const {
    history,
    provider = 'deepseek',
    apiKey,
    endpoint,
    model,
    temperature = 0.7,
    maxTokens = 1500,
  } = config;

  if (!apiKey && provider !== 'custom') {
    throw new Error('请先在 AI 设置中填入 API Key');
  }
  if (!history || history.length === 0) {
    throw new Error('对话历史不能为空');
  }

  const providerConfig = { ...API_PROVIDERS[provider] };
  if (apiKey) providerConfig.apiKey = apiKey;
  if (endpoint && provider === 'custom') providerConfig.endpoint = endpoint;

  const request = buildRequest(provider, model || providerConfig.model, history, {
    temperature,
    maxTokens,
  });

  let response;
  try {
    response = await fetch(request.url, {
      method: 'POST',
      headers: request.headers,
      body: JSON.stringify(request.body),
    });
  } catch (e) {
    if (e.message === 'Failed to fetch') {
      throw new Error('网络请求失败，请检查网络连接或 API 地址是否正确。');
    }
    throw new Error(`请求发送失败: ${e.message}`);
  }

  if (!response.ok) {
    const statusMessages = {
      401: 'API Key 无效或已过期。',
      429: '请求过于频繁，请稍后再试。',
    };
    const baseMsg = statusMessages[response.status] || `AI 服务返回错误 (${response.status})`;
    throw new Error(baseMsg);
  }

  let responseData;
  try {
    responseData = await response.json();
  } catch (e) {
    throw new Error('无法解析 AI 返回的数据。');
  }

  try {
    return parseResponse(provider, responseData);
  } catch (e) {
    throw new Error(`追问失败: ${e.message}`);
  }
}