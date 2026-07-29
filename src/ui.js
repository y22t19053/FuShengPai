// ===== src/ui.js · 业务主控中心 =====
import { state, $, $$, cacheDom } from './state.js';
import { injectAnimations } from './ui/ui-anim.js';
import {
  renderTeachingPanel, renderStep1, renderStep2, renderStep3,
  initSettingsPanel, initProfilePanel, renderHistoryPanel,
  refreshAll, updateDailySignDisplay, updateApiStatus,
  escapeHtml
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
  exportAllData, getDrawTimestamps
} from './storage.js';
import { checkUsageFrequency } from './engine.js'; 
import { requestReading, requestFollowUp, testApiConnection } from './ai.js';
import {
  createDeck, shuffle, drawTiYong, calcDiff, detectLines, calcFullBaZi, calcYearPillar
} from './engine.js';
import {
  SUITS, RANKS, GONG_ORDER, GONG_NAMES, GONG_WUXING, GONG_DIRECTION,
  ALL_LINES, TIME_LABELS, API_PROVIDERS, CATEGORIES,
  getWuxing, getCardValue, getCardId, getCardColor,
  getShengKe, getShengKeLabel, getWangState
} from './data.js';
import {
  UI_TEXTS, RULES_TEXTS, TUTORIAL_TEXTS, PHYSICAL_GUIDE,
  REFUSAL_TEXTS, USAGE_REMINDERS, SHARE_TEXTS, SHARE_QUOTES,
  TIME_RESTRICTION, HISTORY_EMPTY, PRIVACY_NOTICE, AI_STYLES,
  AI_GUIDE_TEXT, ONBOARDING_STEPS, generateFullReading,
  MIRROR_QUESTIONS, RITUAL_COSTS, PERSONALITY_TONES,
  OBSERVER_COVENANT, SIGN_LIBRARY, INTENT_QUESTIONS
} from './texts/index.js';
import { MAX_DAILY_OBSERVATIONS } from './constants.js';

// ================================================================
// 核心业务逻辑（调度各模块）
// ================================================================
function updateStep(n) { /* 保持原样 */ }
function getBaziFromProfile() { /* 保持原样 */ }
function detectIntent(question, category) { /* 保持原样 */ }
function generateFollowUpQuestions(intent, ti, yong) { /* 保持原样 */ }
function applyRefinement(key, value) { /* 保持原样 */ }
function localInterpretation() { /* 保持原样 */ }
function generateInterpretation() { /* 保持原样 */ }
function buildAIPrompt() { /* 保持原样 */ }
function resetAll() { /* 保持原样 */ }
function proceedStartQuestion() { /* 保持原样 */ }
function startQuestion() { guardMidnight(proceedStartQuestion); }
function startManualEntry() { guardMidnight(() => { /* 保持原样 */ }); }
function lazyStart() { guardMidnight(proceedLazyStart); }
function proceedLazyStart() { /* 保持原样 */ }
function resetStep2() { /* 保持原样 */ }
function confirmTiYong() { /* 保持原样 */ }
function resetGrid() { /* 保持原样 */ }
function copyLocalResult() { /* 保持原样 */ }
function saveApiSettingsFromForm() { /* 保持原样 */ }
function saveProfileFromForm() { /* 保持原样 */ }
function checkEthicalBoundary(question) { /* 保持原样 */ }

async function triggerAI() { /* 保持原样 */ }
async function sendFollowUp() { /* 保持原样 */ }
async function handleTestApiConnection() { /* 保持原样 */ }

// ================================================================
// 全局事件监听绑定（彻底防止点击失灵和拖拽干扰）
// ================================================================

// 点击监听：负责所有按钮事件
document.addEventListener('click', function(e) {
  const btn = e.target.closest('button');
  if (btn) {
    if (btn.id === 'scrollLeftBtn' || btn.id === 'scrollRightBtn') return;
    if (btn.classList.contains('refinement-btn')) return; // 已废弃
    if (btn.classList.contains('tag-remove')) return; // 已废弃
    const action = btn.dataset.action;
    if (!action) return;
    switch (action) {
      case 'togglePanel': togglePanel(btn.dataset.panel); break;
      case 'resetAll': resetAll(); break;
      case 'confirmQuestion': startQuestion(); break;
      case 'lazyStart': lazyStart(); break;
      case 'manualEntry': startManualEntry(); break;
      case 'selectCategory': state.category = state.category === btn.dataset.category ? '' : btn.dataset.category; document.querySelectorAll('[data-action="selectCategory"]').forEach(b => b.classList.toggle('selected', b.dataset.category === state.category)); break;
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
      case 'clearApiSettings': clearApiSettings(); updateApiStatus(); toast(UI_TEXTS.toastCleared); break;
      case 'testApiConnection': handleTestApiConnection(); break;
      case 'saveProfile': saveProfileFromForm(); break;
      case 'deleteHistoryItem': if (btn.dataset.historyIndex !== undefined) { deleteHistoryItem(parseInt(btn.dataset.historyIndex)); renderHistoryPanel(); domModal.setAttribute('hidden', ''); toast('已删除'); } break;
      case 'importCode': importShareCode(); break;
      case 'dailyFortune': showDailyFortune(); break;
      case 'closeModal': domModal.setAttribute('hidden', ''); break;
      case 'closeShare': domSharePreview.setAttribute('hidden', ''); break;
      case 'saveShareImage': saveShareImage(); break;
    }
    return;
  }
  const historyItem = e.target.closest('.history-item'); if (historyItem && historyItem.dataset.index !== undefined) { showHistoryDetail(parseInt(historyItem.dataset.index)); return; }
  const lineBtn = e.target.closest('.line-btn'); if (lineBtn && lineBtn.dataset.line) { setLine(lineBtn.dataset.line.split(',').map(Number)); return; }
  const emptyDash = e.target.closest('.empty-dash'); if (emptyDash && state.sel) { const card = findCardById(state.sel); if (card && !isCardPlaced(card)) { if (emptyDash.textContent.includes('体')) placeCardOnTiYong(card, 'ti'); else placeCardOnTiYong(card, 'yong'); } return; }
  const gong = e.target.closest('.gong'); if (gong && state.sel) { const g = parseInt(gong.dataset.gong); const card = findCardById(state.sel); if (card && !isCardPlaced(card)) placeCardOnGong(card, g); }
});

// 触摸监听：彻底重写触屏点按与拖拽
document.addEventListener('touchstart', function(e) {
  const cardEl = e.target.closest('.card-back, .card-face-small');
  if (!cardEl) return;
  startPress(e.touches[0].clientX, e.touches[0].clientY, cardEl);
}, { passive: true });

document.addEventListener('touchmove', function(e) {
  moveDrag(e.touches[0].clientX, e.touches[0].clientY, e);
}, { passive: false });

document.addEventListener('touchend', function(e) {
  endDrag(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
});

// 鼠标监听：PC端原生拖拽与点按
document.addEventListener('mousedown', function(e) {
  const cardEl = e.target.closest('.card-back, .card-face-small');
  if (!cardEl) return;
  startPress(e.clientX, e.clientY, cardEl);
});
document.addEventListener('mousemove', function(e) { moveDrag(e.clientX, e.clientY, e); });
document.addEventListener('mouseup', function(e) { endDrag(e.clientX, e.clientY); });

// 其它面板绑定
document.addEventListener('click', function(e) { const b = e.target.closest('#providerGrid button'); if (!b || !b.dataset.value) return; state.selectedProvider = b.dataset.value; $$('#providerGrid button').forEach(x => x.classList.toggle('selected', x === b)); const info = API_PROVIDERS[state.selectedProvider]; if (info) { const ep = $('#apiEndpoint'); if (ep) ep.value = info.endpoint || ''; } });
document.addEventListener('click', function(e) { if (e.target === domModal) domModal.setAttribute('hidden', ''); });

// ================================================================
// 应用启动
// ================================================================
function init() {
  try {
    cacheDom(); updateStep(1); renderStep1(); updateApiStatus();
    const ep = $('#apiEndpoint'); if (ep && !ep.value) ep.value = API_PROVIDERS.deepseek.endpoint;
    if (!hasCompletedOnboarding()) showOnboarding();
    injectAnimations();
  } catch (e) { document.body.innerHTML = '<div style="color:#d45050;padding:40px;text-align:center;font-family:sans-serif;"><h2>浮生牌启动失败</h2><p>请检查浏览器控制台（F12）的错误信息，并确认所有文件已正确保存。</p><p style="font-size:0.8rem;">' + e.message + '</p></div>'; console.error(e); }
}
document.addEventListener('DOMContentLoaded', init);