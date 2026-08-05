// ===== src/services/readings.js · 本地解读（九宫全息阵纯逻辑） =====
import {
  getShengKe, getShengKeLabel, getRelationPlain, getWangState, getWangStatePlain,
  getWuxing, getCardValue, GONG_NAMES, GONG_WUXING, getGongEnvironment
} from '../data.js';
import { calcDiff } from '../engine.js';
import { calculateDurianIndex } from '../durian.js';
import { applyCovenant } from '../philosophy/covenant.js';
import { getProfile } from '../storage.js';
import { detectIntent, extractKeywords } from './intent.js';
import { getBaziFromProfile } from './profile.js';
import { buildSummary } from './summary.js';

// ===== 差值三种情况解析 =====
export function getDiffAnalysisText(diffType, gong, card) {
  const gongName = GONG_NAMES[gong] + '宫';
  const rank = card.isJoker ? card.type : card.rank + (card.suit || '');
  switch (diffType) {
    case '等于':
      return `· ${gongName}落 ${rank}，差值零，能量相合，事件处于平衡态，吉凶未分，宜静观其变。`;
    case '大于':
      return `· ${gongName}落 ${rank}，宫的能量强于牌的能量，环境压力明显，需借势或待时，不宜强求。`;
    case '小于':
      return `· ${gongName}落 ${rank}，牌的能量强于宫的能量，自身能量有余，可主动破局，把握主动权。`;
    default:
      return '';
  }
}

/**
 * 生成完整本地解读（纯逻辑，不触碰 DOM）。
 * 副作用：写入 state.intent / state.durianIndex / state.summary（与旧 localInterpretation 保持一致）。
 * @param {object} state 全局状态对象
 * @returns {Promise<{text: string, modules: any[], summary: object}>}
 */
export async function buildLocalReading(state) {
  const readings = await import('../texts/texts-readings.js');
  const tiWx = getWuxing(state.ti), yongWx = getWuxing(state.yong);
  const relation = getShengKe(tiWx, yongWx);
  const intent = detectIntent(state.question, state.category, state.subCategory);
  state.intent = intent;

  let result = '';

  const savedProfile = getProfile();
  if (savedProfile && (savedProfile.name || savedProfile.gender || savedProfile.birthPlace || savedProfile.currentPlace)) {
    let parts = [];
    if (savedProfile.name) parts.push(`姓名：${savedProfile.name}`);
    if (savedProfile.gender) parts.push(`性别：${savedProfile.gender}`);
    if (savedProfile.birthPlace) parts.push(`出生地：${savedProfile.birthPlace}`);
    if (savedProfile.currentPlace) parts.push(`现居地：${savedProfile.currentPlace}`);
    if (parts.length) result += `【求测人】${parts.join('，')}\n\n`;
  }
  if (state.category) result += `【领域：${state.category}${state.subCategory ? '/' + state.subCategory : ''}】\n\n`;
  const bazi = getBaziFromProfile();
  if (bazi) result += `【生辰】${bazi.fullText}\n\n`;
  result += `你为${tiWx}，所问之事为${yongWx}。\n`;
  if (relation) result += `（${getRelationPlain(relation)} · ${getShengKeLabel(relation)}）\n\n`;
  if (state.line) result += `天机线：${state.line.map(g => GONG_NAMES[g] + '宫').join(' → ')}\n\n`;

  const allGongs = state.gongOrder.length ? state.gongOrder : Object.keys(state.grid).map(Number);
  let coreText = '';

  for (const g of allGongs) {
    const cards = state.grid[g] || [];
    if (!cards.length) continue;
    cards.forEach(card => {
      const diff = calcDiff(g, card);
      const absDiff = Math.abs(diff);
      const diffType = diff > 0 ? '大于' : diff < 0 ? '小于' : '等于';
      const diffAnalysis = getDiffAnalysisText(diffType, g, card);
      const wang = getWangState(getWuxing(card), GONG_WUXING[g]);
      const relToTi = getShengKe(tiWx, getWuxing(card));
      const linePos = state.line ? state.line.indexOf(g) : -1;
      const linePosition = linePos === 0 ? 'start' : linePos === 1 ? 'middle' : linePos === 2 ? 'end' : 'offline';
      const ctx = {
        gong: { id: g, name: GONG_NAMES[g], element: GONG_WUXING[g] },
        card: { element: getWuxing(card), value: getCardValue(card), suit: card.suit },
        tiYongRelation: relToTi || '同我',
        wangState: wang,
        linePosition,
        diff: absDiff,
        diffType,
        intent
      };
      const readingResult = readings.generateFullReading(ctx);
      const label = state.lineOrder[g] || GONG_NAMES[g] + '宫';
      coreText += `【${label}】差值 ${absDiff}（${diffType}）\n${diffAnalysis}\n${readingResult.light}\n\n---\n${readingResult.shadow}\n\n`;
    });
  }
  if (coreText) result += `【牌面解读】\n${coreText}\n\n`;

  if (tiWx && yongWx) {
    result += `【你与所问之事】\n你为${tiWx}，所问之事为${yongWx}。关系：${getRelationPlain(relation || '同我')}（${relation || '同我'}）。\n\n`;
  }
  let diffText = '';
  for (const g of allGongs) {
    const cards = state.grid[g] || [];
    if (!cards.length) continue;
    cards.forEach(card => {
      const diff = calcDiff(g, card);
      const absDiff = Math.abs(diff);
      const diffType = diff > 0 ? '大于' : diff < 0 ? '小于' : '等于';
      const diffAnalysis = getDiffAnalysisText(diffType, g, card);
      diffText += `${GONG_NAMES[g]}宫差值${absDiff}（${diffType}）\n${diffAnalysis}\n`;
    });
  }
  if (diffText) result += `【宫位细看】\n${diffText}\n\n`;

  let wangText = '';
  for (const g of allGongs) {
    const cards = state.grid[g] || [];
    if (!cards.length) continue;
    cards.forEach(card => {
      const wang = getWangState(getWuxing(card), GONG_WUXING[g]);
      wangText += `${GONG_NAMES[g]}宫：${getWangStatePlain(wang)}\n`;
    });
  }
  if (wangText) result += `【宫位能量】\n${wangText}\n\n`;

  // ===== 宫位大环境分析 =====
  let envText = '';
  let envTotal = 0, envCount = 0;
  for (const g of allGongs) {
    const cards = state.grid[g] || [];
    if (!cards.length) continue;
    cards.forEach(card => {
      const gongWx = GONG_WUXING[g];
      const cardWx = getWuxing(card);
      const env = getGongEnvironment(gongWx, cardWx);
      if (!env) return;
      const rank = card.isJoker ? card.type : card.rank + (card.suit || '');
      envText += `· ${GONG_NAMES[g]}宫（${gongWx}）落 ${rank}（${cardWx}）：${env.plain || env.label} —— ${env.desc}\n`;
      envTotal += env.score;
      envCount++;
    });
  }
  if (envCount > 0) {
    const avgScore = (envTotal / envCount).toFixed(1);
    const envJudge =
      avgScore >= 2.5 ? '整体环境滋养，局势对你有利。'
      : avgScore >= 1 ? '整体环境偏助力，顺势可成。'
      : avgScore > -1 ? '整体环境中性，吉凶取决于你的选择。'
      : avgScore > -2.5 ? '整体环境偏压制，宜谨慎守势。'
      : '整体环境明显不利，暂避锋芒为佳。';
    result += `【宫位大环境】\n${envText}\n综合评估：${envJudge}（环境均分 ${avgScore}）\n\n`;
  }

  if (state.line) {
    const tlText = state.line.map(g => `${state.lineOrder[g] || GONG_NAMES[g] + '宫'}：${GONG_NAMES[g]}宫`).join('\n');
    result += `【天机线】\n${tlText}\n\n`;
  } else {
    result += `【天机线】\n未连成天机线，当前局势仍在变化中。\n\n`;
  }

  if (bazi) result += `【四柱八字】\n${bazi.fullText}\n生肖：${bazi.yearPillar.shengXiao}\n\n`;

  if (state.question) {
    const keywords = extractKeywords(state.question);
    if (keywords.length) result += `【意图关键词】\n${keywords.join('、')}\n\n`;
  }

  const durian = calculateDurianIndex(state);
  if (durian) {
    state.durianIndex = durian;
    result += `张力指数：${durian.score}/10（${durian.level}）\n${durian.description}\n`;
  }

  result = applyCovenant(result);
  const summary = buildSummary(state);
  return { text: result.trim(), modules: [], summary };
}
