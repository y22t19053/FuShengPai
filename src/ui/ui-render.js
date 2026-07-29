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
        
        <!-- 逻辑工具嵌入：5W2H / SWOT -->
        <h4 style="color:var(--accent);margin-top:2vh;">🛠️ 替代占卜的逻辑思维工具</h4>
        <div class="physical-body" style="font-size:0.9rem;color:#ccc;line-height:1.6;">
          <p>如果你面对的是现实的问题，优先使用以下框架分析，而不是依赖玄学。</p>
          <p><strong>5W2H分析法：</strong><br>
          Who（对象）、What（事情）、Where（地点）、When（时间）、Why（原因）、How（怎么做）、How much（多少成本）。</p>
          <p><strong>SWOT分析法：</strong><br>
          S（优势）、W（劣势）、O（机会）、T（威胁）。</p>
          <p>在浮生牌中，你可以先梳理这些，如果发现只有焦虑没有具体抓手，再回到牌面找突破口。</p>
        </div>

        <h4 style="color:var(--accent);margin-top:2vh;">实体牌操作指南</h4>
        ${PHYSICAL_GUIDE && PHYSICAL_GUIDE.sections ? PHYSICAL_GUIDE.sections.map(sec => `<h4>${sec.heading}</h4><div class="physical-body">${sec.body.replace(/\n/g, '<br>')}</div>`).join('') : ''}
      </div>
    </details>
  `;
  container.innerHTML = html;
}

export function renderDeck() { /* 保持你最新的 renderDeck 代码 */ }
export function renderTiYong() {
  const bar = $('#tiyongBar');
  if (!bar) return;
  const tiHTML = state.ti ? `<div class="mini-card ${getCardColor(state.ti)}">${state.ti.isJoker ? state.ti.type : state.ti.rank}${state.ti.isJoker ? '' : state.ti.suit}</div>` : `<div class="empty-dash" data-drop="ti">${UI_TEXTS.labelTi}</div>`;
  const yongHTML = state.yong ? `<div class="mini-card ${getCardColor(state.yong)}">${state.yong.isJoker ? state.yong.type : state.yong.rank}${state.yong.isJoker ? '' : state.yong.suit}</div>` : `<div class="empty-dash" data-drop="yong">${UI_TEXTS.labelYong}</div>`;
  let badge = '';
  if (state.ti && state.yong) {
    const rel = getShengKe(getWuxing(state.ti), getWuxing(state.yong));
    if (rel) badge = `<span class="relation-badge ${rel === '生我' ? 'good' : rel === '克我' ? 'bad' : ''}">${rel} ${getShengKeLabel(rel)}</span>`;
  }
  bar.innerHTML = `<div class="slot">${UI_TEXTS.labelTi} ${tiHTML}</div><span class="separator">${UI_TEXTS.labelSeparator}</span><div class="slot">${UI_TEXTS.labelYong} ${yongHTML}</div>${badge}`;
  const btn = $('#btnConfirmTY'); if (btn) btn.disabled = !(state.ti && state.yong);
}
export function renderGrid() { /* 保持 renderGrid 代码 */ }
export function refreshAll() { renderDeck(); renderTiYong(); renderGrid(); }

// 【核心修改】扑克牌式御神签渲染
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
      <div class="card-face-small ${colorCls}" style="margin:8px auto;width:70px;height:100px;display:flex;align-items:center;justify-content:center;flex-direction:column;border-radius:6px;border:1px solid rgba(255,255,255,0.1);">
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

export function renderStep2() { /* 保持你的 renderStep2 */ }
export function renderStep3(text) { /* 保持你的 renderStep3 */ }

export function initSettingsPanel() {
  const s = getApiSettings();
  if (s) { state.selectedProvider = s.provider || 'deepseek'; $$('#providerGrid button').forEach(b => b.classList.toggle('selected', b.dataset.value === state.selectedProvider)); $('#apiKey').value = s.apiKey || ''; $('#apiEndpoint').value = s.endpoint || API_PROVIDERS[state.selectedProvider]?.endpoint || ''; $('#aiStyle').value = s.aiStyle || 'guide'; }
  updateApiStatus();
  
  const panel = $('#panelSettings');
  if (panel && !panel.querySelector('#sponsorBlock')) {
    const sponsorBlock = document.createElement('div');
    sponsorBlock.id = 'sponsorBlock';
    sponsorBlock.style.cssText = `margin-top:20px;border-top:1px solid rgba(255,255,255,0.1);padding-top:16px;text-align:center;`;
    sponsorBlock.innerHTML = `
      <div style="font-size:0.7rem; color:var(--dim);">本项目完全开源，欢迎审查与自由使用。</div>
      <div style="font-size:0.8rem; margin-top:6px;">
        <a href="https://github.com/y22t19053/FuShengPai" target="_blank" style="color:var(--accent);text-decoration:none;">🔗 查看开源仓库 GitHub</a>
      </div>
    `;
    panel.appendChild(sponsorBlock);
  }
}
export function initProfilePanel() { /* 保持你的 initProfilePanel */ }
export function renderHistoryPanel() { /* 保持你的 renderHistoryPanel */ }

// 更新API状态函数
export function updateApiStatus() {
  const s = getApiSettings();
  const st = $('#apiStatus');
  if (!st) return;
  st.textContent = s && s.apiKey ? UI_TEXTS.apiStatusConfigured : UI_TEXTS.apiStatusNotConfigured;
  st.style.color = s && s.apiKey ? '#5a9a6a' : '';
}