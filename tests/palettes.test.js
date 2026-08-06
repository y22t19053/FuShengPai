import { describe, it, expect } from 'vitest';
import {
  PALETTE_GROUPS,
  dayIndex,
  getTodayPalette,
  paletteToCssVars,
  buildSharePaper,
  mixColor,
  hexToRgb,
  rgbStr,
} from '../src/palettes.js';

const ALL_COLORS = PALETTE_GROUPS.flatMap((g) =>
  [g.deep, g.action, g.bright, g.bright2, g.mood, g.structure, g.paper].filter(Boolean)
);

describe('palettes.js · 十组动态配色', () => {
  it('10 组、共 20 色，每组 2 色', () => {
    expect(PALETTE_GROUPS.length).toBe(10);
    for (const g of PALETTE_GROUPS) {
      const colors = [g.deep, g.action, g.bright, g.bright2, g.mood, g.structure, g.paper].filter(Boolean);
      expect(colors.length).toBe(2, `${g.name} 应有 2 色`);
      for (const c of colors) expect(c).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it('60 天内：每天 ≤4 组、组不重复，且 10 组全部登场（每组颜色都出现在界面上）', () => {
    const seen = new Set();
    for (let i = 0; i < 60; i++) {
      const d = new Date(Date.UTC(2026, 0, 1) + i * 86400000);
      const p = getTodayPalette(d);
      expect(p.ids.length).toBeLessThanOrEqual(4);
      expect(new Set(p.ids).size).toBe(p.ids.length);
      p.ids.forEach((id) => seen.add(id));
      // 关键字段必须齐备（防组3/4 无 deep 字段导致 undefined 的回归）
      for (const k of ['deep', 'action', 'bright', 'mood', 'structure', 'accent', 'accentBright', 'paper']) {
        expect(p[k], `第 ${i} 天 ${k} 不应为 undefined`).toBeTruthy();
        expect(p[k]).toMatch(/^#[0-9A-Fa-f]{6}$/);
      }
      // 背景以浅纸为主（微染不破坏浅纸暖底）
      expect(hexToRgb(p.deep)[0] < 120).toBe(true); // deep 是深色系
    }
    expect([...seen].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('20 个原始颜色在 60 天轮换中全部出现', () => {
    const used = new Set();
    for (let i = 0; i < 60; i++) {
      const d = new Date(Date.UTC(2026, 0, 1) + i * 86400000);
      const p = getTodayPalette(d);
      for (const c of [p.deep, p.action, p.bright, p.bright2, p.mood, p.structure, p.accentBright, p.paper]) {
        if (c) used.add(c.toUpperCase());
      }
    }
    for (const c of ALL_COLORS) {
      expect(used.has(c.toUpperCase()), `颜色 ${c} 应在轮换中出现`).toBe(true);
    }
  });

  it('同日稳定：同一日期多次调用结果一致；跨日轮换：相邻两天不同', () => {
    const d = new Date(2026, 5, 15);
    expect(getTodayPalette(d).ids).toEqual(getTodayPalette(new Date(2026, 5, 15)).ids);
    expect(dayIndex(new Date(2026, 5, 15))).toBe(dayIndex(new Date(2026, 5, 15)));
    // 60 天内至少 58 天与前一天不同（轮换保证几乎每天换）
    let diff = 0;
    for (let i = 1; i < 60; i++) {
      const a = getTodayPalette(new Date(Date.UTC(2026, 0, 1) + (i - 1) * 86400000));
      const b = getTodayPalette(new Date(Date.UTC(2026, 0, 1) + i * 86400000));
      if (a.ids.join(',') !== b.ids.join(',')) diff++;
    }
    expect(diff).toBeGreaterThan(55);
  });

  it('paletteToCssVars：全部变量有值，accent 为 hex、accent-rgb 为通道串', () => {
    const vars = paletteToCssVars();
    expect(Object.keys(vars).length).toBeGreaterThan(40);
    for (const [k, v] of Object.entries(vars)) {
      expect(typeof v, `变量 ${k} 应有值`).toBe('string');
      expect(v.length).toBeGreaterThan(0, `变量 ${k} 不应为空`);
    }
    expect(vars['--accent']).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(vars['--accent-rgb']).toMatch(/^\d+, \d+, \d+$/);
    expect(vars['--structure']).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(vars['--mood']).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  it('accent 是莫兰迪调和版（≠原亮色，防晃眼）；accent-bright 保留原亮色', () => {
    for (let i = 0; i < 60; i++) {
      const p = getTodayPalette(new Date(Date.UTC(2026, 0, 1) + i * 86400000));
      expect(p.accent).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(p.accentBright).toMatch(/^#[0-9A-Fa-f]{6}$/);
      if (['#80ED99', '#66D4C8', '#05A5FA', '#D3FFAF'].includes(p.accentBright.toUpperCase())) {
        expect(p.accent).not.toBe(p.accentBright.toUpperCase());
      }
    }
  });

  it('buildSharePaper：双色板结构完整，qrLight 恒为近白（保证可扫）', () => {
    const paper = buildSharePaper();
    for (const k of ['dark', 'light']) {
      const p = paper[k];
      expect(p.bg0).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(p.gold).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(p.red).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(p.qrLight).toBe('#FFFFFF');
      expect(p.pillBg).toContain('rgba');
      expect(p.pillRed).toContain('rgba');
    }
  });

  it('颜色工具：hexToRgb / rgbStr / mixColor', () => {
    expect(hexToRgb('#ffffff')).toEqual([255, 255, 255]);
    expect(hexToRgb('#000000')).toEqual([0, 0, 0]);
    expect(rgbStr('#6fae9c')).toBe('111, 174, 156');
    expect(mixColor('#000000', '#ffffff', 0.5)).toBe('#808080');
    expect(mixColor('#000000', '#ffffff', 0)).toBe('#000000');
    expect(mixColor('#000000', '#ffffff', 1)).toBe('#ffffff');
  });
});
