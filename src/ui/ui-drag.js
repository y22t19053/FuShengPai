// ===== src/ui/ui-drag.js · Pointer 事件处理 + 拖拽 + 天机线（完整版） =====
import { state } from '../state.js';
import { ALL_LINES, TIME_LABELS, GONG_NAMES, getCardId } from '../data.js';
import { calcDiff } from '../engine.js';
import { UI_TEXTS } from '../texts/index.js';
import { toast } from './ui-modal.js';
import { refreshAll } from './ui-render.js';

const pointerState = {
  down: false,
  moved: false,
  isClick: false,
  startX: 0,
  startY: 0,
  cardEl: null,
  moveTimer: null,
  ghostCard: null,
};

export function initDrag() {
  document.addEventListener('pointerdown', onPointerDown);
  document.addEventListener('pointermove', onPointerMove);
  document.addEventListener('pointerup', onPointerUp);
  document.addEventListener('pointercancel', onPointerUp);
}

export function destroyDrag() {
  document.removeEventListener('pointerdown', onPointerDown);
  document.removeEventListener('pointermove', onPointerMove);
  document.removeEventListener('pointerup', onPointerUp);
  document.removeEventListener('pointercancel', onPointerUp);
}

function highlightDropTargets(active) {
  document.querySelectorAll('.gong, .empty-dash').forEach(el => {
    el.classList.toggle('drag-highlight', active);
  });
}

function onPointerDown(e) {
  const cardEl = e.target.closest('.card-back, .card-face-small');
  if (!cardEl) return;
  const id = cardEl.dataset.cardid;
  const card = findCardById(id);
  if (!card || isCardPlaced(card)) return;

  pointerState.down = true;
  pointerState.moved = false;
  pointerState.isClick = true;
  pointerState.startX = e.clientX;
  pointerState.startY = e.clientY;
  pointerState.cardEl = cardEl;
  pointerState.ghostCard = null;

  // 200ms内没移动，视为点击选中
  pointerState.moveTimer = setTimeout(() => {
    if (!pointerState.moved && pointerState.down) {
      selectCard(cardEl.dataset.cardid);
      highlightDropTargets(true);
    }
  }, 200);
}

function onPointerMove(e) {
  if (!pointerState.down) return;
  const dx = e.clientX - pointerState.startX;
  const dy = e.clientY - pointerState.startY;
  if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
    pointerState.moved = true;
    pointerState.isClick = false;
    clearTimeout(pointerState.moveTimer);
    highlightDropTargets(true);
    if (!pointerState.ghostCard) {
      startGhostDrag(e.clientX, e.clientY);
    }
  }
  if (pointerState.ghostCard) {
    pointerState.ghostCard.style.left = (e.clientX - 30) + 'px';
    pointerState.ghostCard.style.top = (e.clientY - 40) + 'px';
  }
}

function onPointerUp(e) {
  clearTimeout(pointerState.moveTimer);
  highlightDropTargets(false);

  if (pointerState.ghostCard) {
    finishGhostDrag(e.clientX, e.clientY);
  } else if (pointerState.isClick && pointerState.down) {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const cardEl = el?.closest('.card-back, .card-face-small');
    if (cardEl) {
      selectCard(cardEl.dataset.cardid);
    }
  }

  pointerState.down = false;
  pointerState.moved = false;
  pointerState.isClick = false;
  pointerState.cardEl = null;
  pointerState.ghostCard = null;
}

function startGhostDrag(clientX, clientY) {
  const el = pointerState.cardEl;
  if (!el) return;
  const ghost = el.cloneNode(true);
  ghost.style.position = 'fixed';
  ghost.style.zIndex = 1000;
  ghost.style.pointerEvents = 'none';
  ghost.style.opacity = '0.7';
  ghost.style.width = el.offsetWidth + 'px';
  ghost.style.height = el.offsetHeight + 'px';
  ghost.style.left = (clientX - 30) + 'px';
  ghost.style.top = (clientY - 40) + 'px';
  document.body.appendChild(ghost);
  pointerState.ghostCard = ghost;
  if (navigator.vibrate) navigator.vibrate(10);
}

function finishGhostDrag(clientX, clientY) {
  if (pointerState.ghostCard) {
    pointerState.ghostCard.remove();
    pointerState.ghostCard = null;
  }

  const dropTarget = document.elementFromPoint(clientX, clientY);
  const gong = dropTarget?.closest('.gong');
  const emptyDash = dropTarget?.closest('.empty-dash');

  const cardId = pointerState.cardEl?.dataset.cardid;
  const card = findCardById(cardId);
  if (!card || isCardPlaced(card)) return;

  if (gong) {
    const g = parseInt(gong.dataset.gong);
    placeCardOnGong(card, g);
  } else if (emptyDash) {
    if (emptyDash.textContent.includes('体')) {
      placeCardOnTiYong(card, 'ti');
    } else {
      placeCardOnTiYong(card, 'yong');
    }
  }
}

// ===== 核心函数 =====
export function selectCard(cardId) {
  if (!cardId) return;
  if (state.sel === cardId) {
    state.sel = null;
    refreshAll();
    return;
  }
  const card = findCardById(cardId);
  if (!card || isCardPlaced(card)) {
    state.sel = null;
    refreshAll();
    return;
  }
  state.sel = cardId;
  refreshAll();
  try { if (navigator.vibrate) navigator.vibrate(8); } catch (e) {}
}

export function isCardPlaced(card) {
  const id = getCardId(card);
  if (state.ti && getCardId(state.ti) === id) return true;
  if (state.yong && getCardId(state.yong) === id) return true;
  for (const g in state.grid) {
    if (state.grid[g] && state.grid[g].some(c => getCardId(c) === id)) return true;
  }
  return false;
}

export function findCardById(id) {
  return state.deck.find(c => getCardId(c) === id);
}

export function placeCardOnGong(card, gong) {
  if (!card) return false;
  if (state.sealed) {
    toast('牌局已封印，不可修改');
    return false;
  }
  if (!state.grid[gong]) state.grid[gong] = [];
  state.grid[gong].push(card);
  state.deck = state.deck.filter(c => getCardId(c) !== getCardId(card));
  if (!state.gongOrder.includes(gong)) state.gongOrder.push(gong);
  state.sel = null;
  refreshAll();
  checkLines();
  const diff = calcDiff(gong, card);
  const gongName = GONG_NAMES[gong];
  const cardName = card.isJoker ? card.type : card.suit + card.rank;
  toast(`${gongName}宫(${gong}) - ${cardName} = 差值 ${diff}`, 1500);
  try { if (navigator.vibrate) navigator.vibrate(10); } catch (e) {}
  return true;
}

export function placeCardOnTiYong(card, role) {
  if (!card || card.isJoker) return false;
  if (state.sealed) {
    toast('牌局已封印，不可修改');
    return false;
  }
  if (role === 'ti' && state.ti) return false;
  if (role === 'yong' && state.yong) return false;
  state.deck = state.deck.filter(c => getCardId(c) !== getCardId(card));
  if (role === 'ti') state.ti = card;
  else state.yong = card;
  state.sel = null;
  refreshAll();
  try { if (navigator.vibrate) navigator.vibrate(10); } catch (e) {}
  return true;
}

// ===== 天机线（用户手动选择，不自动生成） =====
export function checkLines() {
  const filled = Object.keys(state.grid).filter(g => state.grid[g] && state.grid[g].length > 0).map(Number);
  const lines = ALL_LINES.filter(line => line.every(g => filled.includes(g)));
  state.possible = lines;

  if (lines.length >= 1 && !state.line) {
    renderLineSelector(lines);
  } else if (!lines.length) {
    removeLineSelector();
  }
}

export function setLine(line) {
  let orderedLine = line;
  if (state.gongOrder && state.gongOrder.length > 0) {
    const firstGong = state.gongOrder.find(g => line.includes(g));
    if (firstGong) {
      const idx = line.indexOf(firstGong);
      orderedLine = [...line.slice(idx), ...line.slice(0, idx)];
    }
  }
  state.line = orderedLine;
  const key = orderedLine.join(',');
  const tl = TIME_LABELS[key] || {};
  state.lineOrder = {};
  state.lineOrder[orderedLine[0]] = '起因';
  state.lineOrder[orderedLine[1]] = '经过';
  state.lineOrder[orderedLine[2]] = '结果';
  for (let g = 1; g <= 9; g++) {
    if (!state.lineOrder[g]) state.lineOrder[g] = tl[g] || '';
  }
  state.possible = [];
  removeLineSelector();
  refreshAll();
  toast(UI_TEXTS.toastLineConfirmed);
}

export function renderLineSelector(candidates) {
  removeLineSelector();

  const container = document.createElement('div');
  container.id = 'lineSelector';
  container.style.cssText = 'display:flex; flex-direction:column; align-items:center; gap:6px; margin:10px 0;';

  const hint = document.createElement('div');
  hint.style.cssText = 'font-size:0.75rem;color:var(--dim);text-align:center;';
  hint.textContent = '✨ 有宫位连成直线。选择一条作为天机线（可跳过）：';
  container.appendChild(hint);

  const btnGroup = document.createElement('div');
  btnGroup.style.cssText = 'display:flex; flex-wrap:wrap; gap:6px; justify-content:center;';

  candidates.forEach(line => {
    const btn = document.createElement('button');
    btn.className = 'line-btn small outline';
    btn.dataset.line = line.join(',');
    btn.textContent = `选：${line.map(g => GONG_NAMES[g]).join('→')}`;
    btnGroup.appendChild(btn);
  });

  const skipBtn = document.createElement('button');
  skipBtn.className = 'small';
  skipBtn.textContent = '跳过（不选天机线）';
  skipBtn.addEventListener('click', () => {
    removeLineSelector();
    toast('未选天机线，按整体九宫解读');
  });
  btnGroup.appendChild(skipBtn);

  container.appendChild(btnGroup);

  const gridArea = document.getElementById('gridArea');
  if (gridArea) gridArea.appendChild(container);
}

export function removeLineSelector() {
  const existing = document.getElementById('lineSelector');
  if (existing) existing.remove();
}

// ===== 封印 =====
export function sealDeck() {
  if (state.sealed) {
    toast('牌局已封印');
    return;
  }
  if (!state.ti || !state.yong || Object.keys(state.grid).length === 0) {
    toast('请先完成布阵');
    return;
  }
  state.sealed = true;
  state.sealedAt = Date.now();
  toast('🔒 牌局已封印，不可再修改');
  refreshAll();
}