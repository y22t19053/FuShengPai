// ===== src/ui/ui-drag.js · 选牌与布阵交互（点击选牌 + 拖拽放置 + 高亮提示） =====
import { state } from '../state.js';
import {
  GONG_NAMES, ALL_LINES, TIME_LABELS, getCardId
} from '../data.js';
import { toast } from './ui-modal.js';
import { refreshAll } from './ui-render.js';

// ---------- 内部工具 ----------
// 落牌翻转反馈：给目标区域最近放置的牌播放翻牌动画
function flipFeedback(selector) {
  const el = document.querySelector(selector);
  if (el) {
    el.classList.remove('card-flipping');
    void el.offsetWidth; // 强制 reflow，重启动画
    el.classList.add('card-flipping');
  }
}

function removeFromDeck(card) {
  const id = getCardId(card);
  state.deck = state.deck.filter(c => getCardId(c) !== id);
}

function addToDeck(card) {
  if (!card) return;
  state.deck.push(card);
}

// ---------- 检查牌是否已被放置 ----------
export function isCardPlaced(card) {
  if (!card) return false;
  const id = getCardId(card);
  if (state.ti && getCardId(state.ti) === id) return true;
  if (state.yong && getCardId(state.yong) === id) return true;
  for (const g in state.grid) {
    if (state.grid[g].some(slotCard => getCardId(slotCard) === id)) return true;
  }
  return false;
}

// ---------- 根据 ID 查找牌 ----------
export function findCardById(id) {
  if (!id) return null;
  return state.deck.find(c => getCardId(c) === id) || null;
}

// ---------- 放置到「你」（体） ----------
export function placeCardOnTiYong(card, slot, silent = false) {
  if (!card || !slot) { toast('未选中有效牌', 2000, 'warning'); return; }
  if (state.sealed) { toast('牌局已封印，不可改动', 2000, 'warning'); return; }

  if (isCardPlaced(card)) { toast('这张牌已经下过，请选别的', 2000, 'warning'); return; }

  const existing = slot === 'ti' ? state.ti : state.yong;
  if (existing) {
    addToDeck(existing);
    if (slot === 'ti') state.ti = null;
    else state.yong = null;
  }

  removeFromDeck(card);
  if (slot === 'ti') state.ti = card;
  else state.yong = card;

  state.sel = null;
  refreshAll();
  flipFeedback(`#${slot === 'ti' ? 'tiSlot' : 'yongSlot'} .mini-card`);
  if (!silent) toast(slot === 'ti' ? '🪷 你已落位' : '🎯 所问之事已定');
}

// ---------- 放置到九宫格 ----------
export function placeCardOnGong(card, gong, silent = false) {
  if (!card || !gong) { toast('未选中有效牌', 2000, 'warning'); return; }
  if (state.sealed) { toast('牌局已封印，不可改动', 2000, 'warning'); return; }
  if (gong < 1 || gong > 9) { toast('无效宫位', 2000, 'warning'); return; }

  if (isCardPlaced(card)) { toast('这张牌已经下过，请选别的', 2000, 'warning'); return; }

  if (state.grid[gong] && state.grid[gong].length >= 3) {
    toast('此宫已满（最多3张），请换一宫', 2000, 'warning');
    return;
  }

  removeFromDeck(card);
  if (!state.grid[gong]) state.grid[gong] = [];
  state.grid[gong].push(card);

  state.sel = null;
  updateLine();
  refreshAll();
  flipFeedback(`.gong[data-gong="${gong}"] .card-stack`);
  if (!silent) toast(`✦ ${GONG_NAMES[gong]}宫 · 一子落定`);
}

// ---------- 手动设置天机线 ----------
export function setLine(lineArray) {
  if (!lineArray || !Array.isArray(lineArray) || lineArray.length !== 3) return;
  if (state.sealed) { toast('牌局已封印，不可改动', 2000, 'warning'); return; }

  state.line = [...lineArray];
  state.lineOrder = {};
  const key = lineArray.join(',');
  const tl = TIME_LABELS[key] || {};
  state.lineOrder[lineArray[0]] = '起因';
  state.lineOrder[lineArray[1]] = '经过';
  state.lineOrder[lineArray[2]] = '结果';
  for (let g = 1; g <= 9; g++) {
    if (!state.lineOrder[g]) state.lineOrder[g] = tl[g] || '';
  }
  refreshAll();
  toast('✨ 天机线已连起——这是你亲手选出的那条线，顺着它看下去', 2400, 'success');
}

// ---------- 自动计算天机线（内部） ----------
function updateLine() {
  if (state.line) return;

  const filled = ALL_LINES.filter(line => {
    return line.every(g => (state.grid[g] && state.grid[g].length > 0));
  });

  if (filled.length > 0) {
    const chosen = filled[0];
    state.line = [...chosen];
    state.lineOrder = {};
    const key = chosen.join(',');
    const tl = TIME_LABELS[key] || {};
    state.lineOrder[chosen[0]] = '起因';
    state.lineOrder[chosen[1]] = '经过';
    state.lineOrder[chosen[2]] = '结果';
    for (let g = 1; g <= 9; g++) {
      if (!state.lineOrder[g]) state.lineOrder[g] = tl[g] || '';
    }
    toast('✨ 天机线自动成形——牌是你摆的，线也是你的选择', 2400, 'success');
  } else {
    state.line = null;
    state.lineOrder = {};
  }
}

// ---------- 封印牌局 ----------
export function sealDeck() {
  if (!state.ti || !state.yong) { toast('请先选好体用', 2200, 'warning'); return; }
  state.sealed = true;
  state.sel = null;
  refreshAll();
  toast('🔒 牌局已封印，不可再改动', 2400, 'success');
}

// ---------- 移除线选择器（如果有） ----------
export function removeLineSelector() {
  const selector = document.getElementById('lineSelector');
  if (selector) selector.remove();
}

// ---------- 初始化交互（点选 + 拖拽 + 高亮 + 长按震动） ----------
let dragInitialized = false;
export function initDrag() {
  if (dragInitialized) return;
  dragInitialized = true;

  let pressTimer = null;
  let draggingCardId = null;
  let pointerActive = false;
  let lastHighlightEl = null;
  let swipeStartX = null;
  let swipeStartY = null;

  function clearHighlight() {
    if (lastHighlightEl) {
      lastHighlightEl.style.boxShadow = '';
      lastHighlightEl.style.borderColor = '';
      lastHighlightEl.style.filter = '';
      lastHighlightEl = null;
    }
  }

  function getCardFromElement(el) {
    if (!el || !el.dataset.cardid) return null;
    const card = findCardById(el.dataset.cardid);
    if (!card || isCardPlaced(card)) return null;
    return card;
  }

  function handleDrop(target, cardId) {
    if (!cardId) return;
    const card = findCardById(cardId);
    if (!card || isCardPlaced(card)) return;

    const emptyDash = target.closest('.empty-dash');
    if (emptyDash) {
      if (emptyDash.textContent.includes('你')) placeCardOnTiYong(card, 'ti');
      else placeCardOnTiYong(card, 'yong');
      return;
    }

    const gong = target.closest('.gong');
    if (gong) {
      const g = parseInt(gong.dataset.gong);
      placeCardOnGong(card, g);
      return;
    }

    state.sel = cardId;
    refreshAll();
    toast('再试一次：拖到「你」或九宫格上', 2200, 'warning');
  }

  document.addEventListener('touchstart', function(e) {
    const cardEl = e.target.closest('.card-back, .card-face-small');
    const card = getCardFromElement(cardEl);
    if (!card) return;
    pointerActive = true;
    draggingCardId = cardEl.dataset.cardid;
    swipeStartX = e.touches[0]?.clientX ?? null;
    swipeStartY = e.touches[0]?.clientY ?? null;
    pressTimer = setTimeout(() => {
      if (navigator.vibrate) navigator.vibrate(15);
      cardEl.classList.add('dragging');
    }, 220);
  }, { passive: true });

  document.addEventListener('touchend', function(e) {
    clearTimeout(pressTimer);
    if (!pointerActive || !draggingCardId) return;
    pointerActive = false;
    const cardEl = document.querySelector(`[data-cardid="${draggingCardId}"]`);
    cardEl?.classList.remove('dragging');
    const deltaX = (e.changedTouches?.[0]?.clientX ?? swipeStartX) - (swipeStartX ?? 0);
    const deltaY = (e.changedTouches?.[0]?.clientY ?? swipeStartY) - (swipeStartY ?? 0);
    const dropTarget = e.target.closest('.empty-dash, .gong');
    if (dropTarget && Math.abs(deltaX) < 24 && Math.abs(deltaY) < 24) handleDrop(e.target, draggingCardId);
    draggingCardId = null;
    swipeStartX = null;
    swipeStartY = null;
    clearHighlight();
  }, { passive: true });

  document.addEventListener('touchmove', function(e) {
    clearTimeout(pressTimer);
    const cardEl = document.querySelector(`[data-cardid="${draggingCardId}"]`);
    if (cardEl) cardEl.classList.add('dragging');
    if (swipeStartX !== null && swipeStartY !== null) {
      const dx = e.touches[0].clientX - swipeStartX;
      const dy = e.touches[0].clientY - swipeStartY;
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) {
        e.preventDefault();
      }
    }
  }, { passive: false });

  document.addEventListener('dragstart', function(e) {
    const cardEl = e.target.closest('.card-back, .card-face-small');
    const card = getCardFromElement(cardEl);
    if (!card) return;
    draggingCardId = cardEl.dataset.cardid;
    e.dataTransfer.setData('text/plain', cardEl.dataset.cardid);
    e.dataTransfer.effectAllowed = 'move';
  });

  document.addEventListener('dragover', function(e) {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    const target = e.target.closest('.empty-dash, .gong');
    if (target) {
      clearHighlight();
      target.style.boxShadow = '0 0 16px 4px rgba(201,160,96,0.5)';
      target.style.borderColor = '#c9a060';
      lastHighlightEl = target;
    }
  });

  document.addEventListener('dragleave', function(e) {
    const target = e.target.closest('.empty-dash, .gong');
    if (target && target === lastHighlightEl) {
      clearHighlight();
    }
  });

  document.addEventListener('drop', function(e) {
    e.preventDefault();
    clearHighlight();
    const cardId = e.dataTransfer?.getData('text/plain') || draggingCardId;
    if (!cardId) return;
    handleDrop(e.target, cardId);
    draggingCardId = null;
  });

  document.addEventListener('dragend', function() {
    clearHighlight();
    draggingCardId = null;
  });
}