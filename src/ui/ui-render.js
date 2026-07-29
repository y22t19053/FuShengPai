// ===== src/ui/ui-render.js · 所有页面的绘制逻辑 =====
import { state, $, $$, domDynamic, domModal, domModalContent, domSharePreview, domShareCanvas } from '../state.js';
import { GONG_ORDER, GONG_NAMES, GONG_WUXING, CATEGORIES } from '../data.js';
import { calcDiff, getWangState, getWuxing, getCardColor, getCardId, getCardValue } from '../data.js';
import { shuffle, drawTiYong, calcFullBaZi, calcYearPillar, getTimeLabels } from '../engine.js';
import { getApiSettings, getProfile, getHistory } from '../storage.js';
import {
  UI_TEXTS, TUTORIAL_TEXTS, PHYSICAL_GUIDE, SHARE_TEXTS,
  HISTORY_EMPTY, AI_GUIDE_TEXT, ONBOARDING_STEPS, generateFullReading,
  TIME_RESTRICTION
} from '../texts/index.js';
import { isCardPlaced, selectCard, placeCardOnGong, placeCardOnTiYong, resetGrid, checkLines } from './ui-drag.js';
import { toast, togglePanel } from './ui-modal.js';
import { localInterpretation, generateInterpretation } from '../ui.js'; // 注意：需要在之后把 generateInterpretation 移到核心 UI 层，暂时这样循环引用

export function renderTeachingPanel() { /* ...原代码复制... */ }
export function renderDeck() { /* ...原代码复制，注意移除 drag 和 scroll 的绑定，这些放到 ui-drag.js 处理... */ }
export function renderTiYong() { /* ...原代码复制... */ }
export function renderGrid() { /* ...原代码复制... */ }
export function refreshAll() { renderDeck(); renderTiYong(); renderGrid(); }

export function renderStep1() { /* ...原代码复制... */ }
export function renderStep2() { /* ...原代码复制... */ }
export function renderStep3(text) { /* ...原代码复制... */ }

export function initSettingsPanel() { /* ...原代码复制... */ }
export function initProfilePanel() { /* ...原代码复制... */ }
export function renderHistoryPanel() { /* ...原代码复制... */ }
export function updateDailySignDisplay(sign) { /* ...原代码复制... */ }