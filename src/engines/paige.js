// ===== src/engines/paige.js · 牌灵引擎（契约实现） =====
// 统一契约：{ id, name, description, inputConfig, calc }
// calc(input) → 纯函数：牌灵课题 + 人格 + 名言 + 分享文案素材。

import { getWuxing } from '../data.js';
import { getPokerPersona } from '../persona.js';
import { getPaiGeQuestion, getPaiGeQuote, getFriendCircleHook, PAIGE_HASHTAGS } from '../texts/social.js';

export const paigeEngine = {
  id: 'paige',
  name: '牌灵',
  description: '牌灵卡：人生课题 + 人格 + 名言 + 分享素材（本机私牌，仅存本地）',
  inputConfig: {
    card: { type: 'object', required: true, label: '牌面对象', desc: '{ suit, rank, isJoker, type }' },
  },
  calc(input) {
    const { card, dateStr } = input || {};
    if (!card) return null;
    const wx = getWuxing(card);
    const persona = getPokerPersona(card);
    const question = getPaiGeQuestion(card);
    // 确定性种子：同牌面同一天 → 同一句（与分享图一致）
    const hook = getFriendCircleHook(card, dateStr);
    const quote = getPaiGeQuote(card, dateStr);
    return {
      card,
      wx,
      persona,
      question,
      hook,
      quote,
      hashtags: PAIGE_HASHTAGS,
    };
  },
};
