import { describe, it, expect } from 'vitest';
import { BANNED_WORDS, RULES, auditText, buildStandardsPrompt } from '../src/texts/standards.js';
import { FOOTER_NOTES } from '../src/share2/style.js';
import { HOUR_POOL } from '../src/texts/hour-pools.js';
import { MOOD_BY_WX, JIANGCHU, CHONG, COMBO } from '../src/texts/daily-oracle.js';
import { STATUS_POOL, REMINDER_POOL, ACTION_POOL } from '../src/texts/index.js';
import { DAILY_MIRROR_LINES } from '../src/texts/mirror-pools.js';

describe('standards 文案标准', () => {
  it('四组禁用词表非空', () => {
    expect(BANNED_WORDS.ancient.length).toBeGreaterThan(0);
    expect(BANNED_WORDS.fear.length).toBeGreaterThan(0);
    expect(BANNED_WORDS.chickenSoup.length).toBeGreaterThan(0);
    expect(BANNED_WORDS.probing.length).toBeGreaterThan(0);
  });

  it('auditText：命中返回 hit，干净文本返回 ok', () => {
    expect(auditText('天机不可泄露').ok).toBe(false);
    expect(auditText('你是不是最近很累').ok).toBe(false);
    expect(auditText('加油！').ok).toBe(false);
    expect(auditText('今天适合把桌面清空一角。').ok).toBe(true);
  });

  it('buildStandardsPrompt：包含铁律与禁用词示例', () => {
    const prompt = buildStandardsPrompt();
    expect(prompt).toContain('浮生牌文案标准');
    expect(prompt).toContain('不装逼');
    expect(prompt).toMatch(/天机|禁忌|禁词|禁用/);
  });

  it('RULES 四条铁律齐全', () => {
    expect(RULES.map((r) => r.id).sort()).toEqual(['no-archaic', 'no-chicken-soup', 'no-pretension', 'no-probing'].sort());
  });
});

// —— 全库文案质量审查：所有用户可见文案池不得踩禁用词 ——
describe('全库文案审查（BANNED 词表扫描）', () => {
  const allTexts = [
    ...Object.values(FOOTER_NOTES).flat().map((t) => ({ src: 'FOOTER_NOTES', text: t })),
    ...HOUR_POOL.flatMap((h) => h.lines.map((t) => ({ src: 'HOUR_POOL', text: t }))),
    ...Object.values(MOOD_BY_WX).flat().flatMap((m) => [m.title, m.text].map((t) => ({ src: 'MOOD_BY_WX', text: t }))),
    ...JIANGCHU.map((j) => ({ src: 'JIANGCHU', text: j.text })),
    ...CHONG.map((c) => ({ src: 'CHONG', text: c.text })),
    ...COMBO.map((c) => ({ src: 'COMBO', text: c.text })),
    ...STATUS_POOL.map((t) => ({ src: 'STATUS_POOL', text: t })),
    ...REMINDER_POOL.map((t) => ({ src: 'REMINDER_POOL', text: t })),
    ...ACTION_POOL.map((t) => ({ src: 'ACTION_POOL', text: t })),
    ...DAILY_MIRROR_LINES.map((t) => ({ src: 'DAILY_MIRROR_LINES', text: t })),
  ];

  it('全部文案池零禁用词命中', () => {
    const hits = allTexts
      .map(({ src, text }) => ({ src, text, r: auditText(text) }))
      .filter((x) => !x.r.ok);
    expect(hits).toEqual([]);
  });

  it('文案池数量达标（扩充后）', () => {
    expect(FOOTER_NOTES.length).toBe(32);
    expect(STATUS_POOL.length).toBeGreaterThanOrEqual(20);
    expect(REMINDER_POOL.length).toBeGreaterThanOrEqual(20);
    expect(ACTION_POOL.length).toBeGreaterThanOrEqual(20);
    expect(DAILY_MIRROR_LINES.length).toBeGreaterThanOrEqual(30);
  });
});
