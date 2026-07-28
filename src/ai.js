// ===== AI 厂商接口封装 =====
// 由于用户浏览器直连第三方 API，所有请求均为纯前端 Fetch。

export async function testApiConnection({ provider, apiKey, endpoint, model }) {
  if (!endpoint) throw new Error('未配置 API 端点');
  // 拼接测试聊天接口
  const url = endpoint + '/chat/completions';
  const body = {
    model: model || 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: 'ping' }],
    max_tokens: 5,
  };

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`API 响应错误 (${res.status}): ${errText}`);
    }
    return '✅ API 连接成功，服务正常。';
  } catch (e) {
    throw new Error(`连接失败: ${e.message}`);
  }
}

export async function requestReading({ provider, apiKey, endpoint, model, style, prompt }) {
  if (!endpoint) throw new Error('API 端点未配置');
  const url = endpoint + '/chat/completions';
  const body = {
    model: model || 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens: 2048,
  };

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
  };

  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`API 请求失败 (${res.status}): ${errText}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || 'AI 未返回有效内容';
}

export async function requestFollowUp({ history, provider, apiKey, endpoint, model }) {
  if (!endpoint) throw new Error('API 端点未配置');
  const url = endpoint + '/chat/completions';
  const body = {
    model: model || 'gpt-3.5-turbo',
    messages: history,
    temperature: 0.8,
    max_tokens: 2048,
  };

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
  };

  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`追问 API 请求失败 (${res.status}): ${errText}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || 'AI 未返回有效追问内容';
}