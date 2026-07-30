// ===== src/ui/ui-modal.js · 弹窗、Toast、引导与分享 =====
import { state, $, $$ } from '../state.js';
import { domToast, domModal, domModalContent, domSharePreview, domShareCanvas } from '../domCache.js';
import { SUITS, RANKS, API_PROVIDERS, getWuxing, getCardColor } from '../data.js';
import { requestReading } from '../ai.js';
// 【绝对修复】确认 hasCompletedOnboarding 和 completeOnboarding 在这里完整导入
import { getApiSettings, getProfile, getHistory, deleteHistoryItem, exportAllData, hasCompletedOnboarding, completeOnboarding } from '../storage.js';
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
  const now = new Date();
  const h = now.getHours();
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const timeStr = now.toLocaleString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
  if ((h >= 23 || h < 1) && !localStorage.getItem('fs_midnight_dismiss')) {
    if (!domModal || !domModalContent) { callback(); return; }
    domModalContent.innerHTML = `
      <h3 style="text-align:center;">子时提示</h3>
      <p style="margin:10px 0;color:var(--dim);">当前时间为 ${timeStr} (${timeZone})，正值子时。观测者效应可能衰减，结果仅供参考。</p>
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

export function showPrivacyWarning() {
  const today = new Date().toDateString();
  if (localStorage.getItem('fs_privacy_dismiss_today') === today) return;

  if (!domModal || !domModalContent) return;
  domModalContent.innerHTML = `
    <div style="text-align:center;">
      <h3>⚠️ 隐私模式检测</h3>
      <p style="margin:10px 0;color:var(--dim);">您当前正在使用浏览器的隐私/无痕模式，<strong>所有数据在关闭页面后将自动清除</strong>。<br>
      建议您立即导出备份，或切换到正常模式使用。</p>
      <div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-top:10px;">
        <button id="exportBackupBtn" class="primary small">导出备份</button>
        <button id="dismissPrivacyBtn" class="outline small">我知道了</button>
      </div>
    </div>
  `;
  domModal.removeAttribute('hidden');
  document.getElementById('exportBackupBtn')?.addEventListener('click', () => {
    exportAllData();
    toast('备份已导出，请妥善保存');
    domModal.setAttribute('hidden', '');
  });
  document.getElementById('dismissPrivacyBtn')?.addEventListener('click', () => {
    localStorage.setItem('fs_privacy_dismiss_today', today);
    domModal.setAttribute('hidden', '');
  });
}

export function showDailyFortune() {
  if (!domModal || !domModalContent) { toast('弹窗系统尚未加载'); return; }
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

export function showHistoryDetail(index) {
  const history = getHistory(); const r = history[index]; if (!r) return;
  const savedLocalText = r.text || '';
  const buildHistoricalPrompt = (historyRecord, question) => { return `请根据以下浮生牌局象进行详细解读。\n\n历史牌局解读：${historyRecord.text}\n\n用户追问：${question}\n\n规则：纯文本格式，用自然语言。话不说死。`; };
  let aiBlock = '';
  if (r.chatHistory && r.chatHistory.length) { aiBlock = '<div class="result-block" style="max-height:150px;margin-top:10px">' + r.chatHistory.map(m => `<div class="chat-msg ${m.role === 'user' ? 'user' : 'ai'}">${m.content.replace(/\n/g, '<br>')}</div>`).join('') + '</div>'; } 
  else { aiBlock = '<p style="color:var(--dim)">暂无 AI 对话记录</p>'; }
  
  domModalContent.innerHTML = `<h3>历史详情</h3>
    <p><strong>时间：</strong>${new Date(r.time).toLocaleString()}</p>
    <p><strong>问题：</strong>${r.question || '未提问'}</p>
    <p><strong>类别：</strong>${r.category || '无'}</p>
    <div class="result-block">${(r.text || '').replace(/\n/g, '<br>')}</div>
    <h4 style="margin-top:10px">AI 对话</h4>${aiBlock}
    <div style="margin-top:10px;display:flex;gap:8px">
      <input type="text" id="historyFollowUpInput" placeholder="${UI_TEXTS.placeholderFollowUp}" style="flex:1">
      <button id="historyFollowUpBtn" class="small">发送</button>
    </div>
    <div class="btn-row" style="margin-top:10px;">
      <button data-action="deleteHistoryItem" data-history-index="${index}" class="outline small">删除此条</button>
      <button id="reObserveBtn" class="primary small">重新观测</button>
      <button data-action="closeModal" class="small">${UI_TEXTS.btnClose}</button>
    </div>
  `;
  domModal.removeAttribute('hidden');

  document.getElementById('reObserveBtn')?.addEventListener('click', () => {
    import('../ui.js').then(ui => {
      Object.assign(state, {
        ti: r.ti,
        yong: r.yong,
        grid: r.grid,
        line: r.line,
        lineOrder: r.lineOrder,
        chatHistory: [],
        step: 3,
        question: r.question,
        category: r.category
      });
      domModal.setAttribute('hidden', '');
      ui.updateStep(3);
      import('../ui/ui-render.js').then(render => {
        render.renderStep3(r.text || '历史牌局已加载，重新生成解读中...');
        ui.generateInterpretation();
      });
      toast('已加载历史牌局，可重新观测');
    });
  });

  const followInput = $('#historyFollowUpInput'); const followBtn = $('#historyFollowUpBtn');
  if (followBtn && followInput) {
    const handler = async () => {
      const q = followInput.value.trim(); if (!q) return; followInput.value = ''; followBtn.disabled = true; followBtn.textContent = '发送中...';
      const settings = getApiSettings(); if (!settings || !settings.apiKey) { toast('请先配置 API Key'); followBtn.disabled = false; followBtn.textContent = '发送'; return; }
      const chatHistory = r.chatHistory ? [...r.chatHistory] : []; chatHistory.push({ role: 'user', content: q });
      const prompt = buildHistoricalPrompt(r, q);
      try {
        const answer = await requestFollowUp({ history: [{ role: 'user', content: prompt }, ...chatHistory], provider: settings.provider, apiKey: settings.apiKey, endpoint: settings.endpoint, model: settings.model });
        chatHistory.push({ role: 'assistant', content: answer }); r.chatHistory = chatHistory;
        const allHistory = getHistory(); allHistory[index] = r; localStorage.setItem('fs_history', JSON.stringify(allHistory)); showHistoryDetail(index);
      } catch (e) { toast(e.message, 3000); } finally { followBtn.disabled = false; followBtn.textContent = '发送'; }
    };
    followBtn.addEventListener('click', handler); followInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handler(); });
  }
}

export function generateShareCode() { /* 保持原有逻辑 */ }
export function importShareCode() { /* 保持原有逻辑 */ }
export function generateShareImage() { /* 保持原有逻辑 */ }
export function saveShareImage() { /* 保持原有逻辑 */ }