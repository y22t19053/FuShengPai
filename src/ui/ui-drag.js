// ===== src/ui/ui-drag.js · 长按、拖拽与放牌逻辑 =====
import { state, $, $$ } from '../state.js';
import { ALL_LINES, TIME_LABELS, GONG_NAMES, getCardId } from '../data.js';
import { UI_TEXTS } from '../texts/index.js';
import { toast } from './ui-modal.js';
import { refreshAll } from './ui-render.js';

export function selectCard(cardId) {
  if (!cardId) return;
  if (state.sel === cardId) { state.sel = null; refreshAll(); return; }
  const card = findCardById(cardId);
  if (!card || isCardPlaced(card)) { state.sel = null; refreshAll(); return; }
  state.sel = cardId; refreshAll();
  try { if (navigator.vibrate) navigator.vibrate(8); } catch (e) {}
}

export function isCardPlaced(card) {
  const id = getCardId(card);
  if (state.ti && getCardId(state.ti) === id) return true;
  if (state.yong && getCardId(state.yong) === id) return true;
  for (const g in state.grid) { if (state.grid[g] && state.grid[g].some(c => getCardId(c) === id)) return true; }
  return false;
}
export function findCardById(id) { return state.deck.find(c => getCardId(c) === id); }

export function placeCardOnGong(card, gong) { /* 保持原逻辑 */ }
export function placeCardOnTiYong(card, role) { /* 保持原逻辑 */ }

export function checkLines() { /* 保持原逻辑 */ }
export function setLine(line) { /* 保持原逻辑 */ }
export function renderLineSelector(candidates) { /* 保持原逻辑 */ }
export function removeLineSelector() { /* 保持原逻辑 */ }

// ================================================================
// 防冲突拖拽核心逻辑
// ================================================================
let longPressTimer = null;
let isLongPress = false;
let ghostCard = null;
let touchDragX = 0, touchDragY = 0;
let mouseDragX = 0, mouseDragY = 0;

export function startPress(clientX, clientY, cardEl) {
  if (!cardEl) return;
  const id = cardEl.dataset.cardid;
  const card = findCardById(id);
  if (!card || isCardPlaced(card)) return;
  selectCard(id); // 点按必响应
  isLongPress = false;
  clearTimeout(longPressTimer);
  longPressTimer = setTimeout(() => {
    isLongPress = true;
    ghostCard = cardEl.cloneNode(true);
    ghostCard.style.position = 'fixed';
    ghostCard.style.zIndex = 1000;
    ghostCard.style.pointerEvents = 'none';
    ghostCard.style.opacity = '0.7';
    ghostCard.style.width = cardEl.offsetWidth + 'px';
    ghostCard.style.height = cardEl.offsetHeight + 'px';
    document.body.appendChild(ghostCard);
    if (navigator.vibrate) navigator.vibrate(10);
  }, 250);
}

export function moveDrag(clientX, clientY, e) {
  if (isLongPress && ghostCard) {
    if (e && e.preventDefault) e.preventDefault();
    ghostCard.style.left = (clientX - ghostCard.offsetWidth / 2) + 'px';
    ghostCard.style.top = (clientY - ghostCard.offsetHeight / 2) + 'px';
  } else {
    const dx = clientX - touchDragX, dy = clientY - touchDragY;
    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
      clearTimeout(longPressTimer);
      isLongPress = true;
      const cardEl = document.elementFromPoint(touchDragX, touchDragY)?.closest('.card-back, .card-face-small');
      if (cardEl) {
        ghostCard = cardEl.cloneNode(true);
        ghostCard.style.position = 'fixed'; ghostCard.style.zIndex = 1000;
        ghostCard.style.pointerEvents = 'none'; ghostCard.style.opacity = '0.7';
        ghostCard.style.width = cardEl.offsetWidth + 'px'; ghostCard.style.height = cardEl.offsetHeight + 'px';
        document.body.appendChild(ghostCard);
      }
    }
  }
}

export function endDrag(clientX, clientY) {
  clearTimeout(longPressTimer);
  if (isLongPress && ghostCard) {
    const dropTarget = document.elementFromPoint(clientX, clientY);
    ghostCard.remove(); ghostCard = null;
    const gong = dropTarget?.closest('.gong');
    const emptyDash = dropTarget?.closest('.empty-dash');
    let placed = false;
    if (gong && state.sel) { const g = parseInt(gong.dataset.gong); const card = findCardById(state.sel); if (card && !isCardPlaced(card)) placed = placeCardOnGong(card, g); } 
    else if (emptyDash && state.sel) { const card = findCardById(state.sel); if (card && !isCardPlaced(card)) { if (emptyDash.textContent.includes('体')) placed = placeCardOnTiYong(card, 'ti'); else placed = placeCardOnTiYong(card, 'yong'); } }
    isLongPress = false; return;
  }
  isLongPress = false;
}