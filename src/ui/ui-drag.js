// ===== src/ui/ui-drag.js · 长按、拖拽与放牌逻辑 =====
import { state, $, $$ } from '../state.js';
import { ALL_LINES, TIME_LABELS, GONG_NAMES, getCardId } from '../data.js';
import { UI_TEXTS } from '../texts/index.js';
import { toast } from './ui-modal.js';
import { refreshAll } from './ui-render.js';

const isTouchDevice = window.matchMedia('(pointer: coarse)').matches;

export function selectCard(cardId) { /* 保持不变 */ }
export function isCardPlaced(card) { /* 保持不变 */ }
export function findCardById(id) { return state.deck.find(c => getCardId(c) === id); }

export function placeCardOnGong(card, gong) {
  if (!card) return false;
  if (!state.grid[gong]) state.grid[gong] = [];
  state.grid[gong].push(card);
  state.deck = state.deck.filter(c => getCardId(c) !== getCardId(card));
  if (!state.gongOrder.includes(gong)) state.gongOrder.push(gong);
  state.sel = null; refreshAll(); checkLines();
  try { if (navigator.vibrate) navigator.vibrate(10); } catch (e) {}
  // 【修复】合并差值 Toast 和落牌 Toast，替换原本独立的落牌提示
  const diff = calcDiff(gong, card);
  const gongName = GONG_NAMES[gong];
  const cardName = card.isJoker ? card.type : card.suit + card.rank;
  toast(`${gongName}宫(${gong}) - ${cardName} = 差值 ${diff}`, 2000);
  return true;
}
export function placeCardOnTiYong(card, role) { /* 保持不变 */ }

export function checkLines() { /* 保持不变 */ }
export function setLine(line) { /* 保持不变 */ }
export function renderLineSelector(candidates) { /* 保持不变 */ }
export function removeLineSelector() { /* 保持不变 */ }

let longPressTimer = null; let isLongPress = false; let ghostCard = null;
let touchDragX = 0, touchDragY = 0; let mouseDragX = 0, mouseDragY = 0;

export function startPress(clientX, clientY, cardEl) { /* 保持不变 */ }
export function moveDrag(clientX, clientY, e) { /* 保持不变 */ }
export function endDrag(clientX, clientY) { /* 保持不变 */ }