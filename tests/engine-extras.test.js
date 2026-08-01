// ===== tests/engine-extras.test.js · 引擎回归测试（大小王数值已统一） =====
import { describe, it, expect } from 'vitest';
import {
  createDeck, shuffle, drawTiYong, getCardValue,
  calcDiff, getDiffMagnitude, getDiffLevel
} from '../src/engine.js';
import { getCardValue as dataGetCardValue } from '../src/data.js';

describe('createDeck 参数语义（回归测试）', () => {
  it('默认包含大小王：54张', () => {
    const deck = createDeck();
    expect(deck.length).toBe(54);
  });

  it('includeJokers=true 时包含大小王', () => {
    expect(createDeck(true)).toHaveLength(54);
  });

  it('includeJokers=false 时不含大小王：52张', () => {
    expect(createDeck(false)).toHaveLength(52);
  });
});

describe('calcDiff 算术差（回归测试）', () => {
  it('巽宫4放梅花5 → 差值 4-5 = -1', () => {
    const card = { suit: '♣', rank: '5', isJoker: false };
    expect(calcDiff(4, card)).toBe(-1);
  });

  it('乾宫6放黑桃A → 差值 6-1 = 5', () => {
    const card = { suit: '♠', rank: 'A', isJoker: false };
    expect(calcDiff(6, card)).toBe(5);
  });

  it('宫位5放小王 → 差值 = 5 - 15 = -10（与统一后数值一致）', () => {
    const joker = { isJoker: true, type: '小王' };
    expect(calcDiff(5, joker)).toBe(-10);
  });

  it('宫位5放大王 → 差值 = 5 - 14 = -9', () => {
    const joker = { isJoker: true, type: '大王' };
    expect(calcDiff(5, joker)).toBe(-9);
  });

  it('getDiffMagnitude 返回绝对值', () => {
    const card = { suit: '♣', rank: '5', isJoker: false };
    expect(getDiffMagnitude(4, card)).toBe(1);
  });
});

describe('getDiffLevel 颜色分级', () => {
  it('abs=0 → 无差', () => {
    const level = getDiffLevel(0);
    expect(level.label).toBe('无差');
  });

  it('abs<=3 → 小差', () => {
    const level = getDiffLevel(-3);
    expect(level.label).toBe('小差');
  });

  it('abs>9 → 巨差', () => {
    const level = getDiffLevel(-10);
    expect(level.label).toBe('巨差');
  });
});

describe('统一大小王数值', () => {
  const jokers = [
    { isJoker: true, type: '大王' },
    { isJoker: true, type: '小王' }
  ];

  it('data.js 和 engine.js 中大小王数值一致', () => {
    for (const card of jokers) {
      expect(dataGetCardValue(card)).toBe(getCardValue(card));
    }
  });

  it('大王=14，小王=15', () => {
    expect(getCardValue(jokers[0])).toBe(14);
    expect(getCardValue(jokers[1])).toBe(15);
  });
});