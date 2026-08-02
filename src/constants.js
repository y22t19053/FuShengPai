// ===== src/constants.js · 可调数值常量 =====

export const MAX_DAILY_OBSERVATIONS = 8;
export const LONG_PRESS_DURATION = 300;
export const SCROLL_MAX_SPEED = 150;
export const SCROLL_STEP_INCREMENT = 25;

// ===== 熵与混沌 =====
export const ENTROPY_THRESHOLD = 30;
export const CHAOS_ITERATIONS = 100;
export const FINGERPRINT_LENGTH = 8;

// ===== 张力指数 =====
export const DURIAN_WEIGHTS = {
  diff: 0.35,
  ke: 0.25,
  trend: 0.20,
  tension: 0.20
};

// ===== 模式 =====
export const MODES = {
  SIMPLE: 'simple',
  STANDARD: 'standard',
  PRO: 'pro'
};

export const WX_COLORS = {
  木: '#5a7a4a',
  火: '#a04040',
  土: '#9a7a4a',
  金: '#6a6a5a',
  水: '#4a6a8a',
  天: '#8a7a5a',
  人: '#5a5a6a',
};

// ===== 辅助函数 =====
export function pick(arr) {
  if (!arr || arr.length === 0) return '';
  return arr[Math.floor(Math.random() * arr.length)];
}

// ===== 差值强度（绝对值分级）=====
export function getIntensityLevel(diff) {
  const abs = Math.abs(diff);
  if (abs <= 1) return 'tiny';
  if (abs <= 3) return 'small';
  if (abs <= 5) return 'medium';
  if (abs <= 8) return 'large';
  return 'huge';
}

export function getPhraseSet(phrasesObj, phraseType, intent) {
  const sets = phrasesObj[phraseType];
  if (!sets) return [];
  if (intent && sets[intent] && Math.random() < 0.6) return sets[intent];
  return sets.default || [];
}