// ===== tests/mahjong.test.js · 麻将占卜核心（136 牌墙 / 判型 / 天地人合成 / 今日手气） =====
import { describe, it, expect } from 'vitest';
import {
  buildWall, drawFromWall, detectPattern, composeReading,
  TILE_MEANINGS, PATTERN_VERDICTS, fengDirection, composeDailyReading,
  tileName, WALL_COUNT,
} from '../src/mahjong.js';

const t = (suit, num) => ({ suit, num });

describe('牌墙（136 张）', () => {
  it('共 136 张', () => {
    expect(buildWall().length).toBe(WALL_COUNT);
  });

  it('万/条/筒 1-9 各 4 张', () => {
    const wall = buildWall();
    for (const suit of ['wan', 'tiao', 'tong']) {
      for (let num = 1; num <= 9; num++) {
        expect(wall.filter(x => x.suit === suit && x.num === num).length).toBe(4);
      }
    }
  });

  it('东南西北 + 中发白 各 4 张', () => {
    const wall = buildWall();
    for (let num = 1; num <= 4; num++) {
      expect(wall.filter(x => x.suit === 'feng' && x.num === num).length).toBe(4);
    }
    for (let num = 1; num <= 3; num++) {
      expect(wall.filter(x => x.suit === 'jian' && x.num === num).length).toBe(4);
    }
  });

  it('id 唯一', () => {
    const ids = buildWall().map(x => x.id);
    expect(new Set(ids).size).toBe(136);
  });

  it('drawFromWall 弹 n 张并缩减牌墙', () => {
    const wall = buildWall();
    const { drawn, wall: rest } = drawFromWall(wall, 3);
    expect(drawn.length).toBe(3);
    expect(rest.length).toBe(133);
  });

  it('tileName 牌面名', () => {
    expect(tileName(t('wan', 1))).toBe('一万');
    expect(tileName(t('tiao', 1))).toBe('幺鸡');
    expect(tileName(t('tong', 3))).toBe('三筒');
    expect(tileName(t('feng', 1))).toBe('东');
    expect(tileName(t('jian', 2))).toBe('发');
  });
});

describe('牌型判定 detectPattern', () => {
  it('刻子：三张同数', () => {
    expect(detectPattern([t('wan', 3), t('wan', 3), t('wan', 3)])).toBe('kezi');
  });

  it('顺子：三张相连同花色', () => {
    expect(detectPattern([t('wan', 4), t('wan', 5), t('wan', 6)])).toBe('shunzi');
    // 不同花色连数不算顺子
    expect(detectPattern([t('wan', 4), t('tiao', 5), t('tong', 6)])).not.toBe('shunzi');
  });

  it('对子：两张相同', () => {
    expect(detectPattern([t('wan', 3), t('wan', 3), t('tong', 7)])).toBe('duizi');
    expect(detectPattern([t('wan', 3), t('wan', 3)])).toBe('duizi');
  });

  it('三元：中发白各一', () => {
    expect(detectPattern([t('jian', 1), t('jian', 2), t('jian', 3)])).toBe('sanyuan');
  });

  it('杂牌：不成型', () => {
    expect(detectPattern([t('wan', 3), t('tiao', 5), t('tong', 8)])).toBe('zapai');
    expect(detectPattern([t('wan', 1), t('wan', 4), t('wan', 7)])).toBe('zapai');
  });

  it('概率粗验：杂牌占绝对多数（~93%）', () => {
    const wall = buildWall();
    let zapai = 0;
    const N = 3000;
    for (let i = 0; i < N; i++) {
      const { drawn } = drawFromWall(wall, 3);
      if (detectPattern(drawn) === 'zapai') zapai++;
    }
    expect(zapai / N).toBeGreaterThan(0.85); // 93% ± 容差
  });
});

describe('34 张单牌义', () => {
  it('总数 34，每张有本义/宜/忌', () => {
    expect(Object.keys(TILE_MEANINGS).length).toBe(34);
    for (const m of Object.values(TILE_MEANINGS)) {
      expect(m.meaning.length).toBeGreaterThan(0);
      expect(m.yi.length).toBeGreaterThan(0);
      expect(m.ji.length).toBeGreaterThan(0);
    }
  });

  it('判词五类齐备', () => {
    for (const k of ['kezi', 'shunzi', 'duizi', 'zapai', 'sanyuan']) {
      expect(PATTERN_VERDICTS[k].text.length).toBeGreaterThan(0);
    }
    expect(PATTERN_VERDICTS.zapai.text).toBe('牌不成型，事无定数。');
    expect(PATTERN_VERDICTS.kezi.text).toBe('三张同数，定数已成。');
  });
});

describe('天地人合成', () => {
  it('位置映射：一=天 二=地 三=人', () => {
    const r = composeReading([t('wan', 1), t('tiao', 5), t('tong', 9)]);
    expect(r.parts[0].position.name).toBe('天牌');
    expect(r.parts[1].position.name).toBe('地牌');
    expect(r.parts[2].position.name).toBe('人牌');
    expect(r.pattern).toBe('zapai');
  });

  it('宜忌合成一句，绝不叠加吉', () => {
    const r = composeReading([t('wan', 1), t('tiao', 5), t('tong', 9)]);
    expect(r.advice).toMatch(/^宜：.+。忌：.+。$/);
    expect(r.advice).not.toContain('大吉大利');
  });

  it('收尾是送客词', () => {
    const r = composeReading([t('wan', 1), t('tiao', 5), t('tong', 9)]);
    expect(r.closing).toBe('牌已定，事在人。明日再来摸一张。');
  });

  it('天命：刻子/三元标记 heaven', () => {
    expect(composeReading([t('wan', 3), t('wan', 3), t('wan', 3)]).heaven).toBe(true);
    expect(composeReading([t('jian', 1), t('jian', 2), t('jian', 3)]).heaven).toBe(true);
    expect(composeReading([t('wan', 1), t('tiao', 5), t('tong', 9)]).heaven).toBe(false);
  });
});

describe('今日手气（单张版）', () => {
  it('永远只说守，不说搏', () => {
    const { drawn } = drawFromWall(buildWall(), 1);
    const r = composeDailyReading(drawn[0]);
    expect(r.verdict).toBe('今日财气平稳，宜守不宜搏。');
    expect(r.verdict).not.toContain('赢钱');
  });

  it('财神方位：风牌定方位', () => {
    expect(fengDirection(t('feng', 1))).toBe('东方');
    expect(fengDirection(t('feng', 3))).toBe('西方');
  });

  it('财神方位：五行推（万=金→西，条=木→东，筒=水→北）', () => {
    expect(fengDirection(t('wan', 5))).toBe('西方');
    expect(fengDirection(t('tiao', 5))).toBe('东方');
    expect(fengDirection(t('tong', 5))).toBe('北方');
  });
});
