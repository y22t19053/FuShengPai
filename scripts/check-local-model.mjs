#!/usr/bin/env node
// ===== scripts/check-local-model.mjs =====
// 检查本机 / 局域网上的 OpenAI 兼容服务（Ollama、LM Studio、vLLM、llama.cpp server…）能不能用来做解读。
// 用法：
//   node scripts/check-local-model.mjs                         # 默认 http://127.0.0.1:11434/v1 qwen3:8b
//   node scripts/check-local-model.mjs http://127.0.0.1:11434/v1 qwen3:8b
//   node scripts/check-local-model.mjs http://127.0.0.1:1234/v1 qwen2.5-7b-instruct
// 不需要任何依赖，Node 18+ 自带 fetch。

const endpoint = (process.argv[2] || 'http://127.0.0.1:11434/v1').replace(/\/+$/, '');
const model = process.argv[3] || 'qwen3:8b';
const base = endpoint.replace(/\/v1$/, '');

function ms(t0) {
  return `${Date.now() - t0}ms`;
}

async function listModels() {
  const tries = [`${endpoint}/models`, `${base}/api/tags`];
  for (const url of tries) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) continue;
      const data = await res.json();
      if (Array.isArray(data?.data)) return data.data.map(m => m.id).filter(Boolean);
      if (Array.isArray(data?.models)) return data.models.map(m => m.name).filter(Boolean);
    } catch (e) {
      // 换下一个地址试
    }
  }
  return null;
}

async function chat(extra = {}) {
  const t0 = Date.now();
  const res = await fetch(`${endpoint}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: '你是浮生牌占卜师。白话，不讲古词，不用 Markdown。' },
        { role: 'user', content: '抽到黑桃7，一句话说说今天的状态。' }
      ],
      temperature: 0.7,
      max_tokens: 160,
      stream: false,
      ...extra
    }),
    signal: AbortSignal.timeout(120000)
  });
  const took = ms(t0);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    return { ok: false, took, error: `HTTP ${res.status} ${text.slice(0, 120)}` };
  }
  const data = await res.json();
  const msg = data?.choices?.[0]?.message || {};
  return {
    ok: true,
    took,
    content: String(msg.content || '').trim(),
    reasoning: String(msg.reasoning_content || msg.reasoning || '').trim(),
    finish: data?.choices?.[0]?.finish_reason || ''
  };
}

console.log(`\n浮生牌 · 本地模型自检\n地址：${endpoint}\n模型：${model}\n`);

const models = await listModels();
if (models === null) {
  console.log('❌ 连不上这个地址。先确认服务已经起来：');
  console.log('   Ollama：终端里跑 `ollama serve`（桌面版装好一般已常驻）');
  console.log('   LM Studio：在 Local Server 页点 Start Server');
  process.exit(1);
}
console.log(`✅ 服务在线，共 ${models.length} 个模型${models.length ? `：${models.slice(0, 8).join('、')}${models.length > 8 ? ' …' : ''}` : ''}`);
if (models.length && !models.some(m => m === model || m.startsWith(`${model}:`))) {
  console.log(`⚠️ 列表里没有「${model}」，先拉一个：ollama pull ${model}`);
}

console.log('\n— 第 1 次：照浮生牌的实际请求方式（自动关掉思考）—');
const plain = await chat({ reasoning_effort: 'none' });
if (!plain.ok) {
  console.log(`❌ 请求失败：${plain.error}`);
  process.exit(1);
}
console.log(`耗时 ${plain.took}｜正文 ${plain.content.length} 字｜思考 ${plain.reasoning.length} 字｜finish=${plain.finish}`);
if (plain.content) {
  console.log(`\n${plain.content}\n`);
} else if (plain.reasoning) {
  console.log('\n⚠️ 只有思考、没有正文。这说明这个模型把输出预算全花在思考上了：');
  console.log('   · 换个非推理模型（如 qwen2.5:7b / llama3.1:8b），或');
  console.log('   · 在浮生牌「高级参数」里把「最大输出」调到 8192 以上');
}

console.log('— 第 2 次：不关思考（对照，看看它本来多慢）—');
const raw = await chat();
if (raw.ok) {
  console.log(`耗时 ${raw.took}｜正文 ${raw.content.length} 字｜思考 ${raw.reasoning.length} 字`);
} else {
  console.log(`（对照请求失败：${raw.error}）`);
}

console.log('\n结论：');
if (plain.content) {
  console.log(`✅ 这个模型可以直接用在浮生牌里。设置里选「本机 Ollama」（或 LM Studio），模型名填 ${model}，Key 留空。`);
} else {
  console.log('❌ 暂时用不了，按上面的提示换模型或调大「最大输出」。');
  process.exitCode = 2;
}
