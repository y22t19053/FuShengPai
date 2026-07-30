// ===== src/ui/ui-render.js · 所有页面的绘制逻辑 =====
import { state, $, $$ } from '../state.js';
import { domDynamic } from '../domCache.js';
import { GONG_ORDER, GONG_NAMES, GONG_WUXING, CATEGORIES, getShengKe, getShengKeLabel } from '../data.js';
import { getWangState, getWuxing, getCardColor, getCardId, getCardValue, SUITS, RANKS } from '../data.js';
import { shuffle, drawTiYong, calcFullBaZi, calcYearPillar, getTimeLabels, calcDiff } from '../engine.js';
import { getApiSettings, getProfile, getHistory } from '../storage.js';
import { UI_TEXTS, TUTORIAL_TEXTS, PHYSICAL_GUIDE, SHARE_TEXTS, HISTORY_EMPTY, AI_GUIDE_TEXT, ONBOARDING_STEPS, generateFullReading } from '../texts/index.js';
import { toast } from './ui-modal.js';
import { isCardPlaced } from './ui-drag.js';

export const escapeHtml = (str) => { const div = document.createElement('div'); div.textContent = str; return div.innerHTML; };

export function renderTeachingPanel() { /* 保持不变 */ }
export function renderDeck() { /* 保持不变 */ }
export function renderTiYong() { /* 保持不变 */ }
export function renderGrid() { /* 保持不变 */ }
export function refreshAll() { renderDeck(); renderTiYong(); renderGrid(); }
export function renderStep1() { /* 保持不变 */ }
export function renderStep2() { /* 保持不变 */ }
export function renderStep3(text) { /* 保持不变 */ }

export function initSettingsPanel() {
  const s = getApiSettings();
  if (s) { state.selectedProvider = s.provider || 'deepseek'; $$('#providerGrid button').forEach(b => b.classList.toggle('selected', b.dataset.value === state.selectedProvider)); $('#apiKey').value = s.apiKey || ''; $('#apiEndpoint').value = s.endpoint || API_PROVIDERS[state.selectedProvider]?.endpoint || ''; $('#aiStyle').value = s.aiStyle || 'guide'; }
  updateApiStatus();
  
  const panel = $('#panelSettings');
  if (panel) {
    // 【修复】在设置面板顶部加入红色安全警告
    let warningHTML = `
      <p style="color:#d45050;font-size:0.7rem;border:1px solid #d45050;padding:6px 12px;border-radius:6px;margin-bottom:12px;line-height:1.4;">
        ⚠️ API Key 以混淆形式存储于本地，建议每次使用后手动清除。
      </p>
    `;
    // 将警告插入到面板内容的最前面
    panel.insertAdjacentHTML('afterbegin', warningHTML);

    if (!panel.querySelector('#sponsorBlock')) {
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
}

export function initProfilePanel() { /* 保持不变 */ }
export function renderHistoryPanel() { /* 保持不变 */ }

export function updateApiStatus() {
  const s = getApiSettings();
  const st = $('#apiStatus');
  if (!st) return;
  st.textContent = s && s.apiKey ? UI_TEXTS.apiStatusConfigured : UI_TEXTS.apiStatusNotConfigured;
  st.style.color = s && s.apiKey ? '#5a9a6a' : '';
}