// ===== src/ui/ui-drag.js · 选牌与布阵交互（点击选牌 + 拖拽放置 + 高亮提示） =====
import { state } from '../state.js';
import {
  GONG_NAMES, ALL_LINES, TIME_LABELS, getCardId
} from '../data.js';
import { toast } from './ui-modal.js';
import { refreshAll } from './ui-render.js';

// ---------- 内部工具 ----------
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
export function placeCardOnTiYong(card, slot) {
  if (!card || !slot) { toast('未选中有效牌'); return; }
  if (state.sealed) { toast('牌局已封印，不可改动'); return; }

  if (isCardPlaced(card)) { toast('这张牌已经下过，请选别的'); return; }

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
  toast(slot === 'ti' ? '🪷 你已落位 · 本我之象' : '🎯 所问之事已定 · 事之象');
}

// ---------- 放置到九宫格 ----------
export function placeCardOnGong(card, gong) {
  if (!card || !gong) { toast('未选中有效牌'); return; }
  if (state.sealed) { toast('牌局已封印，不可改动'); return; }
  if (gong < 1 || gong > 9) { toast('无效宫位'); return; }

  if (isCardPlaced(card)) { toast('这张牌已经下过，请选别的'); return; }

  if (state.grid[gong] && state.grid[gong].length >= 3) {
    toast('此宫已满（最多3张），请换一宫');
    return;
  }

  removeFromDeck(card);
  if (!state.grid[gong]) state.grid[gong] = [];
  state.grid[gong].push(card);

  state.sel = null;
  updateLine();
  refreshAll();
  toast(`✦ ${GONG_NAMES[gong]}宫 · 一子落定，万象生`);
}

// ---------- 手动设置天机线 ----------
export function setLine(lineArray) {
  if (!lineArray || !Array.isArray(lineArray) || lineArray.length !== 3) return;
  if (state.sealed) { toast('牌局已封印，不可改动'); return; }

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
  toast('✨ 天机线已连起');
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
    toast('✨ 自动连成天机线');
  } else {
    state.line = null;
    state.lineOrder = {};
  }
}

// ---------- 封印牌局 ----------
export function sealDeck() {
  if (!state.ti || !state.yong) { toast('请先选好体用'); return; }
  state.sealed = true;
  state.sel = null;
  refreshAll();
  toast('🔒 牌局已封印，不可再改动');
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

  // 长按震动（可选反馈）
  let pressTimer = null;
  document.addEventListener('touchstart', function(e) {
    const cardEl = e.target.closest('.card-back, .card-face-small');
    if (!cardEl || !cardEl.dataset.cardid) return;
    const card = findCardById(cardEl.dataset.cardid);
    if (!card || isCardPlaced(card)) return;
    pressTimer = setTimeout(() => {
      if (navigator.vibrate) navigator.vibrate(15);
    }, 250);
  }, { passive: true });

  document.addEventListener('touchend', function() {
    clearTimeout(pressTimer);
  }, { passive: true });

  document.addEventListener('touchmove', function() {
    clearTimeout(pressTimer);
  }, { passive: true });

  // ===== 桌面端拖拽（通过 dataTransfer 传递卡牌 ID） =====
  document.addEventListener('dragstart', function(e) {
    const cardEl = e.target.closest('.card-back, .card-face-small');
    if (!cardEl || !cardEl.dataset.cardid) return;
    const card = findCardById(cardEl.dataset.cardid);
    if (!card || isCardPlaced(card)) return;
    e.dataTransfer.setData('text/plain', cardEl.dataset.cardid);
    e.dataTransfer.effectAllowed = 'move';
  });

  document.addEventListener('dragover', function(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  });

  // 高亮提示
  let lastHighlightEl = null;
  function clearHighlight() {
    if (lastHighlightEl) {
      lastHighlightEl.style.boxShadow = '';
      lastHighlightEl.style.borderColor = '';
      lastHighlightEl.style.filter = '';
      lastHighlightEl = null;
    }
  }

  document.addEventListener('dragenter', function(e) {
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
    const cardId = e.dataTransfer.getData('text/plain');
    if (!cardId) return;
    const card = findCardById(cardId);
    if (!card || isCardPlaced(card)) return;

    // 目标：体用槽
    const emptyDash = e.target.closest('.empty-dash');
    if (emptyDash) {
      if (emptyDash.textContent.includes('你')) placeCardOnTiYong(card, 'ti');
      else placeCardOnTiYong(card, 'yong');
      return;
    }
    // 目标：九宫格
    const gong = e.target.closest('.gong');
    if (gong) {
      const g = parseInt(gong.dataset.gong);
      placeCardOnGong(card, g);
      return;
    }
    // 没有落在有效位置，自动回到选中态
    state.sel = cardId;
    refreshAll();
    toast('再试一次：拖到「你」或九宫格上');
  });

  document.addEventListener('dragend', function() {
    clearHighlight();
  });
}