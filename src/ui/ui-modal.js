// ===== src/ui/ui-modal.js · 弹窗、Toast、引导与分享（最终版） =====
import { state } from '../state.js';
import { SUITS, RANKS, API_PROVIDERS, getWuxing, getCardColor, getShengKe } from '../data.js';
import { requestReading, requestFollowUp } from '../ai.js';
import {
  getApiSettings, getProfile, getHistory, deleteHistoryItem,
  exportAllData, hasCompletedOnboarding, completeOnboarding,
  getTimeline, getTimeCapsule
} from '../storage.js';
import { UI_TEXTS, SHARE_QUOTES, ONBOARDING_STEPS } from '../texts/index.js';
import { renderTeachingPanel } from './ui-render.js';
import { escapeForHTML, setHTML } from '../utils/safe.js';

export let toastTimer = null;

export function toast(msg, duration = 2000) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
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
    if (panelId === 'history') {
      import('./ui-render.js').then(m => m.renderHistoryPanel());
    }
    if (panelId === 'settings') {
      import('./ui-render.js').then(m => m.initSettingsPanel());
    }
    if (panelId === 'profile') {
      import('./ui-render.js').then(m => m.initProfilePanel());
    }
  }
}

export function showOnboarding() { state.currentOnboardStep = 0; renderOnboardStep(); }

// ===== 新手引导（重写版：四步更清晰、多行文本、按钮动态文案） =====
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
  const actionBtn = isLast ? '开始使用' : '下一步';

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
    }
  });

  const skipBtn = overlay.querySelector('#onboardSkip');
  if (skipBtn) skipBtn.addEventListener('click', () => { overlay.remove(); completeOnboarding(); });
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
  document.getElementById('copyPromptBtn2')?.addEventListener('click', async () => {
    const { buildAIPrompt } = await import('../ui.js');
    const prompt = await buildAIPrompt();
    navigator.clipboard.writeText(prompt).then(
      () => toast('✅ 提示词已复制，可粘贴到任何 AI 工具使用'),
      () => toast('复制失败')
    );
  });
}

// ===== 分享码（安全导入） =====
export function generateShareCode() {
  const text = document.getElementById('interpretText')?.innerText;
  if (!text) { toast('没有可分享的解读'); return; }
  const data = { t: text, v: 1, ts: Date.now() };
  const json = JSON.stringify(data);
  const code = btoa(encodeURIComponent(json));
  navigator.clipboard.writeText(code).then(
    () => toast('分享码已复制到剪贴板'),
    () => toast('复制失败，请手动复制')
  );
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

// ===== 历史详情（安全） =====
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

  document.getElementById('copyFullBtn')?.addEventListener('click', () => {
    navigator.clipboard.writeText(fullText).then(
      () => toast('完整记录已复制'),
      () => toast('复制失败')
    );
  });
}

// ===== 榴莲报告（名称已统一为榴莲指数） =====
export function showDurianReport() {
  const timeline = getTimeline();
  const modal = document.getElementById('modal');
  const content = document.getElementById('modalContent');
  if (!modal || !content) return;
  if (timeline.length < 3) { toast('需要至少3次观测才能生成报告'); return; }

  const recent = timeline.slice(-30);
  const scores = recent.map(t => t.durianScore || 0);
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  const max = Math.max(...scores);
  const min = Math.min(...scores);

  // 读取 durianComponents
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
    <h3>🍈 榴莲报告</h3>
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

// ===== 赞赏支持（修复图片路径 + 后备提示） =====
export function showRewardModal() {
  const modal = document.getElementById('modal');
  const content = document.getElementById('modalContent');
  if (!modal || !content) return;
  const imgBase = import.meta.env.BASE_URL || '/';
  const html = `
    <div style="text-align:center;">
      <h3 style="color:var(--accent);">☕ 赞赏支持</h3>
      <p style="color:var(--dim);font-size:0.85rem;">如果浮生牌对你有帮助，可以请我喝杯咖啡~</p>
      <img src="${imgBase}reward.png" alt="赞赏码" style="max-width:200px;border-radius:8px;margin:12px 0;" 
           onerror="this.style.display='none';document.getElementById('rewardFallback').style.display='block'">
      <p id="rewardFallback" style="display:none;font-size:0.8rem;color:var(--dim);">未找到赞赏码图片，请将图片放到项目根目录 public/reward.png</p>
      <p style="font-size:0.7rem;color:var(--dim);">微信/支付宝扫码赞赏</p>
      <div class="btn-row"><button data-action="closeModal" class="small">关闭</button></div>
    </div>
  `;
  setHTML(content, html);
  modal.removeAttribute('hidden');
}

// ===== 分享图（包含开源地址） =====
export function generateShareImage() {
  const container = document.getElementById('sharePreview');
  const canvas = document.getElementById('shareCanvas');
  if (!container || !canvas) { toast('分享组件未就绪'); return; }
  const text = document.getElementById('interpretText')?.innerText;
  if (!text) { toast('没有可分享的内容'); return; }

  canvas.width = 600;
  canvas.height = 800;
  const ctx = canvas.getContext('2d');

  const grad = ctx.createLinearGradient(0, 0, 600, 800);
  grad.addColorStop(0, '#1a1a2e');
  grad.addColorStop(1, '#0d0d15');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 600, 800);

  ctx.strokeStyle = 'rgba(201,160,96,0.5)';
  ctx.lineWidth = 2;
  ctx.strokeRect(20, 20, 560, 760);

  ctx.fillStyle = '#c9a060';
  ctx.font = 'bold 28px "Georgia", serif';
  ctx.textAlign = 'center';
  ctx.fillText('浮生牌', 300, 70);

  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = '14px "Georgia", sans-serif';
  ctx.fillText(new Date().toLocaleDateString('zh-CN'), 300, 100);

  let tiWx = '?', yongWx = '?', relation = '';
  if (state.ti && state.yong) {
    tiWx = getWuxing(state.ti);
    yongWx = getWuxing(state.yong);
    const rel = getShengKe(tiWx, yongWx);
    relation = rel || '未知';
  }
  const wxTags = { '火': '🔥 行动者', '金': '⚔️ 判断者', '木': '🌳 成长者', '水': '🌊 洞察者', '土': '🏔️ 承载者', '天': '☀️ 超越者', '人': '🌙 智谋者' };
  const tag = wxTags[tiWx] || '🔮 观测者';

  ctx.fillStyle = 'rgba(201,160,96,0.15)';
  ctx.fillRect(150, 140, 300, 50);
  ctx.fillStyle = '#c9a060';
  ctx.font = 'bold 24px "Georgia", serif';
  ctx.fillText(`✦ ${tag} ✦`, 300, 175);

  ctx.fillStyle = '#e0e0e8';
  ctx.font = '20px "Georgia", serif';
  ctx.fillText(`你 · ${tiWx}  ⚡  ${yongWx} · 所问之事`, 300, 220);
  ctx.fillStyle = '#c9a060';
  ctx.font = '16px "Georgia", serif';
  ctx.fillText(`【${relation}】`, 300, 248);

  const durian = state.durianIndex || { score: 0, level: '未知' };
  const scoreColor = durian.score < 3 ? '#4CAF50' : durian.score < 5 ? '#8BC34A' : durian.score < 7 ? '#FFC107' : durian.score < 9 ? '#FF9800' : '#F44336';
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(180, 270, 240, 70);
  ctx.fillStyle = scoreColor;
  ctx.font = 'bold 40px "Georgia", serif';
  ctx.fillText(`🍈 ${durian.score}/10`, 300, 322);
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = '14px "Georgia", serif';
  ctx.fillText(durian.level || '', 300, 350);

  const summary = text.split('\n').filter(line => line.trim()).slice(0, 6).join(' ');
  ctx.fillStyle = '#c8c8d8';
  ctx.font = '15px "Georgia", serif';
  ctx.textAlign = 'left';
  let lines = [];
  let current = '';
  const maxWidth = 520;
  for (let ch of summary) {
    let test = current + ch;
    if (ctx.measureText(test).width > maxWidth) {
      lines.push(current);
      current = ch;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  if (lines.length > 6) lines = lines.slice(0, 6);

  let y = 390;
  for (let line of lines) {
    ctx.fillText(line, 40, y);
    y += 28;
  }

  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.font = '14px "Georgia", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('开源 · 免费 · 不可迷信', 300, 730);
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.font = '12px "Georgia", sans-serif';
  ctx.fillText('https://github.com/y22t19053/FuShengPai', 300, 755);

  container.removeAttribute('hidden');
  toast('✨ 分享图已生成');
}

// ===== 保存分享图（iOS兼容） =====
export function saveShareImage() {
  const canvas = document.getElementById('shareCanvas');
  if (!canvas) { toast('没有图片可保存'); return; }

  canvas.toBlob(function(blob) {
    if (!blob) { toast('保存失败'); return; }
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `浮生牌_${new Date().toISOString().slice(0,10)}.png`;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast('💾 图片已保存（如果未自动下载，请长按图片保存）');
  }, 'image/png');
}