// ===== src/durian.js · 榴莲指数 =====
// 【修改】榴莲图标，更像榴莲
import { calcDiff } from './engine.js';
import { GONG_ORDER, getWuxing, getShengKe } from './data.js';

export function calculateDurianIndex(state) {
  if (!state.ti || !state.yong) return 0;

  const tiWx = getWuxing(state.ti);
  const yongWx = getWuxing(state.yong);

  let totalDiff = 0;
  let maxDiff = 0;
  const gongs = state.gongOrder.length ? state.gongOrder : GONG_ORDER;

  for (const g of gongs) {
    const cards = state.grid[g] || [];
    if (cards.length) {
      const diff = calcDiff(parseInt(g), cards[0]);
      totalDiff += diff;
      maxDiff += 9;
    }
  }
  const diffScore = maxDiff > 0 ? Math.min(1, totalDiff / maxDiff) : 0.5;

  let keCount = 0;
  let totalRels = 0;
  for (const g of gongs) {
    const cards = state.grid[g] || [];
    for (const card of cards) {
      const rel = getShengKe(tiWx, getWuxing(card));
      if (rel) {
        totalRels++;
        if (rel === '克我' || rel === '我克') keCount++;
      }
    }
  }
  const keScore = totalRels > 0 ? keCount / totalRels : 0.3;

  let trendScore = 0.5;
  if (state.line && state.line.length === 3) {
    const diffs = state.line.map(g => {
      const cards = state.grid[g] || [];
      return cards.length ? calcDiff(g, cards[0]) : 0;
    });
    if (diffs.every(d => d !== undefined)) {
      const trend = diffs[2] - diffs[0];
      trendScore = 0.5 + Math.max(-0.4, Math.min(0.4, trend / 20));
    }
  }

  const rel = getShengKe(tiWx, yongWx);
  const tensionMap = { '生我': 0.2, '我生': 0.4, '同我': 0.3, '我克': 0.6, '克我': 0.8 };
  const tensionScore = tensionMap[rel] || 0.5;

  const raw = diffScore * 0.35 + keScore * 0.25 + trendScore * 0.2 + tensionScore * 0.2;
  const score = Math.round(Math.min(10, Math.max(0, raw * 10)) * 10) / 10;

  return {
    score,
    components: {
      diff: Math.round(diffScore * 10),
      ke: Math.round(keScore * 10),
      trend: Math.round(trendScore * 10),
      tension: Math.round(tensionScore * 10)
    },
    level: score < 3 ? '低' : score < 5 ? '中低' : score < 7 ? '中' : score < 9 ? '高' : '极高',
    description: score < 3 ? '结构温和，建议顺势而为' :
      score < 5 ? '略有张力，保持观察' :
      score < 7 ? '结构冲突，需要调整' :
      score < 9 ? '高度张力，建议谨慎' :
      '极端张力，强烈建议暂缓'
  };
}

// ===== 榴莲图标（更像榴莲） =====
export function getDurianIcon(score) {
  if (score < 3) return '🌰';
  if (score < 5) return '🥜';
  if (score < 7) return '🟡';
  if (score < 9) return '🟠';
  return '🔴';
}

export function getDurianEmoji(score) {
  return getDurianIcon(score);
}

export function getDurianColor(score) {
  if (score < 3) return '#4CAF50';
  if (score < 5) return '#8BC34A';
  if (score < 7) return '#FFC107';
  if (score < 9) return '#FF9800';
  return '#F44336';
}