// ===== src/services/three-spread.js · 三牌直断阵（纯逻辑） =====
import { getShengKe, getShengKeLabel, getWuxing } from '../data.js';
import { getPokerPersona } from '../persona.js';
import { applyCovenant } from '../philosophy/covenant.js';

// 三牌阵专属张力指数：看五行顺逆与同气
export function computeThreeDurian(cards) {
  const wxs = cards.map(({ card }) => getWuxing(card));
  const rels = [];
  for (let i = 0; i < wxs.length - 1; i++) {
    rels.push(getShengKe(wxs[i], wxs[i + 1]));
  }
  const scoreMap = { '生我': 0.75, '我生': 0.6, '同我': 0.5, '我克': 0.4, '克我': 0.28, null: 0.5 };
  const base = rels.reduce((s, r) => s + (scoreMap[r] ?? 0.5), 0) / rels.length;
  const sameCount = (wxs[0] === wxs[1] ? 1 : 0) + (wxs[1] === wxs[2] ? 1 : 0) + (wxs[0] === wxs[2] ? 1 : 0);
  const raw = base * 0.75 + Math.min(1, sameCount) * 0.25;
  const score = Math.round(Math.min(10, Math.max(0, raw * 10)) * 10) / 10;
  const level = score < 3 ? '低' : score < 5 ? '中低' : score < 7 ? '中' : score < 9 ? '高' : '极高';
  let desc;
  if (score >= 8) desc = '三张牌气连成一线，整体顺畅，此事势头正旺，顺势可为。';
  else if (score >= 6) desc = '能量整体顺畅，虽有起伏但可控，按牌面提示慢慢走即可。';
  else if (score >= 4) desc = '气场偏于拉扯，牌与牌之间互相制约，宜缓不宜急，先看清再动。';
  else desc = '牌与牌之间互相压制的地方多，此事阻力不小，三思而后行，必要时换个角度再问。';
  return { score, level, description: desc, components: { rels } };
}

/**
 * 组装三牌阵完整解读文本。
 * @param {object} state 全局状态对象（需含 threeCards / question / consultMode / consultName）
 * @returns {string}
 */
export function buildThreeSpreadText(state) {
  const cards = state.threeCards || [];
  const parts = [];
  const phases = ['过去', '现在', '未来'];
  const person = state.consultMode ? (state.consultName || '求测人') : '你';
  const start = state.question
    ? `【${person}所问】${state.question}\n\n`
    : `【${person}所问】未具体提问，以牌面直断当下之局。\n\n`;
  parts.push(start);

  cards.forEach(({ card, phase }, i) => {
    const p = getPokerPersona(card);
    const wx = getWuxing(card);
    const rel = i > 0 ? getShengKe(getWuxing(cards[i - 1].card), wx) : null;
    const relText = rel ? `，与前牌${getShengKeLabel(rel)}（${rel}）` : '';
    const personaText = p ? `${p.title}：${p.keywords.join('、')}` : '';
    parts.push(`【${phase}】落 ${card.isJoker ? card.type : card.rank + (card.suit || '')}（${wx}）${relText}\n${personaText}\n`);
  });

  const durian = computeThreeDurian(cards);
  const relLine = [];
  for (let i = 1; i < cards.length; i++) {
    const a = getWuxing(cards[i - 1].card);
    const b = getWuxing(cards[i].card);
    const rel = getShengKe(a, b);
    if (rel) {
      relLine.push(`「${phases[i - 1]}」${a}与「${phases[i]}」${b}：${rel}（${getShengKeLabel(rel)}）`);
    }
  }
  if (relLine.length) parts.push(`【五行流转】\n${relLine.join('\n')}\n`);
  parts.push(`【直断】\n${durian.description}\n`);
  parts.push(`张力指数：${durian.score}/10（${durian.level}）\n`);
  parts.push(`\n※ 三牌直断，重在方向不在细节。若想深入，可换「九宫全息阵」细看。`);
  return applyCovenant(parts.join('\n').trim());
}
