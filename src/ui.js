// ===== src/ui.js · 业务主控（日运细选+模型选择+AI高级参数+盲抽牌灵+from=share） =====
// 中文字体：奶油冰淇淋主题统一使用系统圆润无衬线栈（PingFang / 微软雅黑等），
// 不再加载宋体网络字体——避免衬线尖角，且首屏更快、PWA 离线零字体依赖。

import { state } from './state.js';
import { injectAnimations } from './ui/ui-anim.js';
import {
  renderStep1, renderStep2, renderFullReport, renderResultPreview, renderHistoryPanel,
  initSettingsPanel, initProfilePanel, updateApiStatus, refreshAll,
  bindScrollButtons, renderPeriodCards
} from './ui/ui-render.js';
import {
  toast, showOnboarding, showDurianReport, showReportsModal,
  renderPeriodReportInto, replayTimelineEntry,
  togglePanel, showHistoryDetail, generateShareCode,
  importShareCode, generateShareImage, saveShareImage, copyShareImage, showAIGuideModal,
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
  API_PROVIDERS, POPULAR_MODELS, getShengKe, getShengKeLabel, getRelationPlain, getWangState, getWangStatePlain, getWuxing,
  getCardValue, getCardColor, GONG_NAMES, GONG_WUXING, ALL_LINES, TIME_LABELS, GONG_ORDER,
  CATEGORIES, PERIODS, getCurrentPeriodKey, getPeriodTitle, getPeriodDesc,
  getRecommendedGongForCategory, getGongEnvironment,
  DAILY_FORTUNE_TYPES, getDailyFortuneType
} from './data.js';
import { MAX_DAILY_OBSERVATIONS, pick } from './constants.js';
import { UI_TEXTS, STATUS_POOL, REMINDER_POOL, ACTION_POOL } from './texts/index.js';
import { getDailyMirrorLine, getSceneLines, getWakeUpLine } from './texts/mirror-pools.js';
import { getAlmanac } from './calendar.js';
import { calculateDurianIndex } from './durian.js';
import { runEngine } from './engines/index.js';
import { generateFingerprint, seedToX0, chaoticGenerator, chaoticShuffle } from './chaos.js';
import { interceptQuestion, checkDependency, getSealStatus } from './philosophy/ethics.js';
import { applyCovenant } from './philosophy/covenant.js';
import { escapeForHTML, setHTML } from './utils/safe.js';
import { playCardSound, playJokerSound, playPlaceSound } from './utils/sound.js';
import { initPWA, isPWAInstalled, requestPWAInstall, hardRefresh } from './pwa.js';
import { resolveApiModel } from './utils/api-config.js';
import { syncQuestionFromInput, createPeriodShareAction } from './utils/flow-helpers.js';
import { copyTextWithFeedback } from './utils/clipboard.js';
import { chaosShuffleDeck } from './services/deck.js';
import { buildSummary } from './services/summary.js';
import { buildLocalReading } from './services/readings.js';
import { computeThreeDurian, buildThreeSpreadText } from './services/three-spread.js';
import { buildSingleCardPrompt, buildAIPrompt as buildAIPromptSvc } from './services/prompts.js';
import { generateFullPeriodLocal } from './services/periods.js';

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

// ===== 本地解读 =====
export async function localInterpretation() {
  return buildLocalReading(state);
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
  renderFullReport(text, null, buildSummary(state));
  updateStep(3);
}

// ===== AI Prompt =====
export async function buildAIPrompt() {
  return buildAIPromptSvc(state);
}

// ===== 通用单牌 AI 提示词生成器（支持细选类别） =====
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

export async function generateThree() {
  try {
    const seal = getSealStatus();
    if (seal && seal.sealed) { toast('牌面安静了一会儿，现在可以重新看了', 2500); }
    const timestamps = getDrawTimestamps();
    const depCheck = checkDependency(timestamps);
    if (depCheck.level === 'warning') { toast(depCheck.message, 4000); }
    const cards = state.threeCards || [];
    if (cards.length < 3) { toast('三张牌未抽齐', 2200, 'warning'); return; }
    const text = buildThreeSpreadText(state);
    state.pendingFullReport = text;
    const durian = computeThreeDurian(cards);
    state.durianIndex = { score: durian.score, level: durian.level, components: durian.components };
    updateStep(3);
    // 两步式：先看三张牌，点按钮再出直断
    renderResultPreview(cards.map(t => t.card), {
      title: '三牌已定',
      subtitle: '过去 · 现在 · 未来，三张牌已落定。想听直断，就点一下下面的按钮。',
      readLabel: '看直断',
      onRead: () => renderFullReport(text, null, buildSummary(state)),
    });
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
  // 两步式：先见牌，再读牌——新手不会一上来就被一整页解读砸脸
  renderResultPreview([state.ti, state.yong], {
    title: '你抽到了',
    subtitle: '牌已落定。想听它怎么说，就点一下下面的按钮；不想听，这一张牌也已经够了。',
    readLabel: '听它怎么说',
    onRead: () => renderFullReport(text, null, summary),
  });
  toast('🃏 牌已落定', 2400, 'success');
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

  // 统一抽牌界面：牌背网格 + 摸牌手势（点牌即开）
  const html = `
    <h3 style="text-align:center;">${escapeForHTML(title)}</h3>
    <p id="periodDeckHint" style="text-align:center;font-size:0.75rem;color:var(--dim);margin-bottom:10px;">凭直觉，点一张牌背即开。翻开的瞬间即定，本周期不可重抽。</p>
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
      // 张力窗口：摸稳 → 牌背轻微抖动 → 才翻牌
      el.classList.add('card-tension');
      // 服务：翻牌前一声「想好了，就翻。」——服务员在桌边欠身，不是催你下单
      const hint = content.querySelector('#periodDeckHint');
      if (hint) hint.textContent = '想好了，就翻。';
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
        const persona = runEngine('poker', { card })?.persona;
        if (persona) toast(`⚡ ${card.type} · ${persona.core}`, 3200, 'success');
      }
      confirmPeriodPick(periodType, card, fortuneType);
    }, settle);
  }

  content.querySelectorAll('#periodDeckGrid .card-back').forEach(el => bindTapToFlip(el));

  // 摸牌手势：点牌即开（无需长按，简单直接）
  function bindTapToFlip(el) {
    const idx = parseInt(el.dataset.periodCardIdx);
    const hint = content.querySelector('#periodDeckHint');
    const onDown = (e) => {
      if (periodLocked) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      el.classList.add('card-holding');
      if (hint) hint.textContent = '想好了，就翻。';
      if (navigator.vibrate) navigator.vibrate(20);
    };
    const onUp = (e) => {
      if (periodLocked) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      el.classList.remove('card-holding');
      flipAndConfirm(idx);
    };
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', () => el.classList.remove('card-holding'));
  }

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

// ===== 赛博黄历（仅日运展示）：真实建除/冲煞/农历/神煞方位 + 白话宜忌 =====
// 走统一契约 daily 引擎（黄历部分）
function buildDailyOracleBlock(wx, dateStr) {
  const oracle = runEngine('daily', { wx, dateStr })?.oracle || {};
  const a = oracle.almanac || {};
  const shenSha = a.shenSha || {};
  const termText = a.term ? `今日${a.term} · ` : '';
  const lunarText = a.lunarDate ? `${a.lunarDate} · ${a.ganZhiDay}日 · ` : '';
  return `
    <div style="font-size:0.82rem;color:var(--text);line-height:1.9;margin:6px 0 10px;padding:10px 14px;background:rgba(111,174,156,0.05);border-radius:var(--r-hand-in);text-align:left;">
      <div style="color:var(--accent);font-size:0.75rem;margin-bottom:2px;">📅 今日黄历 · ${escapeForHTML(oracle.jianchu.name)}　<span style="opacity:0.7;">${escapeForHTML(termText)}${escapeForHTML(lunarText)}冲${escapeForHTML(oracle.chong.name)}·${escapeForHTML(oracle.chong.animal)}</span></div>
      <div>宜 · ${oracle.yi.map(escapeForHTML).join('、')}${shenSha.cai ? `　<span style="opacity:0.7;">财神在${escapeForHTML(shenSha.cai)}</span>` : ''}</div>
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

  // 降噪：镜像/黄历/场景/清醒话/上次 AI 解读收进折叠，默认只留牌 + 判词 + 动作
  const extraBlock = `
    <div style="font-size:0.78rem;color:var(--dim);line-height:1.8;margin:6px 0;">
      <div style="color:var(--accent);font-size:0.78rem;margin-bottom:2px;">☯ 情绪镜像</div>${escapeForHTML(mirrorLine)}
    </div>
    ${oracleBlock}
    ${sceneLines.length ? `<div style="font-size:0.78rem;color:var(--dim);line-height:1.8;margin:6px 0 10px;padding:10px 14px;background:rgba(111,174,156,0.05);border-radius:var(--r-hand-in);">${sceneLines.map(l => `<div>· ${escapeForHTML(l)}</div>`).join('')}</div>` : ''}
    ${wakeUpLine ? `<div style="font-size:0.78rem;color:#d4a05a;line-height:1.7;margin:4px 0 10px;">⚡ ${escapeForHTML(wakeUpLine)}</div>` : ''}
    ${hasAi ? `
      <div style="text-align:left;font-size:0.85rem;margin:12px 0;padding:12px;background:rgba(111,174,156,0.06);border-radius:var(--r-hand-in);max-height:200px;overflow-y:auto;">
        <div style="color:var(--accent);font-size:0.8rem;margin-bottom:8px;">✨ 上次 AI 解读</div>
        ${periodHistory.chatHistory.filter(m => m.role === 'assistant').map(m => `<div style="margin-bottom:8px;">${escapeForHTML(m.content).replace(/\n/g, '<br>')}</div>`).join('')}
      </div>
    ` : ''}
  `;

  const html = `
    <div style="text-align:center;">
      <div style="font-size:0.8rem;color:var(--dim);margin-bottom:8px;">${typeIcon} ${escapeForHTML(typeLabel)} · 你的牌</div>
      <div class="card-face-small ${colorCls}" style="margin:10px auto;width:80px;height:112px;display:flex;align-items:center;justify-content:center;flex-direction:column;border-radius:10px;border:3px solid var(--border);background:#f6f0e2;animation:revealPop .5s ease both;">
        <span style="font-size:2rem;font-weight:bold;">${escapeForHTML(rank)}</span>
        <span style="font-size:1.4rem;">${escapeForHTML(suit)}</span>
        <span style="font-size:0.7rem;color:var(--dim);margin-top:2px;">${escapeForHTML(wx)}</span>
      </div>
      ${metaphor ? `<div style="font-size:0.9rem;color:var(--text);line-height:1.8;margin:12px 0;padding:12px;background:rgba(111,174,156,0.06);border-radius:var(--r-hand-in);white-space:pre-wrap;">${escapeForHTML(metaphor)}</div>` : ''}
      <details style="font-size:0.8rem;color:var(--dim);margin:4px 0 10px;text-align:left;">
        <summary style="cursor:pointer;">☯ 想多看一眼</summary>
        ${extraBlock}
      </details>

      <p class="num" style="font-size:0.7rem;color:var(--dim);">抽于 ${new Date(data.drawnAt).toLocaleString()}</p>
      <p style="font-size:0.7rem;color:#d45050;">⚠️ 此牌已锁定，本周期不可重抽。建议截图保存。</p>

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
      fortuneType,
      dateStr: periodKey,
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
      fortuneType,
      dateStr: periodKey,
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
  const metaphor = runEngine('poker', { card, fortuneType, periodLabel: typeLabel, dateStr: periodKey })?.metaphor || '';

  // 情绪镜像（结果页顶部）+ 场景短句（日运专属）
  const mirrorLine = getDailyMirrorLine();
  const sceneLines = getSceneLines(fortuneType);

  // 存储（支持日运细选）
  saveStoredPeriodCard(periodType, { periodKey, card, fortune: metaphor, drawnAt: Date.now(), fortuneType }, fortuneType);

  const oracleBlock = periodType === 'daily' ? buildDailyOracleBlock(wx, periodKey) : '';

  // 降噪：默认只给「牌 + 一句话判词」，情绪镜像/黄历/场景短句收进折叠，新人一眼能看懂
  const extraBlock = `
    <div style="font-size:0.78rem;color:var(--dim);line-height:1.8;margin:8px 0 6px;">
      <div style="color:var(--accent);font-size:0.78rem;margin-bottom:2px;">☯ 情绪镜像</div>${escapeForHTML(mirrorLine)}
    </div>
    ${oracleBlock}
    ${sceneLines.length ? `<div style="font-size:0.78rem;color:var(--dim);line-height:1.8;margin:6px 0 10px;padding:10px 14px;background:rgba(111,174,156,0.05);border-radius:var(--r-hand-in);">${sceneLines.map(l => `<div>· ${escapeForHTML(l)}</div>`).join('')}</div>` : ''}
  `;

  const html = `
    <div style="text-align:center;">
      <div style="font-size:0.8rem;color:var(--dim);margin-bottom:8px;">${escapeForHTML(typeLabel)} · 你抽到了</div>
      <div class="card-face-small ${colorCls}" style="margin:10px auto;width:80px;height:112px;display:flex;align-items:center;justify-content:center;flex-direction:column;border-radius:10px;border:3px solid var(--border);background:#f6f0e2;animation:revealPop .5s ease both;">
        <span style="font-size:2rem;font-weight:bold;">${escapeForHTML(rank)}</span>
        <span style="font-size:1.4rem;">${escapeForHTML(suit)}</span>
        <span style="font-size:0.7rem;color:var(--dim);margin-top:2px;">${escapeForHTML(wx)}</span>
      </div>
      <div style="font-size:0.9rem;color:var(--text);line-height:1.8;margin:12px 0;padding:12px;background:rgba(111,174,156,0.06);border-radius:8px;white-space:pre-wrap;">${escapeForHTML(metaphor)}</div>
      <details style="font-size:0.8rem;color:var(--dim);margin:4px 0 10px;text-align:left;">
        <summary style="cursor:pointer;">☯ 想多看一眼</summary>
        ${extraBlock}
      </details>
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
    setHTML(content, `<div style="color:#d45050;border:1px solid #d45050;padding:8px;border-radius:var(--r-hand-in);margin-bottom:8px;font-size:0.85rem;">⚠️ AI 服务不可用：${escapeForHTML(e.message || '未知错误')}</div>`);
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
      if (menu) {
        menu.hidden = !menu.hidden;
        // 打开菜单时刷新「安装到桌面」按钮状态
        const btn = menu.querySelector('[data-action="installPWA"]');
        if (btn) {
          btn.textContent = isPWAInstalled() ? '✅ 已安装到桌面' : '📲 安装到桌面';
          btn.title = isPWAInstalled() ? '浮生牌已安装，点开桌面图标即像 App 一样使用' : '把浮生牌添加到主屏幕，像 App 一样全屏使用';
        }
      }
      break;
    }
    case 'installPWA': {
      const r = requestPWAInstall();
      if (r === 'installed') toast('✅ 浮生牌已安装到桌面，点开即像 App 一样使用', 3000, 'success');
      else if (r === 'guide') { /* iOS 引导弹层已显示 */ }
      else if (r === 'prompt') { /* 系统安装弹窗已显示 */ }
      else if (r === 'banner') { /* 横幅已显示 */ }
      break;
    }
    case 'hardRefresh': {
      toast('🧹 正在清理缓存并重新加载…', 2500);
      setTimeout(() => { hardRefresh(); }, 700);
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
    case 'copyShareImage': copyShareImage(); break;
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
      import('./ui/ui-modal.js').then(m => m.generateShareImage({ type: 'daily', card, typeKey, fortuneType, template: 'daily' }));
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
  // 桌面壳（Electron）检测：仅控制台确认原生壳，不打扰界面
  if (window.fspDesktop?.isDesktop) {
    window.fspDesktop.getVersion().then(v => {
      console.info(`[浮生牌] 桌面版 v${v} · ${window.fspDesktop.platform}`);
    }).catch(() => {});
  }

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
    document.addEventListener('fsp-pwa-installed', () => {
      toast('🎉 已安装成功！回到桌面点开浮生牌，像 App 一样使用', 4000, 'success');
    });
    initDrag();
    bindScrollButtons();
    renderPeriodCards();
  } catch (e) {
    document.body.innerHTML = `<div style="color:#d45050;padding:40px;text-align:center;"><h2>浮生牌启动失败</h2><p>${escapeForHTML(e.message)}</p></div>`;
    console.error(e);
  }
}
document.addEventListener('DOMContentLoaded', init);