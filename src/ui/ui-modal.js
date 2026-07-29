// ===== src/ui/ui-modal.js · 弹窗、Toast、引导与分享 =====
import { state, $, $$, domToast, domModal, domModalContent, domSharePreview, domShareCanvas } from '../state.js';
import { SUITS, RANKS, API_PROVIDERS, getWuxing, getCardColor } from '../data.js';
import { requestReading } from '../ai.js';
import { getApiSettings, getProfile, getHistory, deleteHistoryItem } from '../storage.js';
import { UI_TEXTS, SHARE_TEXTS, SHARE_QUOTES, TIME_RESTRICTION, ONBOARDING_STEPS, SIGN_LIBRARY } from '../texts/index.js';

export let toastTimer = null;
export function toast(msg, duration = 2000) {
  if (!domToast) return;
  domToast.textContent = msg; domToast.removeAttribute('hidden'); domToast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { domToast.classList.remove('show'); setTimeout(() => domToast.setAttribute('hidden', ''), 400); }, duration);
}

export function togglePanel(panelId) {
  const panel = $('#panel' + panelId.charAt(0).toUpperCase() + panelId.slice(1));
  if (!panel) return;
  const isHidden = panel.hasAttribute('hidden');
  $$('.static-panel').forEach(p => p.setAttribute('hidden', ''));
  if (isHidden) { panel.removeAttribute('hidden'); }
}

export function showOnboarding() { state.currentOnboardStep = 0; renderOnboardStep(); }
export function renderOnboardStep() {
  const existing = document.querySelector('.onboard-overlay');
  if (existing) existing.remove();
  if (!ONBOARDING_STEPS || !ONBOARDING_STEPS.length) { completeOnboarding(); return; }
  const step = ONBOARDING_STEPS[state.currentOnboardStep];
  if (!step) return;
  const overlay = document.createElement('div'); overlay.className = 'onboard-overlay';
  const dotsHTML = ONBOARDING_STEPS.map((_, i) => `<span class="onboard-dot${i === state.currentOnboardStep ? ' active' : ''}"></span>`).join('');
  overlay.innerHTML = `<div class="onboard-card"><h3>${step.title}</h3><p>${step.body}</p><div class="onboard-dots">${dotsHTML}</div><div><button class="primary small" id="onboardNext">${step.btn}</button>${state.currentOnboardStep < ONBOARDING_STEPS.length - 1 ? '<button class="outline small" id="onboardSkip">跳过</button>' : ''}</div></div>`;
  document.body.appendChild(overlay);
  overlay.querySelector('#onboardNext').addEventListener('click', () => {
    if (state.currentOnboardStep < ONBOARDING_STEPS.length - 1) { state.currentOnboardStep++; renderOnboardStep(); } 
    else { overlay.remove(); completeOnboarding(); toast('有什么想问的，默念后抽牌即可'); }
  });
  const skipBtn = overlay.querySelector('#onboardSkip');
  if (skipBtn) skipBtn.addEventListener('click', () => { overlay.remove(); completeOnboarding(); });
}

export function guardMidnight(callback) {
  const h = new Date().getHours();
  if ((h >= 23 || h < 1) && !localStorage.getItem('fs_midnight_dismiss')) {
    if (!domModal || !domModalContent) { callback(); return; } // 防御性返回
    domModalContent.innerHTML = `
      <h3 style="text-align:center;">子时提示</h3>
      <p style="margin:10px 0;color:var(--dim);">当前为子时，观测者效应可能衰减。结果仅供参考。</p>
      <div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;">
        <button id="midnightProceedBtn" class="primary">我清楚，继续</button>
        <button id="midnightHideBtn" class="outline">今天别提醒我了</button>
      </div>
    `;
    domModal.removeAttribute('hidden');
    document.getElementById('midnightProceedBtn').addEventListener('click', () => { domModal.setAttribute('hidden', ''); callback(); });
    document.getElementById('midnightHideBtn').addEventListener('click', () => { localStorage.setItem('fs_midnight_dismiss', 'true'); domModal.setAttribute('hidden', ''); callback(); });
  } else { callback(); }
}

export function showDailyFortune() {
  if (!domModal || !domModalContent) { toast('弹窗系统尚未加载'); return; } // 防御性返回
  const today = new Date().toDateString(); 
  let hash = 0; for (let i = 0; i < today.length; i++) { hash = ((hash << 5) - hash) + today.charCodeAt(i); hash |= 0; }
  const idx = Math.abs(hash) % 54; let card;
  if (idx < 52) { const suit = SUITS[Math.floor(idx / 13)]; const rank = RANKS[idx % 13]; card = { suit, rank, isJoker: false }; }
  else if (idx === 52) card = { isJoker: true, type: '大王' }; else card = { isJoker: true, type: '小王' };
  const wx = getWuxing(card); const label = card.isJoker ? card.type : card.suit + card.rank; const colorCls = getCardColor(card);
  const fortunes = { '火': '热情是你的燃料，别让它灼伤你。', '金': '决断的时刻来了，信任你的切割力。', '木': '生长的节奏不可强求，根深自然叶茂。', '水': '顺应变化，暗流之下自有出路。', '天': '天意如风，顺势而行。', '人': '智谋是你的武器，善用巧劲。' };
  const quote = fortunes[wx] || '平常心，即是最好的状态。';
  localStorage.setItem('fs_todays_sign_date', today); localStorage.setItem('fs_todays_sign', JSON.stringify(card));
  domModalContent.innerHTML = `
    <div style="text-align:center;padding:10px;font-family:'Georgia',serif;">
      <h3 style="font-size:1.8rem;color:var(--accent);letter-spacing:4px;">今日抽牌</h3>
      <div class="card-face-small ${colorCls}" style="margin:12px auto;width:80px;height:112px;display:flex;align-items:center;justify-content:center;flex-direction:column;border-radius:6px;border:1px solid rgba(255,255,255,0.2);background:rgba(0,0,0,0.3);">
        <span class="rank" style="font-size:2.2rem;font-weight:bold;line-height:1;">${label}</span>
        <span class="suit" style="font-size:1.4rem;">${card.isJoker ? '' : card.suit}</span>
      </div>
      <p style="font-size:0.9rem;color:var(--dim);margin-top:8px;">今日启示：${quote}</p>
      <button id="dailyAiBtn" class="primary small" style="margin-top:12px;">✨ 呼唤AI深度解析</button>
      <div id="dailyAiResult" style="margin-top:8px;text-align:left;font-size:0.85rem;color:#ddd;"></div>
      <button data-action="closeModal" style="margin-top:12px;">关闭</button>
    </div>
  `;
  domModal.removeAttribute('hidden');
  document.getElementById('dailyAiBtn').addEventListener('click', async function() {
    this.disabled = true; this.textContent = '召唤中...';
    const settings = getApiSettings();
    if (!settings || !settings.apiKey) { toast('请先配置 API Key'); this.disabled = false; this.textContent = '✨ 呼唤AI深度解析'; return; }
    try {
      const provider = settings.provider || 'deepseek'; let endpoint = settings.endpoint || API_PROVIDERS[provider]?.endpoint || '';
      if (endpoint.endsWith('/v1')) endpoint = endpoint.slice(0, -3); if (endpoint.endsWith('/')) endpoint = endpoint.slice(0, -1);
      const model = settings.model || API_PROVIDERS[provider]?.model || '';
      const prompt = `请针对抽中的扑克牌进行深度解读。\n牌面：${label}\n五行：${wx}\n启示：${quote}\n要求：纯中文，话不说死，以心理学共情和日常生活的角度展开。`;
      const result = await requestReading({ provider, apiKey: settings.apiKey, endpoint, model, prompt });
      document.getElementById('dailyAiResult').innerHTML = `<div style="border-top:1px solid rgba(255,255,255,0.1);padding-top:8px;margin-top:8px;color:#e0e0e0;"><strong>AI 解牌：</strong><br>${result}</div>`;
    } catch (e) { toast(e.message); }
    finally { this.disabled = false; this.textContent = '✨ 呼唤AI深度解析'; }
  });
}

export function showHistoryDetail(index) { /* 保持原有逻辑 */ }
export function generateShareCode() { /* 保持原有逻辑 */ }
export function importShareCode() { /* 保持原有逻辑 */ }
export function generateShareImage() { /* 保持原有逻辑 */ }
export function saveShareImage() { /* 保持原有逻辑 */ }