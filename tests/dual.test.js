import { describe, it, expect } from 'vitest';
import {
  makeRoom, encodeRoom, decodeRoom, makeVoucher, encodeVoucher, decodeVoucher,
  cardsFromVoucher, buildReading, visibleForTier, buildReceiptText,
} from '../src/dual/room.js';

describe('dual mode room & voucher', () => {
  const room = makeRoom({ hostName: '测试占卜师', brand: '测试牌室', contact: 'wx: test', tier: 'B', area: '情感' });

  it('房间码可编码/解码往返', () => {
    const decoded = decodeRoom(room.code);
    expect(decoded).toBeTruthy();
    expect(decoded.host.name).toBe('测试占卜师');
    expect(decoded.tier).toBe('B');
  });

  it('凭证可编码/解码往返', () => {
    const voucher = makeVoucher(room.code, [{ suit: '♥', rank: 'A' }, { suit: '♠', rank: '5' }], '要不要换工作');
    const decoded = decodeVoucher(encodeVoucher(voucher));
    expect(decoded).toBeTruthy();
    expect(decoded.q).toBe('要不要换工作');
    expect(decoded.fp).toMatch(/^FS-[0-9A-F]{8}$/);
    const cards = cardsFromVoucher(decoded);
    expect(cards[0]).toEqual({ suit: '♥', rank: 'A' });
    expect(cards[1]).toEqual({ suit: '♠', rank: '5' });
  });

  it('同一凭证复现同一牌局（确定性）', () => {
    const voucher = makeVoucher(room.code, [{ suit: '♦', rank: 'K' }, { suit: '♣', rank: '3' }]);
    const cards = cardsFromVoucher(decodeVoucher(encodeVoucher(voucher)));
    const a = buildReading(room, cards);
    const b = buildReading(room, cards);
    expect(a.fingerprint).toBe(b.fingerprint);
    expect(a.cards[0].name).toBe(b.cards[0].name);
    expect(a.relation).toBe(b.relation);
  });

  it('A 档不泄露结构摘要，B/C 逐级放开', () => {
    const cards = [{ suit: '♥', rank: 'A' }, { suit: '♠', rank: '5' }];
    const reading = buildReading(room, cards);
    const a = visibleForTier(reading, 'A');
    const b = visibleForTier(reading, 'B');
    const c = visibleForTier(reading, 'C');
    expect(a.relation).toBeUndefined();
    expect(a.keywords).toBeUndefined();
    expect(b.relation).toBeTruthy();
    expect(Array.isArray(b.keywords)).toBe(true);
    expect(Array.isArray(c.points)).toBe(true);
  });

  it('对读回执包含凭证与免责声明', () => {
    const voucher = makeVoucher(room.code, [{ suit: '♥', rank: 'A' }, { suit: '♠', rank: '5' }]);
    const reading = buildReading(room, cardsFromVoucher(voucher));
    const text = buildReceiptText(room, voucher, reading, '体用相克，顺序错了。');
    expect(text).toContain(voucher.fp);
    expect(text).toContain('体用相克');
    expect(text).toContain('不构成任何预测');
  });
});
