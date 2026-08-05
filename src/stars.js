// ===== src/stars.js · 五星本名（身份层） =====
// 金木水火土五星本来就是中国的——《史记·天官书》早有星官，
// 马王堆《五星占》比西方占星典籍早几百年。这里不借拉丁符号，
// 只认回中国本名，配五行本命色：
//   水星 → 辰星（水，黑）
//   金星 → 太白（金，白）
//   火星 → 荧惑（火，赤）
//   木星 → 岁星（木，青）
//   土星 → 镇星（土，黄）
// 紫是借来的，青是自家的。

/** 五星本名档案：element 五行 / color 五行本命色 / hex 暗底可读色 */
export const FIVE_STARS = {
  辰星: { element: '水', color: '黑', hex: '#7d97ad', desc: '水之正，主智谋、潜藏、流动' },
  太白: { element: '金', color: '白', hex: '#c9cdbf', desc: '金之正，主肃敛、决断、变革' },
  荧惑: { element: '火', color: '赤', hex: '#c96a5a', desc: '火之正，主明动、热情、光明' },
  岁星: { element: '木', color: '青', hex: '#9aab7f', desc: '木之正，主生发、条达、生长' },
  镇星: { element: '土', color: '黄', hex: '#b0a05a', desc: '土之正，主承载、生化、安定' },
};

/** 五行 → 五星本名 */
export const STAR_OF_WX = { 水: '辰星', 金: '太白', 火: '荧惑', 木: '岁星', 土: '镇星' };

/** 五行 → 本命色（青/赤/黄/白/黑） */
export const COLOR_OF_WX = { 木: '青', 火: '赤', 土: '黄', 金: '白', 水: '黑' };

/**
 * 取五行对应的星官句（判词点缀用）
 * @param {string} wx 木火土金水
 * @returns {string} 如「岁星之青，东方生发之气」
 */
export function getStarLine(wx) {
  const star = STAR_OF_WX[wx];
  if (!star) return '';
  const info = FIVE_STARS[star];
  if (!info) return '';
  const dir = { 木: '东方', 火: '南方', 土: '中央', 金: '西方', 水: '北方' }[wx] || '';
  return `${star}之${info.color}，${dir}生发之气`;
}

/**
 * 五行色（暗底可读档，Web 端统一走这一份；与 constants.WX_COLORS 同源）
 * 青（木）/ 赤（火）/ 黄（土）/ 白（金）/ 黑（水）
 */
export const WX_STAR_COLORS = {
  木: '#9aab7f', // 青 · 岁星
  火: '#c96a5a', // 赤 · 荧惑
  土: '#b0a05a', // 黄 · 镇星
  金: '#c9cdbf', // 白 · 太白
  水: '#7d97ad', // 黑 · 辰星（暗底用青蓝代，避免纯黑隐形）
};
