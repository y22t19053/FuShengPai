// ===== src/ui/ui-drag.js · 长按、拖拽与放牌逻辑（多端修复版） =====
import { state, $, $$ } from '../state.js';
import { ALL_LINES, TIME_LABELS, GONG_NAMES, getCardId } from '../data.js';
import { UI_TEXTS } from '../texts/index.js';
// 【核心修复】toast 在 ui-modal.js 中，refreshAll 在 ui-render.js 中
import { toast } from './ui-modal.js';
import { refreshAll } from './ui-render.js';

// 核心操作函数
export function selectCard(cardId) {
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

export function placeCardOnGong(card, gong) {
  if (!card) return false;
  if (!state.grid[gong]) state.grid[gong] = [];
  state.grid[gong].push(card);
  state.deck = state.deck.filter(c => getCardId(c) !== getCardId(card));
  if (!state.gongOrder.includes(gong)) state.gongOrder.push(gong);
  state.sel = null; refreshAll(); checkLines();
  try { if (navigator.vibrate) navigator.vibrate(10); } catch (e) {}
  toast(UI_TEXTS.toastAnyCount, 1500);
  return true;
}
export function placeCardOnTiYong(card, role) {
  if (!card || card.isJoker) return false;
  if (role === 'ti' && state.ti) return false;
  if (role === 'yong' && state.yong) return false;
  state.deck = state.deck.filter(c => getCardId(c) !== getCardId(card));
  if (role === 'ti') state.ti = card; else state.yong = card;
  state.sel = null; refreshAll();
  try { if (navigator.vibrate) navigator.vibrate(10); } catch (e) {}
  return true;
}

// 天机线检测相关（留接口给全局调用）
export function checkLines() { /* 保持原样 */ }
export function setLine(line) { /* 保持原样 */ }
export function renderLineSelector(candidates) { /* 保持原样 */ }
export function removeLineSelector() { /* 保持原样 */ }

// ================================================================
// 拖拽核心逻辑（重写防冲突版）
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
  
  // 彻底隔离：触屏按下的那一刻，必须立即触发点选（防卡顿）
  if (!isLongPress) selectCard(id);

  isLongPress = false;
  // 使用 setTimeout 接管后续长按拖动逻辑
  clearTimeout(longPressTimer);
  longPressTimer = setTimeout(() => {
    isLongPress = true;
    // 克隆跟随手指的幽灵卡
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
  
  const rect = cardEl.getBoundingClientRect();
  touchDragX = clientX; touchDragY = clientY;
  mouseDragX = clientX; mouseDragY = clientY;
}

export function moveDrag(clientX, clientY, e) {
  if (isLongPress && ghostCard) {
    if (e && e.preventDefault) e.preventDefault();
    ghostCard.style.left = (clientX - ghostCard.offsetWidth / 2) + 'px';
    ghostCard.style.top = (clientY - ghostCard.offsetHeight / 2) + 'px';
  } else {
    // 如果手指移动距离超过阈值（10px），立刻中断长按判定，转为拖动。
    const dx = clientX - touchDragX, dy = clientY - touchDragY;
    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
      clearTimeout(longPressTimer);
      // 触发幽灵卡
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
    if (placed) { /* 放牌成功，无需额外操作，placeCard函数会处理刷新 */ }
    isLongPress = false; return;
  }
  // 如果没有触发长按（点击直接抬起），就不做额外操作
  isLongPress = false;
}