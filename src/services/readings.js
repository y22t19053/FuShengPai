// ===== src/services/readings.js · 本地解读（九宫全息阵纯逻辑） =====
// 写法：先说结论 → 讲来路 → 逐牌两句 → 旁枝一句 → 收在动作。
// 旧版把「差值 / 旺衰 / 天机线 / 大环境」逐宫各列一遍，同一件事在一页里说四次，
// 读起来像数据库导出；这里只在需要的地方说一次，细节交给牌面那几行。
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
import { pickSmallAction, pickHandback } from '../texts/reading-frame.js';
import { getCardImage } from '../texts/card-images.js';
import { composeCardParts, pickDeeper } from '../texts/texts-readings.js';
import { recordAsk, repeatPreamble } from './repeat-ask.js';

// ===== 差值三种情况解析（保留导出：设置面板与分享文案仍会用） =====
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
  const tiWx = getWuxing(state.ti), yongWx = getWuxing(state.yong);
  const relation = getShengKe(tiWx, yongWx);
  const relationPlain = getRelationPlain(relation || '同我');
  const intent = detectIntent(state.question, state.category, state.subCategory);
  state.intent = intent;

  const allGongs = state.gongOrder.length ? state.gongOrder : Object.keys(state.grid).map(Number);
  const lineGongs = Array.isArray(state.line) ? state.line : [];

  // ---------- 先把每宫的料一次性算好，后面按叙事顺序取用 ----------
  const slots = [];
  let envTotal = 0, envCount = 0, strongCount = 0, weakCount = 0;
  for (const g of allGongs) {
    const cards = state.grid[g] || [];
    for (const card of cards) {
      const diff = calcDiff(g, card);
      const absDiff = Math.abs(diff);
      const diffType = diff > 0 ? '大于' : diff < 0 ? '小于' : '等于';
      const wang = getWangState(getWuxing(card), GONG_WUXING[g]);
      const relToTi = getShengKe(tiWx, getWuxing(card));
      const linePos = lineGongs.indexOf(g);
      const linePosition = linePos === 0 ? 'start' : linePos === 1 ? 'middle' : linePos === 2 ? 'end' : 'offline';
      const parts = composeCardParts({
        gong: { id: g, name: GONG_NAMES[g], element: GONG_WUXING[g] },
        card: { element: getWuxing(card), value: getCardValue(card), suit: card.suit },
        tiYongRelation: relToTi || '同我',
        wangState: wang,
        linePosition,
        diff: absDiff,
        diffType,
        intent
      });
      const env = getGongEnvironment(GONG_WUXING[g], getWuxing(card));
      if (env) { envTotal += env.score; envCount++; }
      if (wang === '旺' || wang === '相') strongCount++;
      if (wang === '囚' || wang === '死') weakCount++;
      slots.push({ g, card, absDiff, diffType, wang, linePos, parts, env,
        label: state.lineOrder[g] || GONG_NAMES[g] + '宫' });
    }
  }

  const envAvg = envCount ? envTotal / envCount : 0;
  const envJudge =
    envAvg >= 2.5 ? '局面本身是养人的，顺着走比硬顶省力'
    : envAvg >= 1 ? '局面偏帮你这边，顺势推一把能成'
    : envAvg > -1 ? '局面不偏不倚，成败多半落在你怎么选'
    : envAvg > -2.5 ? '局面偏拧，能守就别拿去赌'
    : '局面明显不利，这会儿硬来只会更费劲';

  let result = '';

  // ---------- 0. 同一件事刚问过：先提醒，再照常给（不替人做决定，也不装作没看见） ----------
  const repeatNote = state.question ? repeatPreamble(state.question) : '';
  if (repeatNote) result += `${repeatNote}\n\n`;

  // ---------- 1. 先说结论（先给判断，再讲来路） ----------
  result += '【先说结论】\n';
  const relationClause = relation === '克我'
    ? `不过你和这件事的关系是${relationPlain}`
    : `你与这件事的关系是${relationPlain}`;
  result += `${envJudge}。${relationClause}。`;
  if (lineGongs.length >= 3) {
    result += strongCount > weakCount
      ? '牌面上它已经连成一条线，这条线现在是有力气的。\n\n'
      : weakCount > strongCount
        ? '牌面上它已经连成一条线，只是眼下没什么力气。\n\n'
        : '牌面上它连成了一条线，力道不强也不弱。\n\n';
  } else {
    result += '牌还没连成一条线，说明现在还没定型，别急着给自己下结论。\n\n';
  }

  // ---------- 2. 事情的来路（只讲天机线那三宫） ----------
  if (lineGongs.length) {
    result += '【事情的来路】\n';
    const lineSlots = slots.filter(s => s.linePos >= 0 && s.linePos < 3)
      .sort((a, b) => a.linePos - b.linePos);
    const segName = ['起因', '经过', '结果'];
    for (const s of lineSlots) {
      const seg = s.parts.line
        ? s.parts.line.replace(/^此宫位于天机线「[^」]*」段，/, '')
        : s.parts.lead;
      const head = /^(事情的)?(起因|经过|结果)$/.test(s.label) || segName.includes(s.label)
        ? segName[s.linePos]
        : s.label;
      result += `${head}：${seg}\n`;
    }
    result += '\n';
  }

  // ---------- 3. 牌面（每张牌两句，不再把差值/旺衰/体用复述一遍） ----------
  if (slots.length) {
    result += '【牌面】\n';
    for (const s of slots) {
      const img = getCardImage(s.card);
      const head = img ? img.image : s.parts.lead;
      const tail = s.parts.hidden ? `${s.parts.trait || ''}${s.parts.trait ? ' ' : ''}${s.parts.hidden}` : s.parts.trait;
      const metaBits = [img ? img.domain : '', `差值${s.absDiff}`].filter(Boolean).join('｜');
      result += `· ${s.label}（${metaBits}）：${head}\n`;
      if (tail) result += `  ${tail}\n`;
      if (s.parts.shadow) result += `  ${s.parts.shadow}\n`;
    }
    result += '\n';
  }

  // ---------- 4. 再看一层（只对主线头一张牌，不逐宫铺） ----------
  const deeperSlot = slots.find(s => s.linePos === 0) || slots[0];
  if (deeperSlot) {
    const deeper = pickDeeper(deeperSlot.g, `${state.question || ''}|${deeperSlot.label}`);
    if (deeper) result += `【再看一层】\n${deeper}\n\n`;
  }

  // ---------- 5. 旁枝（没进天机线的宫，一句带过） ----------
  const sideSlots = slots.filter(s => s.linePos < 0);
  if (sideSlots.length) {
    const names = [...new Set(sideSlots.map(s => GONG_NAMES[s.g] + '宫'))].join('、');
    result += `【还有几处】\n${names} 上还落着${sideSlots.length}张牌，不在主线上。`
      + '多半是旁枝：可能有人插手，也可能是你自己的一部分心思，先放一放。\n\n';
  }

  // ---------- 5. 你与所问之事（只出现一次） ----------
  if (tiWx && yongWx) {
    result += `【你与所问之事】\n你为${tiWx}，所问之事为${yongWx}`
      + `${relation ? `，${getShengKeLabel(relation)}` : ''}。\n\n`;
  }

  // ---------- 6. 底牌（八字 / 关键词 / 张力，压成一小段） ----------
  const bazi = getBaziFromProfile();
  const keywords = state.question ? extractKeywords(state.question) : [];
  const durian = calculateDurianIndex(state);
  if (durian) state.durianIndex = durian;
  let meta = '';
  if (bazi) meta += `生辰：${bazi.fullText}\n`;
  if (keywords.length) meta += `你说的关键词：${keywords.join('、')}\n`;
  if (durian) meta += `张力指数：${durian.score}/10（${durian.level}）——${durian.description}\n`;
  if (envCount) meta += `环境均分：${envAvg.toFixed(1)}`;
  if (meta) result += `【底牌】\n${meta.replace(/\n$/, '')}\n\n`;

  // ---------- 7. 收在动作与决定权 ----------
  const seed = `${state.question || ''}|${state.category || ''}|${durian ? durian.score : ''}`;
  result += `今天能做的一步：${pickSmallAction(seed)}\n`;
  result += `${pickHandback(seed)}\n`;

  result = applyCovenant(result);
  // 记下这次问的是什么（下一次同一件事进来时才拦得住）
  if (state.question) recordAsk(state.question);
  const summary = buildSummary(state);
  return { text: result.trim(), modules: [], summary };
}
