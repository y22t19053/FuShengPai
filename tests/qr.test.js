import { describe, it, expect } from 'vitest';
import { normalizeHexColor } from '../src/utils/qr.js';

describe('normalizeHexColor（qr.js · rgba→hex 归一化）', () => {
  it('hex 原样返回', () => {
    expect(normalizeHexColor('#c9d2e8')).toBe('#c9d2e8');
    expect(normalizeHexColor('#000000')).toBe('#000000');
  });

  it('rgba() 转为 hex（丢弃 alpha）', () => {
    expect(normalizeHexColor('rgba(21,17,41,0.45)')).toBe('#151129');
    expect(normalizeHexColor('rgba(236,227,207,0.5)')).toBe('#ece3cf');
  });

  it('rgb() 转为 hex', () => {
    expect(normalizeHexColor('rgb(255,0,0)')).toBe('#ff0000');
    expect(normalizeHexColor('rgb(0, 128, 255)')).toBe('#0080ff');
  });

  it('边界：越界值钳制到 0-255', () => {
    expect(normalizeHexColor('rgba(300,20,10,1)')).toBe('#ff140a');
  });

  it('空值/非字符串原样返回', () => {
    expect(normalizeHexColor(null)).toBe(null);
    expect(normalizeHexColor(undefined)).toBe(undefined);
    expect(normalizeHexColor(42)).toBe(42);
  });

  it('无法识别格式原样返回', () => {
    expect(normalizeHexColor('blue')).toBe('blue');
    expect(normalizeHexColor('')).toBe('');
  });
});
