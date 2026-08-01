import { describe, it, expect } from 'vitest';
import { createDeck, calcDiff, getCardValue, getDiffLevel, getDiffMagnitude } from '../src/engine.js';

describe('createDeck 参数语义（回归测试）', () => {
  it('默认 createDeck() → 54 张含 2 王', () => {
    const d = createDeck();
    expect(d).toHaveLength(54);
    expect(d.filter(c => c.isJoker)).toHaveLength(2);
  });

  it('createDeck(false) → 52 张无王（一键起局旧契约）', () => {
    const d = createDeck(false);
    expect(d).toHaveLength(52);
    expect(d.filter(c => c.isJoker)).toHaveLength(0);
  });

  it('createDeck(true) → 54 张含 2 王（手动模式旧契约）', () => {
    const d = createDeck(true);
    expect(d.filter(c => c.isJoker)).toHaveLength(2);
  });
});

describe('calcDiff 算术差（回归测试）', () => {
  it('巽宫4放梅花5 → 差值 4-5 = -1', () => {
    const card = { rank: '5', suit: '♣' };
    expect(calcDiff(4, card)).toBe(-1);
  });

  it('乾宫6放黑桃A → 差值 6-1 = 5', () => {
    const card = { rank: 'A', suit: '♠' };
    expect(calcDiff(6, card)).toBe(5);
  });

  it('大小王算 0 → 宫位5放小王 = 5', () => {
    const joker = { isJoker: true, type: '小王' };
    expect(calcDiff(5, joker)).toBe(5);
  });

  it('getDiffMagnitude 返回绝对值', () => {
    const card = { rank: 'K', suit: '♥' }; // 13
    expect(getDiffMagnitude(4, card)).toBe(9);
  });
});

describe('getDiffLevel 颜色分级', () => {
  it('0 → 灰色', () => {
    expect(getDiffLevel(0).color).toBe('#9ca3af');
  });
  it('2 → 绿色（小差）', () => {
    expect(getDiffLevel(2).color).toBe('#10b981');
  });
  it('12 → 红色（巨差）', () => {
    expect(getDiffLevel(12).color).toBe('#ef4444');
  });
});