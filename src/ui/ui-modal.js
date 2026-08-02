// ===== src/ui/ui-modal.js · 弹窗、Toast、引导与分享（统一 Share 架构驱动） =====
import { state } from '../state.js';
import { API_PROVIDERS, getWuxing, getCardColor, getShengKe, DAILY_FORTUNE_TYPES, getDailyFortuneType, getCurrentPeriodKey } from '../data.js';
import { requestReading, requestFollowUp } from '../ai.js';
import {
  getApiSettings, getProfile, getHistory, deleteHistoryItem,
  exportAllDataJson, importAllData,
  hasCompletedOnboarding, completeOnboarding,
  getTimeline, getTimeCapsule, getStoredPeriodCards
} from '../storage.js';
import { UI_TEXTS, ONBOARDING_STEPS } from '../texts/index.js';
import { renderTeachingPanel } from './ui-render.js';
import { escapeForHTML, setHTML } from '../utils/safe.js';
import { loadQRImage } from '../utils/qr.js';
import { copyTextWithFeedback } from '../utils/clipboard.js';
import { getPokerPersona, getDailyFortune, FORTUNE_TYPES } from '../persona.js';
import { getPaiGeQuestion, getPaiGeQuote, getFortuneTags, SOCIAL_INVITE_TEXT, SOCIAL_HASHTAGS, PAIGE_HASHTAGS } from '../texts/social.js';
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
      toast('有什么想问的，默念后抽牌即可');
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
  if (!modal || !content) { toast('弹窗系统尚未加载'); return; }
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
  if (!code) { toast('请粘贴分享码'); return; }
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

  let aiBlock = '';
  let fullText = r.text || '';
  if (r.chatHistory && r.chatHistory.length) {
    aiBlock = '<div class="result-block" style="max-height:150px;margin-top:10px;font-size:0.85rem;">' + r.chatHistory.map(m => `<div class="chat-msg ${m.role === 'user' ? 'user' : 'ai'}">${escapeForHTML(m.content).replace(/\n/g, '<br>')}</div>`).join('') + '</div>';
    const chatText = r.chatHistory.map(m => (m.role === 'user' ? '用户：' : 'AI：') + m.content).join('\n\n');
    fullText += '\n\n===== AI 对话 =====\n' + chatText;
  } else {
    aiBlock = '<p style="color:var(--dim);font-size:0.85rem;">暂无 AI 对话记录</p>';
  }

  const html = `<h3>历史详情</h3>
    <p style="font-size:0.85rem;color:var(--dim);"><strong>时间：</strong>${escapeForHTML(new Date(r.time).toLocaleString())}</p>
    <p style="font-size:0.85rem;color:var(--dim);"><strong>问题：</strong>${escapeForHTML(r.question || '未提问')}</p>
    <p style="font-size:0.85rem;color:var(--dim);"><strong>类别：</strong>${escapeForHTML(r.category || '无')}</p>
    <div class="result-block" style="font-size:0.85rem;max-height:200px;overflow-y:auto;white-space:pre-wrap;">${escapeForHTML(r.text || '')}</div>
    <h4 style="margin-top:10px;color:var(--accent);font-size:0.9rem;">AI 对话</h4>${aiBlock}
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
    const ok = await copyTextWithFeedback(fullText, btn);
    toast(ok ? '完整记录已复制' : '复制失败');
  });
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
  toast('这条观测没有对应的解读记录');
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
    setHTML(area, `<p style="font-size:0.8rem;color:var(--dim);text-align:center;padding:10px;">${label}还没有观测记录，先抽一局吧。</p>`);
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
        <span style="font-size:0.7rem;color:var(--dim);">${stats.count} 次观测</span>
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
      ${recentHtml ? `<div style="margin-top:8px;font-size:0.72rem;color:var(--dim);">最近观测（点“当时的我”回看完整解读）：</div>${recentHtml}` : ''}
    </div>
  `);
}

// 完整时间线列表（最新在前，最多 30 条，每条可回看）
function renderTimelineList(timeline) {
  if (!timeline.length) {
    return '<p style="font-size:0.8rem;color:var(--dim);text-align:center;padding:12px;">还没有观测记录，先去抽一局吧。</p>';
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
    <h3 style="text-align:center;">📊 观测报告</h3>
    <p style="font-size:0.7rem;color:var(--dim);text-align:center;margin-bottom:10px;">共 ${timeline.length} 次观测 · 历史 ${history.length} 条记录</p>
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
      <button data-action="durianReport" class="small outline">张力总报告</button>
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
  if (timeline.length < 3) { toast('需要至少3次观测才能生成报告'); return; }

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
  if (avg > 7) advice = '⚠️ 你的观测整体张力偏高，建议暂停几天，让状态沉淀后再试。';
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
    <p style="font-size:0.65rem;color:var(--dim);">基于最近 ${recent.length} 次观测</p>
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

// ---------- 文本换行 ----------
function wrapText(ctx, text, maxWidth, maxLines) {
  const lines = [];
  let current = '';
  for (const ch of text) {
    const test = current + ch;
    if (ctx.measureText(test).width > maxWidth) {
      lines.push(current);
      current = ch;
      if (lines.length >= maxLines) break;
    } else {
      current = test;
    }
  }
  if (current && lines.length < maxLines) lines.push(current);
  while (lines.length < maxLines) lines.push('');
  return lines.slice(0, maxLines);
}

// ---------- 圆角矩形（兼容旧浏览器） ----------
function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// ---------- 统一底部社交栏（淡色印章风：弱化广告感，像一枚落款） ----------
async function drawSocialFooter(ctx, w, h, typeLabel) {
  const sealR = 58;              // 印章半径
  const sealCX = 92;             // 印章圆心 x
  const sealCY = h - 92;         // 印章圆心 y
  const inkDark = 'rgba(106,90,58,0.85)';   // 淡墨色（深棕）
  const inkLight = 'rgba(106,90,58,0.4)';   // 浅墨色
  const paper = 'rgba(250,246,235,0.94)';   // 宣纸底色

  // 印章外环（双圈细描边，像老式印章）
  ctx.save();
  ctx.beginPath();
  ctx.arc(sealCX, sealCY, sealR, 0, Math.PI * 2);
  ctx.fillStyle = paper;
  ctx.fill();
  ctx.strokeStyle = inkDark;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(sealCX, sealCY, sealR - 6, 0, Math.PI * 2);
  ctx.strokeStyle = inkLight;
  ctx.lineWidth = 1;
  ctx.stroke();

  // 印章内：淡墨二维码（小尺寸，不抢视觉）
  const qrSize = 82;
  // 死链接钉死：不用 window.location 拼接，防止本地环境（localhost:5174）干扰
  const qrTarget = 'https://y22t19053.github.io/FuShengPai/';
  const qrImg = await loadQRImage(qrTarget, qrSize, { dark: '#6a5a3a', light: '#faf6eb' });
  if (qrImg) {
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.drawImage(qrImg, sealCX - qrSize / 2, sealCY - qrSize / 2, qrSize, qrSize);
    ctx.restore();
  }

  // 印章右下角的小点装饰（仿篆刻留白）
  ctx.fillStyle = inkLight;
  ctx.beginPath();
  ctx.arc(sealCX + sealR - 16, sealCY + sealR - 16, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 右侧落款文字（克制：不出现"扫码领福利"式话术）
  const tx = sealCX + sealR + 26;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = 'rgba(80,65,50,0.8)';
  ctx.font = 'bold 26px "KaiTi","PingFang SC",serif';
  ctx.fillText('浮生牌', tx, h - 108);

  ctx.fillStyle = 'rgba(80,65,50,0.5)';
  ctx.font = '18px "KaiTi","PingFang SC",serif';
  ctx.fillText(`观牌知势 · ${typeLabel}`, tx, h - 74);

  const dateStr = new Date().toISOString().slice(0, 10);
  ctx.fillStyle = 'rgba(106,90,58,0.45)';
  ctx.font = '15px "Georgia",sans-serif';
  ctx.fillText(`仅限今日 · ${dateStr}`, tx, h - 46);

  // 右下角极淡的装饰字（几乎看不见，纯氛围）
  ctx.fillStyle = 'rgba(106,90,58,0.14)';
  ctx.font = '14px "KaiTi",serif';
  ctx.textAlign = 'right';
  ctx.fillText('一 牌 一 观', w - 40, h - 36);
}

// ---------- 旧报纸基底（用于占卜/人格图 600×800，会被 scale 放大） ----------
function drawCardBase(ctx, w, h, motto) {
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, '#e8ddc5');
  grad.addColorStop(0.5, '#ddd0b0');
  grad.addColorStop(1, '#d2c4a2');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  for (let i = 0; i < 120; i++) {
    const x = Math.random() * w, y = Math.random() * h;
    const r = Math.random() * 2 + 0.5;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(120, 100, 70, ${Math.random() * 0.15})`;
    ctx.fill();
  }

  ctx.save();
  ctx.strokeStyle = 'rgba(80, 65, 50, 0.7)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  for (let i = 0; i <= 60; i++) {
    const t = i / 60;
    const x = 18 + t * (w - 36) + (Math.random() - 0.5) * 1.2;
    const y = 18 + (Math.random() - 0.5) * 1.2;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  for (let i = 0; i <= 60; i++) {
    const t = i / 60;
    const x = w - 18 + (Math.random() - 0.5) * 1.2;
    const y = 18 + t * (h - 36) + (Math.random() - 0.5) * 1.2;
    ctx.lineTo(x, y);
  }
  for (let i = 0; i <= 60; i++) {
    const t = i / 60;
    const x = w - 18 - t * (w - 36) + (Math.random() - 0.5) * 1.2;
    const y = h - 18 + (Math.random() - 0.5) * 1.2;
    ctx.lineTo(x, y);
  }
  for (let i = 0; i <= 60; i++) {
    const t = i / 60;
    const x = 18 + (Math.random() - 0.5) * 1.2;
    const y = h - 18 - t * (h - 36) + (Math.random() - 0.5) * 1.2;
    ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = 'rgba(80, 65, 50, 0.6)';
  ctx.font = '14px "Songti SC", "KaiTi", "PingFang SC", "Microsoft YaHei", serif';
  ctx.textAlign = 'left';
  ctx.fillText('浮生牌', 30, 40);

  ctx.fillStyle = 'rgba(80, 65, 50, 0.4)';
  ctx.font = '12px "KaiTi", "PingFang SC", "Microsoft YaHei", serif';
  ctx.textAlign = 'right';
  ctx.fillText('随手翻翻', w - 30, h - 24);

  ctx.fillStyle = 'rgba(80, 65, 50, 0.2)';
  ctx.font = '12px "KaiTi", "PingFang SC", "Microsoft YaHei", serif';
  ctx.save();
  ctx.translate(w - 30, 90);
  ctx.rotate(Math.PI / 2);
  ctx.fillText(motto || '· 观 牌 如 观 心 ·', 0, 0);
  ctx.restore();

  ctx.save();
  ctx.translate(50, 78);
  ctx.rotate(-0.15);
  ctx.beginPath();
  ctx.arc(0, 0, 10, 0, Math.PI * 2);
  ctx.fillStyle = '#2c2c2c';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(4, -2, 7.5, 0, Math.PI * 2);
  ctx.fillStyle = '#e8ddc5';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, 5, 2, 0, Math.PI * 2);
  ctx.fillStyle = '#c0392b';
  ctx.fill();
  ctx.restore();
}

// ---------- 九宫占卜卡（旧报纸） ----------
async function drawDivinationCard(ctx, w, h, text) {
  ctx.save();
  ctx.strokeStyle = 'rgba(80, 65, 50, 0.18)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(60, 220); ctx.lineTo(w - 60, 200);
  ctx.moveTo(60, 240); ctx.lineTo(w - 60, 220);
  ctx.moveTo(60, 260); ctx.lineTo(w - 60, 240);
  ctx.stroke();
  ctx.restore();

  const tiWx = state.ti ? getWuxing(state.ti) : '?';
  const yongWx = state.yong ? getWuxing(state.yong) : '?';
  const rel = state.ti && state.yong ? (getShengKe(tiWx, yongWx) || '未知') : '未知';
  ctx.fillStyle = 'rgba(60, 50, 40, 0.85)';
  ctx.font = 'bold 24px "Songti SC", "KaiTi", "PingFang SC", "Microsoft YaHei", serif';
  ctx.textAlign = 'center';
  ctx.fillText('你的牌 · ' + tiWx + '   ⚡   ' + yongWx, w/2, 110);
  ctx.fillStyle = 'rgba(180, 60, 50, 0.8)';
  ctx.font = '18px "KaiTi", "PingFang SC", "Microsoft YaHei", serif';
  ctx.fillText('这局：' + rel, w/2, 150);

  const lines = text.split('\n').filter(l => l.trim() && !l.includes('【') && !l.includes('差值') && !l.includes('旺衰'));
  const pick = lines.length > 3 ? lines[Math.floor(Math.random() * 3)] : (lines[0] || '牌未落定，心却已有答案。');
  ctx.fillStyle = 'rgba(60, 50, 40, 0.65)';
  ctx.font = '18px "KaiTi", "PingFang SC", "Microsoft YaHei", serif';
  const summary = wrapText(ctx, pick, 420, 2);
  summary.forEach((ln, i) => ctx.fillText(ln, w/2, 190 + i * 26));

  ctx.fillStyle = 'rgba(100, 80, 60, 0.4)';
  ctx.font = '14px "KaiTi", "PingFang SC", "Microsoft YaHei", serif';
  ctx.fillText('—— 牌说', w/2 + 100, 260);

  const durian = state.durianIndex || { score: 0, level: '未知' };
  ctx.fillStyle = 'rgba(80, 70, 50, 0.6)';
  ctx.font = '16px "Georgia", "PingFang SC", sans-serif';
  ctx.fillText('🍈 ' + durian.score + '/10', w/2, h - 160);
}

// ---------- 人格卡（旧） ----------
async function drawPersonaCard(ctx, w, h, card) {
  const persona = getPokerPersona(card);
  if (!persona) return;

  const wxColorMap = { '木':'#5a7a4a', '火':'#a04040', '土':'#9a7a4a', '金':'#6a6a5a', '水':'#4a6a8a', '天':'#8a7a5a', '人':'#5a5a6a' };
  const accent = wxColorMap[persona.element] || '#8a7a5a';

  ctx.save();
  ctx.translate(w/2, 220);
  ctx.rotate(-0.06);
  ctx.beginPath();
  ctx.arc(0, 0, 70, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  ctx.stroke();

  const rank = card.isJoker ? card.type : card.rank;
  const suit = card.isJoker ? (card.type === '大王' ? '☀' : '☽') : card.suit;
  ctx.shadowColor = 'rgba(192, 57, 43, 0.2)';
  ctx.shadowBlur = 8;
  ctx.fillStyle = '#2c2c2c';
  ctx.font = 'bold 58px "KaiTi", "PingFang SC", "Microsoft YaHei", serif';
  ctx.textAlign = 'center';
  ctx.fillText(suit + rank, 0, 20);
  ctx.shadowBlur = 0;
  ctx.restore();

  ctx.fillStyle = 'rgba(60, 50, 40, 0.8)';
  ctx.font = '18px "KaiTi", "PingFang SC", "Microsoft YaHei", serif';
  ctx.textAlign = 'center';
  ctx.fillText('你 是 这 样 的 牌', w/2, 330);

  ctx.fillStyle = '#2c2c2c';
  ctx.font = 'bold 26px "Songti SC", "KaiTi", "PingFang SC", "Microsoft YaHei", serif';
  ctx.fillText(persona.shortTitle || persona.title, w/2, 370);

  const kws = persona.keywords.slice(0, 3);
  kws.forEach((kw, i) => {
    const bx = w/2 - 60 + i * 60;
    ctx.fillStyle = 'rgba(180, 60, 50, 0.1)';
    ctx.fillRect(bx - 24, 400, 48, 20);
    ctx.strokeStyle = 'rgba(180, 60, 50, 0.25)';
    ctx.strokeRect(bx - 24, 400, 48, 20);
    ctx.fillStyle = 'rgba(80, 70, 50, 0.8)';
    ctx.font = '11px "Songti SC", "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText(kw, bx, 414);
  });

  ctx.fillStyle = 'rgba(60, 50, 40, 0.65)';
  ctx.font = '15px "KaiTi", "PingFang SC", "Microsoft YaHei", serif';
  const firstLine = persona.core.split('。')[0] + '。';
  const lines = wrapText(ctx, firstLine, 380, 2);
  lines.forEach((ln, i) => ctx.fillText(ln, w/2, 470 + i * 22));

  ctx.fillStyle = 'rgba(180, 60, 50, 0.5)';
  ctx.font = '13px "KaiTi", "PingFang SC", "Microsoft YaHei", serif';
  ctx.fillText('· 就 是 这 张 ·', w/2, h - 160);
}

// ---------- 牌灵卡（深空大字报 1080×1440） ----------
async function drawPaiGeCard(ctx, w, h, card) {
  const q = getPaiGeQuestion(card);
  if (!q) return;
  const quote = getPaiGeQuote(card);

  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#0b0818');
  bg.addColorStop(0.5, '#1a142b');
  bg.addColorStop(1, '#0d0a1a');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  const glow = ctx.createRadialGradient(w / 2, 520, 50, w / 2, 520, 600);
  glow.addColorStop(0, 'rgba(201,160,96,0.08)');
  glow.addColorStop(1, 'rgba(201,160,96,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255,255,240,0.35)';
  ctx.font = '20px "KaiTi","PingFang SC",serif';
  const quoteLine = '“' + quote.text + '” —— ' + quote.author;
  ctx.fillText(quoteLine.slice(0, 30), w / 2, 80);

  ctx.strokeStyle = 'rgba(201,160,96,0.2)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(100, 130);
  ctx.lineTo(w - 100, 130);
  ctx.stroke();

  const centerX = w / 2, centerY = 560;
  ctx.fillStyle = 'rgba(245,240,225,0.06)';
  roundRectPath(ctx, centerX - 250, centerY - 320, 500, 640, 24);
  ctx.fill();
  ctx.strokeStyle = 'rgba(245,240,225,0.12)';
  ctx.lineWidth = 1;
  ctx.stroke();

  const rank = card.isJoker ? '★' : card.rank;
  const suit = card.isJoker ? '' : card.suit;
  const isRed = card.isJoker ? false : (card.suit === '♥' || card.suit === '♦');
  const mainColor = isRed ? '#e74c3c' : '#f0e6d0';

  ctx.fillStyle = mainColor;
  ctx.font = 'bold 56px "Georgia",serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(rank, 90, 210);
  ctx.font = '60px "Georgia",serif';
  ctx.fillText(suit, 90, 280);

  ctx.save();
  ctx.translate(w - 90, 910);
  ctx.rotate(Math.PI);
  ctx.fillStyle = mainColor;
  ctx.font = 'bold 56px "Georgia",serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(rank, 0, 0);
  ctx.font = '60px "Georgia",serif';
  ctx.fillText(suit, 0, 70);
  ctx.restore();

  ctx.shadowColor = 'rgba(201,160,96,0.4)';
  ctx.shadowBlur = 60;
  ctx.fillStyle = mainColor;
  ctx.font = 'bold 280px "Georgia",serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(suit || (card.type === '大王' ? '☀' : '☽'), centerX, centerY - 40);
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#f0e6d0';
  ctx.font = 'bold 64px "KaiTi","PingFang SC",serif';
  ctx.fillText(q.title, centerX, centerY + 250);

  q.keywords.slice(0, 3).forEach((kw, i) => {
    const x = centerX - 100 + i * 100;
    ctx.fillStyle = 'rgba(201,160,96,0.12)';
    roundRectPath(ctx, x - 50, centerY + 290, 100, 44, 22);
    ctx.fill();
    ctx.fillStyle = 'rgba(201,160,96,0.85)';
    ctx.font = '20px "PingFang SC",sans-serif';
    ctx.fillText(kw, x, centerY + 318);
  });

  ctx.fillStyle = 'rgba(240,230,208,0.7)';
  ctx.font = '28px "KaiTi",serif';
  const questionLines = wrapText(ctx, q.question, 800, 3);
  questionLines.forEach((ln, i) => ctx.fillText(ln, centerX, centerY + 430 + i * 40));

  ctx.fillStyle = 'rgba(201,160,96,0.35)';
  ctx.font = '16px "PingFang SC",sans-serif';
  ctx.fillText('「见牌如见本心，不告亦知，不语已明。」', w - 60, h - 210);
}

// ---------- 日运卡（大字报 1080×1440） ----------
async function drawDailyFortuneCard(ctx, w, h, card, typeKey) {
  const fortune = getDailyFortune(card, typeKey);
  if (!fortune) return;

  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, '#e8ddc5');
  grad.addColorStop(0.5, '#ddd0b0');
  grad.addColorStop(1, '#d2c4a2');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  for (let i = 0; i < 300; i++) {
    const x = Math.random() * w, y = Math.random() * h;
    const r = Math.random() * 3 + 1;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(120,100,70,${Math.random() * 0.1})`;
    ctx.fill();
  }

  const wxColorMap = { '木':'#5a7a4a', '火':'#a04040', '土':'#9a7a4a', '金':'#6a6a5a', '水':'#4a6a8a', '天':'#8a7a5a', '人':'#5a5a6a' };
  const accent = wxColorMap[fortune.wx] || '#8a7a5a';

  ctx.fillStyle = accent;
  ctx.font = 'bold 40px "Songti SC","KaiTi",serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(fortune.typeIcon + ' ' + fortune.typeLabel, w / 2, 100);

  const cardX = w / 2 - 180, cardY = 180, cardW = 360, cardH = 500;
  ctx.save();
  ctx.translate(w / 2, cardY + cardH / 2 + 20);
  ctx.rotate(-0.05);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  roundRectPath(ctx, -cardW / 2, -cardH / 2, cardW, cardH, 24);
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 6;
  ctx.stroke();

  const rank = card.isJoker ? card.type : card.rank;
  const suit = card.isJoker ? (card.type === '大王' ? '☀' : '☽') : card.suit;
  ctx.fillStyle = '#2c2c2c';
  ctx.font = 'bold 120px "Georgia",serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(suit + rank, 0, 20);
  ctx.restore();

  ctx.fillStyle = accent;
  ctx.font = 'bold 80px "KaiTi",serif';
  ctx.fillText(fortune.grade, w / 2, cardY + cardH + 100);

  ctx.fillStyle = 'rgba(60,50,40,0.85)';
  ctx.font = 'bold 34px "KaiTi","PingFang SC",serif';
  const lines = wrapText(ctx, fortune.text, 800, 3);
  lines.forEach((ln, i) => ctx.fillText(ln, w / 2, cardY + cardH + 200 + i * 48));

  const tags = getFortuneTags(card, typeKey);
  tags.slice(0, 3).forEach((tag, i) => {
    const x = w / 2 - 110 + i * 110;
    ctx.fillStyle = 'rgba(201,160,96,0.2)';
    roundRectPath(ctx, x - 50, cardY + cardH + 340, 100, 40, 20);
    ctx.fill();
    ctx.fillStyle = '#6a5a3a';
    ctx.font = '18px "PingFang SC",sans-serif';
    ctx.fillText(tag, x, cardY + cardH + 366);
  });

  ctx.fillStyle = 'rgba(100,90,70,0.4)';
  ctx.font = '16px "Georgia",sans-serif';
  ctx.fillText(new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }), w / 2, cardY + cardH + 430);
}

// ---------- 统一入口（支持新版 Share 模板 + 旧版绘制） ----------
export async function generateShareImage(options = {}) {
  const container = document.getElementById('sharePreview');
  const canvas = document.getElementById('shareCanvas');
  if (!container || !canvas) { toast('分享组件未就绪'); return; }

  const type = options.type || 'divination';
  const card = options.card || null;
  const typeKey = options.typeKey || 'overall';
  const fortuneType = options.fortuneType || typeKey || 'overall';
  const text = options.text || document.getElementById('interpretText')?.innerText || '';
  const template = options.template || ''; // 可选：新 Share 模板

  canvas.width = 1080;
  canvas.height = 1440;
  const ctx = canvas.getContext('2d');

  let typeLabel = '浮生占卜';
  if (type === 'paige') typeLabel = '牌灵';
  else if (type === 'daily') typeLabel = getDailyFortuneType(fortuneType)?.label || '今日运势';
  else if (type === 'persona') typeLabel = '人格分析';

  // ===== 优先使用新版 Share 架构模板 =====
  if (template && ['tarot', 'daily', 'divination'].includes(template)) {
    try {
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
      return;
    } catch (e) {
      console.warn('Share 模板渲染失败，回退旧版：', e);
      try {
        if (type === 'paige' && card) {
          await drawPaiGeCard(ctx, 1080, 1440, card);
          await drawSocialFooter(ctx, 1080, 1440, typeLabel);
          container.removeAttribute('hidden');
          toast('✨ 牌灵卡已生成，长按保存或截图分享', 2200, 'success');
          return;
        }
        if (type === 'daily' && card) {
          await drawDailyFortuneCard(ctx, 1080, 1440, card, fortuneType);
          await drawSocialFooter(ctx, 1080, 1440, typeLabel);
          container.removeAttribute('hidden');
          toast('✨ 日运卡已生成，长按保存或截图分享', 2200, 'success');
          return;
        }
      } catch (fallbackError) {
        console.error('分享图回退失败', fallbackError);
      }
    }
  }

  // ===== 旧版绘制（默认） =====
  if (type === 'paige' && card) {
    await drawPaiGeCard(ctx, 1080, 1440, card);
    await drawSocialFooter(ctx, 1080, 1440, typeLabel);
    container.removeAttribute('hidden');
    toast('✨ 牌灵卡已生成，长按保存或截图分享');
    return;
  } else if (type === 'daily' && card) {
    await drawDailyFortuneCard(ctx, 1080, 1440, card, fortuneType);
    await drawSocialFooter(ctx, 1080, 1440, typeLabel);
    container.removeAttribute('hidden');
    toast('✨ 日运卡已生成，长按保存或截图分享');
    return;
  } else if (type === 'divination') {
    ctx.save();
    ctx.scale(1.8, 1.8);
    drawCardBase(ctx, 600, 800, '观牌知势 · 明心见性');
    await drawDivinationCard(ctx, 600, 800, text);
    ctx.restore();
    await drawSocialFooter(ctx, 1080, 1440, typeLabel);
  } else if (type === 'persona' && card) {
    ctx.save();
    ctx.scale(1.8, 1.8);
    drawCardBase(ctx, 600, 800, '身 份 告 宣');
    await drawPersonaCard(ctx, 600, 800, card);
    ctx.restore();
    await drawSocialFooter(ctx, 1080, 1440, typeLabel);
  } else {
    toast('未知分享类型');
    return;
  }

  container.removeAttribute('hidden');
  toast('✨ ' + typeLabel + '分享图已生成', 2200, 'success');
}

// ===== 保存分享图（文件名带毫秒时间戳，永不同名覆盖） =====
export function saveShareImage() {
  const canvas = document.getElementById('shareCanvas');
  if (!canvas) { toast('没有图片可保存', 2000, 'info'); return; }

  canvas.toBlob(function(blob) {
    if (!blob) { toast('保存失败'); return; }
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = getUniqueFilename();
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast('💾 图片已保存（如果未自动下载，请长按图片保存）');
  }, 'image/png');
}

// ===== 数据迁移弹窗 =====
export function showDataMigrationModal() {
  const modal = document.getElementById('modal');
  const content = document.getElementById('modalContent');
  if (!modal || !content) return;

  const html = `
    <h3 style="color:var(--accent);">📦 数据迁移</h3>
    <p style="color:var(--dim);font-size:0.8rem;line-height:1.8;margin:12px 0;">
      浮生牌是<strong>纯本地应用</strong>：你的牌史、日运、时间胶囊只存在这台设备的浏览器里，
      <strong>不上传任何服务器</strong>——这既是隐私承诺，也意味着：清缓存、换浏览器或换手机，
      数据都会消失。
    </p>
    <p style="color:var(--accent);font-size:0.8rem;line-height:1.8;margin:12px 0;">
      💡 建议习惯：<strong>每月初导出一次</strong>存到网盘/相册；换设备时先导出，再导入。
    </p>
    <div style="display:flex;flex-direction:column;gap:8px;margin:16px 0;">
      <button id="exportAllDataBtn" class="primary small">⬇️ 导出全部数据（存为备份文件）</button>
      <button id="importAllDataBtn" class="outline small">⬆️ 导入备份（覆盖当前数据）</button>
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
    toast('📦 数据已导出，请妥善保存');
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
          toast('❌ 导入失败，文件格式无效');
        }
      } catch (err) {
        toast('❌ 导入失败: ' + err.message);
      }
    };
    reader.readAsText(file);
  });
}