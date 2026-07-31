// ===== src/ui/ui-render.js · 全流程渲染 =====
import { state } from '../state.js';
import {
  GONG_ORDER, GONG_NAMES, GONG_WUXING, CATEGORIES,
  getShengKe, getShengKeLabel, getWuxing, getCardColor,
  getCardId, getCardValue
} from '../data.js';
import {
  calcFullBaZi, calcDiff, getDiffLevel
} from '../engine.js';
import { getApiSettings, getProfile, getHistory } from '../storage.js';
import { UI_TEXTS, HISTORY_EMPTY, AI_GUIDE_TEXT } from '../texts/index.js';
import { calculateDurianIndex, getDurianIcon } from '../durian.js';
import { toast } from './ui-modal.js';
import { isCardPlaced } from './ui-drag.js';
import { generateMetaphor } from '../metaphor.js';

export const escapeHtml = (str) => {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
};

// ===== 教程 =====
export function renderTeachingPanel() {
  const container = document.getElementById('teachingContent');
  if (!container) return;
  container.innerHTML = `
    <div style="max-width:680px;margin:0 auto;padding:8px 0;line-height:1.9;">
      <h3 style="color:var(--accent);margin-bottom:8px;">🃏 浮生牌使用手册</h3>
      <p style="font-size:0.85rem;color:var(--dim);margin-bottom:16px;border-left:3px solid var(--accent);padding-left:10px;">
        这是一个帮助你在不确定时看清自己处境的工具。它不算命，不预言，只是给你一面镜子。
      </p>
      <div style="background:rgba(0,0,0,0.2);border-radius:8px;padding:12px 14px;margin-bottom:12px;">
        <h4 style="color:var(--accent);margin-bottom:6px;">占卜的核心原则</h4>
        <ul style="font-size:0.8rem;color:var(--dim);padding-left:18px;">
          <li><strong>不问笼统的问题</strong>：问题越具体，牌面越清晰。</li>
          <li><strong>牌是提示，不是命令</strong>：牌面提醒你，决定权在你。</li>
          <li><strong>一卦一断</strong>：一件事，不要反复问。</li>
          <li><strong>不测生死，不窥他人</strong>：涉及生命或他人隐私的问题，这里不碰。</li>
        </ul>
      </div>
      <div style="background:rgba(0,0,0,0.2);border-radius:8px;padding:12px 14px;margin-bottom:12px;">
        <h4 style="color:var(--accent);margin-bottom:6px;">如何开始</h4>
        <ol style="font-size:0.8rem;color:var(--dim);padding-left:18px;">
          <li>输入一个你想问的问题。</li>
          <li>系统会先带你确认问题的具体含义。</li>
          <li>抽牌，看一句“画面”提示。</li>
          <li>写下自己心里闪过的那句话。</li>
          <li>带走它，不必做任何决定。</li>
        </ol>
      </div>
      <div style="background:rgba(0,0,0,0.15);border-radius:8px;padding:12px 14px;">
        <h4 style="color:var(--accent);margin-bottom:6px;">最后</h4>
        <p style="font-size:0.8rem;color:var(--dim);">
          浮生牌不认为人生可以被评分，不认为一副牌可以决定你的命运。它只是一面镜子。
        </p>
      </div>
    </div>
  `;
}

// ===== 首页 + 逼问流程 =====
export function renderStep1() {
  const core = document.getElementById('coreArea');
  if (!core) return;

  // 逼问流程
  if (state.questionFlow) {
    renderQuestionFlow(core);
    return;
  }

  // 默认首页
  core.innerHTML = `
    <div style="margin-bottom:16px;">
      <h3 style="font-size:1.6rem;margin:0;">浮生牌</h3>
      <div style="color:var(--dim);font-size:0.85rem;margin-top:4px;">这里没有答案。只有一面镜子。</div>
    </div>
    <input type="text" id="questionInput" placeholder="${UI_TEXTS.placeholderQuestion}" autocomplete="off" value="${escapeHtml(state.question)}">
    <div class="category-grid">${CATEGORIES.map(c => `<button data-action="selectCategory" data-category="${c}" class="${state.category === c ? 'selected' : ''}">${c}</button>`).join('')}</div>
    <div class="btn-row">
      <button data-action="confirmQuestion" class="primary">${UI_TEXTS.btnStartDraw}</button>
      <button data-action="lazyStart" class="outline">${UI_TEXTS.btnLazy}</button>
    </div>
  `;
}

// ===== 逼问界面 =====
function renderQuestionFlow(core) {
  const flow = state.questionFlow;
  const q = flow.question || '';

  let inner = '';
  if (flow.stage === 'ask_mirror') {
    inner = `
      <h3>先别急</h3>
      <div style="font-size:1rem;color:var(--text);margin:16px 0;line-height:1.8;">
        「${escapeHtml(q)}」
      </div>
      <div style="font-size:0.9rem;color:var(--dim);line-height:1.8;">
        你确定你问的是这个吗？
        <br><br>
        闭上眼睛三秒钟，想象一下「这件事已经解决了」的那一刻。<br>
        你看到的是什么画面？
      </div>
      <div class="btn-row">
        <button data-action="flowContinue" class="primary">我想好了</button>
        <button data-action="flowEdit" class="outline">再想想</button>
      </div>
    `;
  } else if (flow.stage === 'ask_confirm') {
    const finalQ = flow.finalQuestion || q;
    inner = `
      <h3>你真正想问的，其实是：</h3>
      <div style="font-size:1.2rem;color:var(--accent);margin:16px 0;line-height:1.6;border-left:3px solid var(--accent);padding-left:16px;">
        ${escapeHtml(finalQ)}
      </div>
      <p style="font-size:0.8rem;color:var(--dim);">是这个吗？</p>
      <div class="btn-row">
        <button data-action="flowStart" class="primary">是，开始抽牌</button>
        <button data-action="flowSkip" class="outline">算了，直接抽</button>
      </div>
    `;
  }

  core.innerHTML = `<div style="max-width:420px;margin:0 auto;padding:20px 0;">${inner}</div>`;
}

// ===== 抽牌后：比喻层 =====
export function renderReveal(metaphor) {
  const core = document.getElementById('coreArea');
  if (!core) return;

  core.innerHTML = `
    <div style="max-width:480px;margin:0 auto;padding:20px 0;text-align:center;">
      <div style="font-size:0.8rem;color:var(--dim);margin-bottom:12px;">牌已经翻了。</div>
      <div style="font-size:1.15rem;line-height:1.9;color:var(--text);margin-bottom:24px;padding:0 10px;">
        ${metaphor.replace(/\n/g, '<br>')}
      </div>
      <button data-action="continueToEcho" class="primary small">继续</button>
    </div>
  `;
}

// ===== 回响层 =====
export function renderEcho() {
  const core = document.getElementById('coreArea');
  if (!core) return;

  core.innerHTML = `
    <div style="max-width:480px;margin:0 auto;padding:20px 0;text-align:center;">
      <div style="font-size:1rem;color:var(--text);margin-bottom:16px;">
        刚才那句话，哪个字让你心里动了一下？
      </div>
      <textarea id="echoInput" rows="3" placeholder="不用完整，几个字就行……"
        style="width:100%;background:rgba(0,0,0,0.4);border:2px solid var(--border);color:var(--text);border-radius:8px;padding:10px 12px;font-size:0.9rem;font-family:inherit;"></textarea>
      <div class="btn-row">
        <button id="echoSubmit" class="primary small">写下了</button>
        <button data-action="skipEcho" class="outline small">跳过</button>
      </div>
      <div id="echoResponse" style="display:none;margin-top:16px;font-size:0.95rem;color:var(--accent);line-height:1.8;"></div>
    </div>
  `;

  document.getElementById('echoSubmit')?.addEventListener('click', () => {
    const val = document.getElementById('echoInput')?.value?.trim();
    const resp = document.getElementById('echoResponse');
    if (!resp) return;
    if (!val) {
      resp.style.display = 'block';
      resp.textContent = '没关系，沉默也是一句话。';
      resp.style.color = 'var(--dim)';
      return;
    }
    resp.style.display = 'block';
    resp.innerHTML = `“${escapeHtml(val)}”<br><br>这句话是你自己写的，不是任何牌说的。<br><span style="font-size:0.75rem;color:var(--dim);">带它离开，过段时间再回来看看。</span>`;
    document.getElementById('echoInput').disabled = true;
    document.getElementById('echoSubmit').style.display = 'none';
    setTimeout(() => {
      const btn = document.createElement('button');
      btn.className = 'primary small';
      btn.textContent = '查看完整解读';
      btn.dataset.action = 'showFullReport';
      resp.appendChild(document.createElement('br'));
      resp.appendChild(btn);
    }, 1500);
  });
}

// ===== 完整报告层 =====
export function renderFullReport(text) {
  const aiSettings = getApiSettings();
  const hasKey = aiSettings && aiSettings.apiKey;
  const result = document.getElementById('resultArea');
  if (!result) return;

  result.innerHTML = `
    <h3>${UI_TEXTS.step3}</h3>
    <div id="durianDisplay" style="margin-bottom:8px;"></div>
    <div class="result-block" id="interpretText" style="font-size:0.9rem;line-height:1.9;">${text.replace(/\n/g, '<br>')}</div>
    <div class="btn-row">
      <button data-action="copyLocal" class="small">${UI_TEXTS.btnCopy}</button>
      <button id="copyPromptBtn" class="small outline">📋 复制提示词</button>
      <button data-action="shareImage" class="outline small">${UI_TEXTS.btnShareImage}</button>
      <button data-action="shareCode" class="outline small">${UI_TEXTS.btnShareCode}</button>
      <button data-action="exportData" class="outline small">完整数据</button>
      <button id="aiReadBtn" data-action="triggerAI" class="primary small">${hasKey ? 'AI 深度解读' : '✨ 接入 AI 深度解读'}</button>
      <button data-action="resetAll" class="small">${UI_TEXTS.btnNewQuestion}</button>
    </div>
    <div id="aiResultContainer" style="display:none;margin-top:10px">
      <div class="result-block" id="aiResultContent"></div>
      <div id="followUpArea" style="display:none;margin-top:8px">
        <div class="btn-row" style="gap:8px">
          <input type="text" id="followUpInput" placeholder="${UI_TEXTS.placeholderFollowUp}">
          <button data-action="sendFollowUp" class="small">发送</button>
        </div>
        <div class="result-block" id="chatHistoryBlock" style="margin-top:6px;max-height:200px;font-size:0.85rem;"></div>
      </div>
    </div>
  `;
  renderDurianDisplay();

  document.getElementById('copyPromptBtn')?.addEventListener('click', async () => {
    const prompt = await import('../ui.js').then(m => m.buildAIPrompt());
    navigator.clipboard.writeText(prompt).then(
      () => toast('✅ 提示词已复制'),
      () => toast('复制失败')
    );
  });
}

// ===== 牌堆渲染（保持原有） =====
let deckCache = [];
let deckCacheIds = '';

export function renderDeck() {
  const el = document.getElementById('deckContainer');
  if (!el) return;
  if (!state.deck || state.deck.length === 0) {
    deckCache = [];
    deckCacheIds = '';
    el.innerHTML = '<span style="color:#666;padding:10px;display:block;text-align:center;width:100%;font-size:0.9rem;">镜中牌已尽，可重置以重观</span>';
    return;
  }
  const currentIds = state.deck.map(c => getCardId(c)).join(',');
  if (currentIds === deckCacheIds && el.children.length === state.deck.length) {
    Array.from(el.children).forEach((child, idx) => {
      const card = state.deck[idx];
      if (!card) return;
      const placed = isCardPlaced(card);
      const sel = state.sel === getCardId(card);
      child.classList.toggle('selected', sel);
      child.classList.toggle('used', placed);
      child.style.opacity = placed ? '0.25' : '';
      child.style.pointerEvents = placed ? 'none' : '';
    });
    return;
  }
  el.style.cssText = `
    display: flex; flex-wrap: nowrap; gap: 10px;
    overflow-x: auto; overflow-y: hidden;
    padding: 10px 8px; touch-action: pan-x;
    scrollbar-width: none; -ms-overflow-style: none;
    -webkit-overflow-scrolling: touch; scroll-behavior: smooth;
  `;
  el.innerHTML = '';
  state.deck.forEach((c, index) => {
    const id = getCardId(c);
    const placed = isCardPlaced(c);
    const sel = state.sel === id;
    const colorCls = getCardColor(c);
    const rank = c.isJoker ? c.type : c.rank;
    const suit = c.isJoker ? '' : c.suit;
    const wx = getWuxing(c);
    const div = document.createElement('div');
    if (state.manualMode) {
      div.className = `card-face-small ${colorCls}${sel ? ' selected' : ''}${placed ? ' used' : ''}`;
      div.style.cssText = `${placed ? 'opacity:0.25;pointer-events:none;' : ''} flex-shrink:0; width:60px; height:84px;`;
      div.dataset.cardid = id;
      div.dataset.cardindex = index;
      div.innerHTML = `<span class="rank">${rank}</span><span class="suit">${suit}</span><span class="wx-tag">${wx}</span>`;
    } else {
      div.className = `card-back${sel ? ' selected' : ''}${placed ? ' used' : ''}`;
      div.style.cssText = `${placed ? 'opacity:0.25;pointer-events:none;' : ''} flex-shrink:0; width:60px; height:84px;`;
      div.dataset.cardid = id;
      div.dataset.cardindex = index;
    }
    el.appendChild(div);
  });
  deckCache = [...state.deck];
  deckCacheIds = currentIds;
}

// ===== 体用栏 =====
export function renderTiYong() {
  const bar = document.getElementById('tiyongBar');
  if (!bar) return;
  const tiHTML = state.ti
    ? `<div class="mini-card ${getCardColor(state.ti)}">${state.ti.isJoker ? state.ti.type : state.ti.rank}${state.ti.isJoker ? '' : state.ti.suit}</div>`
    : `<div class="empty-dash" data-drop="ti">${UI_TEXTS.labelTi}</div>`;
  const yongHTML = state.yong
    ? `<div class="mini-card ${getCardColor(state.yong)}">${state.yong.isJoker ? state.yong.type : state.yong.rank}${state.yong.isJoker ? '' : state.yong.suit}</div>`
    : `<div class="empty-dash" data-drop="yong">${UI_TEXTS.labelYong}</div>`;
  let badge = '';
  if (state.ti && state.yong) {
    const rel = getShengKe(getWuxing(state.ti), getWuxing(state.yong));
    if (rel) badge = `<span class="relation-badge ${rel === '生我' ? 'good' : rel === '克我' ? 'bad' : ''}">${rel} ${getShengKeLabel(rel)}</span>`;
  }
  bar.innerHTML = `
    <div class="slot">${UI_TEXTS.labelTi} ${tiHTML}</div>
    <span class="separator">${UI_TEXTS.labelSeparator}</span>
    <div class="slot">${UI_TEXTS.labelYong} ${yongHTML}</div>
    ${badge}
  `;
  const btn = document.getElementById('btnConfirmTY');
  if (btn) btn.disabled = !(state.ti && state.yong);
}

// ===== 九宫格 =====
export function renderGrid() {
  const el = document.getElementById('gridContainer');
  if (!el) return;
  const recommendedGong = state.intent ? getRecommendedGong(state.intent) : null;
  el.innerHTML = GONG_ORDER.map(g => {
    const cards = state.grid[g] || [];
    let cls = '';
    if (state.line && state.line.includes(g)) cls = 'confirmed';
    let inner = `
      <span class="num">${g}</span>
      <span class="name">${GONG_NAMES[g]}</span>
      <span class="wx">${GONG_WUXING[g]}</span>
    `;
    if (cards.length) {
      inner += '<div class="card-stack">';
      cards.forEach(c => { inner += `<div class="mini-card ${getCardColor(c)}">${c.isJoker ? c.type : c.rank}${c.isJoker ? '' : c.suit}</div>`; });
      inner += '</div>';
      const diff = calcDiff(g, cards[cards.length - 1]);
      const cardVal = getCardValue(cards[cards.length - 1]);
      const diffLevel = getDiffLevel(diff);
      inner += `<span class="diff-label" style="color:${diffLevel.color}">差值：| ${g} - ${cardVal} | = ${diff}</span>`;
    } else {
      inner += '<span class="empty-label">空</span>';
    }
    if (state.lineOrder[g]) inner += `<span class="time-tag">${state.lineOrder[g]}</span>`;
    if (recommendedGong === g) inner += `<span class="recommend-tag">⭐</span>`;
    return `<div class="gong ${cls}" data-gong="${g}">${inner}</div>`;
  }).join('');

  // 天机线引导
  const lineGuide = document.getElementById('lineGuide');
  const filledGongs = Object.keys(state.grid).filter(g => state.grid[g] && state.grid[g].length > 0).map(Number);
  if (filledGongs.length >= 3 && (state.possible || []).length > 0 && !state.line) {
    if (!lineGuide) {
      const guide = document.createElement('div');
      guide.id = 'lineGuide';
      guide.style.cssText = 'margin-top:8px;padding:10px 12px;background:rgba(201,160,96,0.08);border-radius:6px;font-size:0.8rem;color:var(--accent);';
      guide.innerHTML = `✨ 检测到可连成天机线。如果你想选一条，点击下方按钮；不想选也没关系。`;
      el.parentNode.insertBefore(guide, el.nextSibling);
    }
  } else if (lineGuide) {
    lineGuide.remove();
  }

  if (Object.keys(state.grid).length > 0) renderTensionMap(el);
}

function getRecommendedGong(intent) {
  const map = { '财运': 2, '感情': 7, '事业': 6, '健康': 8, '学业': 4, '决策': 5, '人际关系': 7, '家宅': 8, '运势': 9, '寻物': 1, '官非': 3, '出行': 3, '灵异': 1, '技能': 4 };
  return map[intent] || null;
}

function renderTensionMap(container) {
  let existing = document.getElementById('tensionMap');
  if (!existing) {
    const map = document.createElement('div');
    map.id = 'tensionMap';
    map.style.cssText = 'margin-top:12px;padding:10px;background:rgba(0,0,0,0.2);border-radius:8px;font-size:0.7rem;';
    container.parentNode.appendChild(map);
    existing = map;
  }
  const gongs = state.gongOrder.length ? state.gongOrder : GONG_ORDER;
  const tensions = gongs.map(g => {
    const cards = state.grid[g] || [];
    if (!cards.length) return { gong: g, tension: 0 };
    const diff = calcDiff(g, cards[0]);
    return { gong: g, tension: Math.min(100, diff * 10) };
  });
  const maxTension = Math.max(1, ...tensions.map(t => t.tension));
  existing.innerHTML = `
    <div style="display:flex;flex-wrap:wrap;gap:4px;justify-content:center;">
      <span style="color:var(--dim);width:100%;text-align:center;margin-bottom:4px;">⚡ 张力分布</span>
      ${tensions.filter(t => t.tension > 0).map(t => {
        const intensity = maxTension > 0 ? Math.round((t.tension / maxTension) * 100) : 0;
        const bg = intensity < 20 ? 'rgba(76,175,80,0.2)' : intensity < 40 ? 'rgba(139,195,74,0.4)' : intensity < 60 ? 'rgba(255,193,7,0.6)' : intensity < 80 ? 'rgba(255,152,0,0.8)' : 'rgba(244,67,54,0.9)';
        return `<span style="display:inline-block;padding:2px 8px;border-radius:4px;background:${bg};color:${intensity > 60 ? '#fff' : 'var(--text)'}">${GONG_NAMES[t.gong]} ${t.tension}%</span>`;
      }).join('')}
    </div>
  `;
}

// ===== 刷新所有 =====
export function refreshAll() {
  renderDeck();
  renderTiYong();
  renderGrid();
  renderDurianDisplay();
}

// ===== 滚动按钮 =====
export function bindScrollButtons() {
  document.removeEventListener('click', handleScrollButtons);
  document.addEventListener('click', handleScrollButtons);
}

function handleScrollButtons(e) {
  const leftBtn = e.target.closest('#scrollLeftBtn');
  if (leftBtn) {
    e.stopPropagation();
    const deck = document.getElementById('deckContainer');
    if (deck) deck.scrollBy({ left: -180, behavior: 'smooth' });
    return;
  }
  const rightBtn = e.target.closest('#scrollRightBtn');
  if (rightBtn) {
    e.stopPropagation();
    const deck = document.getElementById('deckContainer');
    if (deck) deck.scrollBy({ left: 180, behavior: 'smooth' });
    return;
  }
}

// ===== 榴莲指数 =====
export function renderDurianDisplay() {
  const container = document.getElementById('durianDisplay');
  if (!container) return;
  if (!state.ti || !state.yong || Object.keys(state.grid).length === 0) {
    container.innerHTML = '';
    return;
  }
  const result = calculateDurianIndex(state);
  state.durianIndex = result;
  const icon = getDurianIcon(result.score);
  container.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;padding:8px 12px;background:rgba(0,0,0,0.2);border-radius:8px;margin:4px 0;">
      <span style="font-size:1.8rem;line-height:1;">${icon}</span>
      <div>
        <div style="font-weight:bold;font-size:1rem;">
          榴莲指数 ${result.score}/10
          <span style="color:${result.score < 3 ? '#4CAF50' : result.score < 5 ? '#8BC34A' : result.score < 7 ? '#FFC107' : result.score < 9 ? '#FF9800' : '#F44336'};font-size:0.75rem;">（${result.level}）</span>
        </div>
        <div style="font-size:0.7rem;color:var(--dim);">${result.description}</div>
      </div>
    </div>
  `;
}

// ===== Step2：布阵 =====
export function renderStep2() {
  const core = document.getElementById('coreArea');
  if (!core) return;
  core.innerHTML = `
    <h3>${state.manualMode ? '手动录入 · 明牌选阵' : '立极·布阵'}</h3>
    <div style="font-size:0.8rem;color:var(--dim);margin-bottom:8px;">
      从牌堆中选出体牌（代表你）和用牌（代表事情），然后把剩下的牌放入九宫。
    </div>
    <div id="durianDisplay" style="margin-bottom:8px;"></div>
    <div class="deck-grid" id="deckContainer"></div>
    <div class="btn-row">
      <button id="scrollLeftBtn" class="outline small">‹</button>
      <button data-action="resetStep2" class="outline small">重置选牌</button>
      ${state.manualMode ? '' : '<button id="btnConfirmTY" disabled data-action="confirmTiYong" class="small primary">' + UI_TEXTS.btnConfirmTiYong + '</button>'}
      <button id="scrollRightBtn" class="outline small">›</button>
      ${state.manualMode ? '<button data-action="generateInterpretation" class="small primary">' + UI_TEXTS.btnInterpret + '</button>' : ''}
    </div>
    <div id="gridArea" ${state.manualMode ? '' : 'style="display:none"'}>
      <div style="font-size:0.75rem;color:var(--dim);margin:6px 0;">
        每个宫位最多3张牌。可以留空。
      </div>
      <div class="grid-9" id="gridContainer"></div>
      <div class="btn-row">
        <button data-action="resetGrid" class="outline small">清九宫</button>
        ${state.manualMode ? '' : '<button data-action="generateInterpretation" class="small primary">' + UI_TEXTS.btnInterpret + '</button>'}
        ${!state.manualMode && state.line ? '<button data-action="sealDeck" class="outline small">🔒 封印</button>' : ''}
      </div>
    </div>
  `;
  refreshAll();
  const btn = document.getElementById('btnConfirmTY');
  if (btn) btn.disabled = !(state.ti && state.yong);
}

// ===== 设置面板 =====
export function initSettingsPanel() {
  const s = getApiSettings();
  if (s) {
    const providerBtns = document.querySelectorAll('#providerGrid button');
    providerBtns.forEach(b => b.classList.toggle('selected', b.dataset.value === s.provider));
    const keyInput = document.getElementById('apiKey');
    if (keyInput) keyInput.value = s.apiKey || '';
    const endpointInput = document.getElementById('apiEndpoint');
    if (endpointInput) endpointInput.value = s.endpoint || '';
    const styleSelect = document.getElementById('aiStyle');
    if (styleSelect) styleSelect.value = s.aiStyle || 'guide';
  }
  updateApiStatus();
}

// ===== 个人面板 =====
export function initProfilePanel() {
  const p = getProfile();
  const birthDate = document.getElementById('birthDate');
  const birthTime = document.getElementById('birthTime');
  const name = document.getElementById('profileName');
  const gender = document.getElementById('profileGender');
  const birthPlace = document.getElementById('birthPlace');
  const currentPlace = document.getElementById('currentPlace');
  if (birthDate) birthDate.value = p.birthDate || '';
  if (birthTime) birthTime.value = p.birthTime || '';
  if (name) name.value = p.name || '';
  if (gender) gender.value = p.gender || '';
  if (birthPlace) birthPlace.value = p.birthPlace || '';
  if (currentPlace) currentPlace.value = p.currentPlace || '';
  updateBaziPreview();
}

export function updateBaziPreview() {
  const preview = document.getElementById('baziPreview');
  if (!preview) return;
  const bd = document.getElementById('birthDate')?.value;
  const bt = document.getElementById('birthTime')?.value || '12:00';
  if (!bd) { preview.textContent = ''; return; }
  const parts = bd.split('-');
  if (parts.length !== 3) { preview.textContent = ''; return; }
  const year = parseInt(parts[0]);
  const month = parseInt(parts[1]);
  const day = parseInt(parts[2]);
  const tp = bt.split(':');
  const hour = tp.length >= 1 ? parseInt(tp[0]) || 12 : 12;
  try {
    const bazi = calcFullBaZi(year, month, day, hour);
    preview.textContent = '四柱预览：' + bazi.fullText + '  |  生肖：' + bazi.yearPillar.shengXiao;
  } catch (e) { preview.textContent = '日期无效'; }
}

// ===== 历史面板 =====
export function renderHistoryPanel() {
  const list = document.getElementById('historyList');
  if (!list) return;
  const history = getHistory();
  if (!history.length) {
    list.innerHTML = `<p style="color:var(--dim);font-size:0.85rem;">${HISTORY_EMPTY}</p>`;
    return;
  }
  list.innerHTML = history.map((r, i) => `
    <div class="history-item" data-index="${i}" style="cursor:pointer;margin:8px 0;padding:10px 12px;background:rgba(255,255,255,0.03);border-radius:6px;border:1px solid rgba(255,255,255,0.05);">
      <strong style="font-size:0.8rem;">${new Date(r.time).toLocaleString()}</strong>
      <span style="font-size:0.75rem;color:var(--dim);margin-left:8px;">${r.question || '未提问'} (${r.category || '无类别'})</span>
    </div>
  `).join('');
}

// ===== 状态提示 =====
export function updateApiStatus() {
  const s = getApiSettings();
  const st = document.getElementById('apiStatus');
  if (!st) return;
  st.textContent = s && s.apiKey ? UI_TEXTS.apiStatusConfigured : UI_TEXTS.apiStatusNotConfigured;
  st.style.color = s && s.apiKey ? '#5a9a6a' : '';
}

// ===== 逼问流程动作（供 ui.js 调用） =====
export function handleFlowAction(action, dataset) {
  const flow = state.questionFlow;
  if (!flow && action !== 'flowStart') return;

  switch (action) {
    case 'flowContinue':
      flow.stage = 'ask_confirm';
      if (!flow.finalQuestion) flow.finalQuestion = flow.question;
      renderStep1();
      break;
    case 'flowEdit':
      state.questionFlow = null;
      renderStep1();
      break;
    case 'flowSkip':
    case 'flowStart': {
      import('../ui.js').then(ui => {
        if (action === 'flowSkip') {
          state.questionFlow = null;
          ui.proceedStartQuestion();
        } else {
          state.question = flow.finalQuestion || flow.question;
          state.questionFlow = null;
          ui.proceedStartQuestion();
        }
      });
      break;
    }
    case 'continueToEcho':
      renderEcho();
      break;
    case 'skipEcho':
      import('../ui.js').then(ui => ui.showFullReport());
      break;
    case 'showFullReport':
      import('../ui.js').then(ui => ui.showFullReport());
      break;
  }
}