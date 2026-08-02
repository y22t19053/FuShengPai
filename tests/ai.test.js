import { describe, it, expect } from 'vitest';
import { buildGeminiUrl } from '../src/ai.js';

describe('AI URL builder', () => {
  it('为 Gemini 使用自定义 endpoint 时保留用户配置', () => {
    const url = buildGeminiUrl('https://example.com/v1beta', 'gemini', 'gemini-2.0-flash', 'abc');
    expect(url).toContain('https://example.com/v1beta/models/gemini-2.0-flash:generateContent?key=abc');
  });
});
