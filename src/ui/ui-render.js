// ===== src/ui/ui-render.js · 所有页面的绘制逻辑 =====
import { state, $, $$, domDynamic, domModal, domModalContent, domSharePreview, domShareCanvas } from '../state.js';
import { GONG_ORDER, GONG_NAMES, GONG_WUXING, CATEGORIES } from '../data.js';
import { getWangState, getWuxing, getCardColor, getCardId, getCardValue, SUITS, RANKS } from '../data.js';
import { shuffle, drawTiYong, calcFullBaZi, calcYearPillar, getTimeLabels, calcDiff } from '../engine.js';
import { getApiSettings, getProfile, getHistory } from '../storage.js';
import {
  UI_TEXTS, TUTORIAL_TEXTS, PHYSICAL_GUIDE, SHARE_TEXTS,
  HISTORY_EMPTY, AI_GUIDE_TEXT, ONBOARDING_STEPS, generateFullReading,
  TIME_RESTRICTION
} from '../texts/index.js';
import { isCardPlaced, selectCard, placeCardOnGong, placeCardOnTiYong } from './ui-drag.js';
import { toast, togglePanel } from './ui-modal.js';

// 安全转义字符
export const escapeHtml = (str) => {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
};

export function renderTeachingPanel() {
  const container = $('#teachingContent');
  if (!container) return;
  let html = `
    <details>
      <summary style="cursor:pointer;color:var(--accent);font-weight:bold;margin-bottom:8px;">展开完整教程手册</summary>
      <div style="margin-top:10px;padding:10px;background:rgba(255,255,255,0.02);border-radius:6px;">
        <p>${TUTORIAL_TEXTS.intro}</p>
        <ol style="padding-left:1.2rem;margin-bottom:2vh;">${TUTORIAL_TEXTS.steps.map(s => '<li style="margin-bottom:0.5vh;font-size:0.85rem;color:var(--dim)">' + s + '</li>').join('')}</ol>
        <p style="font-size:0.75rem;color:var(--accent);margin-bottom:2vh;">${TUTORIAL_TEXTS.offlineHint}</p>
        
        <h4 style="color:var(--accent);margin-top:2vh;">🛠️ 替代占卜的逻辑思维工具</h4>
        <div class="physical-body" style="font-size:0.9rem;color:#ccc;line-height:1.6;">
          <p><strong>5W2H分析法：</strong><br>Who（对象）、What（事情）、Where（地点）、When（时间）、Why（原因）、How（怎么做）、How much（多少成本）。</p>
          <p><strong>SWOT分析法：</strong><br>S（优势）、W（劣势）、O（机会）、T（威胁）。</p>
        </div>
        ${PHYSICAL_GUIDE && PHYSICAL_GUIDE.sections ? `<h4 style="color:var(--accent);margin-top:2vh;">实体牌操作指南</h4>` + PHYSICAL_GUIDE.sections.map(sec => `<h4>${sec.heading}</h4><div class="physical-body">${sec.body.replace(/\n/g, '<br>')}</div>`).join('') : ''}
      </div>
    </details>
  `;
  container.innerHTML = html;
}

export function renderDeck() { /* 保持原逻辑 */ }
export function renderTiYong() { /* 保持原逻辑 */ }
export function renderGrid() { /* 保持原逻辑 */ }
export function refreshAll() { renderDeck(); renderTiYong(); renderGrid(); }

// 核心：御神签渲染与起念按钮分离
export function renderStep1() {
  const today = new Date().toDateString();
  const storedDate = localStorage.getItem('fs_todays_sign_date');
  const storedSign = localStorage.getItem('fs_todays_sign');
  let sign = null;
  if (storedDate === today && storedSign) {
    try { sign = JSON.parse(storedSign); } catch(e) {}
  }

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

  domDynamic.innerHTML = `<div class="panel">
    <div id="dailySignCard" style="margin-bottom:20px;background:rgba(255,255,255,0.02);border-radius:8px;padding:16px;text-align:center;border:1px solid rgba(255,255,255,0.05);">
      ${dailyHTML}
    </div>
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

export function renderStep2() { /* 保持原逻辑 */ }
export function renderStep3(text) { /* 保持原逻辑 */ }

export function initSettingsPanel() { /* 保持原逻辑 */ }
export function initProfilePanel() { /* 保持原逻辑 */ }
export function renderHistoryPanel() { /* 保持原逻辑 */ }

export function updateApiStatus() {
  const s = getApiSettings();
  const st = $('#apiStatus');
  if (!st) return;
  st.textContent = s && s.apiKey ? UI_TEXTS.apiStatusConfigured : UI_TEXTS.apiStatusNotConfigured;
  st.style.color = s && s.apiKey ? '#5a9a6a' : '';
}