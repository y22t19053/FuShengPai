// ===== src/ui/ui-modal.js · 弹窗、Toast、引导与分享 =====
import { state, $, $$, domToast, domModal, domModalContent, domSharePreview, domShareCanvas } from '../state.js';
import { SUITS, RANKS, API_PROVIDERS, getWuxing, getCardColor } from '../data.js';
import { calcYearPillar } from '../engine.js';
import { getApiSettings, getProfile, getHistory, deleteHistoryItem, saveApiSettings } from '../storage.js';
import { requestReading, testApiConnection } from '../ai.js';
import {
  UI_TEXTS, SHARE_TEXTS, SHARE_QUOTES, TIME_RESTRICTION,
  REFUSAL_TEXTS, ONBOARDING_STEPS, SIGN_LIBRARY
} from '../texts/index.js';
import { renderStep3 } from './ui-render.js';
import { generateInterpretation, buildAIPrompt } from '../ui.js';

export let toastTimer = null;
export function toast(msg, duration = 2000) { /* ...原代码复制... */ }

export function togglePanel(panelId) { /* ...原代码复制... */ }
export function showOnboarding() { /* ...原代码复制... */ }
export function renderOnboardStep() { /* ...原代码复制... */ }

export function guardMidnight(callback) { /* ...原代码复制... */ }

export function showDailyFortune() { /* ...原代码复制... */ }
export function showHistoryDetail(index) { /* ...原代码复制... */ }
export function generateShareCode() { /* ...原代码复制... */ }
export function importShareCode() { /* ...原代码复制... */ }
export function generateShareImage() { /* ...原代码复制... */ }
export function saveShareImage() { /* ...原代码复制... */ }