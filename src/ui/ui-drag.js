// ===== src/ui/ui-drag.js · 长按、拖拽与放牌逻辑 =====
import { state, $, $$ } from '../state.js';
import { ALL_LINES, TIME_LABELS, GONG_NAMES, getCardId } from '../data.js';
import { calcDiff } from '../engine.js';
import { UI_TEXTS } from '../texts/index.js';
import { toast } from './ui-modal.js';
import { refreshAll } from './ui-render.js';

const isTouchDevice = window.matchMedia('(pointer: coarse)').matches;

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

export function placeCardOnGong(card, gong) {
  if (!card) return false;
  if (!state.grid[gong]) state.grid[gong] = [];
  state.grid[gong].push(card);
  state.deck = state.deck.filter(c => getCardId(c) !== getCardId(card));
  if (!state.gongOrder.includes(gong)) state.gongOrder.push(gong);
  state.sel = null; refreshAll(); checkLines();
  const diff = calcDiff(gong, card);
  const gongName = GONG_NAMES[gong];
  const cardName = card.isJoker ? card.type : card.suit + card.rank;
  toast(`${gongName}宫(${gong}) - ${cardName} = 差值 ${diff}`, 2000);
  try { if (navigator.vibrate) navigator.vibrate(10); } catch (e) {}
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

// ---- 天机线相关函数（补齐） ----
export function checkLines() {
  // 检查是否有天机线，并存储到 state.possible
  const filled = Object.keys(state.grid).filter(g => state.grid[g] && state.grid[g].length > 0).map(Number);
  state.possible = ALL_LINES.filter(line => line.every(g => filled.includes(g)));
  if (state.possible.length === 1) {
    setLine(state.possible[0]);
  } else if (state.possible.length > 1) {
    renderLineSelector(state.possible);
  } else {
    removeLineSelector();
  }
}

export function setLine(line) {
  state.line = line;
  const key = line.join(',');
  const tl = TIME_LABELS[key] || {};
  state.lineOrder = {};
  state.lineOrder[line[0]] = '起因';
  state.lineOrder[line[1]] = '经过';
  state.lineOrder[line[2]] = '结果';
  for (let g = 1; g <= 9; g++) {
    if (!state.lineOrder[g]) state.lineOrder[g] = tl[g] || '';
  }
  state.possible = [];
  removeLineSelector();
  refreshAll();
  toast(UI_TEXTS.toastLineConfirmed);
}

export function renderLineSelector(candidates) {
  // 移除旧的选择器
  removeLineSelector();
  const container = document.createElement('div');
  container.id = 'lineSelector';
  container.style.cssText = 'display:flex; gap:10px; justify-content:center; margin:10px 0; flex-wrap:wrap;';
  candidates.forEach(line => {
    const btn = document.createElement('button');
    btn.className = 'line-btn small outline';
    btn.dataset.line = line.join(',');
    btn.textContent = `天机线：${line.map(g => GONG_NAMES[g]).join('→')}`;
    container.appendChild(btn);
  });
  const gridArea = document.getElementById('gridArea');
  if (gridArea) gridArea.appendChild(container);
}

export function removeLineSelector() {
  const existing = document.getElementById('lineSelector');
  if (existing) existing.remove();
}

// ---- 拖拽逻辑 ----
let longPressTimer = null; let isLongPress = false; let ghostCard = null;
let touchDragX = 0, touchDragY = 0; let mouseDragX = 0, mouseDragY = 0;

export function startPress(clientX, clientY, cardEl) {
  if (!cardEl) return;
  const id = cardEl.dataset.cardid; const card = findCardById(id);
  if (!card || isCardPlaced(card)) return;
  
  if (isTouchDevice) {
    selectCard(id);
    return;
  }

  selectCard(id);
  isLongPress = false; clearTimeout(longPressTimer);
  longPressTimer = setTimeout(() => {
    isLongPress = true; ghostCard = cardEl.cloneNode(true);
    ghostCard.style.position = 'fixed'; ghostCard.style.zIndex = 1000; ghostCard.style.pointerEvents = 'none';
    ghostCard.style.opacity = '0.7'; ghostCard.style.width = cardEl.offsetWidth + 'px'; ghostCard.style.height = cardEl.offsetHeight + 'px';
    document.body.appendChild(ghostCard);
    if (navigator.vibrate) navigator.vibrate(10);
  }, 250);
}

export function moveDrag(clientX, clientY, e) {
  if (isTouchDevice) return;
  
  if (isLongPress && ghostCard) {
    if (e && e.preventDefault) e.preventDefault();
    ghostCard.style.left = (clientX - ghostCard.offsetWidth / 2) + 'px';
    ghostCard.style.top = (clientY - ghostCard.offsetHeight / 2) + 'px';
  } else {
    const dx = clientX - touchDragX, dy = clientY - touchDragY;
    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
      clearTimeout(longPressTimer); isLongPress = true;
      const cardEl = document.elementFromPoint(touchDragX, touchDragY)?.closest('.card-back, .card-face-small');
      if (cardEl) {
        ghostCard = cardEl.cloneNode(true); ghostCard.style.position = 'fixed'; ghostCard.style.zIndex = 1000;
        ghostCard.style.pointerEvents = 'none'; ghostCard.style.opacity = '0.7';
        ghostCard.style.width = cardEl.offsetWidth + 'px'; ghostCard.style.height = cardEl.offsetHeight + 'px';
        document.body.appendChild(ghostCard);
      }
    }
  }
}

export function endDrag(clientX, clientY) {
  clearTimeout(longPressTimer);
  if (isTouchDevice) {
    if (ghostCard) ghostCard.remove();
    isLongPress = false; ghostCard = null;
    return;
  }
  
  if (isLongPress && ghostCard) {
    const dropTarget = document.elementFromPoint(clientX, clientY);
    ghostCard.remove(); ghostCard = null;
    const gong = dropTarget?.closest('.gong'); const emptyDash = dropTarget?.closest('.empty-dash');
    let placed = false;
    if (gong && state.sel) { const g = parseInt(gong.dataset.gong); const card = findCardById(state.sel); if (card && !isCardPlaced(card)) placed = placeCardOnGong(card, g); } 
    else if (emptyDash && state.sel) { const card = findCardById(state.sel); if (card && !isCardPlaced(card)) { if (emptyDash.textContent.includes('体')) placed = placeCardOnTiYong(card, 'ti'); else placed = placeCardOnTiYong(card, 'yong'); } }
    isLongPress = false; return;
  }
  isLongPress = false;
}