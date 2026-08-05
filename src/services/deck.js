// ===== src/services/deck.js · 牌堆洗牌（真随机混沌熵） =====
// 真随机：每次抽牌都用 crypto 熵重新播种混沌引擎洗牌。
// 同一会话里连点多次「抽一张」，每次都是全新顺序——杜绝「洗一次牌摸一整页」的伪随机。
import { seedToX0, chaoticGenerator, chaoticShuffle } from '../chaos.js';

/**
 * 用 crypto 32 字节熵播种混沌引擎洗牌。
 * @param {object[]} deck 牌堆
 * @returns {object[]} 洗好的新牌堆
 */
export function chaosShuffleDeck(deck) {
  const seed = new Uint8Array(32);
  window.crypto.getRandomValues(seed);
  return chaoticShuffle(deck, chaoticGenerator(seedToX0(seed)));
}
