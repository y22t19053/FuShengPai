// ===== src/controllers/ActionHandler.js · 动作调度中心 =====
import { state, $, $$ } from '../state.js';
import { resetAll, startQuestion, startManualEntry, lazyStart, generateInterpretation, confirmTiYong, resetGrid, resetStep2 } from '../ui.js';
import { togglePanel, toast, showDailyFortune, showHistoryDetail, generateShareCode, importShareCode, generateShareImage, saveShareImage, showPrivacyWarning, guardMidnight } from '../ui/ui-modal.js';
import { initSettingsPanel, initProfilePanel, renderHistoryPanel, refreshAll } from '../ui/ui-render.js';
import { triggerAI, sendFollowUp, handleTestApiConnection, saveApiSettingsFromForm, saveProfileFromForm, checkEthicalBoundary } from '../ui.js';
import { getApiSettings, clearApiSettings, updateApiStatus, exportAllData } from '../storage.js';
import { UI_TEXTS } from '../texts/index.js';

export function handleAction(action, dataset) {
  switch (action) {
    case 'togglePanel': togglePanel(dataset.panel); break;
    case 'resetAll': resetAll(); break;
    case 'confirmQuestion': startQuestion(); break;
    case 'lazyStart': lazyStart(); break;
    case 'manualEntry': startManualEntry(); break;
    case 'selectCategory': 
      state.category = state.category === dataset.category ? '' : dataset.category; 
      document.querySelectorAll('[data-action="selectCategory"]').forEach(b => b.classList.toggle('selected', b.dataset.category === state.category)); 
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
    case 'clearApiSettings': clearApiSettings(); updateApiStatus(); toast(UI_TEXTS.toastCleared); break;
    case 'testApiConnection': handleTestApiConnection(); break;
    case 'saveProfile': saveProfileFromForm(); break;
    case 'deleteHistoryItem': 
      if (dataset.historyIndex !== undefined) { 
        import('../storage.js').then(s => { s.deleteHistoryItem(parseInt(dataset.historyIndex)); renderHistoryPanel(); });
        domModal.setAttribute('hidden', ''); 
        toast('已删除'); 
      } 
      break;
    case 'importCode': importShareCode(); break;
    case 'dailyFortune': showDailyFortune(); break;
    case 'closeModal': 
      const modalEl = document.getElementById('modal');
      if (modalEl) modalEl.setAttribute('hidden', '');
      break;
    case 'closeShare': domSharePreview.setAttribute('hidden', ''); break;
    case 'saveShareImage': saveShareImage(); break;
  }
}

// 辅助函数封装（避免循环引用）
function copyLocalResult() {
  const el = document.getElementById('interpretText');
  if (!el) return;
  navigator.clipboard.writeText(el.innerText).then(() => toast(UI_TEXTS.toastCopied), () => toast(UI_TEXTS.toastCopyFailed));
}