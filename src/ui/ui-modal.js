// ===== src/ui/ui-modal.js · 弹窗、Toast、引导与分享（统一 Share 架构驱动） =====
import { state } from '../state.js';
import { API_PROVIDERS, getWuxing, getShengKe, DAILY_FORTUNE_TYPES, getDailyFortuneType, getCurrentPeriodKey } from '../data.js';
import { requestReading, requestFollowUp } from '../ai.js';
import {
  getApiSettings, getProfile, getHistory, deleteHistoryItem,
  exportAllDataJson, importAllData, updateHistoryChatAt,
  hasCompletedOnboarding, completeOnboarding,
  getTimeline, getTimeCapsule, getStoredPeriodCards
} from '../storage.js';
import { UI_TEXTS, ONBOARDING_STEPS } from '../texts/index.js';
import { renderTeachingPanel } from './ui-render.js';
import { escapeForHTML, setHTML } from '../utils/safe.js';
import { loadQRImage } from '../utils/qr.js';
import { copyTextWithFeedback } from '../utils/clipboard.js';
import { resolveApiModel } from '../utils/api-config.js';

// ===== 新增 Share 架构导入 =====
import { buildShareData, buildSingleCardShareData } from '../share/share-data.js';
import { renderShareCard } from '../share/renderer.js';

export let toastTimer = null;

// ===== 唯一文件名生成（毫秒级时间戳，终身不重名） =====
export function getUniqueFilename(prefix = '浮生牌') {
  const now = new Date();
  const ts = now.toISOString().replace(/[:.]/g, '-');
  return `${prefix}_${ts}.png`;
}

export function toast(msg, duration = 2000, type = 'info') {
  const el = document.getElementById('toast');
  if (!el) return;
  // 清空并重建（保证纯文本安全 + 进度条子元素）
  el.innerHTML = '';
  const text = document.createElement('span');
  text.className = 'toast-msg';
  text.textContent = msg;
  const bar = document.createElement('div');
  bar.className = 'toast-bar';
  el.appendChild(text);
  el.appendChild(bar);
  el.classList.remove('toast-success', 'toast-warning', 'toast-info');
  el.classList.add(type === 'success' ? 'toast-success' : type === 'warning' ? 'toast-warning' : 'toast-info');
  el.style.setProperty('--toast-dur', duration + 'ms');
  el.removeAttribute('hidden');
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.setAttribute('hidden', ''), 400);
  }, duration);
}

export function togglePanel(panelId) {
  const panel = document.getElementById('panel' + panelId.charAt(0).toUpperCase() + panelId.slice(1));
  if (!panel) return;
  const isHidden = panel.hasAttribute('hidden');
  document.querySelectorAll('.static-panel').forEach(p => p.setAttribute('hidden', ''));
  if (isHidden) {
    panel.removeAttribute('hidden');
    if (panelId === 'teaching') renderTeachingPanel();
    if (panelId === 'history') import('./ui-render.js').then(m => m.renderHistoryPanel());
    if (panelId === 'settings') import('./ui-render.js').then(m => m.initSettingsPanel());
    if (panelId === 'profile') import('./ui-render.js').then(m => m.initProfilePanel());
    // 面板较长（如教程）：滚动到面板顶部，避免与页尾内容视觉重叠
    setTimeout(() => {
      panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 30);
  }
}

export function showOnboarding() { state.currentOnboardStep = 0; renderOnboardStep(); }

// ===== 新手引导 =====
export function renderOnboardStep() {
  const existing = document.querySelector('.onboard-overlay');
  if (existing) existing.remove();
  if (!ONBOARDING_STEPS || !ONBOARDING_STEPS.length) { completeOnboarding(); return; }
  const step = ONBOARDING_STEPS[state.currentOnboardStep];
  if (!step) return;
  const overlay = document.createElement('div');
  overlay.className = 'onboard-overlay';
  const dotsHTML = ONBOARDING_STEPS.map((_, i) => `<span class="onboard-dot${i === state.currentOnboardStep ? ' active' : ''}"></span>`).join('');
  const isLast = state.currentOnboardStep === ONBOARDING_STEPS.length - 1;
  const skipBtnHTML = isLast ? '' : '<button class="outline small" id="onboardSkip">跳过</button>';
  const actionBtn = step.btn || (isLast ? '开始使用' : '下一步');

  overlay.innerHTML = `<div class="onboard-card">
    <h3 style="color:var(--accent);font-size:1.4rem;margin-bottom:12px;">${escapeForHTML(step.title)}</h3>
    <div style="font-size:0.95rem;line-height:1.9;color:var(--text);margin:0 0 16px 0;text-align:left;white-space:pre-line;">${escapeForHTML(step.body)}</div>
    <div class="onboard-dots">${dotsHTML}</div>
    <div style="display:flex;gap:8px;justify-content:center;margin-top:16px;">
      <button class="primary small" id="onboardNext" style="padding:8px 24px;font-size:0.9rem;">${actionBtn}</button>
      ${skipBtnHTML}
    </div>
  </div>`;

  document.body.appendChild(overlay);

  overlay.querySelector('#onboardNext').addEventListener('click', () => {
    if (state.currentOnboardStep < ONBOARDING_STEPS.length - 1) {
      state.currentOnboardStep++;
      renderOnboardStep();
    } else {
      overlay.remove();
      completeOnboarding();
      toast('有什么想问的，默念后抽牌即可', 2600, 'info');
      focusQuestionInputAfterOnboarding();
    }
  });

  const skipBtn = overlay.querySelector('#onboardSkip');
  if (skipBtn) skipBtn.addEventListener('click', () => { overlay.remove(); completeOnboarding(); focusQuestionInputAfterOnboarding(); });
}

// 引导结束后，桌面端自动聚焦问题输入框（移动端不弹键盘）
function focusQuestionInputAfterOnboarding() {
  if (!window.matchMedia || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  setTimeout(() => {
    const input = document.getElementById('questionInput');
    if (input) {
      input.style.pointerEvents = 'auto';
      input.style.zIndex = '3';
      input.focus({ preventScroll: true });
    }
  }, 350);
}

export function showAIGuideModal() {
  const modal = document.getElementById('modal');
  const content = document.getElementById('modalContent');
  if (!modal || !content) { toast('弹窗系统尚未加载', 2200, 'warning'); return; }
  const html = `
    <div style="text-align:center;padding:8px;">
      <h3 style="color:var(--accent);">🤖 AI 深度解读</h3>
      <p style="margin:12px 0;color:var(--dim);font-size:0.85rem;line-height:1.8;">
        需要自行配置 AI API Key（支持 DeepSeek、千问、OpenAI 等）。
        <br>
        <span style="font-size:0.75rem;color:#666;">Key 只存储在你的浏览器本地，不会上传到任何服务器。</span>
      </p>
      <div class="btn-row">
        <button id="goToSettingsBtn" class="primary small">去配置 API Key</button>
        <button id="copyPromptBtn2" class="outline small">📋 复制提示词</button>
        <button data-action="closeModal" class="outline small">稍后再说</button>
      </div>
    </div>
  `;
  setHTML(content, html);
  modal.removeAttribute('hidden');
  document.getElementById('goToSettingsBtn')?.addEventListener('click', () => {
    modal.setAttribute('hidden', '');
    togglePanel('settings');
  });
  document.getElementById('copyPromptBtn2')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const { buildAIPrompt } = await import('../ui.js');
    const prompt = await buildAIPrompt();
    const ok = await copyTextWithFeedback(prompt, btn);
    toast(ok ? '✅ 提示词已复制（含问题与领域），可粘贴到任何 AI 工具' : '复制失败，请长按手动复制');
  });
}

// ===== 日运细选弹窗 =====
export function showDailyFortunePicker() {
  const modal = document.getElementById('modal');
  const content = document.getElementById('modalContent');
  if (!modal || !content) return;

  const storedPeriods = getStoredPeriodCards();
  const todayKey = getCurrentPeriodKey('daily');

  const html = `
    <h3 style="color:var(--accent);text-align:center;margin-bottom:12px;">☯ 日运细选</h3>
    <p style="font-size:0.7rem;color:var(--dim);text-align:center;margin-bottom:10px;">每项独立抽牌·独立锁定</p>
    <div style="display:flex;flex-direction:column;gap:4px;max-height:50vh;overflow-y:auto;padding:4px;">
      ${DAILY_FORTUNE_TYPES.map(t => {
        const stored = storedPeriods[`daily_${t.key}`];
        const hasCard = stored && stored.periodKey === todayKey && stored.card;
        const btnText = hasCard ? `${t.icon} ${t.label}·查看` : `${t.icon} ${t.label}·抽牌`;
        const action = hasCard ? 'openPeriodDetail' : 'openPeriodDeck';
        return `<button data-action="${action}" data-period="daily" data-fortune-type="${t.key}" class="small outline" style="width:100%;padding:10px;font-size:0.85rem;text-align:left;">${btnText}</button>`;
      }).join('')}
      <button data-action="closeModal" class="small outline" style="width:100%;padding:10px;font-size:0.8rem;margin-top:6px;">取消</button>
    </div>
  `;
  setHTML(content, html);
  modal.removeAttribute('hidden');
}

// ===== 分享码 =====
export function generateShareCode() {
  const text = document.getElementById('interpretText')?.innerText;
  if (!text) { toast('没有可分享的解读', 2000, 'info'); return; }
  const data = { t: text, v: 1, ts: Date.now() };
  const json = JSON.stringify(data);
  const code = btoa(encodeURIComponent(json));
  copyTextWithFeedback(code).then(ok => {
    toast(ok ? '分享码已复制到剪贴板' : '复制失败，请手动复制');
  });
}

export function importShareCode() {
  const input = document.getElementById('importCode');
  if (!input) return;
  const code = input.value.trim();
  if (!code) { toast('请粘贴分享码', 2200, 'warning'); return; }
  try {
    const json = decodeURIComponent(atob(code));
    const data = JSON.parse(json);
    if (!data.t) throw new Error('无效数据');
    const resultArea = document.getElementById('resultArea');
    if (resultArea) {
      setHTML(resultArea, `<h3>${escapeForHTML(UI_TEXTS.step3)}</h3><div class="result-block">${escapeForHTML(data.t).replace(/\n/g, '<br>')}</div><div class="btn-row"><button data-action="closeModal" class="small">关闭</button></div>`);
    }
    toast(UI_TEXTS.toastImportSuccess);
  } catch (e) {
    toast(UI_TEXTS.toastImportFail);
  }
}

// ===== 历史详情 =====
export function showHistoryDetail(index) {
  const history = getHistory();
  const r = history[index];
  const modal = document.getElementById('modal');
  const content = document.getElementById('modalContent');
  if (!modal || !content || !r) return;

  // 对话上下文：有 chatHistory 用之；否则用「问题 + 解读正文」构造初始一轮
  const chat = (Array.isArray(r.chatHistory) && r.chatHistory.length)
    ? r.chatHistory.slice()
    : [
        { role: 'user', content: r.question || '（未提问）' },
        { role: 'assistant', content: r.text || '' }
      ];

  const renderAiBlock = () => {
    if (!chat.length) return '<p style="color:var(--dim);font-size:0.85rem;">暂无 AI 对话记录</p>';
    return '<div class="result-block" style="max-height:150px;margin-top:10px;font-size:0.85rem;overflow-y:auto;" id="historyChatBlock">' + chat.map(m => `<div class="chat-msg ${m.role === 'user' ? 'user' : 'ai'}">${escapeForHTML(m.content).replace(/\n/g, '<br>')}</div>`).join('') + '</div>';
  };

  const html = `<h3>历史详情</h3>
    <p style="font-size:0.85rem;color:var(--dim);"><strong>时间：</strong><span class="num">${escapeForHTML(new Date(r.time).toLocaleString())}</span></p>
    <p style="font-size:0.85rem;color:var(--dim);"><strong>问题：</strong>${escapeForHTML(r.question || '未提问')}</p>
    <p style="font-size:0.85rem;color:var(--dim);"><strong>类别：</strong>${escapeForHTML(r.category || '无')}</p>
    <div class="result-block" style="font-size:0.85rem;max-height:200px;overflow-y:auto;white-space:pre-wrap;">${escapeForHTML(r.text || '')}</div>
    <h4 style="margin-top:10px;color:var(--accent);font-size:0.9rem;">AI 对话</h4>${renderAiBlock()}
    <div id="historyFollowUp" style="margin-top:12px;border-top:1px dashed var(--border);padding-top:10px;">
      <div style="display:flex;gap:6px;">
        <input id="historyFollowUpInput" placeholder="继续追问这张牌 / 这份解读……" autocomplete="off"
          style="flex:1;font-size:0.85rem;padding:8px;border:1px solid var(--border);border-radius:6px;background:rgba(0,0,0,0.2);color:var(--text);">
        <button id="historyFollowUpSend" class="primary small" style="white-space:nowrap;">💬 追问</button>
      </div>
      <div id="historyFollowUpStatus" style="font-size:0.7rem;color:var(--dim);margin-top:6px;display:none;"></div>
    </div>
    <div class="btn-row" style="margin-top:10px;">
      <button id="copyFullBtn" class="small outline">📋 复制全部</button>
      <button data-action="deleteHistoryItem" data-history-index="${index}" class="outline small">删除此条</button>
      <button data-action="closeModal" class="small">${escapeForHTML(UI_TEXTS.btnClose)}</button>
    </div>
  `;
  setHTML(content, html);
  modal.removeAttribute('hidden');

  document.getElementById('copyFullBtn')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const fullText = [r.text || '', '===== AI 对话 =====', chat.map(m => (m.role === 'user' ? '用户：' : 'AI：') + m.content).join('\n\n')].join('\n\n');
    const ok = await copyTextWithFeedback(fullText, btn);
    toast(ok ? '完整记录已复制' : '复制失败');
  });

  // ---- 继续追问（多轮，基于该条历史的对话上下文） ----
  const sendBtn = document.getElementById('historyFollowUpSend');
  const input = document.getElementById('historyFollowUpInput');
  const status = document.getElementById('historyFollowUpStatus');
  let asking = false;

  async function sendAsk() {
    if (asking) return;
    const q = input.value.trim();
    if (!q) return;
    const settings = getApiSettings();
    if (!settings || !settings.apiKey) { toast('未配置 API Key，请先到「AI」设置', 2200, 'warning'); return; }
    asking = true;
    sendBtn.disabled = true;
    status.style.display = 'block';
    status.textContent = '思考中…';

    chat.push({ role: 'user', content: q });
    input.value = '';
    const provider = settings.provider || 'deepseek';
    let endpoint = settings.endpoint || API_PROVIDERS[provider]?.endpoint || '';
    if (endpoint.endsWith('/v1')) endpoint = endpoint.slice(0, -3);
    if (endpoint.endsWith('/')) endpoint = endpoint.slice(0, -1);
    const model = resolveApiModel(provider, settings.model, API_PROVIDERS[provider]?.model || '');
    try {
      const result = await requestFollowUp({
        history: chat,
        provider,
        apiKey: settings.apiKey,
        endpoint,
        model,
        temperature: settings.temperature,
        maxTokens: settings.maxTokens,
        topP: settings.topP,
        headers: settings.headers
      });
      chat.push({ role: 'assistant', content: result });
      updateHistoryChatAt(index, chat);
      const block = document.getElementById('historyChatBlock');
      if (block) {
        block.innerHTML += `<div class="chat-msg ai">${escapeForHTML(result).replace(/\n/g, '<br>')}</div>`;
        block.scrollTop = block.scrollHeight;
      }
      status.style.display = 'none';
      toast('AI 回复已保存', 2400, 'success');
    } catch (e) {
      chat.pop(); // 撤回未成功的提问，保留原上下文
      status.style.display = 'block';
      status.innerHTML = `<span style="color:#d45050;">失败：${escapeForHTML(e.message || '未知错误')}</span>`;
    } finally {
      asking = false;
      sendBtn.disabled = false;
    }
  }

  sendBtn?.addEventListener('click', sendAsk);
  input?.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendAsk(); });
}

// ===== 观测报告中心（完整时间线 + 周期报告 + 回看“当时的我”） =====
const PERIOD_LABELS = { weekly: '本周', monthly: '本月', seasonal: '本季', yearly: '今年' };

function formatTimestamp(ts) {
  const d = new Date(ts);
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

// 各周期起始时间（本周从周一开始）
function periodStartMs(periodType, now = new Date()) {
  const y = now.getFullYear();
  switch (periodType) {
    case 'weekly': {
      const d = new Date(now);
      d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    }
    case 'monthly': return new Date(y, now.getMonth(), 1).getTime();
    case 'seasonal': return new Date(y, Math.floor(now.getMonth() / 3) * 3, 1).getTime();
    case 'yearly': return new Date(y, 0, 1).getTime();
    default: return 0;
  }
}

function computeScoreStats(entries) {
  const scores = entries.map(e => e.durianScore || 0);
  if (!scores.length) return null;
  let comps = { diff: 0, ke: 0, trend: 0, tension: 0 };
  let c = 0;
  for (const e of entries) {
    if (e.durianComponents) {
      comps.diff += e.durianComponents.diff || 0;
      comps.ke += e.durianComponents.ke || 0;
      comps.trend += e.durianComponents.trend || 0;
      comps.tension += e.durianComponents.tension || 0;
      c++;
    }
  }
  if (c) for (const k in comps) comps[k] = Math.round(comps[k] / c);
  return {
    count: entries.length,
    avg: scores.reduce((a, b) => a + b, 0) / scores.length,
    max: Math.max(...scores),
    min: Math.min(...scores),
    comps: c ? comps : null,
  };
}

function trendOf(scores) {
  if (scores.length < 3) return '➡️ 平稳';
  const a = scores[scores.length - 1] - scores[scores.length - 3];
  return a > 0.5 ? '📈 上升' : a < -0.5 ? '📉 下降' : '➡️ 平稳';
}

// 时间线条目 ↔ 历史记录关联（±3 秒容差，按时间匹配）
function findHistoryIndexByTime(ts) {
  const history = getHistory();
  for (let i = 0; i < history.length; i++) {
    if (Math.abs((history[i].time || 0) - ts) < 3000) return i;
  }
  return -1;
}

// 回看“当时的我”：打开对应历史详情
export function replayTimelineEntry(time) {
  const idx = findHistoryIndexByTime(Number(time));
  if (idx >= 0) { showHistoryDetail(idx); return; }
  toast('这条记录没有对应的解读', 2200, 'warning');
}

// 渲染周期报告到 modal 内的周期报告区
export function renderPeriodReportInto(periodType) {
  const area = document.getElementById('periodReportArea');
  if (!area) return;
  const timeline = getTimeline();
  const entries = timeline.filter(t => t.time >= periodStartMs(periodType));
  const stats = computeScoreStats(entries);
  const label = PERIOD_LABELS[periodType] || periodType;

  if (!stats) {
    setHTML(area, `<p style="font-size:0.8rem;color:var(--dim);text-align:center;padding:10px;">${label}还没有记录，先抽一局吧。</p>`);
    return;
  }

  const trend = trendOf(entries.map(e => e.durianScore || 0));
  const comps = stats.comps;

  // 常见问题 top3
  const freq = {};
  for (const e of entries) if (e.question) freq[e.question] = (freq[e.question] || 0) + 1;
  const topQ = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 3)
    .map(([q, n]) => `${escapeForHTML(String(q).slice(0, 18))} ×${n}`).join(' · ');

  // 最近观测（“当时的我”可回看）
  const recentHtml = entries.slice(0, 3).map(t => {
    const s = t.durianScore || 0;
    const q = t.question ? String(t.question).slice(0, 20) : '未提问';
    return `<div style="display:flex;align-items:center;gap:6px;padding:5px 6px;border-radius:6px;background:rgba(0,0,0,0.12);margin-bottom:4px;font-size:0.72rem;">
      <span style="color:var(--dim);">${escapeForHTML(formatTimestamp(t.time).slice(5))}</span>
      <span style="flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeForHTML(q)}</span>
      <span style="font-weight:bold;">${s.toFixed(1)}</span>
      <button data-action="replayTimeline" data-time="${t.time}" class="small outline" style="font-size:0.6rem;padding:2px 6px;">当时的我</button>
    </div>`;
  }).join('');

  setHTML(area, `
    <div style="background:rgba(0,0,0,0.18);border-radius:8px;padding:10px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
        <strong style="font-size:0.9rem;">📅 ${label}报告</strong>
        <span style="font-size:0.7rem;color:var(--dim);">${stats.count} 次记录</span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:6px;">
        <div style="background:rgba(0,0,0,0.2);padding:6px;border-radius:6px;text-align:center;">
          <div style="font-size:0.6rem;color:var(--dim);">平均</div>
          <div style="font-size:1.1rem;font-weight:bold;">${stats.avg.toFixed(1)}</div>
        </div>
        <div style="background:rgba(0,0,0,0.2);padding:6px;border-radius:6px;text-align:center;">
          <div style="font-size:0.6rem;color:var(--dim);">最高</div>
          <div style="font-size:1.1rem;font-weight:bold;color:#F44336;">${stats.max}</div>
        </div>
        <div style="background:rgba(0,0,0,0.2);padding:6px;border-radius:6px;text-align:center;">
          <div style="font-size:0.6rem;color:var(--dim);">最低</div>
          <div style="font-size:1.1rem;font-weight:bold;color:#4CAF50;">${stats.min}</div>
        </div>
        <div style="background:rgba(0,0,0,0.2);padding:6px;border-radius:6px;text-align:center;">
          <div style="font-size:0.6rem;color:var(--dim);">趋势</div>
          <div style="font-size:1.1rem;font-weight:bold;">${trend}</div>
        </div>
      </div>
      ${comps ? `<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:4px;font-size:0.6rem;color:var(--dim);text-align:center;margin:6px 0;">
        <div>差值 ${comps.diff}</div><div>相克 ${comps.ke}</div><div>趋势 ${comps.trend}</div><div>张力 ${comps.tension}</div>
      </div>` : ''}
      ${topQ ? `<div style="font-size:0.72rem;color:var(--dim);margin-top:4px;">常见问题：${topQ}</div>` : ''}
      ${recentHtml ? `<div style="margin-top:8px;font-size:0.72rem;color:var(--dim);">最近记录（点“当时的我”回看完整解读）：</div>${recentHtml}` : ''}
    </div>
  `);
}

// 完整时间线列表（最新在前，最多 30 条，每条可回看）
function renderTimelineList(timeline) {
  if (!timeline.length) {
    return '<p style="font-size:0.8rem;color:var(--dim);text-align:center;padding:12px;">还没有记录，先去抽一局吧。</p>';
  }
  return timeline.slice(0, 30).map(t => {
    const s = Math.max(0, Math.min(10, t.durianScore || 0));
    const pct = Math.round(s * 10);
    const color = s >= 7 ? '#F44336' : s >= 5 ? '#FF9800' : s >= 3 ? '#FFC107' : '#4CAF50';
    const q = t.question ? String(t.question).slice(0, 24) : '未提问';
    return `<div style="display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:6px;background:rgba(0,0,0,0.15);margin-bottom:4px;">
      <div style="flex:0 0 74px;font-size:0.6rem;color:var(--dim);">${escapeForHTML(formatTimestamp(t.time))}</div>
      <div style="flex:1;min-width:0;">
        <div style="font-size:0.72rem;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeForHTML(q)}</div>
        <div style="height:5px;border-radius:3px;background:rgba(255,255,255,0.1);margin-top:3px;overflow:hidden;">
          <div style="height:100%;width:${pct}%;background:${color};border-radius:3px;"></div>
        </div>
      </div>
      <div style="flex:0 0 32px;font-size:0.8rem;font-weight:bold;color:${color};text-align:center;">${s.toFixed(1)}</div>
      <button data-action="replayTimeline" data-time="${t.time}" class="small outline" style="flex:0 0 auto;font-size:0.65rem;padding:3px 8px;">回看</button>
    </div>`;
  }).join('');
}

// 报告中心弹窗：周期报告 + 完整时间线
export function showReportsModal() {
  const modal = document.getElementById('modal');
  const content = document.getElementById('modalContent');
  if (!modal || !content) return;

  const timeline = getTimeline();
  const history = getHistory();

  const html = `
    <h3 style="text-align:center;">📊 我的记录</h3>
    <p style="font-size:0.7rem;color:var(--dim);text-align:center;margin-bottom:10px;">共 ${timeline.length} 次记录 · 历史 ${history.length} 条</p>
    <div class="btn-row" style="flex-wrap:wrap;justify-content:center;gap:6px;">
      <button data-action="periodReport" data-period="weekly" class="outline small">本周</button>
      <button data-action="periodReport" data-period="monthly" class="outline small">本月</button>
      <button data-action="periodReport" data-period="seasonal" class="outline small">本季</button>
      <button data-action="periodReport" data-period="yearly" class="outline small">今年</button>
    </div>
    <div id="periodReportArea" style="margin-top:10px;"></div>
    <hr style="border:none;border-top:1px dashed rgba(255,255,255,0.15);margin:12px 0;">
    <h4 style="color:var(--accent);font-size:0.95rem;margin-bottom:8px;">🕐 完整时间线 <span style="font-size:0.65rem;color:var(--dim);font-weight:normal;">（点击“回看”可看当时的完整解读）</span></h4>
    ${renderTimelineList(timeline)}
    <div class="btn-row" style="margin-top:10px;">
      <button data-action="durianReport" class="small outline">心情指数报告</button>
      <button data-action="closeModal" class="small">${escapeForHTML(UI_TEXTS.btnClose)}</button>
    </div>
  `;
  setHTML(content, html);
  modal.removeAttribute('hidden');
  renderPeriodReportInto('monthly');
}

// ===== 榴莲报告 =====
export function showDurianReport() {
  const timeline = getTimeline();
  const modal = document.getElementById('modal');
  const content = document.getElementById('modalContent');
  if (!modal || !content) return;
  if (timeline.length < 3) { toast('需要至少3次记录才能生成报告', 2400, 'warning'); return; }

  const recent = timeline.slice(0, 30);
  const scores = recent.map(t => t.durianScore || 0);
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  const max = Math.max(...scores);
  const min = Math.min(...scores);

  let avgDiff = 0, avgKe = 0, avgTrend = 0, avgTension = 0;
  let count = 0;
  for (const entry of recent) {
    if (entry.durianComponents) {
      avgDiff += entry.durianComponents.diff || 0;
      avgKe += entry.durianComponents.ke || 0;
      avgTrend += entry.durianComponents.trend || 0;
      avgTension += entry.durianComponents.tension || 0;
      count++;
    }
  }
  if (count > 0) {
    avgDiff = Math.round(avgDiff / count);
    avgKe = Math.round(avgKe / count);
    avgTrend = Math.round(avgTrend / count);
    avgTension = Math.round(avgTension / count);
  }

  const trend = scores.length >= 3
    ? scores[scores.length - 1] - scores[scores.length - 3] > 0.5 ? '📈 上升'
      : scores[scores.length - 1] - scores[scores.length - 3] < -0.5 ? '📉 下降' : '➡️ 平稳'
    : '➡️ 平稳';

  let advice = '';
  if (avg > 7) advice = '⚠️ 你的状态整体偏紧绷，建议暂停几天，让自己松一松。';
  else if (avg > 5) advice = '📌 当前处于中等张力区间，适合观察但不适合做重大决策。';
  else if (avg > 3) advice = '🌱 状态温和，适合推进日常事务和温和的自我观察。';
  else advice = '✨ 状态良好，如有重要决定，此时是较好的窗口期。';

  const html = `
    <h3>张力报告</h3>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:6px;margin:8px 0;">
      <div style="background:rgba(0,0,0,0.2);padding:6px;border-radius:6px;text-align:center;">
        <div style="font-size:0.6rem;color:var(--dim);">平均</div>
        <div style="font-size:1.2rem;font-weight:bold;">${avg.toFixed(1)}</div>
      </div>
      <div style="background:rgba(0,0,0,0.2);padding:6px;border-radius:6px;text-align:center;">
        <div style="font-size:0.6rem;color:var(--dim);">最高</div>
        <div style="font-size:1.2rem;font-weight:bold;color:#F44336;">${max}</div>
      </div>
      <div style="background:rgba(0,0,0,0.2);padding:6px;border-radius:6px;text-align:center;">
        <div style="font-size:0.6rem;color:var(--dim);">最低</div>
        <div style="font-size:1.2rem;font-weight:bold;color:#4CAF50;">${min}</div>
      </div>
      <div style="background:rgba(0,0,0,0.2);padding:6px;border-radius:6px;text-align:center;">
        <div style="font-size:0.6rem;color:var(--dim);">趋势</div>
        <div style="font-size:1.2rem;font-weight:bold;">${trend}</div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:4px;font-size:0.6rem;color:var(--dim);text-align:center;margin:4px 0;">
      <div>差值 ${avgDiff}</div>
      <div>相克 ${avgKe}</div>
      <div>趋势 ${avgTrend}</div>
      <div>张力 ${avgTension}</div>
    </div>
    <div style="padding:8px 12px;background:rgba(0,0,0,0.15);border-radius:6px;font-size:0.8rem;margin:6px 0;border-left:3px solid var(--accent);">
      ${escapeForHTML(advice)}
    </div>
    <p style="font-size:0.65rem;color:var(--dim);">基于最近 ${recent.length} 次记录</p>
    <div class="btn-row" style="margin-top:8px;">
      <button data-action="closeModal" class="small">关闭</button>
    </div>
  `;
  setHTML(content, html);
  modal.removeAttribute('hidden');
}

// ===== 赞赏支持 =====
export async function showRewardModal() {
  const modal = document.getElementById('modal');
  const content = document.getElementById('modalContent');
  if (!modal || !content) return;
  const imgBase = import.meta.env.BASE_URL || '/';
  const rewardUrl = import.meta.env.VITE_REWARD_URL || '';

  let qrImg = null;
  if (rewardUrl) {
    try { qrImg = await loadQRImage(rewardUrl, 200); } catch (e) { qrImg = null; }
  }

  const html = `
    <div style="text-align:center;">
      <h3 style="color:var(--accent);">☕ 赞赏支持</h3>
      <p style="color:var(--dim);font-size:0.85rem;">如果浮生牌对你有帮助，可以请我喝杯咖啡~</p>
      ${qrImg
        ? `<img src="${qrImg.src}" alt="赞赏码" style="max-width:200px;border-radius:8px;margin:12px 0;">`
        : `<img src="${imgBase}reward.png" alt="赞赏码" style="max-width:200px;border-radius:8px;margin:12px 0;"
             onerror="this.style.display='none';document.getElementById('rewardFallback').style.display='block'">
           <p id="rewardFallback" style="display:none;font-size:0.8rem;color:var(--dim);">
             ${rewardUrl ? '未找到赞赏码图片，请将图片放到项目根目录 public/reward.png' : '未配置赞赏链接，请设置 VITE_REWARD_URL 或放置 public/reward.png'}
           </p>`}
      <p style="font-size:0.7rem;color:var(--dim);">微信/支付宝扫码赞赏</p>
      <div class="btn-row"><button data-action="closeModal" class="small">关闭</button></div>
    </div>
  `;
  setHTML(content, html);
  modal.removeAttribute('hidden');
}
// ============================================================
// ========== 分享图统一绘制（新版 Share 架构驱动） ==========
// ============================================================

// ---------- 统一入口（仅走 share2 新模板：tarot / daily / divination） ----------
export async function generateShareImage(options = {}) {
  const container = document.getElementById('sharePreview');
  const canvas = document.getElementById('shareCanvas');
  if (!container || !canvas) { toast('分享组件未就绪', 2200, 'warning'); return; }

  const type = options.type || 'divination';
  const card = options.card || null;
  const typeKey = options.typeKey || 'overall';
  const fortuneType = options.fortuneType || typeKey || 'overall';
  const text = options.text || document.getElementById('interpretText')?.innerText || '';
  const template = options.template || '';

  const TEMPLATES = ['tarot', 'daily', 'mint', 'divination'];
  if (!TEMPLATES.includes(template)) { toast('未知分享模板', 2200, 'warning'); return; }

  canvas.width = 1080;
  canvas.height = 1440;
  const ctx = canvas.getContext('2d');

  let typeLabel = '浮生占卜';
  if (type === 'paige') typeLabel = '牌灵';
  else if (type === 'daily') typeLabel = getDailyFortuneType(fortuneType)?.label || '今日运势';

  let shareData;
  if (type === 'divination') {
    shareData = buildShareData(text);
  } else if (type === 'paige' || type === 'daily') {
    shareData = buildSingleCardShareData(card, fortuneType);
    // 牌灵：把"问题/课题"文本作为小字引语；日运：保留情绪金句路线，不混入运势报告
    if (type === 'paige' && text) shareData.quote = text;
    shareData.durian = state.durianIndex?.score || 0;
    shareData.relation = state.ti && state.yong ? getShengKe(getWuxing(state.ti), getWuxing(state.yong)) : '';
  } else {
    shareData = buildShareData(text);
  }

  await renderShareCard(canvas, shareData, template);
  // tarot/daily/divination 自带完整底部（含二维码与落款）
  container.removeAttribute('hidden');
  toast('✨ ' + typeLabel + '分享图已生成', 2200, 'success');
}

// ===== 保存分享图（文件名带毫秒时间戳，永不同名覆盖） =====
export function saveShareImage() {
  const canvas = document.getElementById('shareCanvas');
  if (!canvas) { toast('没有图片可保存', 2000, 'info'); return; }

  canvas.toBlob(function(blob) {
    if (!blob) { toast('保存失败', 2200, 'warning'); return; }
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = getUniqueFilename();
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast('💾 图片已保存（如果未自动下载，请长按图片保存）', 2400, 'success');
  }, 'image/png');
}

// ===== 数据迁移弹窗 =====
export function showDataMigrationModal() {
  const modal = document.getElementById('modal');
  const content = document.getElementById('modalContent');
  if (!modal || !content) return;

  const html = `
    <h3 style="color:var(--accent);">📦 数据备份</h3>
    <p style="color:var(--dim);font-size:0.8rem;line-height:1.8;margin:12px 0;">
      浮生牌是<strong>纯本地应用</strong>：你的记录、日运、时间胶囊只存在这台设备的浏览器里，
      <strong>不上传任何服务器</strong>——这既是隐私承诺，也意味着：清缓存、换浏览器或换手机，
      数据都会消失。
    </p>
    <p style="color:var(--accent);font-size:0.8rem;line-height:1.8;margin:12px 0;">
      💡 建议习惯：<strong>每月初导出一次</strong>存到网盘/相册；换设备时先导出，再导入。
    </p>
    <p style="color:var(--dim);font-size:0.75rem;line-height:1.7;margin:4px 0 12px;">
      🔄 导入为<strong>合并模式</strong>：历史记录双向去重合并；本机已有的日运、牌灵、AI 设置不会被覆盖，
      导入的牌灵只在本机未抽时补入——手机与电脑双端互导即可同一位玩家。
    </p>
    <div style="display:flex;flex-direction:column;gap:8px;margin:16px 0;">
      <button id="exportAllDataBtn" class="primary small">⬇️ 导出数据（存成本地备份）</button>
      <button id="importAllDataBtn" class="outline small">⬆️ 导入备份</button>
    </div>
    <input type="file" id="importDataFile" accept=".json" style="display:none;">
    <div class="btn-row"><button data-action="closeModal" class="small">关闭</button></div>
  `;
  setHTML(content, html);
  modal.removeAttribute('hidden');

  document.getElementById('exportAllDataBtn')?.addEventListener('click', () => {
    const json = exportAllDataJson();
    if (!json) { toast('没有可导出的数据', 2000, 'info'); return; }
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `浮生牌备份_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast('📦 数据已导出，请妥善保存', 2400, 'success');
  });

  document.getElementById('importAllDataBtn')?.addEventListener('click', () => {
    document.getElementById('importDataFile')?.click();
  });

  document.getElementById('importDataFile')?.addEventListener('change', function() {
    const file = this.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const success = importAllData(e.target.result);
        if (success) {
          toast('✅ 数据导入成功', 2400, 'success');
          modal.setAttribute('hidden', '');
          setTimeout(() => location.reload(), 800);
        } else {
          toast('❌ 导入失败，文件格式无效', 2600, 'warning');
        }
      } catch (err) {
        toast('❌ 导入失败: ' + err.message, 2600, 'warning');
      }
    };
    reader.readAsText(file);
  });
}
