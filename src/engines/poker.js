// ===== src/engines/poker.js · 扑克单牌引擎（契约实现） =====
// 统一契约：{ id, name, description, inputConfig, calc }
// calc(input) → 纯函数，返回超集结构；UI 层薄调用。

import { getWuxing } from '../data.js';
import { getPokerPersona, getDailyFortune } from '../persona.js';
import { generateSingleCardMetaphor } from '../metaphor.js';

export const pokerEngine = {
  id: 'poker',
  name: '扑克单牌',
  description: '单张扑克牌：人格 + 运势 + 比喻（周期牌详情、日运细选共用）',
  inputConfig: {
    card: { type: 'object', required: true, label: '牌面对象', desc: '{ suit, rank, isJoker, type }' },
    fortuneType: { type: 'string', default: 'overall', label: '运势类别', desc: 'overall/wealth/love/noble/career/health/study' },
    periodLabel: { type: 'string', default: '日运', label: '周期标签', desc: '如 日运/周运/月运' },
  },
  calc(input) {
    const { card, fortuneType = 'overall', periodLabel = '日运', dateStr = '' } = input || {};
    if (!card) return null;
    const wx = getWuxing(card);
    const persona = getPokerPersona(card);
    const fortune = getDailyFortune(card, fortuneType, dateStr);
    const metaphor = generateSingleCardMetaphor(card, wx, periodLabel, fortuneType, dateStr);
    return { card, wx, persona, fortune, metaphor };
  },
};
