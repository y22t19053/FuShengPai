// ===== src/controllers/ActionHandler.js · 动作调度中心 =====
import { state, $, $$ } from '../state.js';
import { 
  resetAll, startQuestion, startManualEntry, lazyStart, generateInterpretation, 
  confirmTiYong, resetGrid, resetStep2, triggerAI, sendFollowUp, 
  handleTestApiConnection, saveApiSettingsFromForm, saveProfileFromForm,
  copyLocalResult, checkEthicalBoundary, switchMode, sealDeckAction,
  showTimeCapsuleAction, showDurianReportAction
} from '../ui.js';
import { togglePanel, toast, showDailyFortune, showHistoryDetail, generateShareCode, importShareCode, generateShareImage, saveShareImage, showPrivacyWarning, showTimeCapsule, showDurianReport } from '../ui/ui-modal.js';
import { initSettingsPanel, initProfilePanel, renderHistoryPanel, refreshAll, updateApiStatus } from '../ui/ui-render.js';
import { getApiSettings, clearApiSettings, exportAllData } from '../storage.js';
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
        document.getElementById('modal')?.setAttribute('hidden', ''); 
        toast('已删除'); 
      } 
      break;
    case 'importCode': importShareCode(); break;
    case 'dailyFortune': showDailyFortune(); break;
    case 'closeModal': 
      const modalEl = document.getElementById('modal');
      if (modalEl) modalEl.setAttribute('hidden', '');
      break;
    case 'closeShare': document.getElementById('sharePreview')?.setAttribute('hidden', ''); break;
    case 'saveShareImage': saveShareImage(); break;
    
    // ---- 新增动作 ----
    case 'switchMode':
      switchMode(dataset.mode);
      break;
    case 'sealDeck':
      sealDeckAction();
      break;
    case 'timeCapsule':
      showTimeCapsuleAction();
      break;
    case 'durianReport':
      showDurianReportAction();
      break;
  }
}