// ===== src/constants.js =====
// 可调数值常量

export const MAX_DAILY_OBSERVATIONS = 8;   // 每日精神力阈值
export const LONG_PRESS_DURATION = 300;     // 长按触发拖拽毫秒数
export const SCROLL_MAX_SPEED = 150;        // 牌堆滑动最高速度
export const SCROLL_STEP_INCREMENT = 25;    // 滑动加速度

// ===== 辅助函数（原本在 texts.js 顶部，现统一收拢于此） =====

export function pick(arr) {
  if (!arr || arr.length === 0) return '';
  return arr[Math.floor(Math.random() * arr.length)];
}

export function getIntensityLevel(diff) {
  if (diff <= 1) return 'tiny';
  if (diff <= 3) return 'small';
  if (diff <= 5) return 'medium';
  if (diff <= 8) return 'large';
  return 'huge';
}

export function getPhraseSet(phrasesObj, phraseType, intent) {
  const sets = phrasesObj[phraseType];
  if (!sets) return [];
  if (intent && sets[intent] && Math.random() < 0.6) return sets[intent];
  return sets.default || [];
}