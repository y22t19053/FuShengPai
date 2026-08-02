import { describe, it, expect } from 'vitest';
import { resolveApiModel } from '../src/utils/api-config.js';

describe('resolveApiModel', () => {
  it('优先使用用户输入的模型名', () => {
    expect(resolveApiModel('deepseek', 'custom-model', 'deepseek-chat')).toBe('custom-model');
  });

  it('当用户未填写时，回退到供应商默认模型', () => {
    expect(resolveApiModel('deepseek', '', 'deepseek-chat')).toBe('deepseek-chat');
  });

  it('在没有任何模型信息时返回空字符串', () => {
    expect(resolveApiModel('custom', '', '')).toBe('');
  });
});
