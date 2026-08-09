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
  木: '#7ba88f', // 青 · 岁星（鼠尾草青）
  火: '#c96f52', // 赤 · 荧惑（陶土红）
  土: '#c9b184', // 黄 · 镇星（燕麦金）
  金: '#a89f8f', // 白 · 太白（暖灰白）
  水: '#7a9cb0', // 黑 · 辰星（雾蓝代，避免纯黑隐形）
  天: '#8f7ac8',
  人: '#8b93a3',
};

// ===== 辅助函数 =====
import { pickRandom } from './utils/rng.js';

export function pick(arr) {
  if (!arr || arr.length === 0) return '';
  return pickRandom(arr);
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
  // 确定性选池：同一天同意图 → 同一种句池（不再 Math.random 每次不同）
  if (intent && sets[intent]) {
    let h = 0x811c9dc5;
    const seed = phraseType + '|' + intent + '|' + todaySeedStr();
    for (const ch of seed) { h ^= ch.charCodeAt(0); h = (h * 0x01000193) >>> 0; }
    if (h % 100 < 60) return sets[intent];
  }
  return sets.default || [];
}
function todaySeedStr() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}