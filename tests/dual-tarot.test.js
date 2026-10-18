import { describe, it, expect } from 'vitest';
import { TAROT_DECK } from '../src/dual/tarot.js';
import {
  makeRoom, makeVoucher, encodeVoucher, decodeVoucher, cardsFromVoucher,
  buildReading, visibleForTier, buildReceiptText,
} from '../src/dual/room.js';

describe('tarot mode (记录牌面，不解读)', () => {
  it('塔罗牌是 78 张，id 唯一', () => {
    expect(TAROT_DECK).toHaveLength(78);
    const ids = new Set(TAROT_DECK.map((c) => c.id));
    expect(ids.size).toBe(78);
    expect(TAROT_DECK.filter((c) => c.arcana === 'major')).toHaveLength(22);
  });

  it('塔罗房间：三张牌 + 正逆位 + 位置', () => {
    const room = makeRoom({ hostName: '测试', deck: 'tarot', area: '感情' });
    expect(room.deck).toBe('tarot');
    const cards = [
      { ...TAROT_DECK[0], orientation: 1 },
      { ...TAROT_DECK[22], orientation: -1 },
      { ...TAROT_DECK[60], orientation: 1 },
    ];
    const reading = buildReading(room, cards);
    expect(reading.deck).toBe('tarot');
    expect(reading.cards.map((c) => c.positionLabel)).toEqual(['当下', '阻碍', '建议']);
    expect(reading.cards[1].orientationLabel).toBe('逆位');
  });

  it('塔罗凭证可编码/解码并复现同一牌面', () => {
    const room = makeRoom({ hostName: '测试', deck: 'tarot' });
    const cards = [
      { ...TAROT_DECK[3], orientation: -1 },
      { ...TAROT_DECK[40], orientation: 1 },
      { ...TAROT_DECK[77], orientation: 1 },
    ];
    const voucher = makeVoucher(room.code, cards, '要不要换工作');
    const decoded = decodeVoucher(encodeVoucher(voucher));
    expect(decoded.d).toBe('tarot');
    const restored = cardsFromVoucher(decoded, 'tarot');
    expect(restored).toHaveLength(3);
    expect(restored[0].name).toBe(TAROT_DECK[3].name);
    expect(restored[0].orientation).toBe(-1);
    const reading = buildReading(room, restored);
    const reading2 = buildReading(room, restored);
    expect(reading.fingerprint).toBe(reading2.fingerprint);
  });

  it('塔罗 A/B 档只暴露牌面与位置，不含五行/宜忌', () => {
    const room = makeRoom({ hostName: '测试', deck: 'tarot', tier: 'A' });
    const cards = ['major-0', 'wands-a', 'cups-5'].map((id, i) => ({ ...TAROT_DECK.find((c) => c.id === id), orientation: i === 1 ? -1 : 1 }));
    const reading = buildReading(room, cards);
    const a = visibleForTier(reading, 'A');
    const b = visibleForTier(reading, 'B');
    expect(a.cards).toHaveLength(3);
    expect(a.cards[0].positionLabel).toBeUndefined();
    expect(b.cards[0].positionLabel).toBe('当下');
    expect(a.relation).toBeUndefined();
    expect(a.yi).toBeUndefined();
  });

  it('塔罗回执文本含正逆位与免责声明', () => {
    const room = makeRoom({ hostName: '测试', deck: 'tarot' });
    const cards = [
      { ...TAROT_DECK[0], orientation: 1 },
      { ...TAROT_DECK[1], orientation: -1 },
      { ...TAROT_DECK[2], orientation: 1 },
    ];
    const voucher = makeVoucher(room.code, cards);
    const reading = buildReading(room, cards);
    const text = buildReceiptText(room, voucher, reading, '我的解读');
    expect(text).toContain('正位');
    expect(text).toContain('逆位');
    expect(text).toContain('不构成任何预测');
  });
});
