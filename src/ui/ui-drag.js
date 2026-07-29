// ===== src/ui/ui-drag.js · 长按、拖拽与放牌逻辑 =====
import { state, $, $$ } from '../state.js';
import { ALL_LINES, TIME_LABELS, GONG_NAMES, getCardId, isCardPlaced, findCardById } from '../data.js';
import { UI_TEXTS, generateFullReading } from '../texts/index.js';
import { toast, refreshAll, renderTiYong, renderGrid } from './ui-render.js';
import { updateStep } from '../ui.js';

// 核心操作函数
export function selectCard(cardId) { /* ...原代码复制... */ }
export function placeCardOnGong(card, gong) { /* ...原代码复制... */ }
export function placeCardOnTiYong(card, role) { /* ...原代码复制... */ }
export function removeCardFromGong(gong) { /* ...原代码复制... */ }
export function checkLines() { /* ...原代码复制... */ }
export function setLine(line) { /* ...原代码复制... */ }
export function renderLineSelector(candidates) { /* ...原代码复制... */ }
export function removeLineSelector() { /* ...原代码复制... */ }

// 触摸与鼠标的拖拽状态变量
export let longPressTimer = null, isLongPress = false, ghostCard = null;
export let touchDragX = 0, touchDragY = 0, mouseDragX = 0, mouseDragY = 0;

export function startPress(clientX, clientY, cardEl) { /* ...原代码复制... */ }
export function moveDrag(clientX, clientY, e) { /* ...原代码复制... */ }
export function endDrag(clientX, clientY) { /* ...原代码复制... */ }