// ===== src/ui/ui-modal.js · 弹窗、Toast、引导与分享 =====
import { state, $, $$ } from '../state.js';
import { SUITS, RANKS, API_PROVIDERS, getWuxing, getCardColor, GENDER_OPTIONS } from '../data.js';
import { requestReading } from '../ai.js';
import {
  getApiSettings, getProfile, getHistory, deleteHistoryItem,
  exportAllData, hasCompletedOnboarding, completeOnboarding,
  getTimeline, getSymbolProfile, getTimeCapsule
} from '../storage.js';
import {
  UI_TEXTS, SHARE_TEXTS, SHARE_QUOTES, TIME_RESTRICTION,
  ONBOARDING_STEPS
} from '../texts/index.js';
import { calculateDurianIndex } from '../durian.js';
import { getSealStatus, removeSeal } from '../philosophy/ethics.js';
import { renderTeachingPanel } from './ui-render.js';

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
    if (panelId === 'teaching') {
      renderTeachingPanel();
    }
  }
}

export function showOnboarding() { state.currentOnboardStep = 0; renderOnboardStep(); }

export function renderOnboardStep() {
  const existing = document.querySelector('.onboard-overlay');
  if (existing) existing.remove();
  if (!ONBOARDING_STEPS || !ONBOARDING_STEPS.length) { completeOnboarding(); return; }
  const step = ONBOARDING_STEPS[state.currentOnboardStep];
  if (!step) return;
  const overlay = document.createElement('div');
  overlay.className = 'onboard-overlay';
  const dotsHTML = ONBOARDING_STEPS.map((_, i) => `<span class="onboard-dot${i === state.currentOnboardStep ? ' active' : ''}"></span>`).join('');
  overlay.innerHTML = `<div class="onboard-card"><h3>${step.title}</h3><p style="font-size:0.9rem;color:var(--dim);">${step.body}</p><div class="onboard-dots">${dotsHTML}</div><div><button class="primary small" id="onboardNext">${step.btn}</button>${state.currentOnboardStep < ONBOARDING_STEPS.length - 1 ? '<button class="outline small" id="onboardSkip">跳过</button>' : ''}</div></div>`;
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
    const modal = document.getElementById('modal');
    const content = document.getElementById('modalContent');
    if (!modal || !content) { callback(); return; }
    content.innerHTML = `
      <h3 style="text-align:center;">子时提示</h3>
      <p style="margin:10px 0;color:var(--dim);">当前时间为 ${timeStr} (${timeZone})，正值子时。观测者效应可能衰减，结果仅供参考。</p>
      <div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;">
        <button id="midnightProceedBtn" class="primary">我清楚，继续</button>
        <button id="midnightHideBtn" class="outline">今天别提醒我了</button>
      </div>
    `;
    modal.removeAttribute('hidden');
    document.getElementById('midnightProceedBtn').addEventListener('click', () => { modal.setAttribute('hidden', ''); callback(); });
    document.getElementById('midnightHideBtn').addEventListener('click', () => { localStorage.setItem('fs_midnight_dismiss', 'true'); modal.setAttribute('hidden', ''); callback(); });
  } else { callback(); }
}

export function showPrivacyWarning() {
  const today = new Date().toDateString();
  if (localStorage.getItem('fs_privacy_dismiss_today') === today) return;
  const modal = document.getElementById('modal');
  const content = document.getElementById('modalContent');
  if (!modal || !content) return;
  content.innerHTML = `
    <div style="text-align:center;">
      <h3>⚠️ 隐私模式检测</h3>
      <p style="margin:10px 0;color:var(--dim);">您当前正在使用浏览器的隐私/无痕模式，<strong>所有数据在关闭页面后将自动清除</strong>。<br>建议您立即导出备份，或切换到正常模式使用。</p>
      <div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-top:10px;">
        <button id="exportBackupBtn" class="primary small">导出备份</button>
        <button id="dismissPrivacyBtn" class="outline small">我知道了</button>
      </div>
    </div>
  `;
  modal.removeAttribute('hidden');
  document.getElementById('exportBackupBtn')?.addEventListener('click', () => {
    exportAllData();
    toast('备份已导出，请妥善保存');
    modal.setAttribute('hidden', '');
  });
  document.getElementById('dismissPrivacyBtn')?.addEventListener('click', () => {
    localStorage.setItem('fs_privacy_dismiss_today', today);
    modal.setAttribute('hidden', '');
  });
}

export function showDailyFortune() {
  const modal = document.getElementById('modal');
  const content = document.getElementById('modalContent');
  if (!modal || !content) { toast('弹窗系统尚未加载'); return; }
  const today = new Date().toDateString();
  let hash = 0; for (let i = 0; i < today.length; i++) { hash = ((hash << 5) - hash) + today.charCodeAt(i); hash |= 0; }
  const idx = Math.abs(hash) % 54; let card;
  if (idx < 52) { const suit = SUITS[Math.floor(idx / 13)]; const rank = RANKS[idx % 13]; card = { suit, rank, isJoker: false }; }
  else if (idx === 52) card = { isJoker: true, type: '大王' }; else card = { isJoker: true, type: '小王' };
  const wx = getWuxing(card); const label = card.isJoker ? card.type : card.suit + card.rank; const colorCls = getCardColor(card);
  const fortunes = { '火': '热情是你的燃料，别让它灼伤你。', '金': '决断的时刻来了，信任你的切割力。', '木': '生长的节奏不可强求，根深自然叶茂。', '水': '顺应变化，暗流之下自有出路。', '天': '天意如风，顺势而行。', '人': '智谋是你的武器，善用巧劲。' };
  const quote = fortunes[wx] || '平常心，即是最好的状态。';
  localStorage.setItem('fs_todays_sign_date', today);
  localStorage.setItem('fs_todays_sign', JSON.stringify(card));
  content.innerHTML = `
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
  modal.removeAttribute('hidden');
  document.getElementById('dailyAiBtn').addEventListener('click', async function() {
    this.disabled = true; this.textContent = '召唤中...';
    const settings = getApiSettings();
    if (!settings || !settings.apiKey) { toast('请先配置 API Key'); this.disabled = false; this.textContent = '✨ 呼唤AI深度解析'; return; }
    try {
      const provider = settings.provider || 'deepseek'; let endpoint = settings.endpoint || API_PROVIDERS[provider]?.endpoint || '';
      if (endpoint.endsWith('/v1')) endpoint = endpoint.slice(0, -3);
      if (endpoint.endsWith('/')) endpoint = endpoint.slice(0, -1);
      const model = settings.model || API_PROVIDERS[provider]?.model || '';
      const prompt = `请针对抽中的扑克牌进行深度解读。\n牌面：${label}\n五行：${wx}\n启示：${quote}\n要求：纯中文，话不说死，以心理学共情和日常生活的角度展开。`;
      const result = await requestReading({ provider, apiKey: settings.apiKey, endpoint, model, prompt });
      document.getElementById('dailyAiResult').innerHTML = `<div style="border-top:1px solid rgba(255,255,255,0.1);padding-top:8px;margin-top:8px;color:#e0e0e0;"><strong>AI 解牌：</strong><br>${result}</div>`;
    } catch (e) { toast(e.message); }
    finally { this.disabled = false; this.textContent = '✨ 呼唤AI深度解析'; }
  });
}

export function showTimeCapsule() {
  const capsule = getTimeCapsule();
  const modal = document.getElementById('modal');
  const content = document.getElementById('modalContent');
  if (!modal || !content) return;
  if (!capsule) { toast('暂无时间胶囊。完成一次观测后可保存。'); return; }
  content.innerHTML = `
    <h3>📦 时间胶囊</h3>
    <p style="color:var(--dim);font-size:0.85rem;">你封印在 ${new Date(capsule.timestamp).toLocaleString()} 的观测</p>
    <div style="margin:12px 0;padding:12px;background:rgba(0,0,0,0.2);border-radius:8px;">
      <p><strong>问题：</strong>${capsule.question || '未提问'}</p>
      <p><strong>解读：</strong>${capsule.text ? capsule.text.slice(0, 200) + '...' : '无'}</p>
    </div>
    <button data-action="closeModal" class="small">关闭</button>
  `;
  modal.removeAttribute('hidden');
}

// ===== 【增强】榴莲报告 =====
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
  const lastThree = scores.slice(-3);
  const trend = lastThree.length === 3 && lastThree[2] - lastThree[0] > 0.5 ? '📈 上升' :
                lastThree.length === 3 && lastThree[2] - lastThree[0] < -0.5 ? '📉 下降' : '➡️ 平稳';

  // 计算各维度平均值（如果有存储）
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

  // 构建建议
  let advice = '';
  if (avg > 7) advice = '⚠️ 你的观测整体张力偏高，建议暂停几天，让状态沉淀后再试。';
  else if (avg > 5) advice = '📌 当前处于中等张力区间，适合观察但不适合做重大决策。';
  else if (avg > 3) advice = '🌱 状态温和，适合推进日常事务和温和的自我观察。';
  else advice = '✨ 状态良好，如有重要决定，此时是较好的窗口期。';

  // 简单的折线图（用 Canvas 绘制）
  const canvasHTML = `<canvas id="durianChart" width="380" height="120" style="width:100%;height:120px;border-radius:6px;background:rgba(0,0,0,0.2);margin:8px 0;"></canvas>`;

  content.innerHTML = `
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
    ${canvasHTML}
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:4px;font-size:0.6rem;color:var(--dim);text-align:center;margin:4px 0;">
      <div>差值 ${avgDiff}</div>
      <div>相克 ${avgKe}</div>
      <div>趋势 ${avgTrend}</div>
      <div>张力 ${avgTension}</div>
    </div>
    <div style="padding:8px 12px;background:rgba(0,0,0,0.15);border-radius:6px;font-size:0.8rem;margin:6px 0;border-left:3px solid var(--accent);">
      ${advice}
    </div>
    <p style="font-size:0.65rem;color:var(--dim);">基于最近 ${recent.length} 次观测</p>
    <div class="btn-row" style="margin-top:8px;">
      <button id="exportReportBtn" class="small outline">导出报告</button>
      <button data-action="closeModal" class="small">关闭</button>
    </div>
  `;
  modal.removeAttribute('hidden');

  // 绘制折线图
  setTimeout(() => {
    const canvas = document.getElementById('durianChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const data = scores.slice(-20);
    if (data.length < 2) return;
    const maxVal = Math.max(10, ...data);
    const minVal = Math.min(0, ...data);
    const range = maxVal - minVal || 1;

    // 绘制网格线
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = h - 10 - (i / 4) * (h - 20);
      ctx.beginPath();
      ctx.moveTo(10, y);
      ctx.lineTo(w - 10, y);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.font = '8px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText((i / 4 * range + minVal).toFixed(1), 8, y + 3);
    }

    // 绘制折线
    const step = (w - 20) / Math.max(1, data.length - 1);
    ctx.beginPath();
    ctx.strokeStyle = '#c9a060';
    ctx.lineWidth = 2;
    for (let i = 0; i < data.length; i++) {
      const x = 10 + i * step;
      const y = h - 10 - ((data[i] - minVal) / range) * (h - 20);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // 绘制数据点
    for (let i = 0; i < data.length; i++) {
      const x = 10 + i * step;
      const y = h - 10 - ((data[i] - minVal) / range) * (h - 20);
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fillStyle = data[i] > 7 ? '#F44336' : data[i] > 5 ? '#FF9800' : '#4CAF50';
      ctx.fill();
    }

    // 标记最近一次
    if (data.length > 0) {
      const lastX = 10 + (data.length - 1) * step;
      const lastY = h - 10 - ((data[data.length - 1] - minVal) / range) * (h - 20);
      ctx.beginPath();
      ctx.arc(lastX, lastY, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#c9a060';
      ctx.fill();
      ctx.strokeStyle = '#c9a060';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }, 50);

  document.getElementById('exportReportBtn')?.addEventListener('click', () => {
    const text = `浮生牌 · 榴莲报告\n\n平均分数：${avg.toFixed(1)}\n最高：${max}，最低：${min}\n趋势：${trend}\n\n建议：${advice}\n\n基于最近 ${recent.length} 次观测`;
    navigator.clipboard.writeText(text).then(
      () => toast('报告已复制到剪贴板'),
      () => toast('复制失败，请手动复制')
    );
  });
}

export function showSealWarning() {
  const seal = getSealStatus();
  const modal = document.getElementById('modal');
  const content = document.getElementById('modalContent');
  if (!modal || !content || !seal) return;
  content.innerHTML = `
    <h3>🔒 封卦状态</h3>
    <p style="color:var(--dim);">原因：${seal.reason}</p>
    <p style="color:var(--dim);">剩余时间：${seal.daysRemaining} 天</p>
    <p style="font-size:0.75rem;color:#888;margin-top:8px;">浮生牌正在休息。这段时间建议你回到现实生活。</p>
    <button data-action="closeModal" class="small">知道了</button>
  `;
  modal.removeAttribute('hidden');
}

export function showHistoryDetail(index) {
  const history = getHistory();
  const r = history[index];
  const modal = document.getElementById('modal');
  const content = document.getElementById('modalContent');
  if (!modal || !content || !r) return;
  const buildHistoricalPrompt = (historyRecord, question) => {
    return `请根据以下浮生牌局象进行详细解读。\n\n历史牌局解读：${historyRecord.text}\n\n用户追问：${question}\n\n规则：纯文本格式，用自然语言。话不说死。`;
  };
  let aiBlock = '';
  if (r.chatHistory && r.chatHistory.length) {
    aiBlock = '<div class="result-block" style="max-height:150px;margin-top:10px;font-size:0.85rem;">' + r.chatHistory.map(m => `<div class="chat-msg ${m.role === 'user' ? 'user' : 'ai'}">${m.content.replace(/\n/g, '<br>')}</div>`).join('') + '</div>';
  } else {
    aiBlock = '<p style="color:var(--dim);font-size:0.85rem;">暂无 AI 对话记录</p>';
  }
  content.innerHTML = `<h3>历史详情</h3>
    <p style="font-size:0.85rem;color:var(--dim);"><strong>时间：</strong>${new Date(r.time).toLocaleString()}</p>
    <p style="font-size:0.85rem;color:var(--dim);"><strong>问题：</strong>${r.question || '未提问'}</p>
    <p style="font-size:0.85rem;color:var(--dim);"><strong>类别：</strong>${r.category || '无'}</p>
    <div class="result-block" style="font-size:0.85rem;">${(r.text || '').replace(/\n/g, '<br>')}</div>
    <h4 style="margin-top:10px;color:var(--accent);font-size:0.9rem;">AI 对话</h4>${aiBlock}
    <div style="margin-top:10px;display:flex;gap:8px">
      <input type="text" id="historyFollowUpInput" placeholder="${UI_TEXTS.placeholderFollowUp}" style="flex:1;background:rgba(0,0,0,0.4);border:2px solid var(--border);color:var(--text);border-radius:8px;padding:8px 12px;font-size:0.85rem;">
      <button id="historyFollowUpBtn" class="small">发送</button>
    </div>
    <div class="btn-row" style="margin-top:10px;">
      <button data-action="deleteHistoryItem" data-history-index="${index}" class="outline small">删除此条</button>
      <button id="reObserveBtn" class="primary small">重新观测</button>
      <button data-action="closeModal" class="small">${UI_TEXTS.btnClose}</button>
    </div>
  `;
  modal.removeAttribute('hidden');

  document.getElementById('reObserveBtn')?.addEventListener('click', () => {
    import('../ui.js').then(ui => {
      Object.assign(state, {
        ti: r.ti, yong: r.yong, grid: r.grid, line: r.line,
        lineOrder: r.lineOrder, chatHistory: [], step: 3,
        question: r.question, category: r.category
      });
      modal.setAttribute('hidden', '');
      ui.updateStep(3);
      import('../ui/ui-render.js').then(render => {
        render.renderStep3(r.text || '历史牌局已加载，重新生成解读中...');
        ui.generateInterpretation();
      });
      toast('已加载历史牌局，可重新观测');
    });
  });

  const followInput = document.getElementById('historyFollowUpInput');
  const followBtn = document.getElementById('historyFollowUpBtn');
  if (followBtn && followInput) {
    const handler = async () => {
      const q = followInput.value.trim();
      if (!q) return;
      followInput.value = '';
      followBtn.disabled = true;
      followBtn.textContent = '发送中...';
      const settings = getApiSettings();
      if (!settings || !settings.apiKey) {
        toast('请先配置 API Key');
        followBtn.disabled = false;
        followBtn.textContent = '发送';
        return;
      }
      const chatHistory = r.chatHistory ? [...r.chatHistory] : [];
      chatHistory.push({ role: 'user', content: q });
      const prompt = buildHistoricalPrompt(r, q);
      try {
        const answer = await requestFollowUp({
          history: [{ role: 'user', content: prompt }, ...chatHistory],
          provider: settings.provider, apiKey: settings.apiKey,
          endpoint: settings.endpoint, model: settings.model
        });
        chatHistory.push({ role: 'assistant', content: answer });
        r.chatHistory = chatHistory;
        const allHistory = getHistory();
        allHistory[index] = r;
        localStorage.setItem('fs_history', JSON.stringify(allHistory));
        showHistoryDetail(index);
      } catch (e) { toast(e.message, 3000); }
      finally { followBtn.disabled = false; followBtn.textContent = '发送'; }
    };
    followBtn.addEventListener('click', handler);
    followInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handler(); });
  }
}

// ============================================
// AI 引导弹窗
// ============================================
export function showAIGuideModal() {
  const modal = document.getElementById('modal');
  const content = document.getElementById('modalContent');
  if (!modal || !content) { toast('弹窗系统尚未加载'); return; }
  content.innerHTML = `
    <div style="text-align:center;padding:8px;">
      <h3 style="color:var(--accent);">🤖 AI 解读未就绪</h3>
      <p style="margin:12px 0;color:var(--dim);font-size:0.9rem;line-height:1.8;">
        要使用 AI 深度解读功能，请先在 <strong>设置面板</strong> 中配置 API Key。
        <br><br>
        支持 DeepSeek、千问、OpenAI、Claude 等多家厂商。
        <br>
        <span style="font-size:0.75rem;color:#666;">Key 仅存储在你的本地浏览器中，不会上传。</span>
      </p>
      <div class="btn-row">
        <button id="goToSettingsBtn" class="primary small">前往设置</button>
        <button data-action="closeModal" class="outline small">稍后再说</button>
      </div>
    </div>
  `;
  modal.removeAttribute('hidden');
  document.getElementById('goToSettingsBtn')?.addEventListener('click', () => {
    modal.setAttribute('hidden', '');
    togglePanel('settings');
  });
}

// ============================================
// 分享功能实现
// ============================================
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
      resultArea.innerHTML = `<h3>${UI_TEXTS.step3}</h3><div class="result-block">${data.t.replace(/\n/g, '<br>')}</div><div class="btn-row"><button data-action="closeModal" class="small">关闭</button></div>`;
    }
    toast(UI_TEXTS.toastImportSuccess);
  } catch (e) {
    toast(UI_TEXTS.toastImportFail);
  }
}

// ===== 【升级】分享图：朋友圈风格卡片 =====
export function generateShareImage() {
  const container = document.getElementById('sharePreview');
  const canvas = document.getElementById('shareCanvas');
  if (!container || !canvas) { toast('分享组件未就绪'); return; }
  const text = document.getElementById('interpretText')?.innerText;
  if (!text) { toast('没有可分享的内容'); return; }

  canvas.width = 600;
  canvas.height = 800;
  const ctx = canvas.getContext('2d');

  // ---- 背景：径向渐变 ----
  const grad = ctx.createRadialGradient(300, 200, 50, 300, 400, 500);
  grad.addColorStop(0, '#2a2a3e');
  grad.addColorStop(0.5, '#1b1b2a');
  grad.addColorStop(1, '#0d0d15');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 600, 800);

  // ---- 装饰边框 ----
  ctx.strokeStyle = 'rgba(201,160,96,0.3)';
  ctx.lineWidth = 2;
  ctx.strokeRect(20, 20, 560, 760);

  // ---- 顶部：Logo 和日期 ----
  ctx.fillStyle = '#c9a060';
  ctx.font = 'bold 32px "Georgia", "Songti SC", serif';
  ctx.textAlign = 'center';
  ctx.fillText('浮生牌 · 观测者的镜子', 300, 75);

  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.font = '14px "Georgia", sans-serif';
  ctx.fillText(new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }), 300, 105);

  // ---- 分割线 ----
  ctx.strokeStyle = 'rgba(201,160,96,0.2)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(60, 125);
  ctx.lineTo(540, 125);
  ctx.stroke();

  // ---- 中央信息：体用五行关系 ----
  let tiWx = '?', yongWx = '?', relation = '';
  if (state.ti && state.yong) {
    tiWx = getWuxing(state.ti);
    yongWx = getWuxing(state.yong);
    const rel = getShengKe(tiWx, yongWx);
    relation = rel || '未知';
  }
  ctx.fillStyle = '#e0e0e8';
  ctx.font = '24px "Georgia", "Songti SC", serif';
  ctx.textAlign = 'center';
  ctx.fillText(`体 · ${tiWx}  ⚡  ${yongWx} · 用`, 300, 175);
  ctx.fillStyle = '#c9a060';
  ctx.font = '20px "Georgia", "Songti SC", serif';
  ctx.fillText(`【${relation}】`, 300, 210);

  // ---- 榴莲指数（大号显示） ----
  const durian = state.durianIndex || { score: 0, level: '未知' };
  const scoreColor = durian.score < 3 ? '#4CAF50' : durian.score < 5 ? '#8BC34A' : durian.score < 7 ? '#FFC107' : durian.score < 9 ? '#FF9800' : '#F44336';
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  // 兼容 roundRect
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(180, 235, 240, 70, 12);
    ctx.fill();
  } else {
    ctx.fillRect(180, 235, 240, 70);
  }
  ctx.fillStyle = scoreColor;
  ctx.font = 'bold 48px "Georgia", serif';
  ctx.textAlign = 'center';
  ctx.fillText(`🍈 ${durian.score}/10`, 300, 295);
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = '14px "Georgia", "Songti SC", serif';
  ctx.fillText(durian.level || '', 300, 325);

  // ---- 体用五行标签（人格标签） ----
  const wxMap = { '火': '🔥 火型 · 热烈', '金': '⚔️ 金型 · 决断', '木': '🌳 木型 · 生长', '水': '🌊 水型 · 流动', '土': '🏔️ 土型 · 承载', '天': '☀️ 天型 · 超越', '人': '🌙 人型 · 智谋' };
  const tag = wxMap[tiWx] || '🔮 观测者';
  ctx.fillStyle = 'rgba(201,160,96,0.15)';
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(200, 345, 200, 30, 15);
    ctx.fill();
  } else {
    ctx.fillRect(200, 345, 200, 30);
  }
  ctx.fillStyle = '#c9a060';
  ctx.font = '14px "Georgia", "Songti SC", serif';
  ctx.textAlign = 'center';
  ctx.fillText(`✦ ${tag} ✦`, 300, 367);

  // ---- 解读摘要（自动换行） ----
  const summary = text.split('\n').filter(line => line.trim()).slice(0, 6).join(' ');
  ctx.fillStyle = '#c8c8d8';
  ctx.font = '15px "Georgia", "Songti SC", serif';
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

  let y = 410;
  for (let line of lines) {
    ctx.fillText(line, 40, y);
    y += 28;
  }

  // ---- 底部哲言 ----
  const quote = SHARE_QUOTES[Math.floor(Math.random() * SHARE_QUOTES.length)];
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.font = '13px "Georgia", "Songti SC", serif';
  ctx.textAlign = 'center';
  ctx.fillText(`「${quote}」`, 300, 740);

  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  ctx.font = '11px "Georgia", sans-serif';
  ctx.fillText('—— 浮生牌 · 观测者的镜子 ——', 300, 770);

  container.removeAttribute('hidden');
  toast('✨ 分享图已生成');
}

export function saveShareImage() {
  const canvas = document.getElementById('shareCanvas');
  if (!canvas) { toast('没有图片可保存'); return; }
  const link = document.createElement('a');
  link.download = `浮生牌_${new Date().toISOString().slice(0,10)}.png`;
  link.href = canvas.toDataURL('image/png');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  toast('💾 图片已保存');
}