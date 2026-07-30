// ===== src/ui.js · 业务主控中心 =====
import { state, $, $$ } from './state.js';
// 【关键修复】改用 domCore
import { cacheDom, domCore } from './domCache.js';
import { injectAnimations } from './ui/ui-anim.js';
import { renderStep1, renderStep2, renderStep3, renderHistoryPanel, initSettingsPanel, initProfilePanel, updateApiStatus, updateDailySignDisplay } from './ui/ui-render.js';
import { toast, guardMidnight, showOnboarding, showPrivacyWarning } from './ui/ui-modal.js';
import { startPress, moveDrag, endDrag } from './ui/ui-drag.js';
import { bindAll } from './controllers/EventBinder.js';
import { getApiSettings, saveApiSettings, clearApiSettings, getProfile, saveProfile, hasCompletedOnboarding, completeOnboarding } from './storage.js';
import { requestReading, requestFollowUp, testApiConnection } from './ai.js';
import { createDeck, shuffle, drawTiYong, calcDiff, detectLines, calcFullBaZi, calcYearPillar } from './engine.js';
import { API_PROVIDERS, getShengKe, getShengKeLabel, getWangState, getWuxing, getCardValue, GONG_NAMES, GONG_WUXING } from './data.js';
import { MAX_DAILY_OBSERVATIONS } from './constants.js';
import { REFUSAL_TEXTS, UI_TEXTS, generateFullReading } from './texts/index.js';

// ...（基础算法和核心函数保持原样不变）...

export function resetAll() { /* 保持原样 */ }
export function startQuestion() { /* 保持原样 */ }
export function startManualEntry() { /* 保持原样 */ }
export function lazyStart() { /* 保持原样 */ }

function proceedStartQuestion() {
  const q = $('#questionInput')?.value?.trim() || ''; 
  if (q) { const check = checkEthicalBoundary(q); if (check.blocked) { domCore.innerHTML = `<div class="panel"><h3>提示</h3><p>${check.message}</p><button data-action="resetAll" class="small">返回</button></div>`; return; } }
  state.question = q; state.manualMode = false; state.uid = 0; 
  generateEntropySeed().then(seed => {
    state.deck = seededShuffle(createDeck(false), seed); state.ti = null; state.yong = null; state.grid = {}; state.line = null; state.lineOrder = {}; state.sel = null; state.possible = []; state.chatHistory = []; state.gongOrder = []; state.editCount = 0; state.refinementTags = {}; state.intent = null;
    updateStep(2); renderStep2();
  });
}

// ...（其余函数保持原样）...

// 启动初始化
function init() {
  try {
    cacheDom();
    try { const testKey = '__fs_test__'; localStorage.setItem(testKey, '1'); localStorage.removeItem(testKey); } catch (e) { showPrivacyWarning(); }
    updateStep(1); renderStep1(); updateApiStatus();
    const ep = document.getElementById('apiEndpoint'); if (ep && !ep.value) ep.value = API_PROVIDERS.deepseek.endpoint;
    if (!hasCompletedOnboarding()) showOnboarding();
    injectAnimations();
    bindAll();
    import('./environment.js').then(env => env.initEnvironmentMonitor());
  } catch (e) { 
    document.body.innerHTML = '<div style="color:#d45050;padding:40px;text-align:center;font-family:sans-serif;"><h2>浮生牌启动失败</h2><p>请检查浏览器控制台（F12）的错误信息，并确认所有文件已正确保存。</p><p style="font-size:0.8rem;">' + e.message + '</p></div>'; console.error(e); 
  }
}
document.addEventListener('DOMContentLoaded', init);