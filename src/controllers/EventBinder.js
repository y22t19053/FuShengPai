// ===== src/controllers/EventBinder.js · 全局事件监听管理 =====
import { state, $, $$ } from '../state.js';
import { startPress, moveDrag, endDrag, isCardPlaced, findCardById } from '../ui/ui-drag.js';
import { togglePanel, guardMidnight, showDailyFortune, showHistoryDetail, generateShareCode, importShareCode, generateShareImage, saveShareImage, showPrivacyWarning } from '../ui/ui-modal.js';
import { handleAction } from './ActionHandler.js';

export function bindAll() {
  // 鼠标/触屏 点击事件（委托给 ActionHandler 处理按钮点击）
  document.addEventListener('click', function(e) {
    const btn = e.target.closest('button');
    if (btn) {
      const action = btn.dataset.action;
      if (action) {
        handleAction(action, btn.dataset);
        return;
      }
    }
    // 处理非按钮点击（九宫格放牌、历史项详情等）
    const historyItem = e.target.closest('.history-item');
    if (historyItem && historyItem.dataset.index !== undefined) {
      showHistoryDetail(parseInt(historyItem.dataset.index));
      return;
    }
    const lineBtn = e.target.closest('.line-btn');
    if (lineBtn && lineBtn.dataset.line) {
      // 引入并调用 setLine，此处需导入
      import('../ui/ui-drag.js').then(drag => drag.setLine(lineBtn.dataset.line.split(',').map(Number)));
      return;
    }
    const emptyDash = e.target.closest('.empty-dash');
    if (emptyDash && state.sel) {
      const card = findCardById(state.sel);
      if (card && !isCardPlaced(card)) {
        if (emptyDash.textContent.includes('体')) {
          import('../ui/ui-drag.js').then(drag => drag.placeCardOnTiYong(card, 'ti'));
        } else {
          import('../ui/ui-drag.js').then(drag => drag.placeCardOnTiYong(card, 'yong'));
        }
      }
      return;
    }
    const gong = e.target.closest('.gong');
    if (gong && state.sel) {
      const g = parseInt(gong.dataset.gong);
      const card = findCardById(state.sel);
      if (card && !isCardPlaced(card)) {
        import('../ui/ui-drag.js').then(drag => drag.placeCardOnGong(card, g));
      }
    }
  });

  // 触摸与鼠标拖拽事件
  document.addEventListener('touchstart', function(e) {
    const cardEl = e.target.closest('.card-back, .card-face-small');
    if (cardEl) startPress(e.touches[0].clientX, e.touches[0].clientY, cardEl);
  }, { passive: true });
  document.addEventListener('touchmove', function(e) {
    moveDrag(e.touches[0].clientX, e.touches[0].clientY, e);
  }, { passive: false });
  document.addEventListener('touchend', function(e) {
    endDrag(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
  });

  document.addEventListener('mousedown', function(e) {
    const cardEl = e.target.closest('.card-back, .card-face-small');
    if (cardEl) startPress(e.clientX, e.clientY, cardEl);
  });
  document.addEventListener('mousemove', function(e) { moveDrag(e.clientX, e.clientY, e); });
  document.addEventListener('mouseup', function(e) { endDrag(e.clientX, e.clientY); });

  // 提供商切换
  document.addEventListener('click', function(e) {
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
    // 点击模态框背景关闭
    const modalEl = document.getElementById('modal');
    if (e.target === modalEl && modalEl) modalEl.setAttribute('hidden', '');
  });

  // 键盘 ESC 关闭
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
}