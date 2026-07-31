// ===== src/ui.js · 业务主控（含周期抽牌 + 分类联动 + 模块化解读） =====
import { state } from './state.js';
import { injectAnimations } from './ui/ui-anim.js';
import {
  renderStep1, renderStep2, renderFullReport, renderHistoryPanel,
  initSettingsPanel, initProfilePanel, updateApiStatus, refreshAll,
  bindScrollButtons, renderPeriodCards
} from './ui/ui-render.js';
import {
  toast, guardMidnight, showOnboarding, showTimeCapsule, showDurianReport,
  togglePanel, showDailyFortune, showHistoryDetail, generateShareCode,
  importShareCode, generateShareImage, saveShareImage, showAIGuideModal
} from './ui/ui-modal.js';
import { initDrag, removeLineSelector, sealDeck, isCardPlaced, findCardById, placeCardOnGong, placeCardOnTiYong, setLine } from './ui/ui-drag.js';
import {
  getApiSettings, saveApiSettings, clearApiSettings, getProfile, saveProfile,
  hasCompletedOnboarding, getDrawTimestamps, addDrawTimestamp,
  saveReading, addTimelineEntry, saveTimeCapsule, getTimeCapsule,
  deleteHistoryItem, exportAllData
} from './storage.js';
import { requestReading, requestFollowUp, testApiConnection } from './ai.js';
import {
  createDeck, shuffle, drawTiYong, calcDiff, calcFullBaZi,
  checkUsageFrequency
} from './engine.js';
import {
  API_PROVIDERS, getShengKe, getShengKeLabel, getWangState, getWuxing,
  getCardValue, GONG_NAMES, GONG_WUXING, ALL_LINES, TIME_LABELS, GONG_ORDER,
  CATEGORIES, PERIODS, getCurrentPeriodKey, getCategoryConfig
} from './data.js';
import { MAX_DAILY_OBSERVATIONS } from './constants.js';
import { UI_TEXTS } from './texts/index.js';
import { calculateDurianIndex } from './durian.js';
import {
  generateChaosSeed, seedToX0, chaoticGenerator, chaoticShuffle,
  generateFingerprint
} from './chaos.js';
import { getEntropyBuffer, resetEntropy, startEntropyCollection, stopEntropyCollection } from './entropy.js';
import { interceptQuestion, checkDependency, getSealStatus } from './philosophy/ethics.js';
import { applyCovenant } from './philosophy/covenant.js';

// --- 基础 ---
function mulberry32(a) {
  return function() {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    var t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

export function updateStep(n) {
  state.step = n;
  for (let i = 1; i <= 3; i++) {
    const el = document.getElementById('sd' + i);
    if (!el) continue;
    el.classList.remove('active', 'done');
    if (i < n) el.classList.add('done');
    if (i === n) el.classList.add('active');
  }
}

export function getBaziFromProfile() {
  try {
    const profile = getProfile();
    if (!profile || !profile.birthDate) return null;
    const parts = profile.birthDate.split('-');
    if (parts.length !== 3) return null;
    const year = parseInt(parts[0]); const month = parseInt(parts[1]); const day = parseInt(parts[2]);
    if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
    let hour = 12;
    if (profile.birthTime) { const tp = profile.birthTime.split(':'); if (tp.length >= 1) hour = parseInt(tp[0]) || 12; }
    return calcFullBaZi(year, month, day, hour);
  } catch (e) { return null; }
}

export function detectIntent(question, category, subCategory) {
  // 优先使用指定分类
  if (category) return subCategory || category;
  const q = (question || '').toLowerCase();
  const intentMap = {
    '感情': ['复合','分手','前任','脱单','正缘','桃花','暧昧','他爱','出轨','婚姻','结婚','离婚','心动','爱'],
    '财运': ['财运','赚钱','项目','投资','破财','工资','偏财','奖金','股票','基金','钱'],
    '事业': ['工作','跳槽','升职','面试','创业','辞职','老板','同事','裁员'],
    '健康': ['身体','生病','手术','失眠','焦虑','抑郁','头疼'],
    '学业': ['考试','考研','考公','成绩','论文','上岸','毕业','升学'],
    '人际关系': ['小人','贵人','朋友','婆媳','婆婆','媳妇','社交','同事'],
    '决策': ['该不该','选哪个','要不要','能不能','怎么办','纠结'],
    '寻物': ['找','丢','东西在哪','不见了','遗失'],
    '家宅': ['风水','房子','搬家','装修','家里'],
    '灵异': ['梦','直觉','感应','前世'],
    '运势': ['运势','今年','今年','日运','周运','月运','年运']
  };
  for (const [intent, keywords] of Object.entries(intentMap)) {
    if (keywords.some(k => q.includes(k))) return intent;
  }
  return null;
}

// ===== 本地解读（13维交叉） =====
export async function localInterpretation() {
  const readings = await import('./texts/texts-readings.js');
  const tiWx = getWuxing(state.ti), yongWx = getWuxing(state.yong);
  const relation = getShengKe(tiWx, yongWx);
  const intent = detectIntent(state.question, state.category, state.subCategory);
  state.intent = intent;
  
  const catConfig = getCategoryConfig(state.category);

  let result = '';
  const profile = getProfile();
  if (profile) {
    let parts = [];
    if (profile.name) parts.push(`姓名：${profile.name}`);
    if (profile.gender) parts.push(`性别：${profile.gender}`);
    if (profile.birthPlace) parts.push(`出生地：${profile.birthPlace}`);
    if (profile.currentPlace) parts.push(`现居地：${profile.currentPlace}`);
    if (parts.length) result += '【求测人】' + parts.join('，') + '\n\n';
  }
  if (state.category) result += `【领域：${state.category}${state.subCategory ? '/' + state.subCategory : ''}】\n\n`;
  if (catConfig && catConfig.promptHint) result += `【类别提示】${catConfig.promptHint}\n\n`;

  const bazi = getBaziFromProfile();
  if (bazi) result += `【四柱】${bazi.fullText}\n\n`;

  result += `体牌为${tiWx}，代表你。用牌为${yongWx}，代表所问之事。\n`;
  if (relation) result += `（${relation} ${getShengKeLabel(relation)}）\n\n`;

  if (state.line) result += `天机线：${state.line.map(g => GONG_NAMES[g] + '宫').join(' → ')}\n\n`;

  const allGongs = state.gongOrder.length ? state.gongOrder : Object.keys(state.grid).map(Number);
  const modules = [];

  // 模块1：核心判词（交叉融合多维度）
  let coreText = '';
  for (const g of allGongs) {
    const cards = state.grid[g] || [];
    if (!cards.length) continue;
    cards.forEach(card => {
      const diff = calcDiff(g, card);
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
        diff,
        intent
      };
      const readingResult = readings.generateFullReading(ctx);
      const label = state.lineOrder[g] || GONG_NAMES[g] + '宫';
      coreText += `【${label}】差值 ${diff}\n${readingResult.light}\n\n---\n${readingResult.shadow}\n\n`;
    });
  }
  if (coreText) result += `【牌面核心判定】\n${coreText}\n\n`;

  // 模块2：五行生克详解
  if (tiWx && yongWx) {
    const rel = getShengKe(tiWx, yongWx);
    modules.push({
      title: '🌿 五行生克',
      content: `体为${tiWx}，用为${yongWx}。关系：${rel || '无直接生克'}。${rel ? getShengKeLabel(rel) + '（' + rel + '）' : ''}`
    });
    // 也可以在模块里包含每个宫位的五行关系
    let gongWuXing = '';
    for (const g of allGongs) {
      const cards = state.grid[g] || [];
      if (!cards.length) continue;
      cards.forEach(card => {
        const cWx = getWuxing(card);
        const relationship = getShengKe(tiWx, cWx) || '同我';
        const wang = getWangState(cWx, GONG_WUXING[g]);
        gongWuXing += `${GONG_NAMES[g]}宫：牌属${cWx}（${relationship}，${wang}）\n`;
      });
    }
    if (gongWuXing) {
      modules.push({
        title: '🔥 宫位五行分布',
        content: gongWuXing.trim()
      });
    }
  }

  // 模块3：差值分析
  let diffText = '';
  let diffSum = 0, diffCount = 0;
  for (const g of allGongs) {
    const cards = state.grid[g] || [];
    if (!cards.length) continue;
    cards.forEach(card => {
      const diff = calcDiff(g, card);
      diffSum += diff; diffCount++;
      const level = diff <= 1 ? '贴合' : diff <= 3 ? '低偏' : diff <= 5 ? '中偏' : diff <= 7 ? '高偏' : '脱节';
      diffText += `${GONG_NAMES[g]}宫：差值${diff}（${level}）\n`;
    });
  }
  const avgDiff = diffCount ? (diffSum / diffCount).toFixed(1) : 'N/A';
  modules.push({
    title: '🔢 差值分析',
    content: `平均差值：${avgDiff}\n${diffText.trim()}`
  });

  // 模块4：旺衰状态
  let wangText = '';
  for (const g of allGongs) {
    const cards = state.grid[g] || [];
    if (!cards.length) continue;
    cards.forEach(card => {
      const wang = getWangState(getWuxing(card), GONG_WUXING[g]);
      wangText += `${GONG_NAMES[g]}宫：${wang}\n`;
    });
  }
  if (wangText) modules.push({
    title: '⚡ 旺衰状态',
    content: wangText.trim()
  });

  // 模块5：天机线与时间线
  if (state.line) {
    const tlText = state.line.map((g, i) => {
      const label = state.lineOrder[g] || GONG_NAMES[g] + '宫';
      return `${label}：${GONG_NAMES[g]}宫（${GONG_WUXING[g]}）`;
    }).join('\n');
    modules.push({
      title: '⏳ 天机线（时空映射）',
      content: `${tlText}\n\n位置关系：起因→经过→结果`
    });
  } else {
    modules.push({
      title: '⏳ 天机线',
      content: '未连成天机线，当前局势仍在变化中，尚未定型。'
    });
  }

  // 模块6：四柱八字
  if (bazi) {
    modules.push({
      title: '📜 四柱八字',
      content: `${bazi.fullText}\n年柱：${bazi.yearPillar.full} 生肖：${bazi.yearPillar.shengXiao}`
    });
  }

  // 模块7：5W2H/SWOT 逻辑工具引导
  const swotText = `【5W2H 自检】\nWhat: 你要解决的核心是什么？\nWhy: 为什么现在做？\nWho: 涉及哪些人？\nWhen: 什么时候需要落实？\nWhere: 在哪个环境中？\nHow: 你打算如何行动？\nHow much: 可承受成本/收益多少？\n\n【SWOT 自检】\nS 优势：你有什么筹码？\nW 劣势：什么在拖累你？\nO 机会：什么因素对有利？\nT 威胁：最坏的可能性？`;
  modules.push({
    title: '🧠 逻辑工具自检（SWOT / 5W2H）',
    content: swotText
  });

  // 模块8：意图关键词
  if (state.question) {
    const keywords = extractKeywords(state.question);
    modules.push({
      title: '✳️ 意图关键词',
      content: keywords.length ? keywords.join('、') : '未提取到明显关键词，请尝试把问题写得更具体。'
    });
  }

  // 榴莲指数（放到最后文本，不放入模块）
  const durian = calculateDurianIndex(state);
  if (durian) {
    state.durianIndex = durian;
    result += `\n🍈 榴莲指数：${durian.score}/10（${durian.level}）\n${durian.description}\n`;
  }

  // 在最终文本中追加模块
  if (modules.length) {
    result += '\n\n===== 维度展开 =====\n\n';
    modules.forEach(m => {
      result += `【${m.title}】\n${m.content}\n\n`;
    });
  }

  result = applyCovenant(result);
  return { text: result.trim(), modules };
}

function extractKeywords(text) {
  const stopWords = ['我','你','他','她','它','的','了','吗','呢','吧','啊','是','在','有','不','想','要','能','会不会','该不该','为什么','什么','怎么'];
  const normalized = text.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, ' ');
  const tokens = normalized.split(/\s+/).filter(t => t.length >= 2 && !stopWords.includes(t));
  return tokens.slice(0, 8);
}

// ===== 生成解读（不经过比喻/回声，直接完整报告） =====
export async function generateInterpretation() {
  const seal = getSealStatus();
  if (seal && seal.sealed) { toast(`🔒 封卦中，剩余 ${seal.daysRemaining} 天`); return; }
  const timestamps = getDrawTimestamps();
  const depCheck = checkDependency(timestamps);
  if (depCheck.level === 'blocked') { toast(depCheck.message, 4000); return; }
  const todayCount = timestamps.filter(ts => new Date(ts).toDateString() === new Date().toDateString()).length;
  if (!state.userCorpus.includes(state.question)) state.userCorpus.push(state.question);

  const { text, modules } = await localInterpretation();
  state.pendingFullReport = text;

  updateStep(3);
  renderFullReport(text, modules);

  try {
    const readingData = { time: Date.now(), question: state.question, category: state.category, subCategory: state.subCategory, intent: state.intent, ti: state.ti, yong: state.yong, grid: state.grid, line: state.line, lineOrder: state.lineOrder, text, chatHistory: state.chatHistory.slice(), durianScore: state.durianIndex?.score || 0 };
    saveReading(readingData);
    addTimelineEntry(readingData);
  } catch (e) { toast('历史保存失败，但解读有效', 2000); }
  addDrawTimestamp(Date.now());
  if (!getTimeCapsule()) saveTimeCapsule({ question: state.question, text: text.slice(0, 500), timestamp: Date.now() });
  if (todayCount >= MAX_DAILY_OBSERVATIONS) toast('今日已多次观测，注意休息。', 3000);
}

export function showFullReport() {
  const text = state.pendingFullReport || '';
  if (!text) { toast('没有可显示的解读'); return; }
  const modules = state.pendingModules || null;
  renderFullReport(text, modules);
  updateStep(3);
}

// ===== AI 提示词（加入分类维度） =====
export async function buildAIPrompt() {
  const { text } = await localInterpretation();
  const profile = getProfile();
  let personalPrefix = '';
  if (profile) {
    let parts = [];
    if (profile.name) parts.push(`姓名：${profile.name}`);
    if (profile.gender) parts.push(`性别：${profile.gender}`);
    if (profile.birthPlace) parts.push(`出生地：${profile.birthPlace}`);
    if (profile.currentPlace) parts.push(`现居地：${profile.currentPlace}`);
    if (parts.length) personalPrefix = '【求测人信息】' + parts.join('，') + '\n\n';
  }
  const catConfig = getCategoryConfig(state.category);
  const catHint = catConfig?.promptHint ? `类别：${state.category}${state.subCategory ? '/' + state.subCategory : ''}\n类别关注点：${catConfig.promptHint}` : '';
  return `${personalPrefix}${catHint}\n\n请根据以下浮生牌局象进行详细解读。\n\n要求：纯文本格式，严禁使用任何Markdown符号。用自然语言分段。从体用生克、时空推演、宫位差值、旺相休囚、阴阳属性等方面展开。话不说死。\n\n${text}\n\n规则：红桃火(阳) 方块金(阳) 梅花木(阴) 黑桃水(阴) JQK土 大王天(阳) 小王人(阴)。`;
}

// ===== 重置 =====
export function resetAll() {
  if (!confirm('此阵一散，当下映照便消逝，确要重来吗？')) return;
  Object.assign(state, { question: '', category: '', subCategory: '', deck: [], ti: null, yong: null, grid: {}, line: null, lineOrder: {}, step: 1, sel: null, possible: [], manualMode: false, gongOrder: [], chatHistory: [], uid: Date.now() % 1000000, editCount: 0, refinementTags: {}, intent: null, fingerprint: null, entropyLevel: 0, chaosSeed: null, sealed: false, sealedAt: null, durianIndex: null, pendingFullReport: '', periodType: null, periodKey: null, periodCard: null, periodFortune: '' });
  resetEntropy();
  const resultArea = document.getElementById('resultArea'); if (resultArea) resultArea.innerHTML = '';
  const tiyongBar = document.getElementById('tiyongBar'); if (tiyongBar) tiyongBar.innerHTML = '';
  const gridArea = document.getElementById('gridArea'); if (gridArea) gridArea.style.display = 'none';
  updateStep(1);
  renderStep1();
  toast(UI_TEXTS.toastReset);
}

// ===== 起卦 =====
export function startQuestion() {
  const input = document.getElementById('questionInput');
  const q = input?.value?.trim() || '';
  if (q) { const intercept = interceptQuestion(q); if (intercept.blocked) { toast(intercept.message, 4000); return; } }
  state.question = q;
  proceedStartQuestion();
}

export function proceedStartQuestion() {
  state.manualMode = false;
  state.uid = Date.now() % 1000000;
  state.fingerprint = null;
  state.sealed = false;
  (async () => {
    state.loading = true;
    try {
      startEntropyCollection();
      await new Promise(r => setTimeout(r, 300));
      const entropy = getEntropyBuffer();
      stopEntropyCollection();
      const seed = await generateChaosSeed(entropy.length > 0 ? entropy : new Uint8Array([Date.now() % 256]));
      state.chaosSeed = seed;
      const x0 = seedToX0(seed);
      const gen = chaoticGenerator(x0);
      const deck = createDeck(false);
      const shuffled = chaoticShuffle(deck, gen);
      state.deck = shuffled;
      state.fingerprint = generateFingerprint(shuffled);
      state.ti = null; state.yong = null; state.grid = {}; state.line = null; state.lineOrder = {}; state.sel = null; state.possible = []; state.chatHistory = []; state.gongOrder = []; state.editCount = 0; state.refinementTags = {}; state.intent = null;
      updateStep(2);
      renderStep2();
    } finally { state.loading = false; }
  })();
}

export function startManualEntry() {
  guardMidnight(() => {
    const input = document.getElementById('questionInput');
    state.question = input?.value?.trim() || '';
    state.manualMode = true;
    state.uid = Date.now() % 1000000;
    state.deck = createDeck(true);
    state.ti = null; state.yong = null; state.grid = {}; state.line = null; state.lineOrder = {}; state.sel = null; state.possible = []; state.chatHistory = []; state.gongOrder = []; state.editCount = 0; state.refinementTags = {}; state.intent = null; state.fingerprint = null; state.sealed = false;
    updateStep(2); renderStep2();
  });
}

export function lazyStart() {
  guardMidnight(() => proceedLazyStart());
}

async function proceedLazyStart() {
  const input = document.getElementById('questionInput');
  state.question = input?.value?.trim() || '';
  state.manualMode = false;
  startEntropyCollection();
  await new Promise(r => setTimeout(r, 300));
  const entropy = getEntropyBuffer();
  stopEntropyCollection();
  const seed = await generateChaosSeed(entropy.length > 0 ? entropy : new Uint8Array([Date.now() % 256]));
  state.chaosSeed = seed;
  const x0 = seedToX0(seed);
  const gen = chaoticGenerator(x0);
  let deck = createDeck(false);
  const shuffled = chaoticShuffle(deck, gen);
  state.fingerprint = generateFingerprint(shuffled);
  const { ti, yong, remaining } = drawTiYong(shuffled);
  state.ti = ti; state.yong = yong;
  let remainingDeck = remaining;
  remainingDeck.push({ isJoker: true, type: '大王', _uid: state.uid++ }, { isJoker: true, type: '小王', _uid: state.uid++ });
  remainingDeck = shuffle(remainingDeck);
  const line = ALL_LINES[Math.floor(mulberry32(seedToX0(seed) * 10000)() * ALL_LINES.length)];
  state.line = [...line];
  const key = line.join(','); const tl = TIME_LABELS[key] || {};
  state.lineOrder = {}; state.lineOrder[line[0]] = '起因'; state.lineOrder[line[1]] = '经过'; state.lineOrder[line[2]] = '结果';
  for (let g = 1; g <= 9; g++) if (!state.lineOrder[g]) state.lineOrder[g] = tl[g] || '';
  for (const g of line) state.grid[g] = [remainingDeck.pop()];
  for (const g of GONG_ORDER) if (!state.grid[g] && remainingDeck.length) state.grid[g] = [remainingDeck.pop()];
  state.deck = remainingDeck; state.gongOrder = line.slice(); state.sealed = true;
  updateStep(3);
  const { text, modules } = await localInterpretation();
  renderFullReport(text, modules);
  toast('🔒 牌局已自动封印', 3000);
}

// ===== 周期抽牌（真正的随机抽取 + 长期挂卡） =====
export async function drawPeriodCard(periodType) {
  const periodConfig = PERIODS[periodType];
  if (!periodConfig) return;
  const periodKey = getCurrentPeriodKey(periodType);

  // 检查是否已抽过当前周期
  const storedPeriods = JSON.parse(localStorage.getItem('fs_period_cards') || '{}');
  const stored = storedPeriods[periodType];
  if (stored && stored.periodKey === periodKey && stored.card) {
    toast(`${periodConfig.label}已抽过，本次显示已保存的结果`, 2500);
    renderStep1(); // 刷新显示
    return;
  }

  // 真正随机抽一张牌
  state.loading = true;
  try {
    startEntropyCollection();
    await new Promise(r => setTimeout(r, 200));
    const entropy = getEntropyBuffer();
    stopEntropyCollection();
    const seed = await generateChaosSeed(entropy.length > 0 ? entropy : new Uint8Array([Date.now() % 256]));
    const x0 = seedToX0(seed);
    const gen = chaoticGenerator(x0);
    const deck = createDeck(true); // 含大小王的54张
    const shuffled = chaoticShuffle(deck, gen);
    const card = shuffled[0];
    const wx = getWuxing(card);
    // 生成一句简短解读
    const fortune = generatePeriodFortune(card, wx, periodType);
    // 存储
    storedPeriods[periodType] = { periodKey, card, fortune, drawnAt: Date.now() };
    localStorage.setItem('fs_period_cards', JSON.stringify(storedPeriods));
    // 更新当前状态
    state.periodType = periodType;
    state.periodKey = periodKey;
    state.periodCard = card;
    state.periodFortune = fortune;
    toast(`${periodConfig.label}已抽取`, 1500);
    renderStep1(); // 刷新页面显示
  } catch(e) {
    toast('周期抽牌失败，请重试', 3000);
  } finally {
    state.loading = false;
  }
}

function generatePeriodFortune(card, wx, periodType) {
  const rank = card.isJoker ? card.type : card.rank;
  const suit = card.isJoker ? '' : card.suit;
  const label = `${rank}${suit}`;
  const fortunes = {
    '火': '热情是今天的燃料，但别烧太急。',
    '金': '现在是做决断的时候，相信你得判断力。',
    '木': '缓慢生长也是生长，别急着开花。',
    '水': '顺势而为，遇到阻力不用硬撞。',
    '土': '稳住，适合积累，不适合激进。',
    '天': '大局有利，适合定大方向。',
    '人': '靠人脉和沟通来解决问题。'
  };
  const base = fortunes[wx] || '保持清醒，平常心看待。';
  const periodLabel = PERIODS[periodType]?.label || '';
  return `${periodLabel}牌面：${label}（${wx}）。${base}`;
}

// ===== 布阵相关 =====
export function resetStep2() {
  if (state.sealed) { toast('牌局已封印，不可重置'); return; }
  if (state.ti) { state.deck.push(state.ti); state.ti = null; }
  if (state.yong) { state.deck.push(state.yong); state.yong = null; }
  state.deck = shuffle(state.deck); state.sel = null;
  refreshAll();
  if (state.step === 2) renderStep2(); else { updateStep(2); renderStep2(); }
  toast('体用已重置，可重新选牌');
}

export function confirmTiYong() {
  if (!state.ti || !state.yong) { toast('请先选好体用牌'); return; }
  if (state.sealed) { toast('牌局已封印'); return; }
  state.deck.push({ isJoker: true, type: '大王', _uid: state.uid++ }, { isJoker: true, type: '小王', _uid: state.uid++ });
  state.deck = shuffle(state.deck);
  const gridArea = document.getElementById('gridArea'); if (gridArea) gridArea.style.display = 'block';
  const deckEl = document.getElementById('deckContainer');
  if (deckEl) { deckEl.classList.add('shuffling'); setTimeout(() => deckEl.classList.remove('shuffling'), 700); }
  toast(UI_TEXTS.toastJokersInjected);
  refreshAll();
}

export function resetGrid() {
  if (state.sealed) { toast('牌局已封印，不可修改'); return; }
  for (const g in state.grid) state.deck.push(...state.grid[g]);
  state.grid = {}; state.line = null; state.lineOrder = {}; state.possible = []; state.gongOrder = []; state.sel = null;
  state.deck = state.manualMode ? state.deck : shuffle(state.deck);
  removeLineSelector();
  refreshAll();
  toast(UI_TEXTS.toastGridCleared);
}

export function sealDeckAction() { sealDeck(); }
export function switchMode(mode) { state.mode = mode; refreshAll(); }
export function showTimeCapsuleAction() { showTimeCapsule(); }
export function showDurianReportAction() { showDurianReport(); }

export function copyLocalResult() {
  const el = document.getElementById('interpretText'); if (!el) return;
  navigator.clipboard.writeText(el.innerText).then(() => toast(UI_TEXTS.toastCopied), () => toast(UI_TEXTS.toastCopyFailed));
}

export function saveApiSettingsFromForm() {
  const p = state.selectedProvider || 'deepseek';
  const info = API_PROVIDERS[p] || API_PROVIDERS.deepseek;
  let endpoint = document.getElementById('apiEndpoint')?.value?.trim() || info.endpoint || '';
  if (endpoint.endsWith('/')) endpoint = endpoint.slice(0, -1);
  const apiKey = document.getElementById('apiKey')?.value?.trim() || '';
  const settings = { provider: p, apiKey, endpoint, model: info.model || '', aiStyle: document.getElementById('aiStyle')?.value || 'guide' };
  saveApiSettings(settings); updateApiStatus(); toast(UI_TEXTS.toastSaved);
}

export function saveProfileFromForm() {
  const bd = document.getElementById('birthDate')?.value || '';
  const bt = document.getElementById('birthTime')?.value || '';
  const name = document.getElementById('profileName')?.value?.trim() || '';
  const gender = document.getElementById('profileGender')?.value || '';
  const birthPlace = document.getElementById('birthPlace')?.value?.trim() || '';
  const currentPlace = document.getElementById('currentPlace')?.value?.trim() || '';
  saveProfile({ birthDate: bd, birthTime: bt, name, gender, birthPlace, currentPlace });
  toast(UI_TEXTS.toastProfileSaved);
}

// ===== AI =====
export async function triggerAI() {
  const btn = document.getElementById('aiReadBtn'); if (!btn) return;
  const settings = getApiSettings(); if (!settings || !settings.apiKey) { showAIGuideModal(); return; }
  btn.disabled = true; btn.textContent = '思考中...';
  const provider = settings.provider || 'deepseek';
  let endpoint = settings.endpoint || API_PROVIDERS[provider]?.endpoint || '';
  if (endpoint.endsWith('/v1')) endpoint = endpoint.slice(0, -3);
  if (endpoint.endsWith('/')) endpoint = endpoint.slice(0, -1);
  const model = settings.model || API_PROVIDERS[provider]?.model || '';
  const prompt = await buildAIPrompt();
  try {
    const result = await requestReading({ provider, apiKey: settings.apiKey, endpoint, model, style: settings.aiStyle || 'guide', prompt });
    const container = document.getElementById('aiResultContainer'); const content = document.getElementById('aiResultContent');
    if (container) container.style.display = 'block';
    if (content) content.innerHTML = '<strong>深层解读：</strong><br>' + result.replace(/\n/g, '<br>');
    state.chatHistory = [{ role: 'user', content: prompt }, { role: 'assistant', content: result }];
    const followUp = document.getElementById('followUpArea'); if (followUp) followUp.style.display = 'block';
    toast('解读完成');
  } catch (e) {
    const container = document.getElementById('aiResultContainer'); if (container) container.style.display = 'block';
    const content = document.getElementById('aiResultContent');
    const { text } = await localInterpretation();
    if (content) content.innerHTML = `<div style="color:#c9a060;border:1px solid #c9a060;padding:8px;border-radius:6px;margin-bottom:8px;font-size:0.85rem;">⚠️ AI 服务暂时无法连接，以下为规则引擎生成的原始解读：</div>${text.replace(/\n/g, '<br>')}`;
    toast('AI 不可用，已展示规则解读', 3000);
  } finally { btn.disabled = false; btn.textContent = '✨ AI 深度解读'; }
}

export async function sendFollowUp() {
  const input = document.getElementById('followUpInput'); if (!input) return;
  const q = input.value.trim(); if (!q) return;
  input.value = '';
  const settings = getApiSettings(); if (!settings || !settings.apiKey) { toast('未配置 API Key'); return; }
  const history = state.chatHistory; if (!history || history.length < 2) { toast('请先进行一次 AI 解读'); return; }
  history.push({ role: 'user', content: q });
  const chatBlock = document.getElementById('chatHistoryBlock'); if (chatBlock) chatBlock.innerHTML += `<div class="chat-msg user">${q}</div>`;
  const provider = settings.provider || 'deepseek';
  let endpoint = settings.endpoint || API_PROVIDERS[provider]?.endpoint || '';
  if (endpoint.endsWith('/v1')) endpoint = endpoint.slice(0, -3);
  if (endpoint.endsWith('/')) endpoint = endpoint.slice(0, -1);
  const model = settings.model || API_PROVIDERS[provider]?.model || '';
  try { const result = await requestFollowUp({ history, provider, apiKey: settings.apiKey, endpoint, model }); history.push({ role: 'assistant', content: result }); if (chatBlock) { chatBlock.innerHTML += `<div class="chat-msg ai">${result.replace(/\n/g, '<br>')}</div>`; chatBlock.scrollTop = chatBlock.scrollHeight; } } catch (e) { if (chatBlock) chatBlock.innerHTML += `<div class="chat-msg" style="color:#d45050">失败：${e.message}</div>`; }
}

export async function handleTestApiConnection() {
  const btn = document.querySelector('[data-action="testApiConnection"]'); if (btn) { btn.disabled = true; btn.textContent = '测试中...'; }
  try {
    const provider = state.selectedProvider || 'deepseek';
    let endpoint = document.getElementById('apiEndpoint')?.value?.trim() || '';
    const apiKey = document.getElementById('apiKey')?.value?.trim() || '';
    if (!apiKey && provider !== 'custom') throw new Error('请先填写 API Key');
    if (!endpoint && API_PROVIDERS[provider]) endpoint = API_PROVIDERS[provider].endpoint;
    if (endpoint.endsWith('/v1')) endpoint = endpoint.slice(0, -3);
    if (endpoint.endsWith('/')) endpoint = endpoint.slice(0, -1);
    const model = API_PROVIDERS[provider]?.model || '';
    const msg = await testApiConnection({ provider, apiKey, endpoint, model }); toast(msg, 3000);
  } catch (e) { toast(`测试失败: ${e.message}`, 4000); }
  finally { if (btn) { btn.disabled = false; btn.textContent = UI_TEXTS.btnTestApi; } }
}

// ===== 动作分发 =====
export function handleAction(action, dataset) {
  switch (action) {
    case 'togglePanel': togglePanel(dataset.panel); break;
    case 'resetAll': resetAll(); break;
    case 'confirmQuestion': startQuestion(); break;
    case 'lazyStart': lazyStart(); break;
    case 'manualEntry': startManualEntry(); break;
    case 'selectCategory':
      state.category = state.category === dataset.category ? '' : dataset.category;
      state.subCategory = '';
      document.querySelectorAll('[data-action="selectCategory"]').forEach(b => b.classList.toggle('selected', b.dataset.category === state.category));
      renderStep1();
      break;
    case 'selectSubCategory':
      state.subCategory = dataset.sub;
      renderStep1();
      break;
    case 'clearSubCategory':
      state.subCategory = '';
      renderStep1();
      break;
    case 'periodDraw':
      drawPeriodCard(dataset.period);
      break;
    case 'confirmTiYong': confirmTiYong(); break;
    case 'resetStep2': resetStep2(); break;
    case 'resetGrid': resetGrid(); break;
    case 'generateInterpretation': generateInterpretation(); break;
    case 'copyLocal': copyLocalResult(); break;
    case 'shareImage': generateShareImage(); break;
    case 'shareCode': generateShareCode(); break;
    case 'exportData': exportAllData(); break;
    case 'triggerAI': triggerAI(); break;
    case 'sendFollowUp': sendFollowUp(); break;
    case 'saveApiSettings': saveApiSettingsFromForm(); break;
    case 'clearApiSettings': clearApiSettings(); const keyInput = document.getElementById('apiKey'); if (keyInput) keyInput.value = ''; updateApiStatus(); toast(UI_TEXTS.toastCleared); break;
    case 'testApiConnection': handleTestApiConnection(); break;
    case 'saveProfile': saveProfileFromForm(); break;
    case 'deleteHistoryItem': if (dataset.historyIndex !== undefined) { deleteHistoryItem(parseInt(dataset.historyIndex)); renderHistoryPanel(); document.getElementById('modal')?.setAttribute('hidden', ''); toast('已删除'); } break;
    case 'importCode': importShareCode(); break;
    case 'dailyFortune': showDailyFortune(); break;
    case 'closeModal': document.getElementById('modal')?.setAttribute('hidden', ''); break;
    case 'closeShare': document.getElementById('sharePreview')?.setAttribute('hidden', ''); break;
    case 'saveShareImage': saveShareImage(); break;
    case 'sealDeck': sealDeckAction(); break;
    case 'timeCapsule': showTimeCapsuleAction(); break;
    case 'durianReport': showDurianReportAction(); break;
    default: break;
  }
}

// ===== 事件绑定 =====
function bindAllEvents() {
  document.addEventListener('click', function(e) {
    const btn = e.target.closest('button');
    if (btn) { const action = btn.dataset.action; if (action) { handleAction(action, btn.dataset); return; } }
    const historyItem = e.target.closest('.history-item'); if (historyItem && historyItem.dataset.index !== undefined) { showHistoryDetail(parseInt(historyItem.dataset.index)); return; }
    const lineBtn = e.target.closest('.line-btn'); if (lineBtn && lineBtn.dataset.line) { setLine(lineBtn.dataset.line.split(',').map(Number)); return; }
    const emptyDash = e.target.closest('.empty-dash'); if (emptyDash && state.sel) { const card = findCardById(state.sel); if (card && !isCardPlaced(card)) { if (emptyDash.textContent.includes('体')) placeCardOnTiYong(card, 'ti'); else placeCardOnTiYong(card, 'yong'); } return; }
    const gong = e.target.closest('.gong'); if (gong && state.sel) { const g = parseInt(gong.dataset.gong); const card = findCardById(state.sel); if (card && !isCardPlaced(card)) placeCardOnGong(card, g); }
  });
  document.addEventListener('click', function(e) {
    const b = e.target.closest('#providerGrid button'); if (b && b.dataset.value) { state.selectedProvider = b.dataset.value; document.querySelectorAll('#providerGrid button').forEach(x => x.classList.toggle('selected', x === b)); const info = API_PROVIDERS[state.selectedProvider]; if (info) { const ep = document.getElementById('apiEndpoint'); if (ep) ep.value = info.endpoint || ''; } }
    const modalEl = document.getElementById('modal'); if (e.target === modalEl && modalEl) modalEl.setAttribute('hidden', '');
  });
  document.addEventListener('keydown', function(e) { if (e.key === 'Escape') { const modal = document.getElementById('modal'); if (modal && !modal.hasAttribute('hidden')) modal.setAttribute('hidden', ''); const share = document.getElementById('sharePreview'); if (share && !share.hasAttribute('hidden')) share.setAttribute('hidden', ''); const onboard = document.querySelector('.onboard-overlay'); if (onboard) onboard.remove(); } });
}

// ===== 初始化 =====
function init() {
  try {
    updateStep(1); renderStep1(); updateApiStatus();
    const ep = document.getElementById('apiEndpoint'); if (ep && !ep.value) ep.value = API_PROVIDERS.deepseek.endpoint;
    if (!hasCompletedOnboarding()) showOnboarding();
    injectAnimations(); bindAllEvents(); initDrag(); bindScrollButtons();
    renderPeriodCards();
  } catch (e) {
    document.body.innerHTML = '<div style="color:#d45050;padding:40px;text-align:center;"><h2>浮生牌启动失败</h2><p>' + e.message + '</p></div>';
    console.error(e);
  }
}
document.addEventListener('DOMContentLoaded', init);