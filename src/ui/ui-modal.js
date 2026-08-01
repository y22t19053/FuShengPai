// ===== src/ui/ui-modal.js · 弹窗、Toast、引导与分享（旧报纸+巨型牌格卡双风格） =====
import { state } from '../state.js';
import { API_PROVIDERS, getWuxing, getCardColor, getShengKe } from '../data.js';
import { requestReading, requestFollowUp } from '../ai.js';
import {
  getApiSettings, getProfile, getHistory, deleteHistoryItem,
  exportAllDataJson, importAllData,
  hasCompletedOnboarding, completeOnboarding,
  getTimeline, getTimeCapsule, getStoredPeriodCards
} from '../storage.js';
import { UI_TEXTS, SHARE_QUOTES, ONBOARDING_STEPS } from '../texts/index.js';
import { renderTeachingPanel } from './ui-render.js';
import { escapeForHTML, setHTML } from '../utils/safe.js';
import { loadQRImage } from '../utils/qr.js';
import { getPokerPersona, getDailyFortune, FORTUNE_TYPES } from '../persona.js';
import { getPaiGeQuestion, getPaiGeQuote, SOCIAL_INVITE_TEXT, SOCIAL_HASHTAGS, PAIGE_HASHTAGS } from '../texts/social.js';

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

// ===== 分享码 =====
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

  document.getElementById('copyFullBtn')?.addEventListener('click', () => {
    navigator.clipboard.writeText(fullText).then(
      () => toast('完整记录已复制'),
      () => toast('复制失败')
    );
  });
}

// ===== 榴莲报告 =====
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
// ========== 分享图绘制（旧报纸 + 巨型牌格卡双风格） ==========
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

// ---------- 卡片基底（旧报纸黄·毛边墨线·残月） ----------
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

// ---------- 底部二维码 + 签名（旧报纸风格） ----------
async function drawFooter(ctx, w) {
  const h = 800;
  const qrTarget = window.location.origin + window.location.pathname + '?from=share';
  const qrImg = await loadQRImage(qrTarget, 100);

  ctx.fillStyle = 'rgba(245, 240, 225, 0.9)';
  ctx.fillRect(28, h - 150, 90, 90);
  ctx.strokeStyle = 'rgba(120, 100, 70, 0.4)';
  ctx.lineWidth = 1;
  ctx.strokeRect(32, h - 146, 82, 82);

  if (qrImg) ctx.drawImage(qrImg, 38, h - 140, 70, 70);

  ctx.fillStyle = 'rgba(80, 70, 50, 0.8)';
  ctx.font = '14px "KaiTi", "PingFang SC", "Microsoft YaHei", serif';
  ctx.textAlign = 'left';
  ctx.fillText('扫码测你的牌格', 130, h - 106);

  ctx.fillStyle = 'rgba(100, 90, 70, 0.5)';
  ctx.font = '11px "Georgia", "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.fillText('y22t19053.github.io/FuShengPai', 130, h - 84);

  ctx.save();
  ctx.fillStyle = 'rgba(255, 215, 0, 0.7)';
  ctx.font = 'bold 13px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('#浮生牌', w - 42, h - 60);
  ctx.restore();
}

// ---------- 模式1：九宫占卜卡 ----------
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

// ---------- 模式2：人格卡（保留但不再用于新入口） ----------
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

// ---------- 模式3：单牌日运卡 ----------
async function drawDailyFortuneCard(ctx, w, h, card, typeKey) {
  const fortune = getDailyFortune(card, typeKey);
  if (!fortune) return;

  const wxColorMap = { '木':'#5a7a4a', '火':'#a04040', '土':'#9a7a4a', '金':'#6a6a5a', '水':'#4a6a8a', '天':'#8a7a5a', '人':'#5a5a6a' };
  const accent = wxColorMap[fortune.wx] || '#8a7a5a';

  ctx.fillStyle = accent;
  ctx.font = '16px "Songti SC", "KaiTi", "PingFang SC", "Microsoft YaHei", serif';
  ctx.textAlign = 'center';
  ctx.fillText(fortune.typeIcon + ' ' + fortune.typeLabel, w/2, 70);

  ctx.save();
  ctx.translate(w/2, 170);
  ctx.rotate(-0.05);
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.fillRect(-40, -60, 80, 120);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(-40, -60, 80, 120);
  const rank = card.isJoker ? card.type : card.rank;
  const suit = card.isJoker ? (card.type === '大王' ? '☀' : '☽') : card.suit;
  ctx.fillStyle = '#2c2c2c';
  ctx.font = 'bold 42px "KaiTi", "PingFang SC", "Microsoft YaHei", serif';
  ctx.fillText(suit + rank, 0, 5);
  ctx.restore();

  ctx.fillStyle = accent;
  ctx.font = 'bold 36px "Songti SC", "KaiTi", "PingFang SC", "Microsoft YaHei", serif';
  ctx.fillText(fortune.grade, w/2, 290);

  ctx.fillStyle = 'rgba(60, 50, 40, 0.7)';
  ctx.font = '17px "KaiTi", "PingFang SC", "Microsoft YaHei", serif';
  const shortText = fortune.text.split('。')[0] + '。';
  const lines = wrapText(ctx, shortText, 380, 2);
  lines.forEach((ln, i) => ctx.fillText(ln, w/2, 340 + i * 24));

  ctx.fillStyle = 'rgba(100, 90, 70, 0.4)';
  ctx.font = '12px "Georgia", "PingFang SC", sans-serif';
  ctx.fillText(new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }), w/2, 420);

  const poem = SHARE_QUOTES[Math.floor(Math.random() * SHARE_QUOTES.length)];
  if (poem) {
    ctx.fillStyle = 'rgba(100, 90, 70, 0.4)';
    ctx.font = '14px "KaiTi", "PingFang SC", "Microsoft YaHei", serif';
    const pLines = poem.split('\n');
    pLines.forEach((ln, i) => ctx.fillText(ln, w/2, 480 + i * 20));
  }
}

// ---------- 模式4：牌格卡（巨型扑克牌·名言·课题） ----------
async function drawPaiGeCard(ctx, w, h, card) {
  const q = getPaiGeQuestion(card);
  if (!q) return;
  const quote = getPaiGeQuote(card);

  // 背景
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, '#1a1a2e');
  bg.addColorStop(1, '#0d0d1a');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // 名言
  ctx.save();
  ctx.fillStyle = 'rgba(240, 230, 208, 0.85)';
  ctx.font = 'italic 20px "Georgia", "Songti SC", "KaiTi", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const quoteLines = wrapText(ctx, '“' + quote.text + '”', 480, 2);
  quoteLines.forEach((line, i) => {
    ctx.fillText(line, w / 2, 60 + i * 26);
  });

  ctx.font = '14px "Georgia", "Songti SC", serif';
  ctx.fillStyle = 'rgba(240, 230, 208, 0.5)';
  ctx.fillText('—— ' + quote.author, w / 2, 60 + quoteLines.length * 26 + 14);
  ctx.restore();

  // 中央白卡
  const cardW = w * 0.62, cardH = h * 0.62;
  const cx = w / 2, cy = h / 2 - 20;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.02);

  ctx.fillStyle = '#f0e6d0';
  ctx.beginPath();
  ctx.roundRect(-cardW / 2, -cardH / 2, cardW, cardH, 18);
  ctx.fill();

  ctx.strokeStyle = 'rgba(80, 65, 50, 0.4)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-cardW / 2 + 8, -cardH / 2 + 8, cardW - 16, cardH - 16, 12);
  ctx.stroke();

  const rank = card.isJoker ? 'JOKER' : card.rank;
  const suit = card.isJoker ? '' : card.suit;
  const isRed = card.isJoker ? false : (card.suit === '♥' || card.suit === '♦');
  const rankColor = isRed ? '#c0392b' : '#2c2c2c';

  ctx.fillStyle = rankColor;
  ctx.font = 'bold 34px "Georgia", "PingFang SC", serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(rank + suit, -cardW / 2 + 20, -cardH / 2 + 16);

  ctx.fillStyle = rankColor;
  ctx.font = 'bold 130px "Georgia", "PingFang SC", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.2)';
  ctx.shadowBlur = 10;
  ctx.fillText(suit || (card.type === '大王' ? '★' : '☆'), 0, -10);
  ctx.shadowBlur = 0;
  if (card.isJoker) {
    ctx.font = 'bold 48px "Georgia", serif';
    ctx.fillText('JOKER', 0, 40);
  }

  ctx.save();
  ctx.translate(cardW / 2 - 20, cardH / 2 - 16);
  ctx.rotate(Math.PI);
  ctx.fillStyle = rankColor;
  ctx.font = 'bold 34px "Georgia", serif';
  ctx.textAlign = 'left';
  ctx.fillText(rank + suit, 0, 0);
  ctx.restore();

  ctx.restore(); // 结束白卡

  // 课题信息
  ctx.fillStyle = '#f0e6d0';
  ctx.font = 'bold 26px "KaiTi", "PingFang SC", serif';
  ctx.textAlign = 'center';
  ctx.fillText(q.title, w / 2, h * 0.73);

  ctx.fillStyle = 'rgba(255,255,240,0.75)';
  ctx.font = '16px "KaiTi", "PingFang SC", serif';
  const qLines = wrapText(ctx, '“' + q.question + '”', 380, 2);
  qLines.forEach((line, i) => ctx.fillText(line, w / 2, h * 0.78 + i * 24));

  q.keywords.forEach((kw, i) => {
    const x = w / 2 - 70 + i * 70;
    ctx.fillStyle = 'rgba(255, 215, 0, 0.15)';
    ctx.beginPath();
    ctx.roundRect(x - 25, h * 0.84, 50, 22, 11);
    ctx.fill();
    ctx.fillStyle = '#f0e6d0';
    ctx.font = '13px "PingFang SC", sans-serif';
    ctx.fillText(kw, x, h * 0.856);
  });

  ctx.fillStyle = 'rgba(255,215,0,0.7)';
  ctx.font = '18px "PingFang SC", sans-serif';
  ctx.fillText(SOCIAL_INVITE_TEXT, w / 2, h * 0.9);
  ctx.fillStyle = 'rgba(255,255,240,0.4)';
  ctx.font = '14px "PingFang SC", sans-serif';
  ctx.fillText(PAIGE_HASHTAGS, w / 2, h * 0.94);
}

// ---------- 统一入口 ----------
export async function generateShareImage(options = {}) {
  const container = document.getElementById('sharePreview');
  const canvas = document.getElementById('shareCanvas');
  if (!container || !canvas) { toast('分享组件未就绪'); return; }

  const type = options.type || 'divination';
  const card = options.card || null;
  const typeKey = options.typeKey || 'overall';
  const text = options.text || document.getElementById('interpretText')?.innerText || '';

  canvas.width = 600;
  canvas.height = 800;
  const ctx = canvas.getContext('2d');

  if (type === 'paige' && card) {
    await drawPaiGeCard(ctx, 600, 800, card);
  } else if (type === 'persona' && card) {
    drawCardBase(ctx, 600, 800, '身 份 告 宣');
    await drawPersonaCard(ctx, 600, 800, card);
  } else if (type === 'daily' && card) {
    drawCardBase(ctx, 600, 800, '今 日 之 运');
    await drawDailyFortuneCard(ctx, 600, 800, card, typeKey);
  } else if (type === 'divination') {
    drawCardBase(ctx, 600, 800, '观牌知势 · 明心见性');
    await drawDivinationCard(ctx, 600, 800, text);
  } else {
    toast('未知分享类型');
    return;
  }

  // 底部二维码部分
  if (type === 'paige') {
    const h = 800;
    const qrTarget = window.location.origin + window.location.pathname + '?from=share';
    const qrImg = await loadQRImage(qrTarget, 100);
    ctx.fillStyle = 'rgba(26, 26, 46, 0.85)';
    ctx.fillRect(28, h - 150, 90, 90);
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(32, h - 146, 82, 82);
    if (qrImg) ctx.drawImage(qrImg, 38, h - 140, 70, 70);
    ctx.fillStyle = 'rgba(240, 230, 208, 0.9)';
    ctx.font = '14px "KaiTi", "PingFang SC", serif';
    ctx.textAlign = 'left';
    ctx.fillText('扫码测你的牌格', 130, h - 106);
    ctx.fillStyle = 'rgba(240, 230, 208, 0.5)';
    ctx.font = '11px "Georgia", sans-serif';
    ctx.fillText('y22t19053.github.io/FuShengPai', 130, h - 84);
    ctx.fillStyle = 'rgba(255, 215, 0, 0.7)';
    ctx.font = 'bold 13px "PingFang SC", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('#浮生牌', canvas.width - 42, h - 60);   // 修复：canvas.width 代替 w
  } else {
    await drawFooter(ctx, 600);
  }

  container.removeAttribute('hidden');
  toast('✨ ' + (type === 'paige' ? '牌格' : type === 'daily' ? '日运' : type === 'persona' ? '人格' : '占卜') + '分享图已生成');
}

// ===== 保存分享图 =====
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

// ===== 数据迁移弹窗 =====
export function showDataMigrationModal() {
  const modal = document.getElementById('modal');
  const content = document.getElementById('modalContent');
  if (!modal || !content) return;

  const html = `
    <h3 style="color:var(--accent);">📦 数据迁移</h3>
    <p style="color:var(--dim);font-size:0.8rem;line-height:1.8;margin:12px 0;">
      所有数据仅存储在你的浏览器本地。清理缓存/隐私记录会使数据永久消失。
      <br><br>
      建议定期导出备份，或换设备时导入恢复。
    </p>
    <div style="display:flex;flex-direction:column;gap:8px;margin:16px 0;">
      <button id="exportAllDataBtn" class="primary small">⬇️ 导出全部数据</button>
      <button id="importAllDataBtn" class="outline small">⬆️ 导入数据</button>
    </div>
    <input type="file" id="importDataFile" accept=".json" style="display:none;">
    <div class="btn-row"><button data-action="closeModal" class="small">关闭</button></div>
  `;
  setHTML(content, html);
  modal.removeAttribute('hidden');

  document.getElementById('exportAllDataBtn')?.addEventListener('click', () => {
    const json = exportAllDataJson();
    if (!json) { toast('没有可导出的数据'); return; }
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
          toast('✅ 数据导入成功');
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