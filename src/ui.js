// ===== src/ui.js · 业务主控（日运细选+模型选择+AI高级参数+盲抽牌灵+from=share） =====
// 中文字体：仅桌面端异步加载（Noto Serif SC 全字集较大，移动端用系统无衬线栈更快，
// 不阻塞首屏，font-display:swap 生效后按需下载所需字集）
if (!window.matchMedia('(pointer: coarse)').matches) {
  Promise.all([
    import('@fontsource/noto-serif-sc/400.css'),
    import('@fontsource/noto-serif-sc/600.css'),
    import('@fontsource/noto-serif-sc/700.css'),
  ]).catch(() => {});
}

import { state } from './state.js';
import { injectAnimations } from './ui/ui-anim.js';
import {
  renderStep1, renderStep2, renderFullReport, renderHistoryPanel,
  initSettingsPanel, initProfilePanel, updateApiStatus, refreshAll,
  bindScrollButtons, renderPeriodCards
} from './ui/ui-render.js';
import {
  toast, showOnboarding, showDurianReport, showReportsModal,
  renderPeriodReportInto, replayTimelineEntry,
  togglePanel, showHistoryDetail, generateShareCode,
  importShareCode, generateShareImage, saveShareImage, showAIGuideModal,
  showDataMigrationModal, showDailyFortunePicker
} from './ui/ui-modal.js';
import {
  initDrag, setLine, findCardById, isCardPlaced,
  placeCardOnTiYong, placeCardOnGong, sealDeck
} from './ui/ui-drag.js';
import {
  getApiSettings, saveApiSettings, clearApiSettings, getProfile, saveProfile,
  hasCompletedOnboarding, getDrawTimestamps, addDrawTimestamp,
  saveReading, addTimelineEntry, saveTimeCapsule, getTimeCapsule,
  deleteHistoryItem, exportAllData, updateHistoryChat,
  getStoredPeriodCards, saveStoredPeriodCard, addPeriodHistoryEntry,
  getHistory
} from './storage.js';
import { requestReading, requestFollowUp, testApiConnection } from './ai.js';
import {
  createDeck, shuffle, drawTiYong, calcFullBaZi, calcDiff
} from './engine.js';
import {
  API_PROVIDERS, POPULAR_MODELS, getShengKe, getShengKeLabel, getWangState, getWuxing,
  getCardValue, getCardColor, GONG_NAMES, GONG_WUXING, ALL_LINES, TIME_LABELS, GONG_ORDER,
  CATEGORIES, PERIODS, getCurrentPeriodKey, getPeriodTitle, getPeriodDesc,
  getRecommendedGongForCategory, getGongEnvironment,
  DAILY_FORTUNE_TYPES, getDailyFortuneType
} from './data.js';
import { MAX_DAILY_OBSERVATIONS, pick } from './constants.js';
import { UI_TEXTS, STATUS_POOL, REMINDER_POOL, ACTION_POOL } from './texts/index.js';
import { getDailyMirrorLine, getSceneLines, getWakeUpLine } from './texts/mirror-pools.js';
import { buildDailyOracle } from './texts/daily-oracle.js';
import { getPokerPersona } from './persona.js';
import { calculateDurianIndex } from './durian.js';
import { generateFingerprint, seedToX0, chaoticGenerator, chaoticShuffle } from './chaos.js';
import { interceptQuestion, checkDependency, getSealStatus } from './philosophy/ethics.js';
import { applyCovenant } from './philosophy/covenant.js';
import { generateSingleCardMetaphor } from './metaphor.js';
import { escapeForHTML, setHTML } from './utils/safe.js';
import { playCardSound, playJokerSound, playPlaceSound } from './utils/sound.js';
import { initPWA } from './pwa.js';
import { resolveApiModel } from './utils/api-config.js';
import { syncQuestionFromInput, createPeriodShareAction } from './utils/flow-helpers.js';
import { copyTextWithFeedback } from './utils/clipboard.js';

function safeSetPeriodCards(cards) {
  try {
    localStorage.setItem('fsp_period_cards', JSON.stringify(cards));
  } catch (e) {
    console.warn('周期卡存储迁移失败', e);
  }
}

// --- 核心 ---
export function updateStep(n) {
  state.step = n;
  // 首页（起念）在宽屏下让内容区全宽，避免左右空栏挤压；立极/观象恢复三栏
  const panels = document.getElementById('dynamicPanels');
  if (panels) panels.classList.toggle('step-home', n === 1);
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
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]);
    const day = parseInt(parts[2]);
    if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
    let hour = 12;
    if (profile.birthTime) {
      const tp = profile.birthTime.split(':');
      if (tp.length >= 1) hour = parseInt(tp[0]) || 12;
    }
    const longitude = profile.birthLongitude || 120;
    return calcFullBaZi(year, month, day, hour, longitude);
  } catch (e) { return null; }
}

export function detectIntent(question, category, subCategory) {
  if (category) return subCategory || category;
  const q = (question || '').toLowerCase();
  const intentMap = {
    '感情': ['复合', '分手', '前任', '脱单', '正缘', '桃花', '暧昧', '他爱', '出轨', '婚姻', '结婚', '离婚', '心动', '爱'],
    '财运': ['财运', '赚钱', '项目', '投资', '破财', '工资', '偏财', '奖金', '股票', '基金', '钱'],
    '事业': ['工作', '跳槽', '升职', '面试', '创业', '辞职', '老板', '同事', '裁员'],
    '健康': ['身体', '生病', '手术', '失眠', '焦虑', '抑郁', '头疼'],
    '学业': ['考试', '考研', '考公', '成绩', '论文', '上岸', '毕业', '升学'],
    '人际关系': ['小人', '贵人', '朋友', '婆媳', '婆婆', '媳妇', '社交', '同事'],
    '决策': ['该不该', '选哪个', '要不要', '能不能', '怎么办', '纠结'],
    '寻物': ['找', '丢', '东西在哪', '不见了', '遗失'],
    '家宅': ['风水', '房子', '搬家', '装修', '家里'],
    '灵异': ['梦', '直觉', '感应', '前世'],
    '运势': ['运势', '今年', '日运', '周运', '月运', '年运'],
    '风水': ['风水', '阳宅', '阴宅', '布局', '气场', '方位'],
    '射覆': ['射覆', '藏物', '找东西', '在哪', '遗失']
  };
  for (const [intent, keywords] of Object.entries(intentMap)) {
    if (keywords.some(k => q.includes(k))) return intent;
  }
  return null;
}

// ===== 三句摘要（此刻的状态 / 一个提醒 / 一句建议） =====
// 同局稳定：同一副牌局反复查看，摘要保持一致
function buildSummary() {
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

// ===== 本地解读 =====
export async function localInterpretation() {
  const readings = await import('./texts/texts-readings.js');
  const tiWx = getWuxing(state.ti), yongWx = getWuxing(state.yong);
  const relation = getShengKe(tiWx, yongWx);
  const intent = detectIntent(state.question, state.category, state.subCategory);
  state.intent = intent;

  let result = '';

  const profile = getProfile();
  if (profile && (profile.name || profile.gender || profile.birthPlace || profile.currentPlace)) {
    let parts = [];
    if (profile.name) parts.push(`姓名：${profile.name}`);
    if (profile.gender) parts.push(`性别：${profile.gender}`);
    if (profile.birthPlace) parts.push(`出生地：${profile.birthPlace}`);
    if (profile.currentPlace) parts.push(`现居地：${profile.currentPlace}`);
    if (parts.length) result += `【求测人】${parts.join('，')}\n\n`;
  }
  if (state.category) result += `【领域：${state.category}${state.subCategory ? '/' + state.subCategory : ''}】\n\n`;
  const bazi = getBaziFromProfile();
  if (bazi) result += `【四柱】${bazi.fullText}\n\n`;
  result += `你为${tiWx}，所问之事为${yongWx}。\n`;
  if (relation) result += `（${relation} ${getShengKeLabel(relation)}）\n\n`;
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
  if (coreText) result += `【牌面核心判定】\n${coreText}\n\n`;

  if (tiWx && yongWx) {
    result += `【五行生克】\n你为${tiWx}，所问之事为${yongWx}。关系：${relation || '无直接生克'}。\n\n`;
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
  if (diffText) result += `【差值分析】\n${diffText}\n\n`;

  let wangText = '';
  for (const g of allGongs) {
    const cards = state.grid[g] || [];
    if (!cards.length) continue;
    cards.forEach(card => {
      const wang = getWangState(getWuxing(card), GONG_WUXING[g]);
      wangText += `${GONG_NAMES[g]}宫：${wang}\n`;
    });
  }
  if (wangText) result += `【旺衰状态】\n${wangText}\n\n`;

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
      envText += `· ${GONG_NAMES[g]}宫（${gongWx}）落 ${rank}（${cardWx}）：${env.label} —— ${env.desc}\n`;
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
  const summary = buildSummary();
  return { text: result.trim(), modules: [], summary };
}

// ===== 差值三种情况解析 =====
function getDiffAnalysisText(diffType, gong, card) {
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

function extractKeywords(text) {
  const normalized = text.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, ' ');
  const tokens = normalized.split(/\s+/).filter(t => t.length >= 2);
  const bigrams = [];
  for (let i = 0; i < tokens.length; i++) {
    for (let j = i + 1; j < Math.min(i + 3, tokens.length); j++) {
      const phrase = tokens.slice(i, j + 1).join('');
      if (phrase.length >= 2 && phrase.length <= 6) bigrams.push(phrase);
    }
  }
  return bigrams.slice(0, 6);
}

export async function generateInterpretation() {
  try {
    const seal = getSealStatus();
    if (seal && seal.sealed) { toast('牌面安静了一会儿，现在可以重新看了', 2500); }
    const timestamps = getDrawTimestamps();
    const depCheck = checkDependency(timestamps);
    if (depCheck.level === 'warning') { toast(depCheck.message, 4000); }

    const todayCount = timestamps.filter(ts => new Date(ts).toDateString() === new Date().toDateString()).length;
    if (!state.userCorpus.includes(state.question)) state.userCorpus.push(state.question);

    const { text, summary } = await localInterpretation();
    state.pendingFullReport = text;

    updateStep(3);
    renderFullReport(text, null, summary);

    try {
      const readingData = {
        time: Date.now(), question: state.question, category: state.category, subCategory: state.subCategory,
        intent: state.intent, ti: state.ti, yong: state.yong, grid: state.grid, line: state.line,
        lineOrder: state.lineOrder, text, chatHistory: state.chatHistory.slice(),
        durianScore: state.durianIndex?.score || 0,
        durianComponents: state.durianIndex?.components || null,
        consultName: state.consultMode ? (state.consultName || '求测人') : ''
      };
      saveReading(readingData);
      addTimelineEntry(readingData);
    } catch (e) { toast('历史保存失败，但解读有效', 2000, 'warning'); }
    addDrawTimestamp(Date.now());
    if (!getTimeCapsule()) saveTimeCapsule({ question: state.question, text: text.slice(0, 500), timestamp: Date.now() });
    if (todayCount >= MAX_DAILY_OBSERVATIONS) toast('今日已抽牌多次，注意休息。', 3000, 'warning');
  } catch (e) {
    console.error('[浮生牌] generateInterpretation 出错:', e);
    toast('生成解读失败: ' + (e.message || '未知错误'), 4000, 'warning');
  }
}

export function showFullReport() {
  const text = state.pendingFullReport || '';
  if (!text) { toast('没有可显示的解读', 2000, 'warning'); return; }
  renderFullReport(text, null, buildSummary());
  updateStep(3);
}

// ===== AI Prompt =====
export async function buildAIPrompt() {
  const text = state.pendingFullReport || (await localInterpretation()).text;
  const profile = getProfile();
  let personalPrefix = '';
  let personaLine = '';
  if (state.consultMode) {
    const who = state.consultName || '求测人';
    personalPrefix = `【求测人信息】本次为他人代占，求测人称呼为「${who}」\n\n`;
    personaLine = `7. 本次是代他人问占，请以「${who}」称呼求测人，解读围绕求测人本人（而非提问者）展开，措辞保持含蓄尊重。\n`;
  } else if (profile) {
    let parts = [];
    if (profile.name) parts.push(`姓名：${profile.name}`);
    if (profile.gender) parts.push(`性别：${profile.gender}`);
    if (profile.birthPlace) parts.push(`出生地：${profile.birthPlace}`);
    if (profile.currentPlace) parts.push(`现居地：${profile.currentPlace}`);
    if (parts.length) personalPrefix = `【求测人信息】${parts.join('，')}\n\n`;
  }
  // 自动带上问题/领域/意向，让 AI 更有上下文
  const contextParts = [];
  if (state.question) contextParts.push(`所求问题：${state.question}`);
  const domain = [state.category, state.subCategory].filter(Boolean);
  if (domain.length) contextParts.push(`领域：${domain.join(' / ')}`);
  if (state.intent) contextParts.push(`问事意向：${state.intent}`);
  const contextPrefix = contextParts.length ? `【本次问占】${contextParts.join('；')}\n\n` : '';
  const prompt = `${personalPrefix}${contextPrefix}请根据以下浮生牌局象进行详细解读。\n\n要求：\n1. 纯文本格式，严禁使用任何Markdown符号（包括#、*、-、数字编号）。\n2. 用自然语言分段，段落间用空行分隔。\n3. 围绕【本次问占】中的问题与领域展开，不要泛泛而谈。\n4. 从体用生克、旺相休囚、宫位差值、天机线、阴阳属性等方面展开。\n5. 结合求测人的八字五行背景，给出针对性建议。\n6. 使用含蓄、留有余地的语气，话不说死，尊重求测人的自主判断。\n${personaLine}以下是牌面信息：\n\n${text}\n\n规则：红桃火(阳) 方块金(阳) 梅花木(阴) 黑桃水(阴) JQK土 大王天(阳) 小王人(阴)。`;
  return prompt;
}

// ===== 通用单牌 AI 提示词生成器（支持细选类别） =====
export function buildSingleCardPrompt(card, opts = {}) {
  if (!card) return '';
  const wx = getWuxing(card);
  const rank = card.isJoker ? card.type : card.rank;
  const suit = card.isJoker ? '' : card.suit;
  const yinyang = card.isJoker ? (card.type === '大王' ? '阳' : '阴') : (card.suit === '♥' || card.suit === '♦' ? '阳' : '阴');
  const metaphor = opts.metaphor || '';
  const periodLabel = opts.periodLabel ? `【${opts.periodLabel}】\n` : '';
  const fortuneType = opts.fortuneType || 'overall';
  const fortuneTypeLabel = getDailyFortuneType(fortuneType)?.label || '综合';
  const now = new Date().toLocaleString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  return `${periodLabel}当前时间：${now}

【牌面】
${rank}${suit}
五行：${wx}
阴阳：${yinyang}

【单牌意象】
${metaphor || '（无预设意象，请基于牌面五行与符号与用户对话）'}

【解读要求】
请基于这张牌的五行能量、阴阳属性，结合当前时间（${now}），围绕「${fortuneTypeLabel}」这个主题，给出深度解读：
1. 这张牌对当前「${fortuneTypeLabel}」状态的影响；
2. 这张牌在“自身/人际/事业/健康”四个维度上的启示；
3. 一条具体可执行的建议。

注意：用自然语言分段，不要使用任何 Markdown 符号（#、*、列表等）。话不说死，保留开放性和对用户自主权的尊重。`;
}

export function resetAll() {
  if (!confirm('要重新开始吗？当前牌局会清空。')) return;
  Object.assign(state, {
    question: '', category: '', subCategory: '', deck: [], ti: null, yong: null,
    grid: {}, line: null, lineOrder: {}, step: 1, sel: null, possible: [],
    manualMode: false, gongOrder: [], chatHistory: [], uid: Date.now() % 1000000,
    editCount: 0, refinementTags: {}, intent: null, fingerprint: null,
    entropyLevel: 0, chaosSeed: null, sealed: false, sealedAt: null,
    durianIndex: null, pendingFullReport: '', pendingModules: null,
    currentTimeArc: null, periodType: null, periodKey: null, periodCard: null,
    periodFortune: '', periodAiHistory: [], pendingPeriodDeck: null,
    fortuneType: 'overall',
    spreadType: 'jiugong', threeCards: [], consultMode: false, consultName: '',
    summary: null
  });
  const resultArea = document.getElementById('resultArea');
  if (resultArea) setHTML(resultArea, '');
  const tiyongBar = document.getElementById('tiyongBar');
  if (tiyongBar) setHTML(tiyongBar, '');
  const gridArea = document.getElementById('gridArea');
  if (gridArea) gridArea.style.display = 'none';
  updateStep(1);
  renderStep1();
  toast(UI_TEXTS.toastReset);
}

export function startQuestion() {
  const input = document.getElementById('questionInput');
  const q = syncQuestionFromInput(input, state);
  if (q) {
    const intercept = interceptQuestion(q);
    if (intercept.blocked) { toast(intercept.message, 4000); return; }
  }
  state.question = q;
  proceedStartQuestion();
}

// ===== 在线 / 离线提示（PWA 离线引导） =====
function setupNetworkHints() {
  if (!('onLine' in navigator)) return;
  let offlineNotified = false;
  const showOffline = () => {
    if (offlineNotified) return;
    offlineNotified = true;
    toast('📴 已离线：牌局与解读照常可用，AI 深度解读需联网', 5000);
  };
  const showOnline = () => {
    if (!offlineNotified) return;
    offlineNotified = false;
    toast('📶 已恢复联网', 2500, 'success');
  };
  window.addEventListener('offline', showOffline);
  window.addEventListener('online', showOnline);
  if (!navigator.onLine) showOffline();
}

// ===== 抽牌 =====
// 真随机：每次抽牌都用 crypto 熵重新播种混沌引擎洗牌。
// 同一会话里连点多次「抽一张」，每次都是全新顺序——杜绝「洗一次牌摸一整页」的伪随机。
function chaosShuffleDeck(deck) {
  const seed = new Uint8Array(32);
  window.crypto.getRandomValues(seed);
  return chaoticShuffle(deck, chaoticGenerator(seedToX0(seed)));
}

export function proceedStartQuestion() {
  state.manualMode = false;
  state.uid = Date.now() % 1000000;
  state.fingerprint = null;
  state.summary = null;
  state.sealed = false;

  state.deck = chaosShuffleDeck(createDeck(false));
  state.fingerprint = generateFingerprint(state.deck);

  state.ti = null; state.yong = null; state.grid = {};
  state.line = null; state.lineOrder = {}; state.sel = null;
  state.possible = []; state.chatHistory = []; state.gongOrder = [];
  state.editCount = 0; state.refinementTags = {}; state.intent = null;
  state.currentTimeArc = null;
  updateStep(2);
  renderStep2();
}

// ===== 三牌直断阵（过去 / 现在 / 未来） =====
export function startThreeSpread() {
  const input = document.getElementById('questionInput');
  syncQuestionFromInput(input, state);
  state.spreadType = 'three';
  state.uid = Date.now() % 1000000;
  state.ti = null; state.yong = null; state.grid = {};
  state.line = null; state.lineOrder = {}; state.sel = null;
  state.possible = []; state.chatHistory = []; state.gongOrder = [];
  state.intent = null; state.editCount = 0; state.refinementTags = {};
  drawThreeCards();
  updateStep(2);
  renderStep2();
}

function drawThreeCards() {
  const deck = chaosShuffleDeck(createDeck(false));
  const phases = ['过去', '现在', '未来'];
  state.threeCards = deck.slice(0, 3).map((card, i) => ({ card, phase: phases[i] }));
  toast('🃏 已抽三张：过去 / 现在 / 未来', 2400, 'success');
}

export function backToJiugong() {
  state.spreadType = 'jiugong';
  state.threeCards = [];
  const modal = document.getElementById('modal');
  if (modal) modal.setAttribute('hidden', '');
  if (!state.deck || state.deck.length < 10) {
    state.deck = chaosShuffleDeck(createDeck(false));
    state.fingerprint = generateFingerprint(state.deck);
  }
  state.ti = null; state.yong = null; state.grid = {};
  state.line = null; state.lineOrder = {}; state.sel = null;
  state.possible = []; state.chatHistory = []; state.gongOrder = [];
  state.intent = null; state.editCount = 0; state.refinementTags = {};
  updateStep(1);
  renderStep1();
  toast('已切回九宫全息阵', 2000, 'success');
}

// 三牌阵专属张力指数：看五行顺逆与同气
function computeThreeDurian(cards) {
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
  if (score >= 8) desc = '三张牌气连成一线，五行顺逆皆有呼应，此事气数正旺，顺势可为。';
  else if (score >= 6) desc = '能量整体顺畅，虽有起伏但可控，按牌面提示慢慢走即可。';
  else if (score >= 4) desc = '气场偏于拉扯，牌与牌之间互相制约，宜缓不宜急，先看清再动。';
  else desc = '五行相克较多，此事阻力不小，三思而后行，必要时换个角度再问。';
  return { score, level, description: desc, components: { rels } };
}

function buildThreeSpreadText() {
  const cards = state.threeCards || [];
  const parts = [];
  const phases = ['过去', '现在', '未来'];
  const person = state.consultMode ? (state.consultName || '求测人') : '你';
  const pronoun = state.consultMode ? 'ta' : '你';
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

export async function generateThree() {
  try {
    const seal = getSealStatus();
    if (seal && seal.sealed) { toast('牌面安静了一会儿，现在可以重新看了', 2500); }
    const timestamps = getDrawTimestamps();
    const depCheck = checkDependency(timestamps);
    if (depCheck.level === 'warning') { toast(depCheck.message, 4000); }
    const cards = state.threeCards || [];
    if (cards.length < 3) { toast('三张牌未抽齐', 2200, 'warning'); return; }
    const text = buildThreeSpreadText();
    state.pendingFullReport = text;
    const durian = computeThreeDurian(cards);
    state.durianIndex = { score: durian.score, level: durian.level, components: durian.components };
    updateStep(3);
    renderFullReport(text, null, buildSummary());
    try {
      const readingData = {
        time: Date.now(), question: state.question, category: state.category, subCategory: state.subCategory,
        intent: state.intent, ti: null, yong: null, grid: {}, line: null,
        lineOrder: {}, text, chatHistory: state.chatHistory.slice(),
        durianScore: durian.score,
        durianComponents: durian.components,
        spreadType: 'three',
        threeCards: state.threeCards.map(t => t.card),
        consultName: state.consultMode ? (state.consultName || '求测人') : ''
      };
      saveReading(readingData);
      addTimelineEntry(readingData);
    } catch (e) { toast('历史保存失败，但解读有效', 2000, 'warning'); }
    addDrawTimestamp(Date.now());
    state.spreadType = 'jiugong';
    state.threeCards = [];
    toast('🃏 三牌直断完成', 2400, 'success');
  } catch (e) {
    console.error('[浮生牌] generateThree 出错:', e);
    toast('生成解读失败: ' + (e.message || '未知错误'), 4000, 'warning');
  }
}

export function startManualEntry() {
  const input = document.getElementById('questionInput');
  syncQuestionFromInput(input, state);
  state.manualMode = true;
  state.manualSeq = true; // 顺序录入：第1张=体，第2张=用，第3张起自动布九宫
  state.uid = Date.now() % 1000000;
  state.deck = createDeck(true);
  state.ti = null; state.yong = null; state.grid = {};
  state.line = null; state.lineOrder = {}; state.sel = null;
  state.possible = []; state.chatHistory = []; state.gongOrder = [];
  state.editCount = 0; state.refinementTags = {}; state.intent = null;
  state.fingerprint = null; state.summary = null; state.sealed = false; state.currentTimeArc = null;
  updateStep(2);
  renderStep2();
}

// ===== 手动录入 · 顺序放置（第1张=体，第2张=用，第3张起自动布九宫） =====
export function autoPlaceSequential(card) {
  if (!card) return;
  if (state.sealed) { toast('牌局已封印，不可改动', 2200, 'warning'); return; }
  if (!state.ti) {
    placeCardOnTiYong(card, 'ti', true);
    toast('第 1 张 · 已录为「你」\n下一张录「所问之事」', 2400, 'success');
    return;
  }
  if (!state.yong) {
    placeCardOnTiYong(card, 'yong', true);
    toast('第 2 张 · 已录为「所问之事」\n下一张起自动布入九宫', 2400, 'success');
    return;
  }
  const g = GONG_ORDER.find(g => !state.grid[g] || state.grid[g].length < 3);
  if (!g) { toast('九宫已满，请先清九宫或重置选牌', 2200, 'warning'); return; }
  const n = (state.grid[g] ? state.grid[g].length : 0) + 1;
  placeCardOnGong(card, g, true);
  const placed = state.grid[g] && state.grid[g].length;
  toast(`第 ${2 + (placed || 0)} 张 · 已入${GONG_NAMES[g]}宫`);
}

export function lazyStart() {
  proceedLazyStart();
}

async function proceedLazyStart() {
  const input = document.getElementById('questionInput');
  syncQuestionFromInput(input, state);
  state.manualMode = false;
  state.currentTimeArc = null;
  state.summary = null; // 新局新摘要

  const shuffled = chaosShuffleDeck(createDeck(false));
  state.fingerprint = generateFingerprint(shuffled);
  const { ti, yong, remaining } = drawTiYong(shuffled);
  state.ti = ti; state.yong = yong;
  let remainingDeck = remaining;
  remainingDeck.push({ isJoker: true, type: '大王', _uid: state.uid++ }, { isJoker: true, type: '小王', _uid: state.uid++ });
  remainingDeck = chaosShuffleDeck(remainingDeck); // 插回大小王后再洗一次
  const line = ALL_LINES[Math.floor(Math.random() * ALL_LINES.length)];
  state.line = [...line];
  const key = line.join(','); const tl = TIME_LABELS[key] || {};
  state.lineOrder = {}; state.lineOrder[line[0]] = '起因'; state.lineOrder[line[1]] = '经过'; state.lineOrder[line[2]] = '结果';
  for (let g = 1; g <= 9; g++) if (!state.lineOrder[g]) state.lineOrder[g] = tl[g] || '';
  for (const g of line) state.grid[g] = [remainingDeck.pop()];
  for (const g of GONG_ORDER) if (!state.grid[g] && remainingDeck.length) state.grid[g] = [remainingDeck.pop()];
  state.deck = remainingDeck; state.gongOrder = line.slice(); state.sealed = true;
  updateStep(3);
  const { text, summary } = await localInterpretation();
  renderFullReport(text, null, summary);
  toast('🃏 牌已落定，看看它怎么说', 3000, 'success');
}

// ===== 时间弧 =====
export function setTimeArc(arc) {
  state.currentTimeArc = arc;
  refreshAll();
  toast(`时间锚点已切换至${arc}弧`);
}

export function setTimeArcAuto() {
  state.currentTimeArc = null;
  refreshAll();
  toast('时间锚点已恢复自动判定', 2200, 'info');
}

// ===== 周期抽牌（支持日运细选） =====
export function openPeriodDeck(periodType, fortuneType = 'overall') {
  const modal = document.getElementById('modal');
  const content = document.getElementById('modalContent');
  if (!modal || !content) return;
  const cfg = PERIODS[periodType];
  if (!cfg) return;

  const stored = getStoredPeriodCards();

  // 日运细选专属 key
  let storeKey = periodType;
  if (periodType === 'daily') storeKey = `daily_${fortuneType}`;

  const periodKey = getCurrentPeriodKey(periodType);
  // 旧数据兼容：若是daily且fortuneType是overall，检查旧daily键
  if (periodType === 'daily' && fortuneType === 'overall') {
    const legacy = stored.daily;
    if (legacy && legacy.periodKey === periodKey && legacy.card) {
      stored[storeKey] = legacy;
      delete stored.daily;
      safeSetPeriodCards(stored);
    }
  }

  if (stored[storeKey] && stored[storeKey].periodKey === periodKey && stored[storeKey].card) {
    openPeriodDetail(periodType, fortuneType);
    return;
  }

  const deck = createDeck(true);
  const shuffled = shuffle(deck);
  state.periodType = periodType;
  state.fortuneType = fortuneType;
  state.pendingPeriodDeck = shuffled;

  const typeLabel = periodType === 'daily' ? getDailyFortuneType(fortuneType).label : cfg.label;
  const title = `${cfg.label}${periodType === 'daily' ? ` · ${typeLabel}` : ''} · 抽一张`;

  const isTouch = window.matchMedia('(pointer: coarse)').matches;
  const cardW = isTouch ? 52 : 60;
  const cardH = isTouch ? 72 : 84;

  // 统一抽牌界面：牌背网格 + 点击翻牌动画（触摸/桌面一致，牌灵同款仪式感）
  const html = `
    <h3 style="text-align:center;">${escapeForHTML(title)}</h3>
    <p id="periodDeckHint" style="text-align:center;font-size:0.75rem;color:var(--dim);margin-bottom:10px;">凭直觉，点一张牌——翻开的瞬间即定，本周期不可重抽。</p>
    <div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center;max-height:${isTouch ? 300 : 400}px;overflow-y:auto;padding:10px;" id="periodDeckGrid">
      ${shuffled.map((c, idx) => `
        <div class="card-back" data-period-card-idx="${idx}" style="flex-shrink:0;width:${cardW}px;height:${cardH}px;cursor:pointer;margin:4px;animation:dealIn 0.4s var(--ease) backwards;animation-delay:${Math.min(idx * 12, 500)}ms;"></div>`).join('')}
    </div>
    <div style="text-align:center;margin-top:10px;display:flex;gap:8px;justify-content:center;flex-wrap:wrap;">
      <button id="periodRandomBtn" class="outline small" style="font-size:0.75rem;">🎲 完全随机抽一张</button>
      <button id="periodManualEntry" class="outline small" style="font-size:0.75rem;">我已抽了实体牌，自己选</button>
    </div>
    <div id="periodManualPicker" style="display:none;margin-top:10px;max-height:250px;overflow-y:auto;padding:8px;">
      <div style="display:flex;flex-wrap:wrap;gap:4px;justify-content:center;">${buildManualCardButtons()}</div>
    </div>
    <div style="text-align:center;font-size:0.65rem;color:var(--dim);margin-top:6px;">⚠️ 此牌将自动保存，无法重抽。建议截图或保存分享图。</div>
  `;
  setHTML(content, html);
  modal.removeAttribute('hidden');

  let periodLocked = false;
  function flipAndConfirm(idx) {
    if (periodLocked) return;
    periodLocked = true;
    const card = shuffled[idx];
    const isJoker = !!(card && card.isJoker);
    const el = content.querySelector(`[data-period-card-idx="${idx}"]`);
    content.querySelectorAll('#periodDeckGrid .card-back').forEach(b => {
      b.style.pointerEvents = 'none';
      b.style.opacity = '0.45';
    });
    if (el) {
      el.style.opacity = '1';
      // 张力窗口：点击 → 牌背轻微抖动 + 震感 30ms → 停顿 400ms → 才翻牌
      el.classList.add('card-tension');
      // 服务：翻牌前一声「想好了，就翻。」——服务员在桌边欠身，不是催你下单
      const hint = content.querySelector('#periodDeckHint');
      if (hint) hint.textContent = '想好了，就翻。';
      if (navigator.vibrate) navigator.vibrate(30);
      playCardSound('tap');
      setTimeout(() => {
        if (isJoker) {
          // 天命时刻：金色光晕 + 更长翻牌 + 专属音效
          el.outerHTML = `<div class="card-face gold joker-flip" style="width:${cardW}px;height:${cardH}px;margin:0 auto;">${escapeForHTML(card.type)}</div>`;
          playJokerSound();
        } else {
          el.outerHTML = `<div class="card-face ${getCardColor(card)}" style="width:${cardW}px;height:${cardH}px;margin:0 auto;animation:cardFlip 0.5s;">${escapeForHTML(card.rank)}${escapeForHTML(card.suit)}</div>`;
          playCardSound('flip');
        }
      }, 420);
    }
    // 天命时刻翻牌更久（0.8s），确认延迟随之拉长
    const settle = isJoker ? 420 + 900 : 420 + 550;
    setTimeout(() => {
      if (isJoker) {
        const persona = getPokerPersona(card);
        if (persona) toast(`⚡ ${card.type} · ${persona.core}`, 3200, 'success');
      }
      confirmPeriodPick(periodType, card, fortuneType);
    }, settle);
  }

  content.querySelectorAll('#periodDeckGrid .card-back').forEach(el => {
    el.addEventListener('click', function() {
      flipAndConfirm(parseInt(this.dataset.periodCardIdx));
    });
  });

  document.getElementById('periodRandomBtn')?.addEventListener('click', () => {
    flipAndConfirm(Math.floor(Math.random() * shuffled.length));
  });

  document.getElementById('periodManualEntry')?.addEventListener('click', () => {
    const picker = document.getElementById('periodManualPicker');
    if (picker) picker.style.display = picker.style.display === 'none' ? 'block' : 'none';
  });

  content.querySelectorAll('[data-manual-card]').forEach(btn => {
    btn.addEventListener('click', function() {
      const label = this.dataset.manualCard;
      if (label === '大王') { confirmPeriodPick(periodType, { isJoker: true, type: '大王' }, fortuneType); return; }
      if (label === '小王') { confirmPeriodPick(periodType, { isJoker: true, type: '小王' }, fortuneType); return; }
      const suit = label[0];
      const rank = label.slice(1);
      confirmPeriodPick(periodType, { suit, rank, isJoker: false }, fortuneType);
    });
  });
}

function buildManualCardButtons() {
  const suits = ['♥', '♦', '♣', '♠'];
  const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  let html = '';
  for (const s of suits) for (const r of ranks) html += `<button class="small outline" data-manual-card="${s}${r}">${s}${r}</button>`;
  html += `<button class="small outline" data-manual-card="大王">大王</button>`;
  html += `<button class="small outline" data-manual-card="小王">小王</button>`;
  return html;
}

// ===== 赛博黄历（仅日运展示）：宜/忌/建除/冲煞，按当日确定性取，不娱乐化 =====
function buildDailyOracleBlock(wx, dateStr) {
  const oracle = buildDailyOracle({ wx, dateStr });
  return `
    <div style="font-size:0.82rem;color:var(--text);line-height:1.9;margin:6px 0 10px;padding:10px 14px;background:rgba(0,0,0,0.12);border-radius:8px;text-align:left;">
      <div style="color:var(--accent);font-size:0.75rem;margin-bottom:2px;">📅 今日黄历 · ${escapeForHTML(oracle.jianchu.name)}　<span style="opacity:0.7;">冲${escapeForHTML(oracle.chong.name)}·${escapeForHTML(oracle.chong.animal)}</span></div>
      <div>宜 · ${oracle.yi.map(escapeForHTML).join('、')}</div>
      <div style="color:#d45050;">忌 · ${oracle.ji.map(escapeForHTML).join('、')}</div>
    </div>`;
}

// ===== 周期牌详情（支持日运细选） =====
export function openPeriodDetail(periodType, fortuneType = 'overall') {
  const modal = document.getElementById('modal');
  const content = document.getElementById('modalContent');
  if (!modal || !content) return;

  const cfg = PERIODS[periodType];
  if (!cfg) return;

  let storeKey = periodType;
  if (periodType === 'daily') storeKey = `daily_${fortuneType}`;

  const stored = getStoredPeriodCards();
  const periodKey = getCurrentPeriodKey(periodType);
  const data = stored[storeKey];

  if (!data || data.periodKey !== periodKey || !data.card) {
    toast('本周期还没抽牌', 2200, 'warning');
    openPeriodDeck(periodType, fortuneType);
    return;
  }

  const card = data.card;
  const wx = getWuxing(card);
  const colorCls = getCardColor(card);
  const rank = card.isJoker ? card.type : card.rank;
  const suit = card.isJoker ? '' : card.suit;
  const metaphor = data.fortune || '';
  const typeLabel = periodType === 'daily' ? getDailyFortuneType(fortuneType).label : cfg.label;
  const typeIcon = periodType === 'daily' ? getDailyFortuneType(fortuneType).icon : '';

  // 情绪镜像（顶部）+ 场景短句 + 温和清醒话（仅日运展示，周/月/季/年不打扰）
  const mirrorLine = getDailyMirrorLine();
  const sceneLines = getSceneLines(fortuneType);
  const wakeUpLine = periodType === 'daily' ? getWakeUpLine() : '';
  const oracleBlock = periodType === 'daily' ? buildDailyOracleBlock(wx, periodKey) : '';

  const history = getHistory();
  const periodHistory = history.find(h => h.type === 'period' && h.periodType === periodType && h.periodKey === periodKey && (h.fortuneType || 'overall') === fortuneType);
  const hasAi = periodHistory && periodHistory.chatHistory && periodHistory.chatHistory.length > 0;

  const html = `
    <div style="text-align:center;">
      <div style="font-size:0.8rem;color:var(--dim);margin-bottom:8px;">${typeIcon} ${escapeForHTML(typeLabel)} · 你的牌</div>
      <div style="font-size:0.8rem;color:var(--accent);line-height:1.7;margin:0 0 10px;padding:10px 14px;background:rgba(0,0,0,0.18);border-radius:8px;">
        <span style="opacity:0.75;margin-right:6px;">☯ 情绪镜像</span>${escapeForHTML(mirrorLine)}
      </div>
      <div class="card-face-small ${colorCls}" style="margin:10px auto;width:80px;height:112px;display:flex;align-items:center;justify-content:center;flex-direction:column;border-radius:6px;border:2px solid var(--border);background:rgba(0,0,0,0.3);">
        <span style="font-size:2rem;font-weight:bold;">${escapeForHTML(rank)}</span>
        <span style="font-size:1.4rem;">${escapeForHTML(suit)}</span>
        <span style="font-size:0.7rem;color:var(--dim);margin-top:2px;">${escapeForHTML(wx)}</span>
      </div>
      ${metaphor ? `<div style="font-size:0.9rem;color:var(--text);line-height:1.8;margin:12px 0;padding:12px;background:rgba(0,0,0,0.15);border-radius:8px;white-space:pre-wrap;">${escapeForHTML(metaphor)}</div>` : ''}
      ${oracleBlock}
      ${sceneLines.length ? `<div style="font-size:0.78rem;color:var(--dim);line-height:1.8;margin:6px 0 10px;padding:10px 14px;background:rgba(0,0,0,0.12);border-radius:8px;">${sceneLines.map(l => `<div>· ${escapeForHTML(l)}</div>`).join('')}</div>` : ''}
      ${wakeUpLine ? `<div style="font-size:0.78rem;color:#d4a05a;line-height:1.7;margin:4px 0 10px;">⚡ ${escapeForHTML(wakeUpLine)}</div>` : ''}
      
      <p class="num" style="font-size:0.7rem;color:var(--dim);">抽于 ${new Date(data.drawnAt).toLocaleString()}</p>
      <p style="font-size:0.7rem;color:#d45050;">⚠️ 此牌已锁定，本周期不可重抽。建议截图保存。</p>

      ${hasAi ? `
        <div style="text-align:left;font-size:0.85rem;margin:12px 0;padding:12px;background:rgba(0,0,0,0.2);border-radius:8px;max-height:200px;overflow-y:auto;">
          <div style="color:var(--accent);font-size:0.8rem;margin-bottom:8px;">✨ 上次 AI 解读</div>
          ${periodHistory.chatHistory.filter(m => m.role === 'assistant').map(m => `<div style="margin-bottom:8px;">${escapeForHTML(m.content).replace(/\n/g, '<br>')}</div>`).join('')}
        </div>
      ` : ''}

      <div class="btn-row">
        <button id="periodAiBtn2" class="outline small">${hasAi ? '🔄 重新 AI 深度解读' : '✨ AI 深度解读'}</button>
        <button id="periodLocalBtn2" class="outline small">本地规则解读</button>
      </div>
      <div id="periodAiResult2" style="display:none;margin-top:8px;text-align:left;font-size:0.85rem;"></div>

      <div class="btn-row">
        <button id="periodCopyPromptBtn2" class="outline small" style="font-size:0.65rem;">📋 复制提示词</button>
        <button data-action="shareDaily" data-fortune="${fortuneType}" data-fortune-type="${fortuneType}" class="outline small">☯ 生成分享图</button>
      </div>
    </div>
  `;
  setHTML(content, html);
  modal.removeAttribute('hidden');

  state.periodType = periodType;
  state.periodKey = periodKey;
  state.periodCard = card;
  state.periodFortune = metaphor;
  state.fortuneType = fortuneType;

  document.getElementById('periodLocalBtn2')?.addEventListener('click', () => {
    const fullText = generateFullPeriodLocal(card, wx, typeLabel, metaphor, fortuneType);
    const el = document.getElementById('periodAiResult2');
    if (el) {
      el.style.display = 'block';
      setHTML(el, `<div style="color:var(--accent);font-size:0.8rem;margin-bottom:4px;">💡 本地规则推导</div>${escapeForHTML(fullText).replace(/\n/g, '<br>')}`);
    }
  });

  document.getElementById('periodAiBtn2')?.addEventListener('click', async function() {
    const settings = getApiSettings();
    if (!settings || !settings.apiKey) { showAIGuideModal(); return; }
    this.disabled = true;
    this.textContent = '解读中...';
    const provider = settings.provider || 'deepseek';
    let endpoint = settings.endpoint || API_PROVIDERS[provider]?.endpoint || '';
    if (endpoint.endsWith('/v1')) endpoint = endpoint.slice(0, -3);
    if (endpoint.endsWith('/')) endpoint = endpoint.slice(0, -1);
    const model = settings.model || API_PROVIDERS[provider]?.model || '';
    const prompt = buildSingleCardPrompt(card, {
      metaphor,
      periodLabel: typeLabel,
      fortuneType
    });
    try {
      const result = await requestReading({
        provider, apiKey: settings.apiKey, endpoint, model, prompt,
        temperature: settings.temperature,
        maxTokens: settings.maxTokens,
        topP: settings.topP,
        headers: settings.headers
      });
      const el = document.getElementById('periodAiResult2');
      if (el) {
        el.style.display = 'block';
        setHTML(el, `<div style="color:var(--accent);font-size:0.8rem;margin-bottom:4px;">✨ AI 深度解读</div>${escapeForHTML(result).replace(/\n/g, '<br>')}`);
      }
      addPeriodHistoryEntry({
        periodType, periodKey, card, fortune: metaphor,
        fortuneType,
        question: `${typeLabel} · ${periodKey}`,
        time: Date.now(),
        chatHistory: [{ role: 'user', content: prompt }, { role: 'assistant', content: result }]
      });
      toast('AI 解读已保存', 2400, 'success');
    } catch (e) {
      toast(e.message || 'AI 请求失败', 3000, 'warning');
    } finally {
      this.disabled = false;
      this.textContent = hasAi ? '🔄 重新 AI 深度解读' : '✨ AI 深度解读';
    }
  });

  document.getElementById('periodCopyPromptBtn2')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const prompt = buildSingleCardPrompt(card, {
      metaphor,
      periodLabel: typeLabel,
      fortuneType
    });
    const ok = await copyTextWithFeedback(prompt, btn);
    toast(ok ? '✅ 单牌 AI 提示词已复制（含领域与时间）' : '复制失败，请长按手动复制');
  });
}

// ===== 确认周期抽牌 =====
export function confirmPeriodPick(periodType, card, fortuneType = 'overall') {
  const modal = document.getElementById('modal');
  const content = document.getElementById('modalContent');
  if (!modal || !content) return;
  const cfg = PERIODS[periodType];
  if (!cfg) return;

  const wx = getWuxing(card);
  const colorCls = getCardColor(card);
  const rank = card.isJoker ? card.type : card.rank;
  const suit = card.isJoker ? '' : card.suit;
  const periodKey = getCurrentPeriodKey(periodType);
  const typeLabel = periodType === 'daily' ? getDailyFortuneType(fortuneType).label : cfg.label;
  const metaphor = generateSingleCardMetaphor(card, wx, typeLabel, fortuneType);

  // 情绪镜像（结果页顶部）+ 场景短句（日运专属）
  const mirrorLine = getDailyMirrorLine();
  const sceneLines = getSceneLines(fortuneType);

  // 存储（支持日运细选）
  saveStoredPeriodCard(periodType, { periodKey, card, fortune: metaphor, drawnAt: Date.now(), fortuneType }, fortuneType);

  const oracleBlock = periodType === 'daily' ? buildDailyOracleBlock(wx, periodKey) : '';

  const html = `
    <div style="text-align:center;">
      <div style="font-size:0.8rem;color:var(--dim);margin-bottom:8px;">${escapeForHTML(typeLabel)} · 你抽到了</div>
      <div style="font-size:0.8rem;color:var(--accent);line-height:1.7;margin:0 0 10px;padding:10px 14px;background:rgba(0,0,0,0.18);border-radius:8px;">
        <span style="opacity:0.75;margin-right:6px;">☯ 情绪镜像</span>${escapeForHTML(mirrorLine)}
      </div>
      <div class="card-face-small ${colorCls}" style="margin:10px auto;width:80px;height:112px;display:flex;align-items:center;justify-content:center;flex-direction:column;border-radius:6px;border:2px solid var(--border);background:rgba(0,0,0,0.3);">
        <span style="font-size:2rem;font-weight:bold;">${escapeForHTML(rank)}</span>
        <span style="font-size:1.4rem;">${escapeForHTML(suit)}</span>
        <span style="font-size:0.7rem;color:var(--dim);margin-top:2px;">${escapeForHTML(wx)}</span>
      </div>
      <div style="font-size:0.9rem;color:var(--text);line-height:1.8;margin:12px 0;padding:12px;background:rgba(0,0,0,0.15);border-radius:8px;white-space:pre-wrap;">${escapeForHTML(metaphor)}</div>
      ${oracleBlock}
      ${sceneLines.length ? `<div style="font-size:0.78rem;color:var(--dim);line-height:1.8;margin:6px 0 10px;padding:10px 14px;background:rgba(0,0,0,0.12);border-radius:8px;">${sceneLines.map(l => `<div>· ${escapeForHTML(l)}</div>`).join('')}</div>` : ''}
      <p style="font-size:0.7rem;color:#d45050;">⚠️ 此牌已锁定，本周期不可重抽。建议截图保存。</p>
      <div class="btn-row">
        <button data-action="closeModal" class="primary small">确认</button>
        <button data-action="shareDaily" data-fortune="${escapeForHTML(fortuneType)}" data-fortune-type="${escapeForHTML(fortuneType)}" class="outline small">☯ 生成分享图</button>
      </div>
    </div>
  `;
  setHTML(content, html);
  modal.removeAttribute('hidden');

  // 保存到历史
  addPeriodHistoryEntry({
    periodType, periodKey, card, fortune: metaphor,
    fortuneType,
    question: `${typeLabel} · ${periodKey}`,
    time: Date.now(), chatHistory: state.periodAiHistory || [],
  });

  renderPeriodCards();
  renderStep1();
}

// ===== 保存周期卡 =====
export function savePeriodCard(periodType, card, metaphor, fortuneType = 'overall') {
  const periodKey = getCurrentPeriodKey(periodType);
  if (!periodKey) return;
  const data = { periodKey, card, fortune: metaphor, drawnAt: Date.now(), fortuneType };
  saveStoredPeriodCard(periodType, data, fortuneType);
  addPeriodHistoryEntry({
    periodType, periodKey, card, fortune: metaphor,
    fortuneType,
    question: `${periodType === 'daily' ? getDailyFortuneType(fortuneType).label : PERIODS[periodType]?.label} · ${periodKey}`,
    time: Date.now(), chatHistory: state.periodAiHistory || [],
  });
  toast('此牌已保存，本周期内不可重抽', 2600, 'warning');
  const modal = document.getElementById('modal');
  if (modal) modal.setAttribute('hidden', '');
  renderPeriodCards();
  renderStep1();
}

function generateFullPeriodLocal(card, wx, periodLabel, metaphor, fortuneType = 'overall') {
  let out = metaphor + '\n\n';
  out += `【${periodLabel}指引】\n`;
  out += `牌面：${card.isJoker ? card.type : card.rank + card.suit}（${wx}）\n`;
  out += `阴阳：${card.isJoker ? (card.type === '大王' ? '阳' : '阴') : (card.suit === '♥' || card.suit === '♦') ? '阳' : '阴'}\n\n`;
  const wxAdvice = {
    '火': '适合主动行动、展示自己。但避免急躁和过度消耗。',
    '金': '适合清理、决断、定边界。注意别过于冷硬。',
    '木': '适合学习、生长、扩张。但不要急于求成。',
    '水': '适合反思、流动、等待。注意别失去方向。',
    '土': '适合积累、稳定、打基础。避免冒进。',
    '天': '适合定大方向、开启新阶段。大局在你。',
    '人': '适合沟通、协调、借助人脉。事情的关键在人。',
  };
  out += wxAdvice[wx] || '保持平常心，顺势而为。';
  out += '\n\n【如果你觉得单张牌不够】\n';
  out += '可以抽取你与本命、所问之事，布九宫，进入完整占卜流程。';
  return out;
}

// ===== 布阵相关 =====
export function resetStep2() {
  if (state.sealed) { toast('牌局已封印，不可重置', 2200, 'warning'); return; }
  if (state.ti) { state.deck.push(state.ti); state.ti = null; }
  if (state.yong) { state.deck.push(state.yong); state.yong = null; }
  state.deck = shuffle(state.deck); state.sel = null;
  refreshAll();
  if (state.step === 2) renderStep2(); else { updateStep(2); renderStep2(); }
  toast('选牌已重置', 2000, 'info');
}

export function confirmTiYong() {
  if (!state.ti || !state.yong) { toast('请先选好「你」和「所问之事」两张牌', 2200, 'warning'); return; }
  if (state.sealed) { toast('牌局已封印', 2200, 'warning'); return; }
  state.deck.push({ isJoker: true, type: '大王', _uid: state.uid++ }, { isJoker: true, type: '小王', _uid: state.uid++ });
  state.deck = shuffle(state.deck);
  const gridArea = document.getElementById('gridArea');
  if (gridArea) gridArea.style.display = 'block';
  const deckEl = document.getElementById('deckContainer');
  if (deckEl) { deckEl.classList.add('shuffling'); setTimeout(() => deckEl.classList.remove('shuffling'), 700); }
  toast(UI_TEXTS.toastJokersInjected);
  refreshAll();
}

export function resetGrid() {
  if (state.sealed) { toast('牌局已封印，不可修改', 2200, 'warning'); return; }
  for (const g in state.grid) state.deck.push(...state.grid[g]);
  state.grid = {}; state.line = null; state.lineOrder = {};
  state.possible = []; state.gongOrder = []; state.sel = null;
  state.deck = state.manualMode ? state.deck : shuffle(state.deck);
  refreshAll();
  toast(UI_TEXTS.toastGridCleared);
}

export function sealDeckAction() { sealDeck(); }
export function switchMode(mode) { state.mode = mode; refreshAll(); }
export function showDurianReportAction() { showDurianReport(); }

export async function copyLocalResult(e) {
  const el = document.getElementById('interpretText');
  if (!el) return;
  // 完整解读折叠时 innerText 为空，回退到缓存的完整文本
  const text = state.pendingFullReport || el.innerText;
  const btn = e && e.currentTarget ? e.currentTarget : null;
  const ok = await copyTextWithFeedback(text, btn);
  toast(ok ? UI_TEXTS.toastCopied : UI_TEXTS.toastCopyFailed);
}

// ===== AI 设置（Cherry Studio式：模型+温度+maxtokens+top_p+自定义请求头） =====
export function saveApiSettingsFromForm() {
  const p = state.selectedProvider || 'deepseek';
  const info = API_PROVIDERS[p] || API_PROVIDERS.deepseek;
  let endpoint = document.getElementById('apiEndpoint')?.value?.trim() || info.endpoint || '';
  if (endpoint.endsWith('/')) endpoint = endpoint.slice(0, -1);
  const apiKey = document.getElementById('apiKey')?.value?.trim() || '';
  const model = resolveApiModel(p, document.getElementById('apiModel')?.value?.trim(), info.model || '');

  // 读取高级参数
  let temperature = parseFloat(document.getElementById('aiTemperature')?.value);
  if (isNaN(temperature)) temperature = 0.7;
  let maxTokens = parseInt(document.getElementById('aiMaxTokens')?.value);
  if (isNaN(maxTokens)) maxTokens = 4096;
  let topP = parseFloat(document.getElementById('aiTopP')?.value);
  if (isNaN(topP)) topP = 0.9;

  let headers = {};
  const headersStr = document.getElementById('aiHeaders')?.value?.trim() || '';
  if (headersStr) {
    try { headers = JSON.parse(headersStr); }
    catch(e) { toast('自定义请求头 JSON 格式错误，已忽略', 2500, 'warning'); }
  }

  const settings = {
    provider: p,
    apiKey,
    endpoint,
    model,
    aiStyle: document.getElementById('aiStyle')?.value || 'guide',
    temperature,
    maxTokens,
    topP,
    headers
  };
  saveApiSettings(settings);
  updateApiStatus();
  toast(UI_TEXTS.toastSaved);
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

// ===== AI 深度解读（透传高级参数） =====
export async function triggerAI() {
  const btn = document.getElementById('aiReadBtn');
  if (!btn) return;
  const settings = getApiSettings();
  if (!settings || !settings.apiKey) { showAIGuideModal(); return; }
  btn.disabled = true; btn.textContent = '思考中...';
  const provider = settings.provider || 'deepseek';
  let endpoint = settings.endpoint || API_PROVIDERS[provider]?.endpoint || '';
  if (endpoint.endsWith('/v1')) endpoint = endpoint.slice(0, -3);
  if (endpoint.endsWith('/')) endpoint = endpoint.slice(0, -1);
  const model = resolveApiModel(provider, settings.model, API_PROVIDERS[provider]?.model || '');
  const prompt = await buildAIPrompt();
  try {
    const result = await requestReading({
      provider,
      apiKey: settings.apiKey,
      endpoint,
      model,
      style: settings.aiStyle || 'guide',
      prompt,
      temperature: settings.temperature,
      maxTokens: settings.maxTokens,
      topP: settings.topP,
      headers: settings.headers
    });
    const container = document.getElementById('aiResultContainer');
    const content = document.getElementById('aiResultContent');
    if (container) container.style.display = 'block';
    if (content) setHTML(content, `<strong>深层解读：</strong><br>${escapeForHTML(result).replace(/\n/g, '<br>')}`);
    state.chatHistory = [{ role: 'user', content: prompt }, { role: 'assistant', content: result }];
    updateHistoryChat(state.chatHistory);
    const followUp = document.getElementById('followUpArea');
    if (followUp) followUp.style.display = 'block';
    toast('AI 解读完成，已保存至历史记录', 2400, 'success');
  } catch (e) {
    const container = document.getElementById('aiResultContainer');
    if (container) container.style.display = 'block';
    const content = document.getElementById('aiResultContent');
    setHTML(content, `<div style="color:#d45050;border:1px solid #d45050;padding:8px;border-radius:6px;margin-bottom:8px;font-size:0.85rem;">⚠️ AI 服务不可用：${escapeForHTML(e.message || '未知错误')}</div>`);
    toast('AI 解析失败，请尝试复制提示词或检查 API Key', 3000, 'warning');
  } finally {
    btn.disabled = false;
    btn.textContent = '✨ AI 深度解读';
  }
}

export async function sendFollowUp() {
  const input = document.getElementById('followUpInput');
  if (!input) return;
  const q = input.value.trim();
  if (!q) return;
  input.value = '';
  const settings = getApiSettings();
  if (!settings || !settings.apiKey) { toast('未配置 API Key', 2200, 'warning'); return; }
  const history = state.chatHistory;
  if (!history || history.length < 2) { toast('请先进行一次 AI 解读', 2200, 'warning'); return; }
  history.push({ role: 'user', content: q });
  const chatBlock = document.getElementById('chatHistoryBlock');
  if (chatBlock) chatBlock.innerHTML += `<div class="chat-msg user">${escapeForHTML(q)}</div>`;
  const provider = settings.provider || 'deepseek';
  let endpoint = settings.endpoint || API_PROVIDERS[provider]?.endpoint || '';
  if (endpoint.endsWith('/v1')) endpoint = endpoint.slice(0, -3);
  if (endpoint.endsWith('/')) endpoint = endpoint.slice(0, -1);
  const model = resolveApiModel(provider, settings.model, API_PROVIDERS[provider]?.model || '');
  try {
    const result = await requestFollowUp({
      history,
      provider,
      apiKey: settings.apiKey,
      endpoint,
      model,
      temperature: settings.temperature,
      maxTokens: settings.maxTokens,
      topP: settings.topP,
      headers: settings.headers
    });
    history.push({ role: 'assistant', content: result });
    if (chatBlock) {
      chatBlock.innerHTML += `<div class="chat-msg ai">${escapeForHTML(result).replace(/\n/g, '<br>')}</div>`;
      chatBlock.scrollTop = chatBlock.scrollHeight;
    }
    updateHistoryChat(history);
    toast('AI 回复已保存', 2400, 'success');
  } catch (e) {
    if (chatBlock) chatBlock.innerHTML += `<div class="chat-msg" style="color:#d45050">失败：${escapeForHTML(e.message)}</div>`;
  }
}

export async function handleTestApiConnection() {
  const btn = document.querySelector('[data-action="testApiConnection"]');
  if (btn) { btn.disabled = true; btn.textContent = '测试中...'; }
  try {
    const provider = state.selectedProvider || 'deepseek';
    let endpoint = document.getElementById('apiEndpoint')?.value?.trim() || '';
    const apiKey = document.getElementById('apiKey')?.value?.trim() || '';
    const model = resolveApiModel(provider, document.getElementById('apiModel')?.value?.trim(), API_PROVIDERS[provider]?.model || '');
    let temperature = parseFloat(document.getElementById('aiTemperature')?.value);
    if (isNaN(temperature)) temperature = 0.7;
    let maxTokens = parseInt(document.getElementById('aiMaxTokens')?.value);
    if (isNaN(maxTokens)) maxTokens = 4096;
    let topP = parseFloat(document.getElementById('aiTopP')?.value);
    if (isNaN(topP)) topP = 0.9;
    if (!apiKey && provider !== 'custom') throw new Error('请先填写 API Key');
    if (!endpoint && API_PROVIDERS[provider]) endpoint = API_PROVIDERS[provider].endpoint;
    if (endpoint.endsWith('/v1')) endpoint = endpoint.slice(0, -3);
    if (endpoint.endsWith('/')) endpoint = endpoint.slice(0, -1);
    const msg = await testApiConnection({ provider, apiKey, endpoint, model, temperature, maxTokens, topP });
    toast(msg, 3000);
  } catch (e) {
    toast(`测试失败: ${e.message}`, 4000);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = UI_TEXTS.btnTestApi; }
  }
}

// ===== 动作分发（支持日运细选+模型高级参数） =====
export function handleAction(action, dataset, el = null) {
  switch (action) {
    case 'togglePanel': togglePanel(dataset.panel); break;
    case 'toggleMoreMenu': {
      const menu = document.getElementById('moreMenu');
      if (menu) menu.hidden = !menu.hidden;
      break;
    }
    case 'resetAll': resetAll(); break;
    case 'toggleConsultMode':
      state.consultMode = !state.consultMode;
      if (!state.consultMode) state.consultName = '';
      renderStep1();
      toast(state.consultMode ? '🧑 已开启求测人模式：问题与解读都围绕求测人展开' : '已切回为自己占卜');
      break;
    case 'confirmQuestion': startQuestion(); break;
    case 'quickDaily': openPeriodDeck('daily'); break;
    case 'quickDraw': lazyStart(); break;
    case 'lazyStart': lazyStart(); break;
    case 'manualEntry': startManualEntry(); break;
    case 'toggleManualSeq':
      state.manualSeq = !state.manualSeq;
      toast(state.manualSeq ? '📋 顺序录入：点牌即按 体→用→九宫 依次放置' : '🎯 自由放置：先点牌选中，再点目标位置放置');
      renderStep2();
      break;
    case 'selectCategory':
      state.category = state.category === dataset.category ? '' : dataset.category;
      state.subCategory = '';
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
    case 'setTimeArc': setTimeArc(dataset.arc); break;
    case 'setTimeArcAuto': setTimeArcAuto(); break;
    case 'openPeriodDeck': {
      const fortuneType = dataset.fortuneType || 'overall';
      openPeriodDeck(dataset.period, fortuneType);
      break;
    }
    case 'openPeriodDetail': {
      const fortuneType = dataset.fortuneType || 'overall';
      openPeriodDetail(dataset.period, fortuneType);
      break;
    }
    case 'confirmTiYong': confirmTiYong(); break;
    case 'resetStep2': resetStep2(); break;
    case 'resetGrid': resetGrid(); break;
    case 'generateInterpretation':
      if (!state.ti || !state.yong) { toast('请先放好「你」和「所问之事」', 2200, 'warning'); break; }
      if (!state.grid || Object.keys(state.grid).length === 0) { toast('请先在九宫格中布下至少一张牌', 2200, 'warning'); break; }
      generateInterpretation();
      break;
    case 'showFullReport': showFullReport(); break;
    case 'copyLocal': copyLocalResult(el ? { currentTarget: el } : null); break;
    case 'shareImage': generateShareImage({ type: 'divination', template: 'divination' }); break;
    case 'shareCode': generateShareCode(); break;
    case 'exportData': exportAllData(); break;
    case 'triggerAI': triggerAI(); break;
    case 'sendFollowUp': sendFollowUp(); break;
    case 'saveApiSettings': saveApiSettingsFromForm(); break;
    case 'clearApiSettings':
      clearApiSettings();
      const keyInput = document.getElementById('apiKey');
      if (keyInput) keyInput.value = '';
      const modelInput = document.getElementById('apiModel');
      if (modelInput) modelInput.value = '';
      const ep2 = document.getElementById('apiEndpoint');
      if (ep2) ep2.value = API_PROVIDERS.deepseek.endpoint || '';
      const tempInput = document.getElementById('aiTemperature');
      if (tempInput) tempInput.value = 0.7;
      const mtInput = document.getElementById('aiMaxTokens');
      if (mtInput) mtInput.value = 4096;
      const tpInput = document.getElementById('aiTopP');
      if (tpInput) tpInput.value = 0.9;
      const hdInput = document.getElementById('aiHeaders');
      if (hdInput) hdInput.value = '';
      updateApiStatus();
      toast(UI_TEXTS.toastCleared);
      break;
    case 'testApiConnection': handleTestApiConnection(); break;
    case 'saveProfile': saveProfileFromForm(); break;
    case 'deleteHistoryItem':
      if (dataset.historyIndex !== undefined) {
        deleteHistoryItem(parseInt(dataset.historyIndex));
        renderHistoryPanel();
        document.getElementById('modal')?.setAttribute('hidden', '');
        toast('已删除', 2000, 'success');
      }
      break;
    case 'importCode': importShareCode(); break;
    case 'closeModal': {
      const m = document.getElementById('modal');
      if (m && !m.hasAttribute('hidden')) {
        m.classList.add('hiding');
        document.getElementById('modalContent')?.classList.add('closing');
        setTimeout(() => {
          m.setAttribute('hidden', '');
          m.classList.remove('hiding');
          document.getElementById('modalContent')?.classList.remove('closing');
        }, 160);
      }
      document.getElementById('fortuneTypeModal')?.setAttribute('hidden', '');
      break;
    }
    case 'closeShare': document.getElementById('sharePreview')?.setAttribute('hidden', ''); break;
    case 'saveShareImage': saveShareImage(); break;
    case 'sealDeck': sealDeckAction(); break;
    case 'durianReport': showDurianReportAction(); break;
    case 'reports': showReportsModal(); break;
    case 'periodReport':
      if (dataset.period) renderPeriodReportInto(dataset.period);
      break;
    case 'replayTimeline':
      if (dataset.time !== undefined) replayTimelineEntry(Number(dataset.time));
      break;
    case 'openRepo': window.open('https://github.com/y22t19053/FuShengPai', '_blank'); break;
    case 'showReward': {
      import('./ui/ui-modal.js').then(m => m.showRewardModal());
      break;
    }
    case 'showDataMigration': {
      import('./ui/ui-modal.js').then(m => m.showDataMigrationModal());
      break;
    }
    case 'openPaiGe': {
      import('./ui/ui-paige.js').then(m => m.openPaiGe());
      break;
    }
    case 'sharePersona': {
      // 旧入口：改指牌灵
      import('./ui/ui-paige.js').then(m => m.openPaiGe());
      break;
    }
    case 'showDailyFortunePicker': {
      showDailyFortunePicker();
      break;
    }
    case 'shareDaily': {
      const action = createPeriodShareAction(state, dataset);
      let card = action.card || null;
      const typeKey = dataset.fortune || action.fortuneType || 'overall';
      const fortuneType = action.fortuneType || typeKey || 'overall';
      if (!card) {
        const stored = getStoredPeriodCards();
        const dailyKey = getCurrentPeriodKey('daily');
        const storedDaily = stored[`daily_${fortuneType}`] || stored[`daily_${typeKey}`] || stored.daily_overall;
        if (storedDaily && storedDaily.periodKey === dailyKey) {
          card = storedDaily.card;
          state.periodType = 'daily';
          state.periodKey = dailyKey;
          state.periodCard = card;
          state.periodFortune = storedDaily.fortune || '';
          state.fortuneType = fortuneType;
        }
      }
      if (!card) {
        if (!typeKey || typeKey === 'overall') {
          const fortModal = document.getElementById('fortuneTypeModal');
          if (fortModal) { fortModal.removeAttribute('hidden'); return; }
        }
        toast('请先抽取一张周期牌', 2200, 'warning');
        return;
      }
      document.getElementById('fortuneTypeModal')?.setAttribute('hidden', '');
      // 走东方国风日运模板（宣纸 + 朱砂印章），不再落到旧版日运报告卡
      import('./ui/ui-modal.js').then(m => m.generateShareImage({ type: 'daily', card, typeKey, fortuneType, template: 'mint' }));
      break;
    }
    case 'closeClarify': { const guide = document.getElementById('clarifyGuide'); if (guide) guide.style.display = 'none'; break; }
    default: break;
  }
}

// ===== 事件绑定 =====
function bindAllEvents() {
  // 注意：此前曾有「引导层存在时吞掉一次点击」的逻辑，
  // 它会导致引导层一旦残留，页面所有按钮（抽牌/分类等）全部失灵，
  // 现已移除；引导层使用全屏遮罩（.onboard-overlay）天然阻止误触。

  document.addEventListener('click', function(e) {
    // 1. 按钮上的 action 优先
    const btn = e.target.closest('button');
    if (btn && btn.dataset.action) {
      handleAction(btn.dataset.action, btn.dataset, btn);
      return;
    }

    // 2. 非按钮元素上的 action（周期卡牌面等）
    const actionEl = e.target.closest('[data-action]');
    if (actionEl && actionEl.dataset.action) {
      handleAction(actionEl.dataset.action, actionEl.dataset, actionEl);
      return;
    }

    // 点击折叠菜单外部时关闭它
    const moreMenu = document.getElementById('moreMenu');
    if (moreMenu && !moreMenu.hidden && !e.target.closest('#moreMenu') && !e.target.closest('.more-btn')) {
      moreMenu.hidden = true;
    }

    // 牌堆操作
    const cardEl = e.target.closest('.card-back, .card-face-small');
    if (cardEl && cardEl.dataset.cardid) {
      const card = findCardById(cardEl.dataset.cardid);
      if (card && !isCardPlaced(card)) {
        // 手动录入 · 顺序模式：点牌即按顺序放置（无需先选中）
        if (state.manualMode && state.manualSeq && !state.sel) {
          autoPlaceSequential(card);
          return;
        }
        if (state.sel === cardEl.dataset.cardid) {
          state.sel = null;
          toast('已取消选中', 2000, 'info');
        } else {
          state.sel = cardEl.dataset.cardid;
          toast('已选中一张牌，点击上方目标位置或九宫格放置', 2000, 'info');
        }
        refreshAll();
      }
      return;
    }

    const historyItem = e.target.closest('.history-item');
    if (historyItem && historyItem.dataset.index !== undefined) {
      showHistoryDetail(parseInt(historyItem.dataset.index));
      return;
    }

    const lineBtn = e.target.closest('.line-btn');
    if (lineBtn && lineBtn.dataset.line) {
      setLine(lineBtn.dataset.line.split(',').map(Number));
      return;
    }

    const emptyDash = e.target.closest('.empty-dash');
    if (emptyDash && state.sel) {
      const card = findCardById(state.sel);
      if (card && !isCardPlaced(card)) {
        if (emptyDash.textContent.includes('你')) placeCardOnTiYong(card, 'ti');
        else placeCardOnTiYong(card, 'yong');
      }
      return;
    }

    const gong = e.target.closest('.gong');
    if (gong && state.sel) {
      const g = parseInt(gong.dataset.gong);
      const card = findCardById(state.sel);
      if (card && !isCardPlaced(card)) placeCardOnGong(card, g);
    }
  });

  // 模型预设按钮点击
  document.addEventListener('click', function(e) {
    const modelBtn = e.target.closest('.model-preset');
    if (modelBtn && modelBtn.dataset.model) {
      const modelInput = document.getElementById('apiModel');
      if (modelInput) modelInput.value = modelBtn.dataset.model;
      const provider = modelBtn.dataset.provider;
      if (provider) {
        document.querySelectorAll('#providerGrid button').forEach(b => {
          b.classList.toggle('selected', b.dataset.value === provider);
        });
        state.selectedProvider = provider;
      }
      toast('模型已填入，保存后生效', 2200, 'info');
      return;
    }

    const b = e.target.closest('#providerGrid button');
    if (b && b.dataset.value) {
      state.selectedProvider = b.dataset.value;
      document.querySelectorAll('#providerGrid button').forEach(x => x.classList.toggle('selected', x === b));
      const info = API_PROVIDERS[state.selectedProvider];
      if (info) {
        const ep = document.getElementById('apiEndpoint');
        if (ep) ep.value = info.endpoint || '';
      }
    }
    const modalEl = document.getElementById('modal');
    if (e.target === modalEl && modalEl) modalEl.setAttribute('hidden', '');
  });

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      const modal = document.getElementById('modal');
      if (modal && !modal.hasAttribute('hidden')) modal.setAttribute('hidden', '');
      const fortModal = document.getElementById('fortuneTypeModal');
      if (fortModal && !fortModal.hasAttribute('hidden')) fortModal.setAttribute('hidden', '');
      const share = document.getElementById('sharePreview');
      if (share && !share.hasAttribute('hidden')) share.setAttribute('hidden', '');
      const onboard = document.querySelector('.onboard-overlay');
      if (onboard) onboard.remove();
    }
  });
}

// ===== 初始化 =====
function init() {
  // 在线/离线提示（PWA 离线可用性引导）
  setupNetworkHints();

  // 扫码入口识别
  if (window.location.search.includes('from=share')) {
    setTimeout(() => {
      toast('✨ 朋友邀你入局 · 抽一张牌灵吧', 3000, 'info');
      const toolSection = document.getElementById('toolSection');
      if (toolSection) toolSection.scrollIntoView({ behavior: 'smooth' });
    }, 800);
  }

  try {
    updateStep(1);
    renderStep1();
    updateApiStatus();
    const ep = document.getElementById('apiEndpoint');
    if (ep && !ep.value) ep.value = API_PROVIDERS.deepseek.endpoint;
    if (!hasCompletedOnboarding()) showOnboarding();
    injectAnimations();
    bindAllEvents();
    initPWA();
    initDrag();
    bindScrollButtons();
    renderPeriodCards();
  } catch (e) {
    document.body.innerHTML = `<div style="color:#d45050;padding:40px;text-align:center;"><h2>浮生牌启动失败</h2><p>${escapeForHTML(e.message)}</p></div>`;
    console.error(e);
  }
}
document.addEventListener('DOMContentLoaded', init);