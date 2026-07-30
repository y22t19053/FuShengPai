// ===== src/ui/ui-render.js · 所有页面的绘制逻辑 =====
import { state, $, $$, domDynamic } from '../state.js';
import { GONG_ORDER, GONG_NAMES, GONG_WUXING, CATEGORIES, getShengKe, getShengKeLabel } from '../data.js';
import { getWangState, getWuxing, getCardColor, getCardId, getCardValue, SUITS, RANKS } from '../data.js';
import { shuffle, drawTiYong, calcFullBaZi, calcYearPillar, getTimeLabels, calcDiff } from '../engine.js';
import { getApiSettings, getProfile, getHistory } from '../storage.js';
import { UI_TEXTS, TUTORIAL_TEXTS, PHYSICAL_GUIDE, SHARE_TEXTS, HISTORY_EMPTY, AI_GUIDE_TEXT, ONBOARDING_STEPS, generateFullReading } from '../texts/index.js';
import { toast } from './ui-modal.js';
import { isCardPlaced } from './ui-drag.js';

export const escapeHtml = (str) => { const div = document.createElement('div'); div.textContent = str; return div.innerHTML; };

export function renderTeachingPanel() { /* 保持原有逻辑 */ }

export function renderDeck() { /* 保持原有逻辑 */ }
export function renderTiYong() { /* 保持原有逻辑 */ }

export function renderGrid() {
  const el = $('#gridContainer'); if (!el) return;
  el.innerHTML = GONG_ORDER.map(g => {
    const cards = state.grid[g] || []; let cls = '';
    if (state.line && state.line.includes(g)) cls = 'confirmed';
    let inner = `<span class="num">${g}</span><span class="name">${GONG_NAMES[g]}</span><span class="wx">${GONG_WUXING[g]}</span>`;
    if (cards.length) {
      inner += '<div class="card-stack">'; cards.forEach(c => { inner += `<div class="mini-card ${getCardColor(c)}">${c.isJoker ? c.type : c.rank}${c.isJoker ? '' : c.suit}</div>`; });
      inner += '</div>';
      // 【优化】差值显示加入微动效 class，产生“浮现”感
      const diff = calcDiff(g, cards[cards.length - 1]);
      const cardVal = getCardValue(cards[cards.length - 1]);
      inner += `<span class="diff-label" style="animation: diffAppear 0.3s ease;">差值：| ${g} - ${cardVal} | = ${diff}</span>`;
    } else {
      inner += '<span class="empty-label">置一念于阵中，便可见微澜</span>';
    }
    if (state.lineOrder[g]) inner += `<span class="time-tag">${state.lineOrder[g]}</span>`;
    return `<div class="gong ${cls}" data-gong="${g}">${inner}</div>`;
  }).join('');
}

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

  domDynamic.innerHTML = `<div class="panel">
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

  // 【新增交互】输入框按回车键直接触发“开始起局”
  const input = document.getElementById('questionInput');
  if (input) {
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const btn = document.querySelector('[data-action="confirmQuestion"]');
        if (btn) btn.click();
      }
    });
  }
}

export function renderStep2() { /* 保持原有逻辑 */ }
export function renderStep3(text) { /* 保持原有逻辑 */ }
export function initSettingsPanel() { /* 保持原有逻辑 */ }
export function initProfilePanel() { /* 保持原有逻辑 */ }
export function renderHistoryPanel() { /* 保持原有逻辑 */ }

export function updateApiStatus() {
  const s = getApiSettings();
  const st = $('#apiStatus');
  if (!st) return;
  st.textContent = s && s.apiKey ? UI_TEXTS.apiStatusConfigured : UI_TEXTS.apiStatusNotConfigured;
  st.style.color = s && s.apiKey ? '#5a9a6a' : '';
}