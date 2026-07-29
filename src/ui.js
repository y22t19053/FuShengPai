// ===== src/ui.js · 主控中心 =====
import { state, $, $$, cacheDom } from './state.js';
import { injectAnimations } from './ui/ui-anim.js';
import {
  renderTeachingPanel, renderStep1, renderStep2, renderStep3,
  initSettingsPanel, initProfilePanel, renderHistoryPanel,
  refreshAll, updateDailySignDisplay
} from './ui/ui-render.js';
import {
  selectCard, placeCardOnGong, placeCardOnTiYong, removeCardFromGong,
  checkLines, setLine, renderLineSelector, removeLineSelector,
  startPress, moveDrag, endDrag
} from './ui/ui-drag.js';
import {
  toast, togglePanel, showOnboarding, guardMidnight, showDailyFortune,
  showHistoryDetail, generateShareCode, importShareCode,
  generateShareImage, saveShareImage
} from './ui/ui-modal.js';

import {
  getHistory, saveReading, addDrawTimestamp,
  getApiSettings, saveApiSettings, clearApiSettings,
  getProfile, saveProfile, hasCompletedOnboarding, completeOnboarding,
  exportAllData, getDrawTimestamps, checkUsageFrequency
} from './storage.js';
import { requestReading, requestFollowUp, testApiConnection } from './ai.js';
import { createDeck, shuffle, drawTiYong, calcDiff, getWangState, getWuxing, getShengKe, getShengKeLabel, detectLines, calcFullBaZi, calcYearPillar } from './engine.js';
import { SUITS, RANKS, GONG_ORDER, GONG_NAMES, CATEGORIES, API_PROVIDERS, ALL_LINES } from './data.js';
import { UI_TEXTS, RULES_TEXTS, generateFullReading, REFUSAL_TEXTS, ONBOARDING_STEPS } from './texts/index.js';
import { MAX_DAILY_OBSERVATIONS } from './constants.js';

// ===== 业务逻辑函数 =====
function updateStep(n) { /* ...原代码复制... */ }

function getBaziFromProfile() { /* ...原代码复制... */ }

function detectIntent(question, category) { /* ...原代码复制... */ }

function generateFollowUpQuestions(intent, ti, yong) { /* ...原代码复制... */ }

function applyRefinement(key, value) { /* ...原代码复制... */ }

function localInterpretation() { /* ...原代码复制... */ }

function generateInterpretation() {
  const timestamps = getDrawTimestamps(); 
  const todayCount = timestamps.filter(ts => new Date(ts).toDateString() === new Date().toDateString()).length;
  const usage = checkUsageFrequency(timestamps);
  if (!state.userCorpus.includes(state.question)) state.userCorpus.push(state.question);
  const text = localInterpretation(); 
  updateStep(3);
  renderStep3(text);
  const interpretEl = $('#interpretText');
  if (interpretEl && todayCount >= MAX_DAILY_OBSERVATIONS && !localStorage.getItem('fs_limit_alert_today')) {
    const alertHTML = `<div style="margin-top:15px;font-size:0.7rem;color:var(--dim);border-top:1px solid rgba(255,255,255,0.05);padding-top:10px;">※ 今日已观测 ${MAX_DAILY_OBSERVATIONS} 次以上，镜面易起雾，请注意休息。</div>`;
    interpretEl.innerHTML += alertHTML;
    localStorage.setItem('fs_limit_alert_today', 'true');
  }
  if (usage.level !== 'normal') toast(usage.message, 4000);
  try {
    saveReading({ time: Date.now(), question: state.question, category: state.category, intent: state.intent, ti: state.ti, yong: state.yong, grid: state.grid, line: state.line, lineOrder: state.lineOrder, text, chatHistory: state.chatHistory.slice() });
  } catch(e) { toast('历史记录保存失败，但解读仍然有效'); }
  addDrawTimestamp(Date.now()); 
}

function buildAIPrompt() { /* ...原代码复制... */ }

function resetAll() { /* ...原代码复制... */ }
function startQuestion() { guardMidnight(proceedStartQuestion); }
function proceedStartQuestion() { /* ...原代码复制... */ }
function startManualEntry() { guardMidnight(() => { /* ...原代码复制... */ }); }

// ... 继续复制 `lazyStart`、`confirmTiYong`、`resetGrid`、`resetStep2`、`copyLocalResult` 等业务逻辑 ...
// ... 以及 `triggerAI`、`sendFollowUp`、`handleTestApiConnection`、`saveApiSettingsFromForm` 等函数 ...

// ===== 全局事件委托 =====
document.addEventListener('click', function(e) { /* 把原有的 switch 事件剥离到各文件，仅在主控中保留全局分发，确保模块化闭环 */ });

document.addEventListener('touchstart', function(e) { /* ...调用 ui-drag 的 startPress... */ });
document.addEventListener('touchmove', function(e) { /* ...调用 ui-drag 的 moveDrag... */ });
document.addEventListener('touchend', function(e) { /* ...调用 ui-drag 的 endDrag... */ });
// 同样处理 mousedown、mousemove、mouseup

// ===== 应用启动 =====
function init() {
  cacheDom();
  updateStep(1);
  renderStep1();
  updateApiStatus();
  injectAnimations();
  const ep = $('#apiEndpoint'); if (ep && !ep.value) ep.value = API_PROVIDERS.deepseek.endpoint;
  if (!hasCompletedOnboarding()) showOnboarding();

  const storedDate = localStorage.getItem('fs_todays_sign_date');
  const storedSign = localStorage.getItem('fs_todays_sign');
  const today = new Date().toDateString();
  if (storedDate === today && storedSign) {
    try { updateDailySignDisplay(JSON.parse(storedSign)); } catch(e) {}
  }
}

document.addEventListener('DOMContentLoaded', init);