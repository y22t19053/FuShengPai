import { describe, it, expect } from 'vitest';
import { normalizeHexColor, qrSVGHTML } from '../src/utils/qr.js';

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

describe('qrSVGHTML（qr.js · uqr 内联 SVG，分享图二维码）', () => {
  it('返回内联 <svg>（无 <img>，分享图不再依赖 img 克隆）', () => {
    const svg = qrSVGHTML('https://example.com/');
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('<path');
    expect(svg).not.toContain('<img');
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
  });

  it('尺寸参数生效（width/height/viewBox）', () => {
    const svg = qrSVGHTML('https://example.com/', { size: 200 });
    expect(svg).toContain('width="200"');
    expect(svg).toContain('height="200"');
    expect(svg).toContain('viewBox="0 0 200 200"');
  });

  it('深浅色可定制（深码随强调色、浅底恒为可扫白）', () => {
    const svg = qrSVGHTML('https://example.com/', { dark: '#4d8f7e', light: '#FFFFFF' });
    expect(svg).toContain('fill="#4d8f7e"');
    expect(svg).toContain('fill="#FFFFFF"');
  });

  it('不同内容生成不同 path（真二维码，非占位）', () => {
    const a = qrSVGHTML('https://a.example/');
    const b = qrSVGHTML('https://b.example/');
    const pathA = a.match(/<path d="([^"]*)"/)[1];
    const pathB = b.match(/<path d="([^"]*)"/)[1];
    expect(pathA.length).toBeGreaterThan(100);
    expect(pathA).not.toBe(pathB);
  });

  it('空内容不抛错（兜底 SVG）', () => {
    expect(() => qrSVGHTML('')).not.toThrow();
    expect(qrSVGHTML('').startsWith('<svg')).toBe(true);
  });
});
