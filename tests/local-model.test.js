import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import {
  isLocalEndpoint, needsApiKey, hasApiConfig, requestReading, stripLightMarkdown, listLocalModels
} from '../src/ai.js';
import { API_PROVIDERS } from '../src/data.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('本地模型：地址判断', () => {
  it('认得出本机与局域网地址', () => {
    expect(isLocalEndpoint('http://127.0.0.1:11434/v1')).toBe(true);
    expect(isLocalEndpoint('http://localhost:1234/v1')).toBe(true);
    expect(isLocalEndpoint('127.0.0.1:11434')).toBe(true);
    expect(isLocalEndpoint('http://192.168.1.5:8080/v1')).toBe(true);
    expect(isLocalEndpoint('http://10.0.0.7:8000')).toBe(true);
  });

  it('云端地址不算本地', () => {
    expect(isLocalEndpoint('https://api.deepseek.com/v1')).toBe(false);
    expect(isLocalEndpoint('https://dashscope.aliyuncs.com/compatible-mode/v1')).toBe(false);
    expect(isLocalEndpoint('')).toBe(false);
    expect(isLocalEndpoint(undefined)).toBe(false);
  });
});

describe('本地模型：要不要 Key', () => {
  it('本机服务不需要 Key', () => {
    expect(needsApiKey('ollama', 'http://127.0.0.1:11434/v1')).toBe(false);
    expect(needsApiKey('lmstudio', 'http://localhost:1234/v1')).toBe(false);
  });

  it('云端服务仍然需要 Key', () => {
    expect(needsApiKey('deepseek', 'https://api.deepseek.com/v1')).toBe(true);
    expect(needsApiKey('custom', 'https://my-gateway.example.com/v1')).toBe(true);
  });

  it('gemini 即使指向本机也要 Key（协议不同）', () => {
    expect(needsApiKey('gemini', 'http://127.0.0.1:9000')).toBe(true);
  });
});

describe('本地模型：配置是否可用', () => {
  it('ollama 没填 Key 也算配置好了（地址从厂商预设回落）', () => {
    expect(hasApiConfig({ provider: 'ollama', apiKey: '', endpoint: '' }, API_PROVIDERS)).toBe(true);
  });

  it('deepseek 没填 Key 就是没配置好', () => {
    expect(hasApiConfig({ provider: 'deepseek', apiKey: '' }, API_PROVIDERS)).toBe(false);
  });

  it('空设置 / 空对象不崩，直接判未配置', () => {
    expect(hasApiConfig(null, API_PROVIDERS)).toBe(false);
    expect(hasApiConfig(undefined)).toBe(false);
    expect(hasApiConfig({}, API_PROVIDERS)).toBe(false);
  });
});

describe('本地模型：请求体与推理模型恢复', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('本机地址不发 Authorization，且遇到"只有思考"会自动关掉思考重试', async () => {
    const calls = [];
    vi.stubGlobal('fetch', async (url, options) => {
      calls.push({ url, body: JSON.parse(options.body), headers: options.headers });
      if (calls.length === 1) {
        // 第一次：qwen3 把预算全花在思考上（Ollama 实测行为）
        return {
          ok: true,
          json: async () => ({
            choices: [{ message: { content: '', reasoning_content: '嗯，用户问的是…' }, finish_reason: 'length' }]
          })
        };
      }
      return {
        ok: true,
        json: async () => ({
          choices: [{ message: { content: '抽到黑桃7，像深夜的楼道，灯只亮一层。' }, finish_reason: 'stop' }]
        })
      };
    });

    const out = await requestReading({
      provider: 'ollama',
      apiKey: '',
      endpoint: 'http://127.0.0.1:11434/v1',
      model: 'qwen3:8b',
      prompt: '抽到黑桃7是什么状态'
    });

    expect(out).toContain('黑桃7');
    expect(calls).toHaveLength(2);
    expect(calls[0].url).toBe('http://127.0.0.1:11434/v1/chat/completions');
    expect(calls[0].headers.Authorization).toBeUndefined();
    // 本机地址第一次就关掉思考（不然小模型会先想 20 秒以上）
    expect(calls[0].body.reasoning_effort).toBe('none');
    // 第二次再加 /no_think 双保险
    expect(calls[1].body.reasoning_effort).toBe('none');
    expect(calls[1].body.messages[1].content).toContain('/no_think');
    expect(calls[1].headers.Authorization).toBeUndefined();
  });

  it('云端地址第一次不带 reasoning_effort（不干扰正常模型）', async () => {
    const calls = [];
    vi.stubGlobal('fetch', async (url, options) => {
      calls.push({ url, body: JSON.parse(options.body), headers: options.headers });
      return {
        ok: true,
        json: async () => ({
          choices: [{ message: { content: '好' }, finish_reason: 'stop' }]
        })
      };
    });

    const out = await requestReading({
      provider: 'deepseek',
      apiKey: 'sk-test',
      endpoint: 'https://api.deepseek.com/v1',
      prompt: '抽到黑桃7'
    });

    expect(out).toBe('好');
    expect(calls).toHaveLength(1);
    expect(calls[0].body.reasoning_effort).toBeUndefined();
    expect(calls[0].headers.Authorization).toBe('Bearer sk-test');
  });

  it('云端没填 Key 仍然直接报错，不会偷偷发请求', async () => {
    const spy = vi.fn();
    vi.stubGlobal('fetch', spy);
    await expect(requestReading({
      provider: 'deepseek',
      apiKey: '',
      endpoint: 'https://api.deepseek.com/v1',
      prompt: '测试'
    })).rejects.toThrow('未配置 API Key');
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('检测本机模型', () => {
  it('OpenAI 兼容口直接给出模型名', async () => {
    const seen = [];
    vi.stubGlobal('fetch', async (url) => {
      seen.push(url);
      return { ok: true, json: async () => ({ data: [{ id: 'qwen3:8b' }, { id: 'qwen2.5:7b' }] }) };
    });
    await expect(listLocalModels('http://127.0.0.1:11434/v1')).resolves.toEqual(['qwen3:8b', 'qwen2.5:7b']);
    expect(seen[0]).toBe('http://127.0.0.1:11434/v1/models');
  });

  it('OpenAI 口不通时回落 Ollama 原生 /api/tags', async () => {
    const seen = [];
    vi.stubGlobal('fetch', async (url) => {
      seen.push(url);
      if (url.endsWith('/v1/models')) throw new Error('404');
      return { ok: true, json: async () => ({ models: [{ name: 'qwen3:4b' }] }) };
    });
    await expect(listLocalModels('http://127.0.0.1:11434/v1')).resolves.toEqual(['qwen3:4b']);
    expect(seen[1]).toBe('http://127.0.0.1:11434/api/tags');
  });

  it('服务在线但没有模型返回空数组（不是 null）', async () => {
    vi.stubGlobal('fetch', async () => ({ ok: true, json: async () => ({ models: [] }) }));
    await expect(listLocalModels('http://127.0.0.1:11434/v1')).resolves.toEqual([]);
  });

  it('两个口都不通返回 null，空地址直接 null 且不发请求', async () => {
    vi.stubGlobal('fetch', async () => { throw new Error('ECONNREFUSED'); });
    await expect(listLocalModels('http://127.0.0.1:11434/v1')).resolves.toBeNull();

    const spy = vi.fn();
    vi.stubGlobal('fetch', spy);
    await expect(listLocalModels('  ')).resolves.toBeNull();
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('Markdown 清理（本地小模型爱写 ** 和 ## ）', () => {
  it('去掉加粗、标题、无序列表符号与分隔线，保留正文', () => {
    const raw = '## 结论\n**压力来源**：任务太多。\n\n---\n\n- 先排序\n- 再沟通\n\n1. 别硬扛';
    const out = stripLightMarkdown(raw);
    expect(out).not.toContain('**');
    expect(out).not.toContain('##');
    expect(out).not.toContain('---');
    expect(out).not.toMatch(/^-\s/m);
    expect(out).toContain('压力来源');
    expect(out).toContain('先排序');
    expect(out).toContain('别硬扛');
  });

  it('行首序号保留（分点解读抹掉序号会糊成一段）', () => {
    expect(stripLightMarkdown('1. 先排序\n2. 再沟通')).toContain('1. 先排序');
  });

  it('正常段落原样保留（不误伤）', () => {
    const raw = '抽到黑桃7，像深夜的楼道，声控灯只亮一层。\n\n今天能做的一步：早点关灯。';
    expect(stripLightMarkdown(raw)).toBe(raw);
  });

  it('空值不炸', () => {
    expect(stripLightMarkdown('')).toBe('');
    expect(stripLightMarkdown(null)).toBe('');
    expect(stripLightMarkdown(undefined)).toBe('');
  });
});
