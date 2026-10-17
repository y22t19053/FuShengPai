import { describe, it, expect } from 'vitest';
import { normalizeEndpoint, buildUrl, buildGeminiUrl } from '../src/ai.js';

describe('normalizeEndpoint', () => {
  it('去掉空格、末尾斜杠和结尾的 /v1', () => {
    expect(normalizeEndpoint(' https://api.deepseek.com/v1/ ')).toBe('https://api.deepseek.com');
    expect(normalizeEndpoint('https://api.deepseek.com/v1')).toBe('https://api.deepseek.com');
    expect(normalizeEndpoint('https://api.deepseek.com/')).toBe('https://api.deepseek.com');
  });

  it('保留完整 chat/completions 路径', () => {
    expect(normalizeEndpoint('https://api.deepseek.com/v1/chat/completions'))
      .toBe('https://api.deepseek.com/v1/chat/completions');
  });

  it('空值返回空串', () => {
    expect(normalizeEndpoint('')).toBe('');
    expect(normalizeEndpoint(null)).toBe('');
  });
});

describe('buildUrl', () => {
  it('末尾带 /v1/ 不再拼出 /v1/v1（回归）', () => {
    expect(buildUrl('https://api.deepseek.com/v1/', 'deepseek'))
      .toBe('https://api.deepseek.com/v1/chat/completions');
  });

  it('末尾带 /v1 也正确', () => {
    expect(buildUrl('https://api.deepseek.com/v1', 'deepseek'))
      .toBe('https://api.deepseek.com/v1/chat/completions');
  });

  it('裸域名补全 /v1/chat/completions', () => {
    expect(buildUrl('https://api.deepseek.com', 'deepseek'))
      .toBe('https://api.deepseek.com/v1/chat/completions');
  });

  it('已经是 chat/completions 时不重复拼接', () => {
    expect(buildUrl('https://api.deepseek.com/v1/chat/completions', 'openai'))
      .toBe('https://api.deepseek.com/v1/chat/completions');
  });

  it('Claude：/v1 与 /v1/messages 都归一到 /v1/messages', () => {
    expect(buildUrl('https://api.anthropic.com/v1', 'claude'))
      .toBe('https://api.anthropic.com/v1/messages');
    expect(buildUrl('https://api.anthropic.com/v1/', 'claude'))
      .toBe('https://api.anthropic.com/v1/messages');
    expect(buildUrl('https://api.anthropic.com/v1/messages', 'claude'))
      .toBe('https://api.anthropic.com/v1/messages');
  });

  it('空地址抛错', () => {
    expect(() => buildUrl('', 'deepseek')).toThrow('API 地址不能为空');
  });
});

describe('buildGeminiUrl', () => {
  it('自定义 endpoint 去掉末尾斜杠', () => {
    expect(buildGeminiUrl('https://example.com/v1beta/', 'gemini', 'gemini-2.0-flash'))
      .toBe('https://example.com/v1beta/models/gemini-2.0-flash:generateContent');
  });

  it('缺省 endpoint 回落到官方 v1beta', () => {
    expect(buildGeminiUrl('', 'gemini', 'gemini-2.0-flash'))
      .toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent');
  });
});
