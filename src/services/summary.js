// ===== src/services/summary.js · 三句摘要（此刻的状态 / 一个提醒 / 一句建议） =====
// 同局稳定：同一副牌局反复查看，摘要保持一致（由调用方保证 state 不变）。
import { pick } from '../constants.js';
import { STATUS_POOL, REMINDER_POOL, ACTION_POOL } from '../texts/index.js';

/**
 * 构建三句摘要。副作用：首次调用会写入 state.summary 缓存（同局稳定）。
 * @param {object} state 全局状态对象
 * @returns {{status: string, reminder: string, action: string}}
 */
export function buildSummary(state) {
  const fp = state.fingerprint || 'uid-' + state.uid;
  if (state.summary && state.summary.fp === fp) return state.summary.data;
  const data = {
    status: pick(STATUS_POOL),
    reminder: pick(REMINDER_POOL),
    action: pick(ACTION_POOL),
  };
  state.summary = { fp, data };
  return data;
}
