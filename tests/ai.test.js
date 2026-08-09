import { describe, it, expect } from 'vitest';
import { buildGeminiUrl } from '../src/ai.js';

describe('AI URL builder', () => {
  it('为 Gemini 使用自定义 endpoint 时保留用户配置（apiKey 不再拼进 URL）', () => {
    const url = buildGeminiUrl('https://example.com/v1beta', 'gemini', 'gemini-2.0-flash');
    expect(url).toBe('https://example.com/v1beta/models/gemini-2.0-flash:generateContent');
    expect(url).not.toContain('key=');
  });

  it('Gemini 缺省 endpoint 时回落到官方 v1beta 地址', () => {
    const url = buildGeminiUrl('', 'gemini', 'gemini-2.0-flash');
    expect(url).toContain('generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent');
  });
});
