// ===== tests/engines.test.js · 四引擎统一契约测试（阶段 3） =====
// 验证：每个引擎暴露 { id, name, description, inputConfig, calc }；calc 为纯函数；
// 统一入口 getEngine/runEngine/listEngines 行为正确。

import { describe, it, expect } from 'vitest';
import {
  ENGINES, getEngine, runEngine, listEngines,
} from '../src/engines/index.js';
import { pokerEngine } from '../src/engines/poker.js';
import { mahjongEngine, calcMahjongDraw } from '../src/engines/mahjong.js';
import { paigeEngine } from '../src/engines/paige.js';
import { dailyEngine } from '../src/engines/daily.js';

// 测试用牌
const card = { suit: '♠', rank: '7', isJoker: false };
const joker = { isJoker: true, type: '大王' };
const mjTile = { suit: 'wan', num: 5, name: '五万' };
const mjTiles = [
  { suit: 'wan', num: 1, name: '一万' },
  { suit: 'tiao', num: 2, name: '二条' },
  { suit: 'tong', num: 3, name: '三筒' },
];

describe('四引擎统一契约（阶段 3）', () => {
  it('注册表包含 4 个引擎：poker/mahjong/paige/daily', () => {
    expect(ENGINES.map(e => e.id).sort()).toEqual(['daily', 'mahjong', 'paige', 'poker']);
  });

  it('每个引擎都暴露 { id, name, description, inputConfig, calc } 契约', () => {
    for (const e of ENGINES) {
      expect(typeof e.id).toBe('string');
      expect(typeof e.name).toBe('string');
      expect(typeof e.description).toBe('string');
      expect(e.inputConfig).toBeTypeOf('object');
      expect(typeof e.calc).toBe('function');
    }
  });

  it('inputConfig 声明了必填输入与默认值', () => {
    expect(pokerEngine.inputConfig.card.required).toBe(true);
    expect(mahjongEngine.inputConfig.mode.default).toBe('three');
    expect(dailyEngine.inputConfig.fortuneType.default).toBe('overall');
    expect(paigeEngine.inputConfig.card.required).toBe(true);
  });
});

describe('getEngine / runEngine / listEngines 统一入口', () => {
  it('getEngine 返回对应引擎', () => {
    expect(getEngine('poker')).toBe(pokerEngine);
    expect(getEngine('mahjong')).toBe(mahjongEngine);
    expect(getEngine('paige')).toBe(paigeEngine);
    expect(getEngine('daily')).toBe(dailyEngine);
    expect(getEngine('nope')).toBeNull();
  });

  it('runEngine 分发到对应引擎 calc', () => {
    const r = runEngine('poker', { card, fortuneType: 'overall', periodLabel: '日运' });
    expect(r.card).toEqual(card);
    expect(r.persona.title).toContain('♠7');
    expect(r.fortune.grade).toBeTruthy();
    expect(r.metaphor).toContain('【日运');
  });

  it('runEngine 对未知引擎抛错', () => {
    expect(() => runEngine('nope', {})).toThrow(/未知引擎/);
  });

  it('listEngines 返回元信息（不含 calc）', () => {
    const list = listEngines();
    expect(list).toHaveLength(4);
    for (const e of list) {
      expect(e.calc).toBeUndefined();
      expect(e.inputConfig).toBeTypeOf('object');
    }
  });
});

describe('poker 引擎', () => {
  it('calc 返回超集：card/wx/persona/fortune/metaphor', () => {
    const r = pokerEngine.calc({ card });
    expect(r.card).toEqual(card);
    expect(r.wx).toBeTruthy();
    expect(r.persona.title).toContain('♠7');
    expect(r.fortune.typeKey).toBe('overall');
    expect(r.fortune.typeLabel).toBeTruthy();
    expect(r.metaphor).toContain('7♠');
  });

  it('支持细选类别 fortuneType', () => {
    const r = pokerEngine.calc({ card, fortuneType: 'wealth', periodLabel: '月运' });
    expect(r.fortune.typeKey).toBe('wealth');
    expect(r.metaphor).toContain('【月运 · 财运');
  });

  it('periodLabel 缺省为日运', () => {
    const r = pokerEngine.calc({ card, fortuneType: 'study' });
    expect(r.metaphor).toContain('【日运 · 学业');
  });

  it('大王走 JOKER 分支', () => {
    const r = pokerEngine.calc({ card: joker });
    expect(r.persona.title).toContain('大王');
    expect(r.wx).toBe('天');
  });

  it('空输入返回 null', () => {
    expect(pokerEngine.calc(null)).toBeNull();
    expect(pokerEngine.calc({})).toBeNull();
  });
});

describe('mahjong 引擎', () => {
  it('three 模式返回 composeReading 结构', () => {
    const r = mahjongEngine.calc({ mode: 'three', tiles: mjTiles });
    expect(r.mode).toBe('three');
    expect(r.reading.pattern).toBeTruthy();
    expect(r.reading.parts).toHaveLength(3);
    expect(r.reading.advice).toMatch(/^宜：.+。忌：.+。$/);
  });

  it('daily 模式返回 composeDailyReading 结构', () => {
    const r = mahjongEngine.calc({ mode: 'daily', tile: mjTile });
    expect(r.mode).toBe('daily');
    expect(r.reading.name).toBeTruthy();
    expect(r.reading.direction).toBeTruthy();
    expect(r.reading.verdict).toBeTruthy();
  });

  it('tiles 超过 3 张只取前 3', () => {
    const many = [...mjTiles, { suit: 'jian', num: 1 }];
    const r = mahjongEngine.calc({ tiles: many });
    expect(r.reading.parts).toHaveLength(3);
  });

  it('非法输入返回 null', () => {
    expect(mahjongEngine.calc({})).toBeNull();
    expect(mahjongEngine.calc({ mode: 'daily', tile: null })).toBeNull();
  });

  it('calcMahjongDraw 生成墙并摸牌', () => {
    const { wall, tiles } = calcMahjongDraw(3);
    expect(wall.length).toBe(133); // 摸走后剩余
    expect(tiles).toHaveLength(3);
  });
});

describe('paige 引擎', () => {
  it('calc 返回 question/persona/quote/hashtags', () => {
    const r = paigeEngine.calc({ card });
    expect(r.card).toEqual(card);
    expect(r.question.title).toBeTruthy();
    expect(r.question.question).toBeTruthy();
    expect(r.persona.title).toContain('♠7');
    expect(r.quote.text).toBeTruthy();
    expect(r.quote.author).toBeTruthy();
    expect(r.hashtags).toContain('#浮生牌');
  });

  it('大王走 JOKER 课题分支', () => {
    const r = paigeEngine.calc({ card: joker });
    expect(r.question.title).toBeTruthy();
    expect(r.hashtags).toContain('#浮生牌');
  });

  it('空输入返回 null', () => {
    expect(paigeEngine.calc(null)).toBeNull();
  });
});

describe('daily 引擎', () => {
  it('无牌时返回 oracle（黄历）', () => {
    const r = dailyEngine.calc({ wx: '土', dateStr: '2026-08-06' });
    expect(r.oracle.wx).toBe('土');
    expect(r.oracle.jianchu.name).toBeTruthy();
    expect(Array.isArray(r.oracle.yi)).toBe(true);
    expect(Array.isArray(r.oracle.ji)).toBe(true);
    expect(r.fortune).toBeNull();
  });

  it('有牌时叠加单牌运势', () => {
    const r = dailyEngine.calc({ card, dateStr: '2026-08-06' });
    expect(r.oracle.jianchu.name).toBeTruthy();
    expect(r.fortune.typeKey).toBe('overall');
  });

  it('日期缺省时用今天（不抛错）', () => {
    const r = dailyEngine.calc({ wx: '金' });
    expect(r.oracle.wx).toBe('金');
  });
});
