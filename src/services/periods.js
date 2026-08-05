// ===== src/services/periods.js · 周期牌纯逻辑 =====

/**
 * 生成周期牌本地指引文本（纯函数）。
 * @param {object} card 牌对象
 * @param {string} wx 五行
 * @param {string} periodLabel 周期标签（如「今日」）
 * @param {string} metaphor 牌灵意象文本
 * @param {string} fortuneType 运势类别（overall 等）
 * @returns {string}
 */
export function generateFullPeriodLocal(card, wx, periodLabel, metaphor, fortuneType = 'overall') {
  let out = metaphor + '\n\n';
  out += `【${periodLabel}指引】\n`;
  out += `牌面：${card.isJoker ? card.type : card.rank + card.suit}（${wx}）\n`;
  out += `阴阳：${card.isJoker ? (card.type === '大王' ? '阳' : '阴') : (card.suit === '♥' || card.suit === '♦') ? '阳' : '阴'}\n\n`;
  const wxAdvice = {
    '火': '适合主动行动、展示自己。但避免急躁和过度消耗。',
    '金': '适合清理、决断、定边界。注意别过于冷硬。',
    '木': '适合学习、生长、扩张。但不要急于求成。',
    '水': '适合反思、流动、等待。注意别失去方向。',
    '土': '适合积累、稳定、打基础。避免冒进。',
    '天': '适合定大方向、开启新阶段。大局在你。',
    '人': '适合沟通、协调、借助人脉。事情的关键在人。',
  };
  out += wxAdvice[wx] || '保持平常心，顺势而为。';
  out += '\n\n【如果你觉得单张牌不够】\n';
  out += '可以抽取你与本命、所问之事，布九宫，进入完整占卜流程。';
  return out;
}
