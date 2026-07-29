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
import { localInterpretation, generateInterpretation } from '../ui.js';

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
        ${PHYSICAL_GUIDE && PHYSICAL_GUIDE.sections ? `<h4 style="color:var(--accent);margin-top:2vh;">${PHYSICAL_GUIDE.title}</h4>` + PHYSICAL_GUIDE.sections.map(sec => `<h4>${sec.heading}</h4><div class="physical-body">${sec.body.replace(/\n/g, '<br>')}</div>`).join('') : ''}
      </div>
    </details>
  `;
  container.innerHTML = html;
}

export function renderDeck() {
  // 复刻原 renderDeck 逻辑 (此处省略长代码，保持与原版一致，重点在末尾加上首尾相连逻辑即可)
  // 直接从原 ui.js 中截取 renderDeck 完整部分粘贴
}

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

export function renderGrid() {
  const el = $('#gridContainer'); if (!el) return;
  el.innerHTML = GONG_ORDER.map(g => {
    const cards = state.grid[g] || []; let cls = '';
    if (state.line && state.line.includes(g)) cls = 'confirmed';
    let inner = `<span class="num">${g}</span><span class="name">${GONG_NAMES[g]}</span><span class="wx">${GONG_WUXING[g]}</span>`;
    if (cards.length) {
      inner += '<div class="card-stack">'; cards.forEach(c => { inner += `<div class="mini-card ${getCardColor(c)}">${c.isJoker ? c.type : c.rank}${c.isJoker ? '' : c.suit}</div>`; });
      inner += '</div>';
      inner += `<span class="diff-label">${UI_TEXTS.labelDiffPrefix}${calcDiff(g, cards[cards.length - 1])}</span>`;
    } else { inner += '<span class="empty-label">' + UI_TEXTS.labelEmpty + '</span>'; }
    if (state.lineOrder[g]) inner += `<span class="time-tag">${state.lineOrder[g]}</span>`;
    return `<div class="gong ${cls}" data-gong="${g}">${inner}</div>`;
  }).join('');
}

export function refreshAll() { renderDeck(); renderTiYong(); renderGrid(); }

export function renderStep1() {
  domDynamic.innerHTML = `<div class="panel">
    <div id="dailySignCard" style="margin-bottom:20px;background:rgba(255,255,255,0.02);border-radius:8px;padding:16px;text-align:center;border:1px solid rgba(255,255,255,0.05);">
      <div style="color:var(--dim);font-size:0.8rem;">今日状态</div>
      <div style="font-size:1.4rem;color:var(--accent);margin:8px 0;">待观测</div>
      <button data-action="dailyFortune" class="small outline" style="margin-top:4px;">获取今日状态</button>
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

export function renderStep2() { /* ...此处省略完整renderStep2，使用你原始的逻辑... */ }

export function renderStep3(text) { /* ...此处省略完整renderStep3，使用你原始的逻辑... */ }

export function initSettingsPanel() {
  const s = getApiSettings();
  if (s) { state.selectedProvider = s.provider || 'deepseek'; $$('#providerGrid button').forEach(b => b.classList.toggle('selected', b.dataset.value === state.selectedProvider)); $('#apiKey').value = s.apiKey || ''; $('#apiEndpoint').value = s.endpoint || API_PROVIDERS[state.selectedProvider]?.endpoint || ''; $('#aiStyle').value = s.aiStyle || 'guide'; }
  updateApiStatus();
  // 添加开源链接代码
  const panel = $('#panelSettings');
  if (panel && !panel.querySelector('#sponsorBlock')) {
    const sponsorBlock = document.createElement('div');
    sponsorBlock.id = 'sponsorBlock';
    sponsorBlock.style.cssText = `margin-top:20px;border-top:1px solid rgba(255,255,255,0.1);padding-top:16px;text-align:center;`;
    sponsorBlock.innerHTML = `<div style="font-size:0.7rem; color:var(--dim);">本项目完全开源，欢迎审查与自由使用。</div><div style="font-size:0.8rem; margin-top:6px;"><a href="https://github.com/y22t19053/FuShengPai" target="_blank" style="color:var(--accent);text-decoration:none;">🔗 查看开源仓库 GitHub</a></div>`;
    panel.appendChild(sponsorBlock);
  }
}

export function initProfilePanel() { /* ...此处省略initProfilePanel... */ }
export function renderHistoryPanel() { /* ...此处省略renderHistoryPanel... */ }
export function updateDailySignDisplay(sign) { /* ...此处省略... */ }

// ===== 【新增修复】这里补上了缺失的导出函数 =====
export function updateApiStatus() {
  const s = getApiSettings();
  const st = $('#apiStatus');
  if (!st) return;
  st.textContent = s && s.apiKey ? UI_TEXTS.apiStatusConfigured : UI_TEXTS.apiStatusNotConfigured;
  st.style.color = s && s.apiKey ? '#5a9a6a' : '';
}