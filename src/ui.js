// ===== src/ui.js · 业务主控中心 =====
import { state, $, $$ } from './state.js';
import { cacheDom } from './domCache.js';
import { injectAnimations } from './ui/ui-anim.js';
import {
  renderTeachingPanel, renderStep1, renderStep2, renderStep3,
  initSettingsPanel, initProfilePanel, renderHistoryPanel,
  refreshAll, updateDailySignDisplay, updateApiStatus, escapeHtml
} from './ui/ui-render.js';
import {
  selectCard, placeCardOnGong, placeCardOnTiYong, removeCardFromGong,
  checkLines, setLine, renderLineSelector, removeLineSelector,
  startPress, moveDrag, endDrag,
  isCardPlaced, findCardById
} from './ui/ui-drag.js';
import {
  toast, togglePanel, showOnboarding, guardMidnight, showDailyFortune,
  showHistoryDetail, generateShareCode, importShareCode,
  generateShareImage, saveShareImage, showPrivacyWarning
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

// ----- 基础算法函数 -----
function mulberry32(a) {
  return function() {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    var t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}
function seededShuffle(array, seed) {
  let arr = [...array]; let rng = mulberry32(seed);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
async function generateEntropySeed() {
  const perfNow = performance.now();
  let seed = Math.floor(perfNow * 1000);
  try {
    const battery = await navigator.getBattery?.();
    if (battery) seed ^= Math.floor(battery.level * 10000);
  } catch(e) {}
  return seed;
}

// ----- 核心业务逻辑 -----
function updateStep(n) { state.step = n; for (let i = 1; i <= 3; i++) { const el = $('#sd' + i); if (!el) continue; el.classList.remove('active', 'done'); if (i < n) el.classList.add('done'); if (i === n) el.classList.add('active'); } }
function getBaziFromProfile() { /* 保持原有逻辑 */ }
function detectIntent(question, category) { /* 保持原有逻辑 */ }

export function localInterpretation() {
  const tiWx = getWuxing(state.ti), yongWx = getWuxing(state.yong);
  const relation = getShengKe(tiWx, yongWx);
  const intent = detectIntent(state.question, state.category);
  state.intent = intent;
  let result = '';
  if (state.category) result += `【领域：${state.category}】\n\n`;
  const bazi = getBaziFromProfile();
  if (bazi) result += `【四柱】${bazi.fullText}\n\n`;
  result += `体牌为${tiWx}，代表你。用牌为${yongWx}，代表所问之事。\n`;
  if (relation) result += `（${relation} ${getShengKeLabel(relation)}）\n\n`;
  if (state.line) { result += `天机线：${state.line.map(g => GONG_NAMES[g] + '宫').join(' → ')}\n\n`; }
  const allGongs = state.gongOrder.length ? state.gongOrder : Object.keys(state.grid).map(Number);
  for (const g of allGongs) {
    const cards = state.grid[g] || []; if (!cards.length) continue;
    cards.forEach(card => {
      const diff = calcDiff(g, card); const wang = getWangState(getWuxing(card), GONG_WUXING[g]); const relToTi = getShengKe(tiWx, getWuxing(card));
      const linePos = state.line ? state.line.indexOf(g) : -1; const linePosition = linePos === 0 ? 'start' : linePos === 1 ? 'middle' : linePos === 2 ? 'end' : 'offline';
      const ctx = { gong: { id: g, name: GONG_NAMES[g], element: GONG_WUXING[g] }, card: { element: getWuxing(card), value: getCardValue(card), suit: card.suit }, tiYongRelation: relToTi || '同我', wangState: wang, linePosition: linePosition, diff: diff, intent: intent };
      const readingResult = generateFullReading(ctx);
      const label = state.lineOrder[g] || GONG_NAMES[g] + '宫';
      result += `【${label}】\n${readingResult.light}\n\n---\n${readingResult.shadow}\n\n`;
    });
  }
  return result.trim();
}

function generateInterpretation() { /* 保持原有逻辑 */ }
function buildAIPrompt() { /* 保持原有逻辑 */ }

export function resetAll() {
  if (!confirm('此阵一散，当下映照便消逝，确要重来吗？')) return;
  Object.assign(state, { question: '', category: '', deck: [], ti: null, yong: null, grid: {}, line: null, lineOrder: {}, step: 1, sel: null, possible: [], manualMode: false, gongOrder: [], chatHistory: [], uid: 0, editCount: 0, refinementTags: {}, intent: null });
  updateStep(1); renderStep1(); toast(UI_TEXTS.toastReset);
}

function proceedStartQuestion() { /* 保持原有逻辑 */ }
function startQuestion() { guardMidnight(proceedStartQuestion); }
function startManualEntry() { /* 保持原有逻辑 */ }
function proceedLazyStart() { /* 保持原有逻辑 */ }
function lazyStart() { guardMidnight(proceedLazyStart); }
function resetStep2() { /* 保持原有逻辑 */ }
function confirmTiYong() { /* 保持原有逻辑 */ }
function resetGrid() { /* 保持原有逻辑 */ }
function copyLocalResult() { /* 保持原有逻辑 */ }
function saveApiSettingsFromForm() { /* 保持原有逻辑 */ }
function saveProfileFromForm() { /* 保持原有逻辑 */ }
function checkEthicalBoundary(question) { /* 保持原有逻辑 */ }

async function triggerAI() {
  const btn = $('#aiReadBtn'); if (!btn) return; btn.disabled = true; btn.textContent = '思考中...';
  const settings = getApiSettings(); if (!settings || !settings.apiKey) { toast('请先配置 API Key'); btn.disabled = false; btn.textContent = UI_TEXTS.btnAIDeepRead; return; }
  const provider = settings.provider || 'deepseek'; 
  let endpoint = settings.endpoint || API_PROVIDERS[provider]?.endpoint || '';
  if (endpoint.endsWith('/v1')) endpoint = endpoint.slice(0, -3); 
  if (endpoint.endsWith('/')) endpoint = endpoint.slice(0, -1);
  const model = settings.model || API_PROVIDERS[provider]?.model || '';
  const prompt = buildAIPrompt();
  try {
    const result = await requestReading({ provider, apiKey: settings.apiKey, endpoint, model, style: settings.aiStyle || 'guide', prompt });
    const container = $('#aiResultContainer'); const content = $('#aiResultContent');
    if (container) container.style.display = 'block'; if (content) content.innerHTML = '<strong>深层解读：</strong><br>' + result.replace(/\n/g, '<br>');
    state.chatHistory = [{ role: 'user', content: prompt }, { role: 'assistant', content: result }];
    const followUp = $('#followUpArea'); if (followUp) followUp.style.display = 'block';
    toast('解读完成');
  } catch (e) {
    const container = $('#aiResultContainer'); if (container) container.style.display = 'block';
    const content = $('#aiResultContent');
    const fallbackText = localInterpretation();
    if (content) content.innerHTML = `
      <div style="color:#c9a060;border:1px solid #c9a060;padding:8px;border-radius:6px;margin-bottom:8px;font-size:0.8rem;">
        ⚠️ AI 服务暂时无法连接，以下为规则引擎生成的原始解读：
      </div>
      ${fallbackText.replace(/\n/g, '<br>')}
    `;
    toast('AI 不可用，已展示规则解读', 3000);
  } finally { btn.disabled = false; btn.textContent = UI_TEXTS.btnAIDeepRead; }
}

async function sendFollowUp() { /* 保持原有逻辑 */ }
async function handleTestApiConnection() { /* 保持原有逻辑 */ }

// ================================================================
// 全局事件监听
// ================================================================

document.addEventListener('click', function(e) {
  const btn = e.target.closest('button');
  if (btn) {
    const action = btn.dataset.action; if (!action) return;
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
      case 'closeModal': 
        const modalEl = document.getElementById('modal');
        if (modalEl) modalEl.setAttribute('hidden', '');
        break;
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

document.addEventListener('touchstart', function(e) {
  const cardEl = e.target.closest('.card-back, .card-face-small');
  if (cardEl) startPress(e.touches[0].clientX, e.touches[0].clientY, cardEl);
}, { passive: true });
document.addEventListener('touchmove', function(e) { moveDrag(e.touches[0].clientX, e.touches[0].clientY, e); }, { passive: false });
document.addEventListener('touchend', function(e) { endDrag(e.changedTouches[0].clientX, e.changedTouches[0].clientY); });

document.addEventListener('mousedown', function(e) { const cardEl = e.target.closest('.card-back, .card-face-small'); if (cardEl) startPress(e.clientX, e.clientY, cardEl); });
document.addEventListener('mousemove', function(e) { moveDrag(e.clientX, e.clientY, e); });
document.addEventListener('mouseup', function(e) { endDrag(e.clientX, e.clientY); });

document.addEventListener('click', function(e) { const b = e.target.closest('#providerGrid button'); if (b && b.dataset.value) { state.selectedProvider = b.dataset.value; $$('#providerGrid button').forEach(x => x.classList.toggle('selected', x === b)); const info = API_PROVIDERS[state.selectedProvider]; if (info) { const ep = $('#apiEndpoint'); if (ep) ep.value = info.endpoint || ''; } } });
document.addEventListener('click', function(e) {
  const modalEl = document.getElementById('modal');
  if (e.target === modalEl && modalEl) modalEl.setAttribute('hidden', '');
});

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    const modal = document.getElementById('modal');
    if (modal && !modal.hasAttribute('hidden')) modal.setAttribute('hidden', '');
    const share = document.getElementById('sharePreview');
    if (share && !share.hasAttribute('hidden')) share.setAttribute('hidden', '');
    const onboard = document.querySelector('.onboard-overlay');
    if (onboard) onboard.remove();
  }
});

// ================================================================
// 应用启动
// ================================================================
function init() {
  try {
    cacheDom();
    try {
      const testKey = '__fs_test__';
      localStorage.setItem(testKey, '1');
      localStorage.removeItem(testKey);
    } catch (e) {
      showPrivacyWarning();
    }
    
    updateStep(1); renderStep1(); updateApiStatus();
    const ep = $('#apiEndpoint'); if (ep && !ep.value) ep.value = API_PROVIDERS.deepseek.endpoint;
    if (!hasCompletedOnboarding()) showOnboarding();
    injectAnimations();
  } catch (e) { document.body.innerHTML = '<div style="color:#d45050;padding:40px;text-align:center;font-family:sans-serif;"><h2>浮生牌启动失败</h2><p>请检查浏览器控制台（F12）的错误信息，并确认所有文件已正确保存。</p><p style="font-size:0.8rem;">' + e.message + '</p></div>'; console.error(e); }
}
document.addEventListener('DOMContentLoaded', init);