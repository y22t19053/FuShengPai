// ===== src/engines/daily.js · 日运引擎（契约实现） =====
// 统一契约：{ id, name, description, inputConfig, calc }
// calc(input) → 纯函数：真实历法黄历（建除/冲煞/宜忌）+ 单牌运势 + 分享素材。

import { getWuxing } from '../data.js';
import { getDailyFortune } from '../persona.js';
import { getFriendCircleHook, getFortuneTags } from '../texts/social.js';
import { buildDailyOracle } from '../texts/daily-oracle.js';

export const dailyEngine = {
  id: 'daily',
  name: '今日日运',
  description: '日运引擎：真实历法黄历（建除/冲煞/财神方位/宜忌）+ 单牌运势',
  inputConfig: {
    wx: { type: 'string', default: '土', label: '五行', desc: '黄历缺省用土，优先取牌面五行' },
    dateStr: { type: 'string', label: '日期', desc: 'YYYY-MM-DD，缺省今天' },
    card: { type: 'object', label: '牌面对象', desc: '有牌时叠加单牌运势' },
    fortuneType: { type: 'string', default: 'overall', label: '运势类别', desc: 'overall/wealth/love/noble/career/health/study' },
  },
  calc(input) {
    const { wx, dateStr, card, fortuneType = 'overall' } = input || {};
    const cardWx = card ? getWuxing(card) : null;
    const oracle = buildDailyOracle({ wx: cardWx || wx || '土', dateStr });
    const fortune = card ? getDailyFortune(card, fortuneType, dateStr) : null;
    // 传入 dateStr 作种子：页内横幅与分享图同一天同牌面 → 同一句文案
    const hook = card ? getFriendCircleHook(card, dateStr) : null;
    const tags = card ? getFortuneTags(card, fortuneType, dateStr).slice(0, 3) : [];
    return { oracle, fortune, hook, tags, card, wx: cardWx || wx || '土' };
  },
};
