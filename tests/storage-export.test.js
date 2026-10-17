import { describe, it, expect, afterEach } from 'vitest';
import { saveApiSettings, clearApiSettings, exportAllDataJson } from '../src/storage.js';

afterEach(() => {
  clearApiSettings();
});

describe('exportAllDataJson 备份脱敏', () => {
  it('默认不导出 apiKey 与自定义请求头', () => {
    saveApiSettings({
      provider: 'deepseek',
      endpoint: 'https://api.deepseek.com/v1',
      model: 'deepseek-chat',
      apiKey: 'sk-test-secret',
      headers: { 'X-Test': '1' }
    });
    const data = JSON.parse(exportAllDataJson());
    expect(data.settings.endpoint).toBe('https://api.deepseek.com/v1');
    expect(data.settings.model).toBe('deepseek-chat');
    expect(data.settings.apiKey).toBeUndefined();
    expect(data.settings.headers).toBeUndefined();
    expect(data.settings).not.toHaveProperty('apiKey');
  });

  it('显式 includeSecrets 时才导出密钥与请求头', () => {
    saveApiSettings({
      endpoint: 'https://example.com/v1',
      apiKey: 'sk-test-secret',
      headers: { Authorization: 'Bearer sk-test-secret' }
    });
    const data = JSON.parse(exportAllDataJson({ includeSecrets: true }));
    expect(data.settings.apiKey).toBe('sk-test-secret');
    expect(data.settings.headers.Authorization).toBe('Bearer sk-test-secret');
  });

  it('没有配置 API 时 settings 为 null', () => {
    const data = JSON.parse(exportAllDataJson());
    expect(data.settings).toBeNull();
  });
});
