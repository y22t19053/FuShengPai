// ===== AI 厂商接口封装（合并版 + 超时重试）=====

async function callAI({ messages, apiKey, endpoint, model, temperature = 0.7, maxTokens = 2048, retries = 2 }) {
  if (!endpoint) throw new Error('API 端点未配置');

  // 确保 endpoint 末尾不带 '/chat/completions'，统一拼接
  const baseUrl = endpoint.replace(/\/+$/, '');
  const url = baseUrl + '/chat/completions';

  const body = {
    model: model || 'gpt-3.5-turbo',
    messages,
    temperature,
    max_tokens: maxTokens,
  };

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
  };

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
      return data.choices?.[0]?.message?.content || 'AI 未返回有效内容';
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
  return callAI({
    messages: [{ role: 'user', content: prompt }],
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