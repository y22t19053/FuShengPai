// ===== src/ui.js · 业务主控中心 =====
import { state, $, $$ } from './state.js';
import { cacheDom } from './domCache.js';
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
import { localInterpretation } from './controllers/ActionHandler.js'; // 避免循环，需调整位置
// 注意：localInterpretation 和 generateInterpretation 等核心解析仍保留在 ui.js，方便 ActionHandler 调用

// ... (保持 generateEntropySeed, updateStep, getBaziFromProfile, detectIntent, localInterpretation, generateInterpretation, buildAIPrompt, resetAll, proceedStartQuestion, startQuestion, startManualEntry, proceedLazyStart, lazyStart, resetStep2, confirmTiYong, resetGrid, saveApiSettingsFromForm, saveProfileFromForm, triggerAI, sendFollowUp, handleTestApiConnection 的逻辑原封不动) ...
// 【注意】由于 ActionHandler 依赖这些函数，原文件的大部分长度得以保留，但文件职责已变成纯粹的“调度器 + 核心逻辑”

export function init() {
  try {
    cacheDom();
    try {
      const testKey = '__fs_test__';
      localStorage.setItem(testKey, '1');
      localStorage.removeItem(testKey);
    } catch (e) { showPrivacyWarning(); }
    
    updateStep(1); renderStep1(); updateApiStatus();
    const ep = document.getElementById('apiEndpoint');
    if (ep && !ep.value) ep.value = API_PROVIDERS.deepseek.endpoint;
    if (!hasCompletedOnboarding()) showOnboarding();
    injectAnimations();
    bindAll(); // 【核心】启动事件绑定
  } catch (e) { 
    document.body.innerHTML = '<div style="color:#d45050;padding:40px;text-align:center;font-family:sans-serif;"><h2>浮生牌启动失败</h2><p>请检查浏览器控制台（F12）的错误信息，并确认所有文件已正确保存。</p><p style="font-size:0.8rem;">' + e.message + '</p></div>'; console.error(e); 
  }
}
document.addEventListener('DOMContentLoaded', init);