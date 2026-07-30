// ===== src/ui/ui-render.js · 所有页面的绘制逻辑 =====
import { state, $, $$ } from '../state.js';
// 【关键修复】引入分栏后的独立 DOM 容器
import { domCore, domResult } from '../domCache.js';
import { GONG_ORDER, GONG_NAMES, GONG_WUXING, CATEGORIES, getShengKe, getShengKeLabel } from '../data.js';
import { getWangState, getWuxing, getCardColor, getCardId, getCardValue, SUITS, RANKS } from '../data.js';
import { shuffle, drawTiYong, calcFullBaZi, calcYearPillar, getTimeLabels, calcDiff } from '../engine.js';
import { getApiSettings, getProfile, getHistory } from '../storage.js';
import { UI_TEXTS, TUTORIAL_TEXTS, PHYSICAL_GUIDE, SHARE_TEXTS, HISTORY_EMPTY, AI_GUIDE_TEXT, ONBOARDING_STEPS, generateFullReading } from '../texts/index.js';
import { toast } from './ui-modal.js';
import { isCardPlaced } from './ui-drag.js';

export const escapeHtml = (str) => { const div = document.createElement('div'); div.textContent = str; return div.innerHTML; };

export function renderTeachingPanel() { /* 保持原样 */ }
export function renderDeck() { /* 保持原样 */ }
export function renderTiYong() { /* 保持原样 */ }
export function renderGrid() { /* 保持原样 */ }
export function refreshAll() { renderDeck(); renderTiYong(); renderGrid(); }

export function renderStep1() {
  const today = new Date().toDateString();
  const storedDate = localStorage.getItem('fs_todays_sign_date');
  const storedSign = localStorage.getItem('fs_todays_sign');
  let sign = null;
  if (storedDate === today && storedSign) { try { sign = JSON.parse(storedSign); } catch(e) {} }

  let dailyHTML = `<div style="color:var(--dim);font-size:0.8rem;">今日状态</div>`;
  if (sign) {
    const colorCls = getCardColor(sign);
    const rank = sign.isJoker ? sign.type : sign.rank;
    const suit = sign.isJoker ? '' : sign.suit;
    dailyHTML += `
      <div class="card-face-small ${colorCls}" style="margin:8px auto;width:70px;height:100px;display:flex;align-items:center;justify-content:center;flex-direction:column;border-radius:6px;border:1px solid rgba(255,255,255,0.1);background:rgba(0,0,0,0.3);">
        <span class="rank" style="font-size:1.8rem;font-weight:bold;">${rank}</span>
        <span class="suit" style="font-size:1.2rem;">${suit}</span>
      </div>
      <div style="font-size:0.8rem;color:#aaa;margin-bottom:4px;">今日启示：${sign.quote || '静观其变'}</div>
      <button data-action="dailyFortune" class="small outline">重新抽牌</button>
    `;
  } else {
    dailyHTML += `
      <div style="font-size:1.4rem;color:var(--accent);margin:8px 0;">待观测</div>
      <button data-action="dailyFortune" class="small outline">获取今日状态</button>
    `;
  }

  // 【关键修复】写入中栏 domCore，而不是覆盖整个父容器
  domCore.innerHTML = `<div class="panel">
    <div id="dailySignCard" style="margin-bottom:20px;background:rgba(255,255,255,0.02);border-radius:8px;padding:16px;text-align:center;border:1px solid rgba(255,255,255,0.05);">${dailyHTML}</div>
    <h3 style="margin-top:0;">${UI_TEXTS.step1}</h3>
    <div class="guide-tip">默念问题（也可不写），选个领域。也可导入朋友的分享码。</div>
    <input type="text" id="questionInput" placeholder="${UI_TEXTS.placeholderQuestion}" autocomplete="off" value="${escapeHtml(state.question)}">
    <div class="category-grid">${CATEGORIES.map(c => `<button data-action="selectCategory" data-category="${c}" class="${state.category === c ? 'selected' : ''}">${c}</button>`).join('')}</div>
    <div class="btn-row">
      <button data-action="confirmQuestion" class="primary">${UI_TEXTS.btnStartDraw}</button>
      <button data-action="manualEntry" class="outline">${UI_TEXTS.btnManual}</button>
      <button data-action="lazyStart" class="outline">${UI_TEXTS.btnLazy}</button>
    </div>
    <div class="import-row btn-row">
      <input type="text" id="importCode" placeholder="${UI_TEXTS.placeholderImport}" autocomplete="off" style="flex:1;">
      <button data-action="importCode" class="small outline">${UI_TEXTS.btnImport}</button>
      <button data-action="dailyFortune" class="small outline">${UI_TEXTS.btnDailyFortune}</button>
    </div>
  </div>`;
}

export function renderStep2() {
  // 【关键修复】写入中栏 domCore
  domCore.innerHTML = `<div class="panel"><h3>${state.manualMode ? '手动录入 · 明牌选阵' : '立极·布阵'}</h3><div class="guide-tip">${state.manualMode ? UI_TEXTS.guideManual : UI_TEXTS.guideSelectTiYong}</div><div class="tiyong-bar" id="tiyongBar"></div><div class="deck-grid" id="deckContainer"></div><div class="btn-row" style="display:flex; flex-wrap:wrap; gap:6px; justify-content:center; align-items:center;">
      <button id="scrollLeftBtn" class="outline small">‹ 选牌</button>
      <button data-action="resetStep2" class="outline small">重置选牌</button>
      ${state.manualMode ? '' : '<button id="btnConfirmTY" disabled data-action="confirmTiYong" class="small primary">' + UI_TEXTS.btnConfirmTiYong + '</button>'}
      <button id="scrollRightBtn" class="outline small">选牌 ›</button>
      ${state.manualMode ? '<button data-action="generateInterpretation" class="small primary">' + UI_TEXTS.btnInterpret + '</button>' : ''}
    </div><div id="gridArea" ${state.manualMode ? '' : 'style="display:none"' }><div class="guide-tip">${UI_TEXTS.guideAfterTiYong}</div><div class="grid-9" id="gridContainer"></div><div class="btn-row"><button data-action="resetGrid" class="outline small">清九宫</button>${state.manualMode ? '' : '<button data-action="generateInterpretation" class="small primary">' + UI_TEXTS.btnInterpret + '</button>'}</div></div></div>`;
  refreshAll();
  if (state.ti && state.yong && !state.manualMode) { const btn = $('#btnConfirmTY'); if (btn) btn.disabled = false; }
}

export function renderStep3(text) {
  const aiSettings = getApiSettings(); const aiVisible = aiSettings && aiSettings.apiKey;
  // 【关键修复】写入右栏 domResult，和左栏(体用)、中栏(起念/布阵)分离
  domResult.innerHTML = `<div class="panel"><h3>${UI_TEXTS.step3}</h3>
    <div class="result-block" id="interpretText">${text.replace(/\n/g, '<br>')}</div>
    <div class="btn-row">
      <button data-action="copyLocal" class="small">${UI_TEXTS.btnCopy}</button>
      <button data-action="shareImage" class="outline small">${UI_TEXTS.btnShareImage}</button>
      <button data-action="shareCode" class="outline small">${UI_TEXTS.btnShareCode}</button>
      <button data-action="exportData" class="outline small">完整数据</button>
      <button id="aiReadBtn" data-action="triggerAI" class="primary small" ${aiVisible ? '' : 'style="display:none"'}>${UI_TEXTS.btnAIDeepRead}</button>
      <button data-action="resetAll" class="small">${UI_TEXTS.btnNewQuestion}</button>
    </div>
    <div class="ai-guide-card">${AI_GUIDE_TEXT}</div>
    <div id="aiResultContainer" style="display:none;margin-top:10px"><div class="result-block" id="aiResultContent"></div>
      <div id="followUpArea" style="display:none;margin-top:8px"><div class="btn-row" style="gap:8px"><input type="text" id="followUpInput" placeholder="${UI_TEXTS.placeholderFollowUp}"><button data-action="sendFollowUp" class="small">发送</button></div>
      <div class="result-block" id="chatHistoryBlock" style="margin-top:6px;max-height:200px;font-size:0.8rem"></div></div></div></div>`;
}

export function initSettingsPanel() { /* 保持原样 */ }
export function initProfilePanel() { /* 保持原样 */ }
export function renderHistoryPanel() { /* 保持原样 */ }

export function updateApiStatus() {
  const s = getApiSettings();
  const st = $('#apiStatus');
  if (!st) return;
  st.textContent = s && s.apiKey ? UI_TEXTS.apiStatusConfigured : UI_TEXTS.apiStatusNotConfigured;
  st.style.color = s && s.apiKey ? '#5a9a6a' : '';
}