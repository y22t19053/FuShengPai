// ===== src/constants.js · 可调数值常量 =====

export const MAX_DAILY_OBSERVATIONS = 8;
export const LONG_PRESS_DURATION = 300;
export const TING_DURATION = 400; // 听牌：按住牌背的悬念停顿（摸牌→开牌）
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
  木: '#7ba88f', // 青 · 岁星（鼠尾草青）
  火: '#c96f52', // 赤 · 荧惑（陶土红）
  土: '#c9b184', // 黄 · 镇星（燕麦金）
  金: '#a89f8f', // 白 · 太白（暖灰白）
  水: '#7a9cb0', // 黑 · 辰星（雾蓝代，避免纯黑隐形）
  天: '#8f7ac8',
  人: '#8b93a3',
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