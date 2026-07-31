// ===== AI 厂商接口封装（合并版 + 超时重试）=====

async function callAI({ messages, apiKey, endpoint, model, temperature = 0.7, maxTokens = 2048, retries = 2 }) {
  if (!endpoint) throw new Error('API 端点未配置');
  if (!apiKey) throw new Error('API Key 未配置');

  const baseUrl = endpoint.replace(/\/+$/, '');
  // 支持 OpenAI / Anthropic / Google 三种格式
  let url, headers, body;

  if (endpoint.includes('anthropic.com')) {
    url = baseUrl + '/messages';
    headers = {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    };
    body = {
      model: model || 'claude-3-haiku-20240307',
      max_tokens: maxTokens,
      messages
    };
  } else if (endpoint.includes('generativelanguage.googleapis.com')) {
    url = baseUrl + '/models/' + (model || 'gemini-pro') + ':generateContent';
    headers = {
      'Content-Type': 'application/json'
    };
    body = {
      contents: messages.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }))
    };
  } else {
    url = baseUrl + '/chat/completions';
    headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    };
    body = {
      model: model || 'gpt-3.5-turbo',
      messages,
      temperature,
      max_tokens: maxTokens,
    };
  }

  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`API 响应错误 (${res.status}): ${errText}`);
      }
      const data = await res.json();
      // 解析不同格式的响应
      if (endpoint.includes('anthropic.com')) {
        return data.content?.[0]?.text || 'AI 未返回有效内容';
      } else if (endpoint.includes('generativelanguage.googleapis.com')) {
        return data.candidates?.[0]?.content?.parts?.[0]?.text || 'AI 未返回有效内容';
      } else {
        return data.choices?.[0]?.message?.content || 'AI 未返回有效内容';
      }
    } catch (e) {
      clearTimeout(timeout);
      lastError = e;
      if (attempt < retries) await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  throw lastError || new Error('AI 请求失败');
}

export async function testApiConnection({ provider, apiKey, endpoint, model }) {
  await callAI({
    messages: [{ role: 'user', content: 'ping' }],
    apiKey,
    endpoint,
    model: model || 'gpt-3.5-turbo',
    maxTokens: 5,
  });
  return '✅ API 连接成功，服务正常。';
}

export async function requestReading({ provider, apiKey, endpoint, model, style, prompt }) {
  const systemPrompt = style ? getStylePrompt(style) : '你是一个冷静、客观的占卜解读助手。';
  return callAI({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt }
    ],
    apiKey,
    endpoint,
    model: model || 'gpt-3.5-turbo',
    temperature: 0.7,
    maxTokens: 2048,
  });
}

export async function requestFollowUp({ history, provider, apiKey, endpoint, model }) {
  return callAI({
    messages: history,
    apiKey,
    endpoint,
    model: model || 'gpt-3.5-turbo',
    temperature: 0.8,
    maxTokens: 2048,
  });
}

function getStylePrompt(style) {
  const styles = {
    guide: '你是一个温和的引导者，用理性而温暖的方式帮助用户理解牌面。',
    analyst: '你是一个冷静的分析师，从逻辑和心理学角度客观解读牌面。',
    sharp: '你是一个犀利直言者，直接点出本质，一针见血，不绕弯子。'
  };
  return styles[style] || styles.guide;
}