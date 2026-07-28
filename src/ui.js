// ===== 浮生牌 · UI 层 =====
// DOM 渲染、事件委托、长按拖拽、多步引导。

import {
  SUITS, RANKS, GONG_ORDER, GONG_NAMES, GONG_WUXING, GONG_DIRECTION,
  ALL_LINES, TIME_LABELS, API_PROVIDERS, CATEGORIES,
  getWuxing, getCardValue, getCardId, getCardColor, getShengKe, getShengKeLabel, getWangState,
} from './data.js';

import {
  createDeck, shuffle, drawTiYong,
  evaluateTiYong, detectLines,
  getTimeLabels, calcDiff, analyzeGrid, checkUsageFrequency,
  calcFullBaZi, calcYearPillar,
} from './engine.js';

import {
  getHistory, saveReading, deleteHistoryItem,
  getDrawTimestamps, addDrawTimestamp,
  getApiSettings, saveApiSettings, clearApiSettings,
  getProfile, saveProfile,
  hasCompletedOnboarding, completeOnboarding,
  exportAllData,
} from './storage.js';

import { requestReading, requestFollowUp, testApiConnection } from './ai.js';

import {
  UI_TEXTS, RULES_TEXTS, TUTORIAL_TEXTS, PHYSICAL_GUIDE,
  READING_TEXTS, REFUSAL_TEXTS, USAGE_REMINDERS,
  SHARE_TEXTS, SHARE_QUOTES, TIME_RESTRICTION,
  HISTORY_EMPTY, PRIVACY_NOTICE, AI_STYLES, AI_GUIDE_TEXT,
  ONBOARDING_STEPS,
} from './texts.js';

// ===== 应用全局状态 =====
const state = {
  question: '',
  category: '',
  deck: [],
  ti: null,
  yong: null,
  grid: {},
  line: null,
  lineOrder: {},
  step: 1,
  sel: null,
  possible: [],
  manualMode: false,
  gongOrder: [],
  chatHistory: [],      // 当前牌阵的 AI 对话历史
  selectedProvider: 'deepseek',
  uid: 0,
  editCount: 0,
  currentOnboardStep: 0,
};

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

let domApp, domDynamic, domToast, domModal, domModalContent, domSharePreview, domShareCanvas;
let cardScrollTimeout = null;

function cacheDom() {
  domApp = $('#appRoot');
  domDynamic = $('#dynamicPanels');
  domToast = $('#toast');
  domModal = $('#modal');
  domModalContent = $('#modalContent');
  domSharePreview = $('#sharePreview');
  domShareCanvas = $('#shareCanvas');
}

// ===== Toast =====
let toastTimer = null;
function toast(msg, duration = 2000) {
  if (!domToast) return;
  domToast.textContent = msg;
  domToast.removeAttribute('hidden');
  domToast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    domToast.classList.remove('show');
    setTimeout(() => domToast.setAttribute('hidden', ''), 400);
  }, duration);
}

// ===== 步骤条 =====
function updateStep(n) {
  state.step = n;
  for (let i = 1; i <= 3; i++) {
    const el = $('#sd' + i);
    if (!el) continue;
    el.classList.remove('active', 'done');
    if (i < n) el.classList.add('done');
    if (i === n) el.classList.add('active');
  }
}

// ===== 面板切换 =====
function togglePanel(panelId) {
  const panel = $('#panel' + panelId.charAt(0).toUpperCase() + panelId.slice(1));
  if (!panel) return;
  const isHidden = panel.hasAttribute('hidden');
  $$('.static-panel').forEach(p => p.setAttribute('hidden', ''));
  if (isHidden) {
    panel.removeAttribute('hidden');
    if (panelId === 'settings') initSettingsPanel();
    if (panelId === 'profile') initProfilePanel();
    if (panelId === 'history') renderHistoryPanel();
    if (panelId === 'teaching') renderTeachingPanel();
  }
}

// ===== 教程面板 =====
function renderTeachingPanel() {
  const container = $('#teachingContent');
  if (!container) return;

  let html = '<p>' + TUTORIAL_TEXTS.intro + '</p>';
  html += '<ol style="padding-left:1.2rem;margin-bottom:2vh;">' +
    TUTORIAL_TEXTS.steps.map(s => '<li style="margin-bottom:0.5vh;font-size:0.85rem;color:var(--dim)">' + s + '</li>').join('') +
    '</ol>';
  html += '<p style="font-size:0.75rem;color:var(--accent);margin-bottom:2vh;">' + TUTORIAL_TEXTS.offlineHint + '</p>';

  if (PHYSICAL_GUIDE && PHYSICAL_GUIDE.sections) {
    html += '<h4 style="color:var(--accent);margin-top:2vh;">' + PHYSICAL_GUIDE.title + '</h4>';
    PHYSICAL_GUIDE.sections.forEach(sec => {
      html += '<h4>' + sec.heading + '</h4>';
      html += '<div class="physical-body">' + sec.body.replace(/\n/g, '<br>') + '</div>';
    });
  }

  container.innerHTML = html;
}

// ===== 牌组渲染（隐藏滚动条，按钮位置改为上方控制栏） =====
function renderDeck() {
  const el = $('#deckContainer');
  if (!el) return;
  
  const previousScrollLeft = el.scrollLeft || 0;

  if (!state.deck.length) { 
    el.innerHTML = '<span style="color:#444;padding:10px;">牌库空</span>'; 
    return; 
  }

  // 1. 设置横向滑动的 CSS（隐藏原生滚动条，仅保留滚动能力）
  el.style.cssText = `
    display: flex; flex-wrap: nowrap; gap: 12px; overflow-x: auto; overflow-y: hidden;
    scroll-snap-type: x mandatory; -webkit-overflow-scrolling: touch;
    padding: 10px 20px; touch-action: pan-x;
    scrollbar-width: none; -ms-overflow-style: none;
  `;
  el.style.setProperty('::-webkit-scrollbar', 'display', 'none');

  // 2. 生成卡片列表
  let html = '';
  state.deck.forEach(c => {
    const id = getCardId(c);
    const placed = isCardPlaced(c);
    const sel = state.sel === id;
    const colorCls = getCardColor(c);
    const rank = c.isJoker ? c.type : c.rank;
    const suit = c.isJoker ? '' : c.suit;
    const wx = getWuxing(c);

    if (state.manualMode) {
      html += `<div class="card-face-small ${colorCls}${sel ? ' selected' : ''}${placed ? ' used' : ''}"
        data-cardid="${id}" data-cardindex="${state.deck.indexOf(c)}"
        style="${placed ? 'opacity:0.3;pointer-events:none' : ''}; scroll-snap-align: center; flex-shrink: 0; width: 70px; height: 100px;">
        <span class="rank">${rank}</span><span class="suit">${suit}</span><span class="wx-tag">${wx}</span>
      </div>`;
    } else {
      html += `<div class="card-back${sel ? ' selected' : ''}${placed ? ' used' : ''}"
        data-cardid="${id}" data-cardindex="${state.deck.indexOf(c)}"
        style="${placed ? 'opacity:0.3;pointer-events:none' : ''}; scroll-snap-align: center; flex-shrink: 0; width: 70px; height: 100px;"></div>`;
    }
  });
  el.innerHTML = html;

  if (previousScrollLeft > 0) {
    requestAnimationFrame(() => {
      el.scrollLeft = previousScrollLeft;
    });
  }

  // 3. 【重要改动】绑定上方控制栏的左右按钮（丝滑帧循环滚动）
  const leftBtn = document.getElementById('scrollLeftBtn');
  const rightBtn = document.getElementById('scrollRightBtn');
  
  if (leftBtn && rightBtn) {
    // 因为每次渲染都会重新创建按钮，这里用替换节点的方式清空旧的监听器
    const lClone = leftBtn.cloneNode(true);
    const rClone = rightBtn.cloneNode(true);
    leftBtn.parentNode.replaceChild(lClone, leftBtn);
    rightBtn.parentNode.replaceChild(rClone, rightBtn);

    const finalLeft = document.getElementById('scrollLeftBtn');
    const finalRight = document.getElementById('scrollRightBtn');
    
    const step = 45; // 每帧移动45px
    let scrollInterval = null;

    const startScroll = (direction) => {
      const doScroll = () => {
        const dir = direction === 'left' ? -step : step;
        el.scrollLeft += dir; // 直接修改scrollLeft，绝对丝滑
      };
      doScroll(); // 短按触发一次单步
      if (scrollInterval) clearInterval(scrollInterval);
      scrollInterval = setInterval(doScroll, 16); // 16ms = 约60fps 极致帧循环
    };

    const stopScroll = () => {
      if (scrollInterval) {
        clearInterval(scrollInterval);
        scrollInterval = null;
      }
    };

    // 绑定PC端鼠标
    finalLeft.addEventListener('mousedown', (e) => { e.preventDefault(); startScroll('left'); });
    finalLeft.addEventListener('mouseup', stopScroll);
    finalLeft.addEventListener('mouseleave', stopScroll);
    
    finalRight.addEventListener('mousedown', (e) => { e.preventDefault(); startScroll('right'); });
    finalRight.addEventListener('mouseup', stopScroll);
    finalRight.addEventListener('mouseleave', stopScroll);

    // 绑定移动端触摸
    finalLeft.addEventListener('touchstart', (e) => { e.preventDefault(); startScroll('left'); });
    finalLeft.addEventListener('touchend', stopScroll);
    finalLeft.addEventListener('touchcancel', stopScroll);

    finalRight.addEventListener('touchstart', (e) => { e.preventDefault(); startScroll('right'); });
    finalRight.addEventListener('touchend', stopScroll);
    finalRight.addEventListener('touchcancel', stopScroll);
  }

  // 4. 滑动吸附计算（但取消自动高亮）
  setupCardSwipeSelection(el);
}

// ===== 横向滑动吸附选牌的核心逻辑（去除自动高亮） =====
function setupCardSwipeSelection(container) {
  const oldListener = container._scrollListener;
  if (oldListener) container.removeEventListener('scroll', oldListener);

  const handleScroll = () => {
    clearTimeout(cardScrollTimeout);
    cardScrollTimeout = setTimeout(() => {
      const containerRect = container.getBoundingClientRect();
      const centerX = containerRect.left + containerRect.width / 2;
      
      let closestCard = null;
      let closestDistance = Infinity;

      container.querySelectorAll('[data-cardid]').forEach(cardEl => {
        if (cardEl.style.pointerEvents === 'none') return; 
        const rect = cardEl.getBoundingClientRect();
        const cardCenterX = rect.left + rect.width / 2;
        const distance = Math.abs(cardCenterX - centerX);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestCard = cardEl;
        }
      });

      if (closestCard) {
        const newId = closestCard.dataset.cardid;
        // 【改动点】取消了自动高亮 state.sel = newId 的自动设定
        try { if (navigator.vibrate) navigator.vibrate(4); } catch (e) {}
      }
    }, 50);
  };

  container.addEventListener('scroll', handleScroll, { passive: true });
  container._scrollListener = handleScroll;
  // 移除初次渲染自动选中逻辑
}

// ===== 体用栏 =====
function renderTiYong() {
  const bar = $('#tiyongBar');
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
  bar.innerHTML = `<div class="slot">${UI_TEXTS.labelTi} ${tiHTML}</div><span class="separator">${UI_TEXTS.labelSeparator}</span><div class="slot">${UI_TEXTS.labelYong} ${yongHTML}</div>${badge}`;
  const btn = $('#btnConfirmTY'); if (btn) btn.disabled = !(state.ti && state.yong);
}

// ===== 九宫格 =====
function renderGrid() {
  const el = $('#gridContainer'); if (!el) return;
  el.innerHTML = GONG_ORDER.map(g => {
    const cards = state.grid[g] || []; let cls = '';
    if (state.line && state.line.includes(g)) cls = 'confirmed';
    let inner = `<span class="num">${g}</span><span class="name">${GONG_NAMES[g]}</span><span class="wx">${GONG_WUXING[g]}</span>`;
    if (cards.length) {
      inner += '<div class="card-stack">';
      cards.forEach(c => { inner += `<div class="mini-card ${getCardColor(c)}">${c.isJoker ? c.type : c.rank}${c.isJoker ? '' : c.suit}</div>`; });
      inner += '</div>';
      inner += `<span class="diff-label">${UI_TEXTS.labelDiffPrefix}${calcDiff(g, cards[cards.length - 1])}</span>`;
    } else { inner += '<span class="empty-label">' + UI_TEXTS.labelEmpty + '</span>'; }
    if (state.lineOrder[g]) inner += `<span class="time-tag">${state.lineOrder[g]}</span>`;
    return `<div class="gong ${cls}" data-gong="${g}">${inner}</div>`;
  }).join('');
}

function refreshAll() { renderDeck(); renderTiYong(); renderGrid(); }

// ===== 选牌 =====
function selectCard(cardId) {
  if (state.sel === cardId) { state.sel = null; refreshAll(); return; }
  const card = findCardById(cardId);
  if (!card || isCardPlaced(card)) { state.sel = null; refreshAll(); return; }
  state.sel = cardId; refreshAll();
  try { if (navigator.vibrate) navigator.vibrate(8); } catch (e) { /* ignore */ }
}

function isCardPlaced(card) {
  const id = getCardId(card);
  if (state.ti && getCardId(state.ti) === id) return true;
  if (state.yong && getCardId(state.yong) === id) return true;
  for (const g in state.grid) {
    if (state.grid[g] && state.grid[g].some(c => getCardId(c) === id)) return true;
  }
  return false;
}

function findCardById(id) { return state.deck.find(c => getCardId(c) === id); }

// ===== 放牌 =====
function placeCardOnGong(card, gong) {
  if (!card) return false;
  if (!state.grid[gong]) state.grid[gong] = [];
  state.grid[gong].push(card);
  state.deck = state.deck.filter(c => getCardId(c) !== getCardId(card));
  if (!state.gongOrder.includes(gong)) state.gongOrder.push(gong);
  state.sel = null; refreshAll(); checkLines();
  try { if (navigator.vibrate) navigator.vibrate(10); } catch (e) { /* ignore */ }
  toast(UI_TEXTS.toastAnyCount, 1500);
  return true;
}

function placeCardOnTiYong(card, role) {
  if (!card || card.isJoker) return false;
  if (role === 'ti' && state.ti) return false;
  if (role === 'yong' && state.yong) return false;
  state.deck = state.deck.filter(c => getCardId(c) !== getCardId(card));
  if (role === 'ti') state.ti = card; else state.yong = card;
  state.sel = null; refreshAll();
  try { if (navigator.vibrate) navigator.vibrate(10); } catch (e) { /* ignore */ }
  return true;
}

// ===== 移除牌 =====
function removeCardFromGong(gong) {
  const cards = state.grid[gong] || [];
  if (!cards.length) return;
  const card = cards.pop();
  state.deck.push(card);
  state.deck = state.manualMode ? state.deck : shuffle(state.deck);
  if (!cards.length) { delete state.grid[gong]; state.gongOrder = state.gongOrder.filter(x => x !== gong); }
  state.line = null; state.lineOrder = {}; state.possible = []; removeLineSelector(); refreshAll(); checkLines();
}

// ===== 天机线 =====
function checkLines() {
  const filled = Object.keys(state.grid).filter(g => (state.grid[g] || []).length > 0).map(Number);
  state.possible = ALL_LINES.filter(l => l.every(g => filled.includes(g)));
  removeLineSelector();
  if (state.possible.length === 1 && !state.line) {
    const line = state.possible[0];
    const firstGong = state.gongOrder.find(g => line.includes(g));
    if (firstGong) { const idx = line.indexOf(firstGong); const ordered = [...line.slice(idx), ...line.slice(0, idx)]; setLine(ordered); }
    else setLine(line);
    toast(UI_TEXTS.toastLineConfirmed);
  } else if (state.possible.length > 1 && !state.line) { renderLineSelector(state.possible); }
  refreshAll();
}

function setLine(line) {
  state.line = [...line]; const key = line.join(','); const tl = TIME_LABELS[key] || {};
  state.lineOrder = {}; state.lineOrder[line[0]] = '起因'; state.lineOrder[line[1]] = '经过'; state.lineOrder[line[2]] = '结果';
  for (let g = 1; g <= 9; g++) if (!state.lineOrder[g]) state.lineOrder[g] = tl[g] || '';
  state.possible = []; removeLineSelector(); refreshAll();
}

function renderLineSelector(candidates) {
  const gridContainer = $('#gridContainer'); if (!gridContainer) return;
  const panel = document.createElement('div'); panel.id = 'lineSelector';
  panel.style.cssText = 'background:rgba(0,0,0,0.3);border:2px solid var(--accent);border-radius:14px;padding:10px 16px;margin-top:10px;';
  let btns = '';
  candidates.forEach(line => {
    btns += `<button class="line-btn" data-line="${line.join(',')}">${line.map(g => GONG_NAMES[g] + '宫').join('→')}</button>`;
    btns += `<button class="line-btn" data-line="${line.slice().reverse().join(',')}">${line.slice().reverse().map(g => GONG_NAMES[g] + '宫').join('→')}</button>`;
  });
  panel.innerHTML = `<p style="font-size:0.85rem;color:var(--accent);margin-bottom:6px;">${UI_TEXTS.toastLinesMultiple}</p><div style="display:flex;gap:5px;flex-wrap:wrap;">${btns}</div>`;
  gridContainer.after(panel);
}
function removeLineSelector() { const el = $('#lineSelector'); if (el) el.remove(); }

// ===== 新手引导 =====
function showOnboarding() {
  state.currentOnboardStep = 0;
  renderOnboardStep();
}

function renderOnboardStep() {
  const existing = document.querySelector('.onboard-overlay');
  if (existing) existing.remove();

  if (!ONBOARDING_STEPS || !ONBOARDING_STEPS.length) {
    completeOnboarding();
    return;
  }

  const step = ONBOARDING_STEPS[state.currentOnboardStep];
  if (!step) return;

  const overlay = document.createElement('div');
  overlay.className = 'onboard-overlay';

  const dotsHTML = ONBOARDING_STEPS.map((_, i) => `<span class="onboard-dot${i === state.currentOnboardStep ? ' active' : ''}"></span>`).join('');

  overlay.innerHTML = `
    <div class="onboard-card">
      <h3>${step.title}</h3>
      <p>${step.body}</p>
      <div class="onboard-dots">${dotsHTML}</div>
      <div>
        <button class="primary small" id="onboardNext">${step.btn}</button>
        ${state.currentOnboardStep < ONBOARDING_STEPS.length - 1 ? '<button class="outline small" id="onboardSkip">跳过</button>' : ''}
      </div>
    </div>
  `;
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

// ===== 起念 =====
function renderStep1() {
  domDynamic.innerHTML = `
    <div class="panel"><h3>${UI_TEXTS.step1}</h3>
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

// ===== 立极（上方加入左右选牌按钮） =====
function renderStep2() {
  domDynamic.innerHTML = `
    <div class="panel"><h3>${state.manualMode ? '手动录入 · 明牌选阵' : '立极·布阵'}</h3>
      <div class="guide-tip">${state.manualMode ? UI_TEXTS.guideManual : UI_TEXTS.guideSelectTiYong}</div>
      <div class="tiyong-bar" id="tiyongBar"></div>
      <div class="deck-grid" id="deckContainer"></div>
      
      <!-- 【核心改动】将左右滑动按钮直接放在了按钮行中 -->
      <div class="btn-row" style="display:flex; flex-wrap:wrap; gap:6px; justify-content:center; align-items:center;">
        <button id="scrollLeftBtn" class="outline small">‹ 选牌</button>
        <button data-action="resetStep2" class="outline small">重抽</button>
        ${state.manualMode ? '' : '<button id="btnConfirmTY" disabled data-action="confirmTiYong" class="small primary">' + UI_TEXTS.btnConfirmTiYong + '</button>'}
        <button id="scrollRightBtn" class="outline small">选牌 ›</button>
        ${state.manualMode ? '<button data-action="generateInterpretation" class="small primary">' + UI_TEXTS.btnInterpret + '</button>' : ''}
      </div>

      <div id="gridArea" ${state.manualMode ? '' : 'style="display:none"'}>
        <div class="guide-tip">${UI_TEXTS.guideAfterTiYong}</div>
        <div class="grid-9" id="gridContainer"></div>
        <div class="btn-row">
          <button data-action="resetGrid" class="outline small">清九宫</button>
          ${state.manualMode ? '' : '<button data-action="generateInterpretation" class="small primary">' + UI_TEXTS.btnInterpret + '</button>'}
        </div>
      </div>
    </div>`;
  refreshAll();
  if (state.ti && state.yong && !state.manualMode) { const btn = $('#btnConfirmTY'); if (btn) btn.disabled = false; }
}

// ===== 确认体用 =====
function confirmTiYong() {
  if (!state.ti || !state.yong) return;
  state.deck.push({ isJoker: true, type: '大王', _uid: state.uid++ }, { isJoker: true, type: '小王', _uid: state.uid++ });
  state.deck = shuffle(state.deck);
  const gridArea = $('#gridArea'); if (gridArea) gridArea.style.display = 'block';
  const deckEl = $('#deckContainer'); if (deckEl) { deckEl.classList.add('shuffling'); setTimeout(() => deckEl.classList.remove('shuffling'), 700); }
  toast(UI_TEXTS.toastJokersInjected); refreshAll();
}

function resetGrid() {
  for (const g in state.grid) state.deck.push(...state.grid[g]);
  state.grid = {}; state.line = null; state.lineOrder = {}; state.possible = []; state.gongOrder = []; state.sel = null;
  state.deck = state.manualMode ? state.deck : shuffle(state.deck); removeLineSelector(); refreshAll(); toast(UI_TEXTS.toastGridCleared);
}

// ===== 一键抽牌 =====
function lazyStart() {
  const h = new Date().getHours();
  if (h >= 23 || h < 1) { toast(TIME_RESTRICTION.message); return; }
  state.question = $('#questionInput')?.value?.trim() || ''; state.manualMode = false;
  let deck = createDeck(false);
  const { ti, yong, remaining } = drawTiYong(deck);
  state.ti = ti; state.yong = yong;
  let remainingDeck = remaining;
  remainingDeck.push({ isJoker: true, type: '大王', _uid: state.uid++ }, { isJoker: true, type: '小王', _uid: state.uid++ });
  remainingDeck = shuffle(remainingDeck);
  const line = ALL_LINES[Math.floor(Math.random() * ALL_LINES.length)];
  state.line = [...line]; const key = line.join(','); const tl = TIME_LABELS[key] || {};
  state.lineOrder = {}; state.lineOrder[line[0]] = '起因'; state.lineOrder[line[1]] = '经过'; state.lineOrder[line[2]] = '结果';
  for (let g = 1; g <= 9; g++) if (!state.lineOrder[g]) state.lineOrder[g] = tl[g] || '';
  for (const g of line) state.grid[g] = [remainingDeck.pop()];
  for (const g of GONG_ORDER) if (!state.grid[g] && remainingDeck.length) state.grid[g] = [remainingDeck.pop()];
  state.deck = remainingDeck; state.gongOrder = line.slice();
  updateStep(3); renderStep3(localInterpretation());
}

// ===== 四柱获取 =====
function getBaziFromProfile() {
  try {
    const profile = getProfile();
    if (!profile || !profile.birthDate) return null;
    const parts = profile.birthDate.split('-');
    if (parts.length !== 3) return null;
    const year = parseInt(parts[0]); const month = parseInt(parts[1]); const day = parseInt(parts[2]);
    if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
    let hour = 12;
    if (profile.birthTime) { const tp = profile.birthTime.split(':'); if (tp.length >= 1) hour = parseInt(tp[0]) || 12; }
    return calcFullBaZi(year, month, day, hour);
  } catch (e) { return null; }
}

// ===== 解读生成 =====
function localInterpretation() {
  const tiWx = getWuxing(state.ti); const yongWx = getWuxing(state.yong);
  const rel = getShengKe(tiWx, yongWx); const label = rel ? getShengKeLabel(rel) : '变数';
  let t = '';
  if (state.category) {
    const catIntros = { '财运': '钱的事儿，有时候不是你挣不到，是你没看到。\n', '感情': '感情这种事，谁也说不好。\n', '事业': '工作嘛，有时候不是你不行，是这个坑不太对。\n', '健康': '身体是诚实的，不舒服了就是在跟你说话。\n', '学业': '有时候不是脑子不够用，是心里太乱了。\n', '决策': '选择困难是因为你知道每个选项背后都有代价。\n' };
    t += (catIntros[state.category] || '') + '\n';
  }
  const bazi = getBaziFromProfile();
  if (bazi) t += `【四柱】${bazi.fullText}\n\n`;
  else { try { const yp = calcYearPillar(new Date().getFullYear()); t += `【年柱】${yp.full}年\n\n`; } catch(e) {} }

  t += `体牌是${tiWx}，是问卦人。用牌是${yongWx}，是所问之事。\n`;
  const tyDesc = READING_TEXTS.tiYongDescriptions[rel];
  if (tyDesc) t += tyDesc + '\n'; else t += '大小王搅局，常规判断不适用。\n';
  t += `（${label}）\n\n`;

  if (state.line) {
    t += `天机线：${state.line.map(g => GONG_NAMES[g] + '宫').join(' → ')}\n`;
    const order = ['起因', '经过', '结果'];
    state.line.forEach((g, i) => {
      const cards = state.grid[g] || []; if (!cards.length) return;
      cards.forEach(card => {
        const diff = calcDiff(g, card); const wang = getWangState(getWuxing(card), GONG_WUXING[g]);
        const cardWx = getWuxing(card); const yinYang = card.isJoker ? (card.type === '大王' ? '阳' : '阴') : (['♥', '♦'].includes(card.suit) ? '阳' : '阴');
        const cardLabel = card.isJoker ? card.type : card.suit + card.rank;
        t += `${order[i]}宫 ${GONG_NAMES[g]}（${GONG_DIRECTION[g]}方，属${GONG_WUXING[g]}）：${cardLabel}（${cardWx}，${yinYang}） 差${diff} ${wang}\n  ${describeDiff(diff, card, g)}\n`;
        const relToTi = getShengKe(tiWx, cardWx);
        if (relToTi) { const rp = { '生我': '这个位置在给你加油。', '克我': '这个位置在给你添堵。', '同我': '它跟你差不多。', '我生': '你在消耗自己。', '我克': '你能拿住，但要费劲。' }; t += `  ${rp[relToTi] || ''}\n`; }
      });
    });
    t += '\n其他位置：\n';
    for (let g = 1; g <= 9; g++) { if (state.line.includes(g)) continue; (state.grid[g] || []).forEach(card => { const diff = calcDiff(g, card); const cardLabel = card.isJoker ? card.type : card.suit + card.rank; t += `${state.lineOrder[g] || '远位'} ${GONG_NAMES[g]}宫：${cardLabel} 差${diff} ${describeDiff(diff, card, g)}\n`; }); }
  } else { for (let g = 1; g <= 9; g++) { (state.grid[g] || []).forEach(card => { const diff = calcDiff(g, card); const cardLabel = card.isJoker ? card.type : card.suit + card.rank; t += `${GONG_NAMES[g]}宫：${cardLabel} 差${diff} ${describeDiff(diff, card, g)}\n`; }); } }
  t += '\n' + READING_TEXTS.closingStatement;
  return t;
}

function describeDiff(diff, card, g) {
  if (!card) return '这个位置还是空的。'; if (card.isJoker) return card.type === '大王' ? '大王直接插手了。' : '小王来了，得动脑子。';
  if (diff === 0) return '牌与宫位严丝合缝，天人合一。在这个位置上你不需要额外做功。';
  if (diff <= 3) return `偏了一点，差值${diff}。差了一口气，自己稍作调整就能补上。`;
  if (diff <= 6) return `偏离较大，差值${diff}。现实和理想之间有段距离，需要费些力气。`;
  return `严重背离，差值${diff}。这个位置几乎是反着来的，别硬扭，接受偏离本身就是一种解法。`;
}

// ===== 观象 =====
function renderStep3(text) {
  const aiSettings = getApiSettings(); const aiVisible = aiSettings && aiSettings.apiKey;
  domDynamic.innerHTML = `<div class="panel"><h3>${UI_TEXTS.step3}</h3>
    <div class="result-block" id="interpretText">${text.replace(/\n/g, '<br>')}</div>
    <div class="btn-row">
      <button data-action="copyLocal" class="small">${UI_TEXTS.btnCopy}</button>
      <button data-action="shareImage" class="outline small">${UI_TEXTS.btnShareImage}</button>
      <button data-action="shareCode" class="outline small">${UI_TEXTS.btnShareCode}</button>
      <button data-action="exportData" class="outline small">完整数据</button>
      <button id="aiReadBtn" data-action="triggerAI" class="primary small" ${aiVisible ? '' : 'style="display:none"'}>${UI_TEXTS.btnAIDeepRead}</button>
      <button data-action="resetAll" class="small">${UI_TEXTS.btnNewQuestion}</button>
    </div>
    <div class="ai-guide-card">${AI_GUIDE_TEXT}</div>
    <div id="aiResultContainer" style="display:none;margin-top:10px"><div class="result-block" id="aiResultContent"></div>
      <div id="followUpArea" style="display:none;margin-top:8px"><div class="btn-row" style="gap:8px"><input type="text" id="followUpInput" placeholder="${UI_TEXTS.placeholderFollowUp}"><button data-action="sendFollowUp" class="small">发送</button></div>
      <div class="result-block" id="chatHistoryBlock" style="margin-top:6px;max-height:200px;font-size:0.8rem"></div></div></div></div>`;
}

function generateInterpretation() {
  const timestamps = getDrawTimestamps(); const usage = checkUsageFrequency(timestamps);
  if (usage.level !== 'normal') toast(usage.message, 4000);
  const text = localInterpretation(); updateStep(3);
  try {
    saveReading({
      time: Date.now(),
      question: state.question,
      category: state.category,
      ti: state.ti,
      yong: state.yong,
      grid: state.grid,
      line: state.line,
      lineOrder: state.lineOrder,
      text,
      chatHistory: state.chatHistory.slice(), // 保存 AI 对话副本
    });
  } catch(e) { toast('历史记录保存失败，但解读仍然有效'); }
  addDrawTimestamp(Date.now()); renderStep3(text);
}

// ===== 分享码 =====
function generateShareCode() {
  const data = { q: state.question, c: state.category, ti: state.ti, yong: state.yong, grid: state.grid, line: state.line };
  const code = btoa(encodeURIComponent(JSON.stringify(data)));
  navigator.clipboard.writeText(code).then(() => toast(UI_TEXTS.toastShareCodeCopied), () => toast(UI_TEXTS.toastCopyFailed));
}

function importShareCode() {
  const h = new Date().getHours(); if (h >= 23 || h < 1) { toast(TIME_RESTRICTION.message); return; }
  const code = $('#importCode')?.value?.trim(); if (!code) { toast(UI_TEXTS.placeholderImport); return; }
  try {
    const data = JSON.parse(decodeURIComponent(atob(code)));
    state.question = data.q || ''; state.category = data.c || ''; state.ti = data.ti; state.yong = data.yong; state.grid = data.grid || {}; state.line = data.line || null;
    const key = (state.line || []).join(','); const tl = TIME_LABELS[key] || {}; state.lineOrder = {};
    if (state.line) { state.lineOrder[state.line[0]] = '起因'; state.lineOrder[state.line[1]] = '经过'; state.lineOrder[state.line[2]] = '结果'; for (let g = 1; g <= 9; g++) if (!state.lineOrder[g]) state.lineOrder[g] = tl[g] || ''; }
    state.possible = []; state.gongOrder = Object.keys(state.grid).map(Number); state.step = 3; state.manualMode = false; state.deck = []; state.sel = null; state.chatHistory = [];
    generateInterpretation(); toast(UI_TEXTS.toastImportSuccess);
  } catch (e) { toast(UI_TEXTS.toastImportFail); }
}

// ===== 分享图 =====
function generateShareImage() {
  const canvas = domShareCanvas; const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = 400, h = 340; canvas.width = w * dpr; canvas.height = h * dpr;
  canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
  const ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr);
  ctx.fillStyle = '#12121c'; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#c9a060'; ctx.font = 'bold 20px Georgia,"Songti SC",serif'; ctx.fillText(SHARE_TEXTS.appName, 20, 35);
  ctx.fillStyle = '#8888a0'; ctx.font = '12px Georgia,"Songti SC",serif'; ctx.fillText(new Date().toLocaleString(), 20, 58);
  const bazi = getBaziFromProfile();
  if (bazi) { ctx.fillStyle = '#6a6a7e'; ctx.font = '11px Georgia,"Songti SC",serif'; ctx.fillText('四柱：' + bazi.fullText, 20, 78); }
  else { try { const yp = calcYearPillar(new Date().getFullYear()); ctx.fillText('年柱：' + yp.full, 20, 78); } catch(e) {} }
  const tiWx = getWuxing(state.ti), yongWx = getWuxing(state.yong); const rel = getShengKe(tiWx, yongWx);
  const summary = SHARE_TEXTS.summaryMap[rel] || '静观其变';
  ctx.fillStyle = '#e0b860'; ctx.font = 'bold 36px Georgia,"Songti SC",serif'; ctx.fillText(summary, 20, 125);
  ctx.fillStyle = '#c9a060'; ctx.font = '16px Georgia,"Songti SC",serif'; ctx.fillText(`${tiWx} ⚡ ${yongWx}  ${rel ? rel + ' ' + getShengKeLabel(rel) : '变数'}`, 20, 165);
  if (state.line) { ctx.fillStyle = '#b0b0c0'; ctx.font = '14px Georgia,"Songti SC",serif'; ctx.fillText(`${SHARE_TEXTS.linePrefix}${state.line.map(g => GONG_NAMES[g] + '宫').join('→')}`, 20, 205); }
  const quote = SHARE_QUOTES[Math.floor(Math.random() * SHARE_QUOTES.length)];
  ctx.fillStyle = '#8888a0'; ctx.font = 'italic 13px Georgia,"Songti SC",serif'; ctx.fillText('"' + quote + '"', 20, 245);
  ctx.fillStyle = '#6a6a7e'; ctx.font = '11px Georgia,"Songti SC",serif'; ctx.fillText(SHARE_TEXTS.footer, 20, h - 16);
  domSharePreview.removeAttribute('hidden');
  toast('长按图片即可保存，或点下方按钮保存到相册');
}

function saveShareImage() {
  const canvas = domShareCanvas;
  canvas.toBlob(blob => {
    if (!blob) { toast('保存失败'); return; }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `浮生牌_${new Date().toISOString().slice(0,10)}.png`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url); toast('分享图已保存');
  }, 'image/png');
}

// ===== 面板初始化 =====
function initSettingsPanel() {
  const s = getApiSettings();
  if (s) { state.selectedProvider = s.provider || 'deepseek'; $$('#providerGrid button').forEach(b => b.classList.toggle('selected', b.dataset.value === state.selectedProvider)); $('#apiKey').value = s.apiKey || ''; $('#apiEndpoint').value = s.endpoint || API_PROVIDERS[state.selectedProvider]?.endpoint || ''; $('#aiStyle').value = s.aiStyle || 'guide'; }
  updateApiStatus();
}

function initProfilePanel() {
  const p = getProfile();
  $('#birthDate').value = p.birthDate || '';
  $('#birthTime').value = p.birthTime || '';
  updateBaziPreview();
  const bd = $('#birthDate'); if (bd) bd.addEventListener('change', updateBaziPreview);
  const bt = $('#birthTime'); if (bt) bt.addEventListener('change', updateBaziPreview);
}

function updateBaziPreview() {
  const preview = $('#baziPreview'); if (!preview) return;
  const bd = $('#birthDate')?.value; const bt = $('#birthTime')?.value || '12:00';
  if (!bd) { preview.textContent = ''; return; }
  const parts = bd.split('-'); if (parts.length !== 3) { preview.textContent = ''; return; }
  const year = parseInt(parts[0]); const month = parseInt(parts[1]); const day = parseInt(parts[2]);
  const tp = bt.split(':'); const hour = tp.length >= 1 ? parseInt(tp[0]) || 12 : 12;
  try { const bazi = calcFullBaZi(year, month, day, hour); preview.textContent = '四柱预览：' + bazi.fullText + '  |  生肖：' + bazi.yearPillar.shengXiao; } catch (e) { preview.textContent = '日期无效'; }
}

function updateApiStatus() {
  const s = getApiSettings(); const st = $('#apiStatus'); if (!st) return;
  st.textContent = s && s.apiKey ? UI_TEXTS.apiStatusConfigured : UI_TEXTS.apiStatusNotConfigured;
  st.style.color = s && s.apiKey ? '#5a9a6a' : '';
}

// ===== 历史记录 =====
function renderHistoryPanel() {
  const list = $('#historyList'); if (!list) return;
  const history = getHistory();
  if (!history.length) { list.innerHTML = `<p style="color:var(--dim)">${HISTORY_EMPTY}</p>`; return; }
  list.innerHTML = history.map((r, i) => `<div class="history-item" data-index="${i}"><strong>${new Date(r.time).toLocaleString()}</strong><span> - ${r.question || '未提问'} (${r.category || '无类别'})</span></div>`).join('');
}

function showHistoryDetail(index) {
  const history = getHistory();
  const r = history[index];
  if (!r) return;

  let aiBlock = '';
  if (r.chatHistory && r.chatHistory.length) {
    aiBlock = '<div class="result-block" style="max-height:150px;margin-top:10px">' +
      r.chatHistory.map(m => `<div class="chat-msg ${m.role === 'user' ? 'user' : 'ai'}">${m.content.replace(/\n/g, '<br>')}</div>`).join('') +
      '</div>';
  } else {
    aiBlock = '<p style="color:var(--dim)">暂无 AI 对话记录</p>';
  }

  domModalContent.innerHTML = `
    <h3>历史详情</h3>
    <p><strong>时间：</strong>${new Date(r.time).toLocaleString()}</p>
    <p><strong>问题：</strong>${r.question || '未提问'}</p>
    <p><strong>类别：</strong>${r.category || '无'}</p>
    <div class="result-block">${(r.text || '').replace(/\n/g, '<br>')}</div>
    <h4 style="margin-top:10px">AI 对话</h4>
    ${aiBlock}
    <div style="margin-top:10px;display:flex;gap:8px">
      <input type="text" id="historyFollowUpInput" placeholder="追问..." style="flex:1">
      <button id="historyFollowUpBtn" class="small">发送</button>
    </div>
    <div class="btn-row">
      <button data-action="deleteHistoryItem" data-history-index="${index}" class="outline small">删除此条</button>
      <button data-action="closeModal" class="small">关闭</button>
    </div>
  `;
  domModal.removeAttribute('hidden');

  const followInput = $('#historyFollowUpInput');
  const followBtn = $('#historyFollowUpBtn');
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

      try {
        const answer = await requestFollowUp({
          history: chatHistory,
          provider: settings.provider,
          apiKey: settings.apiKey,
          endpoint: settings.endpoint,
          model: settings.model,
        });
        chatHistory.push({ role: 'assistant', content: answer });
        r.chatHistory = chatHistory;
        const allHistory = getHistory();
        allHistory[index] = r;
        localStorage.setItem('fs_history', JSON.stringify(allHistory));
        showHistoryDetail(index);
      } catch (e) {
        toast(e.message, 3000);
      } finally {
        followBtn.disabled = false;
        followBtn.textContent = '发送';
      }
    };
    followBtn.addEventListener('click', handler);
    followInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handler(); });
  }
}

// ===== AI 解读 =====
async function triggerAI() {
  const btn = $('#aiReadBtn'); if (!btn) return; btn.disabled = true; btn.textContent = '思考中...';
  const settings = getApiSettings(); if (!settings || !settings.apiKey) { toast('请先在 AI 设置中填入 API Key'); btn.disabled = false; btn.textContent = UI_TEXTS.btnAIDeepRead; return; }
  const prompt = buildAIPrompt();
  try {
    const result = await requestReading({ provider: settings.provider || 'deepseek', apiKey: settings.apiKey, endpoint: settings.endpoint, model: settings.model, style: settings.aiStyle || 'guide', prompt });
    const container = $('#aiResultContainer'); const content = $('#aiResultContent');
    if (container) container.style.display = 'block'; if (content) content.innerHTML = '<strong>AI解读：</strong><br>' + result.replace(/\n/g, '<br>');
    state.chatHistory = [{ role: 'user', content: prompt }, { role: 'assistant', content: result }];
    const followUp = $('#followUpArea'); if (followUp) followUp.style.display = 'block';
    toast('解读完成');
  } catch (e) {
    const container = $('#aiResultContainer'); if (container) container.style.display = 'block';
    const content = $('#aiResultContent'); if (content) content.innerHTML = `<span style="color:#d45050">${e.message}</span>`;
    toast(e.message, 3000);
  } finally { btn.disabled = false; btn.textContent = UI_TEXTS.btnAIDeepRead; }
}

async function sendFollowUp() {
  const input = $('#followUpInput'); if (!input) return; const q = input.value.trim(); if (!q) return; input.value = '';
  const settings = getApiSettings(); if (!settings || !settings.apiKey) { toast('未配置 API Key'); return; }
  const history = state.chatHistory; if (!history || history.length < 2) { toast('请先进行一次 AI 解读'); return; }
  history.push({ role: 'user', content: q });
  const chatBlock = $('#chatHistoryBlock'); if (chatBlock) chatBlock.innerHTML += `<div class="chat-msg user">${q}</div>`;
  try {
    const result = await requestFollowUp({ history, provider: settings.provider || 'deepseek', apiKey: settings.apiKey, endpoint: settings.endpoint, model: settings.model });
    history.push({ role: 'assistant', content: result });
    if (chatBlock) { chatBlock.innerHTML += `<div class="chat-msg ai">${result.replace(/\n/g, '<br>')}</div>`; chatBlock.scrollTop = chatBlock.scrollHeight; }
  } catch (e) { if (chatBlock) chatBlock.innerHTML += `<div class="chat-msg" style="color:#d45050">失败：${e.message}</div>`; }
}

function buildAIPrompt() {
  return `请根据以下浮生牌局象进行详细解读。\n\n要求：纯文本格式，严禁使用任何Markdown符号。用自然语言分段。从体用生克、时空推演、宫位差值、旺相休囚、阴阳属性等方面展开。话不说死。\n\n${localInterpretation()}\n\n规则：红桃火(阳) 方块金(阳) 梅花木(阴) 黑桃水(阴) J/Q/K土 大王天(阳) 小王人(阴)。`;
}

// ===== API 测试 =====
async function handleTestApiConnection() {
  const btn = document.querySelector('[data-action="testApiConnection"]');
  if (btn) {
    btn.disabled = true;
    btn.textContent = '测试中...';
  }
  try {
    const provider = state.selectedProvider || 'deepseek';
    const apiKey = $('#apiKey')?.value?.trim() || '';
    const endpoint = $('#apiEndpoint')?.value?.trim() || '';
    const model = API_PROVIDERS[provider]?.model || '';
    if (!apiKey && provider !== 'custom') {
      throw new Error('请先填写 API Key');
    }
    const msg = await testApiConnection({ provider, apiKey, endpoint, model });
    toast(msg, 3000);
  } catch (e) {
    toast(`测试失败: ${e.message}`, 4000);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = '测试连接';
    }
  }
}

// ===== 每日运势 =====
function showDailyFortune() {
  const today = new Date().toDateString(); let hash = 0; for (let i = 0; i < today.length; i++) { hash = ((hash << 5) - hash) + today.charCodeAt(i); hash |= 0; }
  const idx = Math.abs(hash) % 54; let card;
  if (idx < 52) { const suit = SUITS[Math.floor(idx / 13)]; const rank = RANKS[idx % 13]; card = { suit, rank, isJoker: false }; }
  else if (idx === 52) card = { isJoker: true, type: '大王' }; else card = { isJoker: true, type: '小王' };
  const wx = getWuxing(card); const label = card.isJoker ? card.type : card.suit + card.rank; const colorCls = getCardColor(card);
  const fortunes = { '火': '今天你像一团火。热情是燃料，别烧到旁边的人。', '金': '今天你像一块金属。判断力在线，该断则断。', '木': '今天你像一棵树。生长是节奏，别急。', '水': '今天你像一汪水。洞察力敏锐，别过度分析。', '天': '今天你是大王。天意在你这边，顺着直觉走。', '人': '今天你是小王。智谋是你的武器，动脑子就能赢。' };
  const fortune = fortunes[wx] || '今天保持平常心。';
  domModalContent.innerHTML = `<div style="text-align:center"><h3>今日运势</h3><div class="card-face-small ${colorCls}" style="margin:0 auto;width:80px;height:112px;"><span class="rank">${card.isJoker ? card.type : card.rank}</span><span class="suit">${card.isJoker ? '' : card.suit}</span><span class="wx-tag">${wx}</span></div><p style="margin-top:2vh;font-size:1rem;color:var(--accent)">${label} · ${wx}</p><p style="margin-top:1vh;font-size:0.9rem;color:var(--text);line-height:1.6">${fortune}</p><button data-action="closeModal" style="margin-top:2vh">关闭</button></div>`;
  domModal.removeAttribute('hidden');
}

function checkEthicalBoundary(question) {
  const q = question.toLowerCase();
  for (const [key, entry] of Object.entries(REFUSAL_TEXTS.keywords)) {
    if (entry.trigger.some(word => q.includes(word))) return { blocked: true, message: entry.response };
  }
  return { blocked: false };
}

function escapeHtml(str) { const div = document.createElement('div'); div.textContent = str; return div.innerHTML; }

// ===== 全局事件委托 =====
document.addEventListener('click', function(e) {
  const btn = e.target.closest('button');
  if (btn) {
    // 【防御性检查】如果点的是我们加的左右滚动按钮，直接不触发任何 data-action
    if (btn.id === 'scrollLeftBtn' || btn.id === 'scrollRightBtn') {
      return;
    }

    const action = btn.dataset.action;
    if (!action) return;
    switch (action) {
      case 'togglePanel': togglePanel(btn.dataset.panel); break;
      case 'resetAll': resetAll(); break;
      case 'confirmQuestion': startQuestion(); break;
      case 'lazyStart': lazyStart(); break;
      case 'manualEntry': startManualEntry(); break;
      case 'selectCategory': state.category = state.category === btn.dataset.category ? '' : btn.dataset.category; document.querySelectorAll('[data-action="selectCategory"]').forEach(b => b.classList.toggle('selected', b.dataset.category === state.category)); break;
      case 'confirmTiYong': confirmTiYong(); break;
      case 'resetStep2': startQuestion(); break;
      case 'resetGrid': resetGrid(); break;
      case 'generateInterpretation': generateInterpretation(); break;
      case 'copyLocal': copyLocalResult(); break;
      case 'shareImage': generateShareImage(); break;
      case 'shareCode': generateShareCode(); break;
      case 'exportData': exportAllData(); break;
      case 'triggerAI': triggerAI(); break;
      case 'sendFollowUp': sendFollowUp(); break;
      case 'saveApiSettings': saveApiSettingsFromForm(); break;
      case 'clearApiSettings': clearApiSettings(); updateApiStatus(); toast(UI_TEXTS.toastCleared); break;
      case 'testApiConnection': handleTestApiConnection(); break;
      case 'saveProfile': saveProfileFromForm(); break;
      case 'deleteHistoryItem': if (btn.dataset.historyIndex !== undefined) { deleteHistoryItem(parseInt(btn.dataset.historyIndex)); renderHistoryPanel(); domModal.setAttribute('hidden', ''); toast('已删除'); } break;
      case 'importCode': importShareCode(); break;
      case 'dailyFortune': showDailyFortune(); break;
      case 'closeModal': domModal.setAttribute('hidden', ''); break;
      case 'closeShare': domSharePreview.setAttribute('hidden', ''); break;
      case 'saveShareImage': saveShareImage(); break;
    }
    return;
  }
  
  const historyItem = e.target.closest('.history-item');
  if (historyItem && historyItem.dataset.index !== undefined) { showHistoryDetail(parseInt(historyItem.dataset.index)); return; }
  const lineBtn = e.target.closest('.line-btn');
  if (lineBtn && lineBtn.dataset.line) { setLine(lineBtn.dataset.line.split(',').map(Number)); return; }
  
  const emptyDash = e.target.closest('.empty-dash');
  if (emptyDash && state.sel) { const card = findCardById(state.sel); if (card && !isCardPlaced(card)) { if (emptyDash.textContent.includes('体')) placeCardOnTiYong(card, 'ti'); else placeCardOnTiYong(card, 'yong'); } return; }
  
  const gong = e.target.closest('.gong');
  if (gong && state.sel) { const g = parseInt(gong.dataset.gong); const card = findCardById(state.sel); if (card && !isCardPlaced(card)) placeCardOnGong(card, g); }
});

// ===== 长按拖拽系统 =====
const LONG_PRESS_DURATION = 200;
let dragData = null;
let pressTimer = null;

function clearPressTimer() {
  if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
}

function startPress(clientX, clientY, cardEl) {
  const id = cardEl.dataset.cardid;
  const card = findCardById(id);
  if (!card || isCardPlaced(card)) return;

  const rect = cardEl.getBoundingClientRect();
  dragData = {
    cardId: id,
    cardEl,
    startX: clientX,
    startY: clientY,
    offsetX: clientX - rect.left,
    offsetY: clientY - rect.top,
    origRect: rect,
    moved: false,
    clone: null,
    longPressTriggered: false,
  };

  pressTimer = setTimeout(() => {
    if (dragData) {
      dragData.longPressTriggered = true;
      const clone = dragData.cardEl.cloneNode(true);
      clone.style.position = 'fixed';
      clone.style.zIndex = '10000';
      clone.style.opacity = '0.9';
      clone.style.pointerEvents = 'none';
      clone.style.left = dragData.origRect.left + 'px';
      clone.style.top = dragData.origRect.top + 'px';
      clone.style.width = dragData.origRect.width + 'px';
      clone.style.height = dragData.origRect.height + 'px';
      clone.style.transition = 'none';
      document.body.appendChild(clone);
      dragData.clone = clone;
      dragData.moved = true;
      try { if (navigator.vibrate) navigator.vibrate(10); } catch (e) {}
    }
  }, LONG_PRESS_DURATION);
}

function moveDrag(clientX, clientY, e) {
  if (!dragData) return;

  if (dragData.clone) {
    if (e && e.preventDefault) e.preventDefault();
    dragData.clone.style.left = (clientX - dragData.offsetX) + 'px';
    dragData.clone.style.top = (clientY - dragData.offsetY) + 'px';
  } else {
    const dx = clientX - dragData.startX;
    const dy = clientY - dragData.startY;
    if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
      clearPressTimer();
      dragData = null;
    }
  }
}

function endDrag(clientX, clientY) {
  clearPressTimer();

  if (!dragData) return;

  if (dragData.clone && dragData.moved) {
    const clone = dragData.clone;
    const card = findCardById(dragData.cardId);
    clone.style.display = 'none';
    const target = document.elementFromPoint(clientX, clientY);
    clone.style.display = '';

    let placed = false;
    if (card && !isCardPlaced(card)) {
      const tg = target?.closest('.gong');
      if (tg) placed = placeCardOnGong(card, parseInt(tg.dataset.gong));
      const td = target?.closest('.empty-dash');
      if (!placed && td) {
        if (td.textContent.includes('体')) placed = placeCardOnTiYong(card, 'ti');
        else if (td.textContent.includes('用')) placed = placeCardOnTiYong(card, 'yong');
      }
    }

    if (placed) {
      clone.remove();
    } else {
      clone.style.transition = 'left 0.2s ease, top 0.2s ease';
      clone.style.left = dragData.origRect.left + 'px';
      clone.style.top = dragData.origRect.top + 'px';
      const onEnd = () => { clone.remove(); clone.removeEventListener('transitionend', onEnd); };
      clone.addEventListener('transitionend', onEnd);
      setTimeout(() => { if (clone.parentNode) clone.remove(); }, 300);
    }
  } else if (!dragData.longPressTriggered) {
    selectCard(dragData.cardId);
  }

  dragData = null;
}

document.addEventListener('touchstart', function(e) {
  const cardEl = e.target.closest('.card-back, .card-face-small');
  if (!cardEl) return;
  startPress(e.touches[0].clientX, e.touches[0].clientY, cardEl);
}, { passive: true });

document.addEventListener('touchmove', function(e) {
  moveDrag(e.touches[0].clientX, e.touches[0].clientY, e);
}, { passive: false });

document.addEventListener('touchend', function(e) {
  endDrag(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
});

document.addEventListener('mousedown', function(e) {
  const cardEl = e.target.closest('.card-back, .card-face-small');
  if (!cardEl) return;
  e.preventDefault();
  const id = cardEl.dataset.cardid;
  const card = findCardById(id);
  if (!card || isCardPlaced(card)) return;
  const rect = cardEl.getBoundingClientRect();
  const clone = cardEl.cloneNode(true);
  clone.style.position = 'fixed';
  clone.style.zIndex = '10000';
  clone.style.opacity = '0.9';
  clone.style.pointerEvents = 'none';
  clone.style.left = rect.left + 'px';
  clone.style.top = rect.top + 'px';
  clone.style.width = rect.width + 'px';
  clone.style.height = rect.height + 'px';
  clone.style.transition = 'none';
  document.body.appendChild(clone);
  dragData = {
    cardId: id,
    cardEl,
    startX: e.clientX,
    startY: e.clientY,
    offsetX: e.clientX - rect.left,
    offsetY: e.clientY - rect.top,
    origRect: rect,
    moved: true,
    clone,
    longPressTriggered: true,
  };
  clearPressTimer();
});

document.addEventListener('mousemove', function(e) {
  if (!dragData || !dragData.clone) return;
  e.preventDefault();
  dragData.clone.style.left = (e.clientX - dragData.offsetX) + 'px';
  dragData.clone.style.top = (e.clientY - dragData.offsetY) + 'px';
});

document.addEventListener('mouseup', function(e) {
  if (!dragData) return;
  if (dragData.clone && dragData.moved) {
    const dx = e.clientX - dragData.startX;
    const dy = e.clientY - dragData.startY;
    if (Math.abs(dx) < 3 && Math.abs(dy) < 3) {
      const cardId = dragData.cardId;
      dragData.clone.remove();
      dragData = null;
      selectCard(cardId);
      return;
    }
    endDrag(e.clientX, e.clientY);
  } else {
    endDrag(e.clientX, e.clientY);
  }
});

// ===== 重置 =====
function resetAll() {
  Object.assign(state, { question: '', category: '', deck: [], ti: null, yong: null, grid: {}, line: null, lineOrder: {}, step: 1, sel: null, possible: [], manualMode: false, gongOrder: [], chatHistory: [], uid: 0, editCount: 0 });
  updateStep(1); renderStep1(); toast(UI_TEXTS.toastReset);
}

function startQuestion() {
  const h = new Date().getHours(); if (h >= 23 || h < 1) { domDynamic.innerHTML = `<div class="panel"><h3>子时不卜</h3><p style="text-align:center;padding:30px">${TIME_RESTRICTION.message}</p></div>`; return; }
  const q = $('#questionInput')?.value?.trim() || ''; if (q) { const check = checkEthicalBoundary(q); if (check.blocked) { domDynamic.innerHTML = `<div class="panel"><h3>提示</h3><p>${check.message}</p><button data-action="resetAll" class="small">返回</button></div>`; return; } }
  state.question = q; state.manualMode = false; state.uid = 0; state.deck = shuffle(createDeck(false)); state.ti = null; state.yong = null; state.grid = {}; state.line = null; state.lineOrder = {}; state.sel = null; state.possible = []; state.chatHistory = []; state.gongOrder = []; state.editCount = 0;
  updateStep(2); renderStep2();
}

function startManualEntry() {
  const h = new Date().getHours(); if (h >= 23 || h < 1) { toast(TIME_RESTRICTION.message); return; }
  state.question = $('#questionInput')?.value?.trim() || ''; state.manualMode = true; state.uid = 0; state.deck = createDeck(true);
  state.ti = null; state.yong = null; state.grid = {}; state.line = null; state.lineOrder = {}; state.sel = null; state.possible = []; state.chatHistory = []; state.gongOrder = []; state.editCount = 0;
  updateStep(2); renderStep2();
}

function copyLocalResult() {
  const el = $('#interpretText'); if (!el) return;
  navigator.clipboard.writeText(el.innerText).then(() => toast(UI_TEXTS.toastCopied), () => toast(UI_TEXTS.toastCopyFailed));
}

// ===== 保存 API 设置时自动清除尾部斜杠 =====
function saveApiSettingsFromForm() {
  const p = state.selectedProvider || 'deepseek'; 
  const info = API_PROVIDERS[p] || API_PROVIDERS.deepseek;
  
  let endpoint = $('#apiEndpoint')?.value?.trim() || info.endpoint || '';
  if (endpoint.endsWith('/')) endpoint = endpoint.slice(0, -1);

  const settings = { 
    provider: p, 
    apiKey: $('#apiKey')?.value?.trim() || '', 
    endpoint: endpoint, 
    model: info.model || '', 
    aiStyle: $('#aiStyle')?.value || 'guide' 
  };
  saveApiSettings(settings); 
  updateApiStatus(); 
  toast(UI_TEXTS.toastSaved);
}

function saveProfileFromForm() {
  const bd = $('#birthDate')?.value || ''; const bt = $('#birthTime')?.value || '';
  saveProfile({ birthDate: bd, birthTime: bt }); toast(UI_TEXTS.toastProfileSaved);
}

// ===== 提供商切换 =====
document.addEventListener('click', function(e) {
  const b = e.target.closest('#providerGrid button');
  if (!b || !b.dataset.value) return;
  state.selectedProvider = b.dataset.value;
  $$('#providerGrid button').forEach(x => x.classList.toggle('selected', x === b));
  const info = API_PROVIDERS[state.selectedProvider];
  if (info) { const ep = $('#apiEndpoint'); if (ep) ep.value = info.endpoint || ''; }
});

// ===== 模态框背景点击关闭 =====
document.addEventListener('click', function(e) { if (e.target === domModal) domModal.setAttribute('hidden', ''); });

// ===== 应用启动 =====
function init() {
  try {
    cacheDom();
    updateStep(1);
    renderStep1();
    updateApiStatus();
    const ep = $('#apiEndpoint'); if (ep && !ep.value) ep.value = API_PROVIDERS.deepseek.endpoint;
    if (!hasCompletedOnboarding()) showOnboarding();
  } catch (e) {
    document.body.innerHTML = '<div style="color:#d45050;padding:40px;text-align:center;font-family:sans-serif;">' +
      '<h2>浮生牌启动失败</h2><p>请检查浏览器控制台（F12）的错误信息，并确认所有文件已正确保存。</p>' +
      '<p style="font-size:0.8rem;">' + e.message + '</p></div>';
    console.error(e);
  }
}

document.addEventListener('DOMContentLoaded', init);