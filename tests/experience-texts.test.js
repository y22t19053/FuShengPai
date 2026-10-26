import { describe, it, expect } from 'vitest';
import { CARD_IMAGE_POOL, getCardImage, getCardImageLine, SUIT_IMAGE_THEME } from '../src/texts/card-images.js';
import { readQuestion, buildAskGuide, allAskTexts, pickRewrite, ASK_REWRITES, ASK_PIVOTS } from '../src/texts/texts-asking.js';
import {
  FRAME_STEPS, BAD_NEWS_LAYERS, CLOSING_BY_FIELD, SMALL_ACTIONS,
  normalizeField, pickClosing, pickSmallAction, buildFramePrompt,
} from '../src/texts/reading-frame.js';
import { matchRefusal, getRepeatNotice, REFUSAL_TEXTS, REFUSAL_TIERS } from '../src/texts/texts-reject.js';
import { buildSingleCardPrompt } from '../src/services/prompts.js';

describe('card-images 单牌意象库', () => {
  it('54 张牌全部有画面与动作', () => {
    expect(CARD_IMAGE_POOL.length).toBe(54);
    for (const c of CARD_IMAGE_POOL) {
      expect(c.image.length, c.key).toBeGreaterThan(6);
      expect(c.action.length, c.key).toBeGreaterThan(4);
    }
  });

  it('花色 × 点数组合无遗漏', () => {
    const keys = new Set(CARD_IMAGE_POOL.map((c) => c.key));
    for (const suit of ['♠', '♥', '♣', '♦']) {
      for (const rank of ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']) {
        expect(keys.has(`${suit}${rank}`), `${suit}${rank}`).toBe(true);
      }
    }
    expect(keys.has('大王')).toBe(true);
    expect(keys.has('小王')).toBe(true);
  });

  it('getCardImage 按牌面取，未知牌返回 null', () => {
    const it1 = getCardImage({ suit: '♠', rank: '7' });
    expect(it1.domain).toBe(SUIT_IMAGE_THEME['♠'].domain);
    expect(it1.image).toContain('楼道');
    expect(getCardImage({ isJoker: true, type: '大王' }).domain).toBe('局外');
    expect(getCardImage({ suit: '♠', rank: 'Z' })).toBe(null);
    expect(getCardImage(null)).toBe(null);
    expect(getCardImageLine({ suit: '♥', rank: 'A' })).toBe(getCardImage({ suit: '♥', rank: 'A' }).image);
  });

  it('同一牌面取句恒定（不随刷新变）', () => {
    const a = getCardImage({ suit: '♦', rank: 'K' });
    const b = getCardImage({ suit: '♦', rank: 'K' });
    expect(a).toEqual(b);
  });
});

describe('texts-asking 问事校准', () => {
  it('两条路一起问 → multiPath', () => {
    const r = readQuestion('我走 A 还是走 B？');
    expect(r.flags).toContain('multiPath');
  });

  it('去留决定 → decision', () => {
    expect(readQuestion('我要不要辞职？').flags).toContain('decision');
    expect(readQuestion('该不该分手').flags).toContain('decision');
  });

  it('没有时间锚点 → noAnchor；补了锚点就不报', () => {
    expect(readQuestion('我今年能脱单吗？').flags).not.toContain('noAnchor'); // 今年是锚点
    expect(readQuestion('我什么时候能脱单？').flags).toContain('noAnchor');
    expect(readQuestion('未来三个月，我把周末用来认识新的人，这条路能不能走通？').flags).not.toContain('noAnchor');
  });

  it('问别人心思 → others', () => {
    expect(readQuestion('他到底喜不喜欢我？').flags).toContain('others');
    expect(readQuestion('我爸妈会不会同意？').flags).toContain('others');
  });

  it('两个问句打包 → packed', () => {
    expect(readQuestion('考研能过吗？工作好找吗？').flags).toContain('packed');
  });

  it('空问题不报，且提示最多两条', () => {
    expect(readQuestion('').hints).toEqual([]);
    expect(readQuestion('我要不要辞职还是继续考公？').hints.length).toBeLessThanOrEqual(2);
  });

  it('拒答类别透传为 refusal 提示', () => {
    const r = readQuestion('我买彩票能中奖吗？', { refusal: true });
    expect(r.flags).toContain('refusal');
    expect(r.ok).toBe(false);
  });

  it('buildAskGuide 结构完整，示例固定三组不同领域', () => {
    const g = buildAskGuide();
    expect(g.principle).toContain('平均数');
    expect(g.rules.length).toBe(4);
    expect(g.steps.length).toBe(5);
    expect(g.samples.length).toBe(3);
    expect(new Set(g.samples.map((s) => s.field)).size).toBe(3);
    expect(g.pivots.length).toBe(Object.keys(ASK_PIVOTS).length);
  });

  it('改写对照表每组都有 why 与 better，且确定性取句稳定', () => {
    for (const r of ASK_REWRITES) {
      expect(r.bad.length).toBeGreaterThan(3);
      expect(r.why.length).toBeGreaterThan(6);
      expect(r.better.length).toBeGreaterThan(6);
    }
    expect(pickRewrite('seed-x')).toBe(pickRewrite('seed-x'));
    expect(allAskTexts().length).toBeGreaterThan(40);
  });
});

describe('reading-frame 六步骨架', () => {
  it('六步顺序固定，且以「推回决定权」收尾', () => {
    expect(FRAME_STEPS.length).toBe(6);
    expect(FRAME_STEPS[0].id).toBe('verdict');
    expect(FRAME_STEPS[FRAME_STEPS.length - 1].id).toBe('handback');
    expect(BAD_NEWS_LAYERS.length).toBe(4);
  });

  it('normalizeField 中英文都能归一', () => {
    expect(normalizeField('love')).toBe('love');
    expect(normalizeField('wealth')).toBe('money');
    expect(normalizeField('career')).toBe('work');
    expect(normalizeField('感情')).toBe('love');
    expect(normalizeField('人际')).toBe('relation');
    expect(normalizeField('')).toBe('self');
  });

  it('每个领域都能取到收尾句，且属于该领域', () => {
    for (const field of Object.keys(CLOSING_BY_FIELD)) {
      const line = pickClosing(field, 'seed-1');
      expect(CLOSING_BY_FIELD[field]).toContain(line);
    }
    expect(pickClosing('love', 'a')).toBe(pickClosing('love', 'a'));
  });

  it('小动作池可确定性取句', () => {
    expect(SMALL_ACTIONS).toContain(pickSmallAction('seed-2'));
    expect(pickSmallAction('s')).toBe(pickSmallAction('s'));
  });

  it('buildFramePrompt 带上六步、四层坏消息与收尾话术', () => {
    const p = buildFramePrompt('love');
    for (const s of FRAME_STEPS) expect(p).toContain(s.name);
    expect(p).toContain('坏消息要说四层');
    expect(p).toContain('决定权');
    expect(p).toContain(CLOSING_BY_FIELD.love[0]);
  });
});

describe('texts-reject 拒答与重复提问', () => {
  it('命中五类拒答并给出可答替换问法', () => {
    const death = matchRefusal('我不想活了');
    expect(death.hit).toBe(true);
    expect(death.type).toBe('death');
    expect(death.pivot).toContain('今天');
    expect(matchRefusal('这个手术要花多少钱').type).toBe('medical');
    expect(matchRefusal('谁害我').hit).toBe(true);
    expect(matchRefusal('我买彩票能中奖吗').type).toBe('gamble');
  });

  it('普通问题不误伤', () => {
    const r = matchRefusal('未来三个月我该先做哪件事');
    expect(r.hit).toBe(false);
    expect(matchRefusal('').hit).toBe(false);
  });

  it('每类都有两条以上回应与一条替换问法', () => {
    for (const [type, item] of Object.entries(REFUSAL_TEXTS.keywords)) {
      expect(item.responses.length, type).toBeGreaterThanOrEqual(2);
      expect(item.pivot.length, type).toBeGreaterThan(6);
    }
    expect(Object.keys(REFUSAL_TIERS)).toEqual(['light', 'mid', 'heavy']);
  });

  it('重复提问按次数给不同话术', () => {
    expect(getRepeatNotice(1)).toContain('刚问过');
    expect(getRepeatNotice(3)).toContain('较劲');
    expect(getRepeatNotice(0)).toBe('');
  });
});

describe('提示词注入（经验落地到 AI）', () => {
  it('单牌提示词同时带上文案标准、六步骨架与这张牌的画面', () => {
    const p = buildSingleCardPrompt({ suit: '♠', rank: '7' }, { fortuneType: 'love' });
    expect(p).toContain('浮生牌文案标准');
    expect(p).toContain('解读骨架');
    expect(p).toContain(getCardImage({ suit: '♠', rank: '7' }).image);
    expect(p).toContain('决定权');
  });
});
