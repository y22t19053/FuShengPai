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
  getProfile, saveProfile, getPersonality, savePersonality,
  hasCompletedOnboarding, completeOnboarding,
  exportAllData,
} from './storage.js';

import { requestReading, requestFollowUp, testApiConnection } from './ai.js';

import {
  UI_TEXTS, RULES_TEXTS, TUTORIAL_TEXTS, PHYSICAL_GUIDE,
  REFUSAL_TEXTS, USAGE_REMINDERS,
  SHARE_TEXTS, SHARE_QUOTES, TIME_RESTRICTION,
  HISTORY_EMPTY, PRIVACY_NOTICE, AI_STYLES, AI_GUIDE_TEXT,
  ONBOARDING_STEPS, 
  generateFullReading, 
  MIRROR_QUESTIONS, 
  RITUAL_COSTS,
  PERSONALITY_TONES,
  OBSERVER_COVENANT,
  SIGN_LIBRARY,
  INTENT_QUESTIONS
} from './texts.js';

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
  chatHistory: [],      
  selectedProvider: 'deepseek',
  uid: 0,
  editCount: 0,
  currentOnboardStep: 0,
  refinementTags: {},
  userCorpus: [],       
  intent: null,
};

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

let domApp, domDynamic, domToast, domModal, domModalContent, domSharePreview, domShareCanvas;
let cardScrollTimeout = null;
let toastTimer = null;
let isInfiniteLoop = false;
let longPressTimer = null;
let isLongPress = false;
let ghostCard = null;
let touchDragX = 0, touchDragY = 0;
let mouseDragX = 0, mouseDragY = 0;

function cacheDom() {
  domApp = $('#appRoot');
  domDynamic = $('#dynamicPanels');
  domToast = $('#toast');
  domModal = $('#modal');
  domModalContent = $('#modalContent');
  domSharePreview = $('#sharePreview');
  domShareCanvas = $('#shareCanvas');
}

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

function renderTeachingPanel() {
  const container = $('#teachingContent');
  if (!container) return;
  let html = `
    <details>
      <summary style="cursor:pointer;color:var(--accent);font-weight:bold;margin-bottom:8px;">展开完整教程手册</summary>
      <div style="margin-top:10px;padding:10px;background:rgba(255,255,255,0.02);border-radius:6px;">
        <p>${TUTORIAL_TEXTS.intro}</p>
        <ol style="padding-left:1.2rem;margin-bottom:2vh;">${TUTORIAL_TEXTS.steps.map(s => '<li style="margin-bottom:0.5vh;font-size:0.85rem;color:var(--dim)">' + s + '</li>').join('')}</ol>
        <p style="font-size:0.75rem;color:var(--accent);margin-bottom:2vh;">${TUTORIAL_TEXTS.offlineHint}</p>
        ${PHYSICAL_GUIDE && PHYSICAL_GUIDE.sections ? `<h4 style="color:var(--accent);margin-top:2vh;">${PHYSICAL_GUIDE.title}</h4>` + PHYSICAL_GUIDE.sections.map(sec => `<h4>${sec.heading}</h4><div class="physical-body">${sec.body.replace(/\n/g, '<br>')}</div>`).join('') : ''}
      </div>
    </details>
  `;
  container.innerHTML = html;
}

function mulberry32(a) {
  return function() {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    var t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}
function seededShuffle(array, seed) {
  let arr = [...array];
  let rng = mulberry32(seed);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

async function generateEntropySeed() {
  const perfNow = performance.now();
  let seed = Math.floor(perfNow * 1000);
  try {
    const battery = await navigator.getBattery?.();
    if (battery) seed ^= Math.floor(battery.level * 10000);
  } catch(e) {}
  return seed;
}

function renderDeck() {
  const el = $('#deckContainer');
  if (!el) return;
  const previousScrollLeft = el.scrollLeft || 0;
  if (!state.deck.length) { el.innerHTML = '<span style="color:#444;padding:10px;">牌库空</span>'; return; }
  el.style.cssText = `display: flex; flex-wrap: nowrap; gap: 12px; overflow-x: auto; overflow-y: hidden; scroll-snap-type: x mandatory; -webkit-overflow-scrolling: touch; padding: 10px 20px; touch-action: pan-x; scrollbar-width: none; -ms-overflow-style: none;`;
  el.style.setProperty('::-webkit-scrollbar', 'display', 'none');
  let html = '';
  state.deck.forEach((c, index) => {
    const id = getCardId(c);
    const placed = isCardPlaced(c);
    const sel = state.sel === id;
    const colorCls = getCardColor(c);
    const rank = c.isJoker ? c.type : c.rank;
    const suit = c.isJoker ? '' : c.suit;
    const wx = getWuxing(c);
    const delay = index * 0.03;
    const animationStyle = `animation: cardAppear 0.25s ease both; animation-delay: ${delay}s;`;
    if (state.manualMode) {
      html += `<div class="card-face-small ${colorCls}${sel ? ' selected' : ''}${placed ? ' used' : ''}" data-cardid="${id}" data-cardindex="${index}" style="${placed ? 'opacity:0.3;pointer-events:none' : ''}; scroll-snap-align: center; flex-shrink: 0; width: 70px; height: 100px; ${animationStyle}"><span class="rank">${rank}</span><span class="suit">${suit}</span><span class="wx-tag">${wx}</span></div>`;
    } else {
      html += `<div class="card-back${sel ? ' selected' : ''}${placed ? ' used' : ''}" data-cardid="${id}" data-cardindex="${index}" style="${placed ? 'opacity:0.3;pointer-events:none' : ''}; scroll-snap-align: center; flex-shrink: 0; width: 70px; height: 100px; ${animationStyle}"></div>`;
    }
  });
  el.innerHTML = html;
  if (previousScrollLeft > 0) requestAnimationFrame(() => { el.scrollLeft = previousScrollLeft; });

  const leftBtn = document.getElementById('scrollLeftBtn');
  const rightBtn = document.getElementById('scrollRightBtn');
  if (leftBtn && rightBtn) {
    const lClone = leftBtn.cloneNode(true);
    const rClone = rightBtn.cloneNode(true);
    leftBtn.parentNode.replaceChild(lClone, leftBtn);
    rightBtn.parentNode.replaceChild(rClone, rightBtn);
    const finalLeft = document.getElementById('scrollLeftBtn');
    const finalRight = document.getElementById('scrollRightBtn');
    let scrollInterval = null;
    let speedUpInterval = null;
    let currentSpeed = 45;
    const MAX_SPEED = 150;
    const STEP_INCREMENT = 25;
    const startScroll = (direction) => {
      currentSpeed = 45; if (scrollInterval) clearInterval(scrollInterval); if (speedUpInterval) clearInterval(speedUpInterval);
      const doScroll = () => { const dir = direction === 'left' ? -currentSpeed : currentSpeed; el.scrollLeft += dir; };
      doScroll();
      scrollInterval = setInterval(doScroll, 16);
      speedUpInterval = setInterval(() => { if (currentSpeed < MAX_SPEED) currentSpeed += STEP_INCREMENT; }, 350);
    };
    const stopScroll = () => { if (scrollInterval) { clearInterval(scrollInterval); scrollInterval = null; } if (speedUpInterval) { clearInterval(speedUpInterval); speedUpInterval = null; } currentSpeed = 45; };
    finalLeft.addEventListener('mousedown', (e) => { e.preventDefault(); startScroll('left'); });
    finalLeft.addEventListener('mouseup', stopScroll); finalLeft.addEventListener('mouseleave', stopScroll);
    finalRight.addEventListener('mousedown', (e) => { e.preventDefault(); startScroll('right'); });
    finalRight.addEventListener('mouseup', stopScroll); finalRight.addEventListener('mouseleave', stopScroll);
    finalLeft.addEventListener('touchstart', (e) => { e.preventDefault(); startScroll('left'); });
    finalLeft.addEventListener('touchend', stopScroll); finalLeft.addEventListener('touchcancel', stopScroll);
    finalRight.addEventListener('touchstart', (e) => { e.preventDefault(); startScroll('right'); });
    finalRight.addEventListener('touchend', stopScroll); finalRight.addEventListener('touchcancel', stopScroll);
  }
  setupCardSwipeSelection(el);

  isInfiniteLoop = false;
  const loopListener = () => {
    if (isInfiniteLoop) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    if (el.scrollLeft <= 30) {
      isInfiniteLoop = true;
      el.scrollTo({ left: maxScroll - 30, behavior: 'instant' });
      isInfiniteLoop = false;
    } else if (el.scrollLeft >= maxScroll - 30) {
      isInfiniteLoop = true;
      el.scrollTo({ left: 30, behavior: 'instant' });
      isInfiniteLoop = false;
    }
  };
  el.removeEventListener('scroll', loopListener);
  el.addEventListener('scroll', loopListener, { passive: true });
}

function setupCardSwipeSelection(container) {
  const oldListener = container._scrollListener;
  if (oldListener) container.removeEventListener('scroll', oldListener);
  const handleScroll = () => {
    clearTimeout(cardScrollTimeout);
    cardScrollTimeout = setTimeout(() => {
      const containerRect = container.getBoundingClientRect();
      const centerX = containerRect.left + containerRect.width / 2;
      let closestCard = null; let closestDistance = Infinity;
      container.querySelectorAll('[data-cardid]').forEach(cardEl => {
        if (cardEl.style.pointerEvents === 'none') return; 
        const rect = cardEl.getBoundingClientRect();
        const cardCenterX = rect.left + rect.width / 2;
        const distance = Math.abs(cardCenterX - centerX);
        if (distance < closestDistance) { closestDistance = distance; closestCard = cardEl; }
      });
      if (closestCard) { const newId = closestCard.dataset.cardid; try { if (navigator.vibrate) navigator.vibrate(4); } catch (e) {} }
    }, 50);
  };
  container.addEventListener('scroll', handleScroll, { passive: true });
  container._scrollListener = handleScroll;
}

function renderTiYong() {
  const bar = $('#tiyongBar');
  if (!bar) return;
  const tiHTML = state.ti ? `<div class="mini-card ${getCardColor(state.ti)}">${state.ti.isJoker ? state.ti.type : state.ti.rank}${state.ti.isJoker ? '' : state.ti.suit}</div>` : `<div class="empty-dash" data-drop="ti">${UI_TEXTS.labelTi}</div>`;
  const yongHTML = state.yong ? `<div class="mini-card ${getCardColor(state.yong)}">${state.yong.isJoker ? state.yong.type : state.yong.rank}${state.yong.isJoker ? '' : state.yong.suit}</div>` : `<div class="empty-dash" data-drop="yong">${UI_TEXTS.labelYong}</div>`;
  let badge = '';
  if (state.ti && state.yong) {
    const rel = getShengKe(getWuxing(state.ti), getWuxing(state.yong));
    if (rel) badge = `<span class="relation-badge ${rel === '生我' ? 'good' : rel === '克我' ? 'bad' : ''}">${rel} ${getShengKeLabel(rel)}</span>`;
  }
  bar.innerHTML = `<div class="slot">${UI_TEXTS.labelTi} ${tiHTML}</div><span class="separator">${UI_TEXTS.labelSeparator}</span><div class="slot">${UI_TEXTS.labelYong} ${yongHTML}</div>${badge}`;
  const btn = $('#btnConfirmTY'); if (btn) btn.disabled = !(state.ti && state.yong);
}

function renderGrid() {
  const el = $('#gridContainer'); if (!el) return;
  el.innerHTML = GONG_ORDER.map(g => {
    const cards = state.grid[g] || []; let cls = '';
    if (state.line && state.line.includes(g)) cls = 'confirmed';
    let inner = `<span class="num">${g}</span><span class="name">${GONG_NAMES[g]}</span><span class="wx">${GONG_WUXING[g]}</span>`;
    if (cards.length) {
      inner += '<div class="card-stack">'; cards.forEach(c => { inner += `<div class="mini-card ${getCardColor(c)}">${c.isJoker ? c.type : c.rank}${c.isJoker ? '' : c.suit}</div>`; });
      inner += '</div>';
      inner += `<span class="diff-label">${UI_TEXTS.labelDiffPrefix}${calcDiff(g, cards[cards.length - 1])}</span>`;
    } else { inner += '<span class="empty-label">' + UI_TEXTS.labelEmpty + '</span>'; }
    if (state.lineOrder[g]) inner += `<span class="time-tag">${state.lineOrder[g]}</span>`;
    return `<div class="gong ${cls}" data-gong="${g}">${inner}</div>`;
  }).join('');
}

function refreshAll() { renderDeck(); renderTiYong(); renderGrid(); }

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
  for (const g in state.grid) { if (state.grid[g] && state.grid[g].some(c => getCardId(c) === id)) return true; }
  return false;
}
function findCardById(id) { return state.deck.find(c => getCardId(c) === id); }
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
  candidates.forEach(line => { btns += `<button class="line-btn" data-line="${line.join(',')}">${line.map(g => GONG_NAMES[g] + '宫').join('→')}</button>`; btns += `<button class="line-btn" data-line="${line.slice().reverse().join(',')}">${line.slice().reverse().map(g => GONG_NAMES[g] + '宫').join('→')}</button>`; });
  panel.innerHTML = `<p style="font-size:0.85rem;color:var(--accent);margin-bottom:6px;">${UI_TEXTS.toastLinesMultiple}</p><div style="display:flex;gap:5px;flex-wrap:wrap;">${btns}</div>`;
  gridContainer.after(panel);
}
function removeLineSelector() { const el = $('#lineSelector'); if (el) el.remove(); }

function showOnboarding() { state.currentOnboardStep = 0; renderOnboardStep(); }
function renderOnboardStep() {
  const existing = document.querySelector('.onboard-overlay');
  if (existing) existing.remove();
  if (!ONBOARDING_STEPS || !ONBOARDING_STEPS.length) { completeOnboarding(); return; }
  const step = ONBOARDING_STEPS[state.currentOnboardStep];
  if (!step) return;
  const overlay = document.createElement('div');
  overlay.className = 'onboard-overlay';
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

// ===== 首页布局 =====
function renderStep1() {
  domDynamic.innerHTML = `<div class="panel">
    <div id="dailySignCard" style="margin-bottom:20px;background:rgba(255,255,255,0.02);border-radius:8px;padding:16px;text-align:center;border:1px solid rgba(255,255,255,0.05);">
      <div style="color:var(--dim);font-size:0.8rem;">今日状态</div>
      <div style="font-size:1.4rem;color:var(--accent);margin:8px 0;">待观测</div>
      <button data-action="dailyFortune" class="small outline" style="margin-top:4px;">获取今日状态</button>
    </div>
    <h3 style="margin-top:0;">${UI_TEXTS.step1}</h3>
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

// ===== 重抽保留体用 =====
function resetStep2() {
  for (const g in state.grid) { state.deck.push(...state.grid[g]); }
  state.grid = {}; state.line = null; state.lineOrder = {}; state.gongOrder = []; state.sel = null; state.possible = [];
  state.deck = shuffle(state.deck); removeLineSelector(); refreshAll(); toast(UI_TEXTS.toastGridCleared);
}

function renderStep2() {
  domDynamic.innerHTML = `<div class="panel"><h3>${state.manualMode ? '手动录入 · 明牌选阵' : '立极·布阵'}</h3><div class="guide-tip">${state.manualMode ? UI_TEXTS.guideManual : UI_TEXTS.guideSelectTiYong}</div><div class="tiyong-bar" id="tiyongBar"></div><div class="deck-grid" id="deckContainer"></div><div class="btn-row" style="display:flex; flex-wrap:wrap; gap:6px; justify-content:center; align-items:center;"><button id="scrollLeftBtn" class="outline small">‹ 选牌</button><button data-action="resetStep2" class="outline small">重置九宫</button>${state.manualMode ? '' : '<button id="btnConfirmTY" disabled data-action="confirmTiYong" class="small primary">' + UI_TEXTS.btnConfirmTiYong + '</button>'}<button id="scrollRightBtn" class="outline small">选牌 ›</button>${state.manualMode ? '<button data-action="generateInterpretation" class="small primary">' + UI_TEXTS.btnInterpret + '</button>' : ''}</div><div id="gridArea" ${state.manualMode ? '' : 'style="display:none"' }><div class="guide-tip">${UI_TEXTS.guideAfterTiYong}</div><div class="grid-9" id="gridContainer"></div><div class="btn-row"><button data-action="resetGrid" class="outline small">清九宫</button>${state.manualMode ? '' : '<button data-action="generateInterpretation" class="small primary">' + UI_TEXTS.btnInterpret + '</button>'}</div></div></div>`;
  refreshAll();
  if (state.ti && state.yong && !state.manualMode) { const btn = $('#btnConfirmTY'); if (btn) btn.disabled = false; }
}

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

function guardMidnight(callback) {
  const h = new Date().getHours();
  if ((h >= 23 || h < 1) && !localStorage.getItem('fs_midnight_dismiss')) {
    domModalContent.innerHTML = `
      <h3 style="text-align:center;">子时提示</h3>
      <p style="margin:10px 0;color:var(--dim);">当前为子时，观测者效应可能衰减。结果仅供参考。</p>
      <div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;">
        <button id="midnightProceedBtn" class="primary">我清楚，继续</button>
        <button id="midnightHideBtn" class="outline">今天别提醒我了</button>
      </div>
    `;
    domModal.removeAttribute('hidden');
    document.getElementById('midnightProceedBtn').addEventListener('click', () => {
      domModal.setAttribute('hidden', '');
      callback();
    });
    document.getElementById('midnightHideBtn').addEventListener('click', () => {
      localStorage.setItem('fs_midnight_dismiss', 'true');
      domModal.setAttribute('hidden', '');
      callback();
    });
  } else {
    callback();
  }
}

function lazyStart() { guardMidnight(proceedLazyStart); }
function proceedLazyStart() {
  state.question = $('#questionInput')?.value?.trim() || ''; state.manualMode = false;
  generateEntropySeed().then(seed => {
    let deck = createDeck(false);
    const { ti, yong, remaining } = drawTiYong(deck);
    state.ti = ti; state.yong = yong;
    let remainingDeck = remaining;
    remainingDeck.push({ isJoker: true, type: '大王', _uid: state.uid++ }, { isJoker: true, type: '小王', _uid: state.uid++ });
    remainingDeck = seededShuffle(remainingDeck, seed + 12345);
    const line = ALL_LINES[Math.floor(mulberry32(seed + 67890)() * ALL_LINES.length)];
    state.line = [...line]; const key = line.join(','); const tl = TIME_LABELS[key] || {};
    state.lineOrder = {}; state.lineOrder[line[0]] = '起因'; state.lineOrder[line[1]] = '经过'; state.lineOrder[line[2]] = '结果';
    for (let g = 1; g <= 9; g++) if (!state.lineOrder[g]) state.lineOrder[g] = tl[g] || '';
    for (const g of line) state.grid[g] = [remainingDeck.pop()];
    for (const g of GONG_ORDER) if (!state.grid[g] && remainingDeck.length) state.grid[g] = [remainingDeck.pop()];
    state.deck = remainingDeck; state.gongOrder = line.slice();
    updateStep(3); renderStep3(localInterpretation());
  });
}

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

function detectIntent(question, category) {
  if (category && CATEGORIES.includes(category)) return category;
  const q = (question || '').toLowerCase();
  const intentMap = { 
    '感情': ['复合', '分手', '前任', '脱单', '正缘', '桃花', '暧昧', '他爱', '出轨', '婚姻', '结婚', '离婚', '心动'], 
    '财运': ['财运', '赚钱', '项目', '投资', '破财', '工资', '偏财', '奖金', '股票', '基金'], 
    '事业': ['工作', '跳槽', '升职', '面试', '创业', '辞职', '老板', '同事', '裁员'], 
    '健康': ['身体', '生病', '手术', '失眠', '焦虑', '抑郁', '头疼'], 
    '学业': ['考试', '考研', '考公', '成绩', '论文', '上岸', '毕业'], 
    '人际关系': ['小人', '贵人', '朋友', '婆媳', '婆婆', '媳妇', '社交'], 
    '决策': ['该不该', '选哪个', '要不要', '能不能', '怎么办', '纠结'] 
  };
  for (const [intent, keywords] of Object.entries(intentMap)) { 
    if (keywords.some(k => q.includes(k))) return intent; 
  }
  return null;
}

function generateFollowUpQuestions(intent, ti, yong) {
  const questions = [];
  if (intent === '感情') { questions.push({ key: 'role', label: '你在这段关系里，是主动付出的一方，还是被动接受的一方？', options: ['主动', '被动'] }); } 
  else if (intent === '财运') { questions.push({ key: 'money_type', label: '这笔财是正职收入，还是意外之财？', options: ['正财', '偏财'] }); } 
  else { questions.push({ key: 'feeling', label: '你现在的状态更多是焦虑，还是疲惫？', options: ['焦虑', '疲惫', '平静'] }); }
  return questions.slice(0, 3);
}

function applyRefinement(key, value) {
  const interpretEl = $('#interpretText');
  if (!interpretEl) return;
  let html = interpretEl.innerHTML;
  const tagsEl = $('#refinementTags');
  if (tagsEl) { tagsEl.innerHTML += `<span class="tag">${value} <span class="tag-remove" data-remove="${key}" style="cursor:pointer;color:#d45050;">×</span></span>`; state.refinementTags[key] = value; }
  toast('已记录补充信息，可再次生成解读以刷新内容', 2000);
}

function localInterpretation() {
  const tiWx = getWuxing(state.ti); 
  const yongWx = getWuxing(state.yong);
  const relation = getShengKe(tiWx, yongWx);
  const intent = detectIntent(state.question, state.category);
  state.intent = intent;

  let result = '';
  if (state.category) result += `【领域：${state.category}】\n\n`;
  const bazi = getBaziFromProfile();
  if (bazi) result += `【四柱】${bazi.fullText}\n\n`;
  result += `体牌为${tiWx}，代表你。用牌为${yongWx}，代表所问之事。\n`;
  if (relation) result += `（${relation} ${getShengKeLabel(relation)}）\n\n`;
  if (state.line) { result += `天机线：${state.line.map(g => GONG_NAMES[g] + '宫').join(' → ')}\n\n`; }

  const allGongs = state.gongOrder.length ? state.gongOrder : Object.keys(state.grid).map(Number);
  for (const g of allGongs) {
    const cards = state.grid[g] || []; if (!cards.length) continue;
    cards.forEach(card => {
      const diff = calcDiff(g, card);
      const wang = getWangState(getWuxing(card), GONG_WUXING[g]);
      const relToTi = getShengKe(tiWx, getWuxing(card));
      const linePos = state.line ? state.line.indexOf(g) : -1;
      const linePosition = linePos === 0 ? 'start' : linePos === 1 ? 'middle' : linePos === 2 ? 'end' : 'offline';
      const ctx = {
        gong: { id: g, name: GONG_NAMES[g], element: GONG_WUXING[g] },
        card: { element: getWuxing(card), value: getCardValue(card), suit: card.suit },
        tiYongRelation: relToTi || '同我',
        wangState: wang,
        linePosition: linePosition,
        diff: diff,
        intent: intent
      };
      const readingResult = generateFullReading(ctx);
      const label = state.lineOrder[g] || GONG_NAMES[g] + '宫';
      result += `【${label}】\n${readingResult.light}\n\n---\n${readingResult.shadow}\n\n`;
    });
  }
  return result.trim();
}

function renderStep3(text) {
  const aiSettings = getApiSettings(); const aiVisible = aiSettings && aiSettings.apiKey;
  const followUpQuestions = generateFollowUpQuestions(state.intent, state.ti, state.yong);
  const followUpHTML = followUpQuestions.map(q => `<button class="refinement-btn" data-key="${q.key}" data-options='${JSON.stringify(q.options)}' style="margin:4px;">${q.label}</button>`).join('');
  domDynamic.innerHTML = `<div class="panel"><h3>${UI_TEXTS.step3}</h3>
    <div class="result-block" id="interpretText">${text.replace(/\n/g, '<br>')}</div>
    <div id="refinementArea" class="refinement-area" style="margin:12px 0; border-top:1px solid rgba(255,255,255,0.1); padding-top:12px;">
      <p style="color:var(--dim);font-size:0.8rem;margin-bottom:6px;">补充一点信息，牌面会更清晰：</p>
      <div style="display:flex;flex-wrap:wrap;gap:6px;">${followUpHTML}</div>
    </div>
    <div id="refinementTags" class="refinement-tags" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;"></div>
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
  const timestamps = getDrawTimestamps(); 
  const todayCount = timestamps.filter(ts => new Date(ts).toDateString() === new Date().toDateString()).length;
  const usage = checkUsageFrequency(timestamps);
  if (!state.userCorpus.includes(state.question)) state.userCorpus.push(state.question);
  const text = localInterpretation(); updateStep(3);
  renderStep3(text);
  const interpretEl = $('#interpretText');
  if (interpretEl && todayCount >= 8 && !localStorage.getItem('fs_limit_alert_today')) {
    const alertHTML = `<div style="margin-top:15px;font-size:0.7rem;color:var(--dim);border-top:1px solid rgba(255,255,255,0.05);padding-top:10px;">※ 今日已观测 8 次以上，镜面易起雾，请注意休息。</div>`;
    interpretEl.innerHTML += alertHTML;
    localStorage.setItem('fs_limit_alert_today', 'true');
  }
  if (usage.level !== 'normal') toast(usage.message, 4000);
  try {
    saveReading({ time: Date.now(), question: state.question, category: state.category, intent: state.intent, ti: state.ti, yong: state.yong, grid: state.grid, line: state.line, lineOrder: state.lineOrder, text, chatHistory: state.chatHistory.slice() });
  } catch(e) { toast('历史记录保存失败，但解读仍然有效'); }
  addDrawTimestamp(Date.now()); 
}

function generateShareCode() {
  const data = { q: state.question, c: state.category, ti: state.ti, yong: state.yong, grid: state.grid, line: state.line };
  const code = btoa(encodeURIComponent(JSON.stringify(data)));
  navigator.clipboard.writeText(code).then(() => toast(UI_TEXTS.toastShareCodeCopied), () => toast(UI_TEXTS.toastCopyFailed));
}
function importShareCode() {
  guardMidnight(() => {
    const code = $('#importCode')?.value?.trim(); if (!code) { toast(UI_TEXTS.placeholderImport); return; }
    try {
      const data = JSON.parse(decodeURIComponent(atob(code)));
      state.question = data.q || ''; state.category = data.c || ''; state.ti = data.ti; state.yong = data.yong; state.grid = data.grid || {}; state.line = data.line || null;
      const key = (state.line || []).join(','); const tl = TIME_LABELS[key] || {}; state.lineOrder = {};
      if (state.line) { state.lineOrder[state.line[0]] = '起因'; state.lineOrder[state.line[1]] = '经过'; state.lineOrder[state.line[2]] = '结果'; for (let g = 1; g <= 9; g++) if (!state.lineOrder[g]) state.lineOrder[g] = tl[g] || ''; }
      state.possible = []; state.gongOrder = Object.keys(state.grid).map(Number); state.step = 3; state.manualMode = false; state.deck = []; state.sel = null; state.chatHistory = [];
      generateInterpretation(); toast(UI_TEXTS.toastImportSuccess);
    } catch (e) { toast(UI_TEXTS.toastImportFail); }
  });
}

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
  if (state.chatHistory && state.chatHistory.length >= 2) {
    const aiReply = state.chatHistory[state.chatHistory.length - 1].content;
    const maxChars = 60; const truncated = aiReply.length > maxChars ? aiReply.substring(0, maxChars) + '……' : aiReply;
    ctx.fillStyle = '#6a6a7e'; ctx.font = 'italic 11px Georgia,"Songti SC",serif'; ctx.fillText('深层映照：' + truncated, 20, 230);
  }
  const quote = SHARE_QUOTES[Math.floor(Math.random() * SHARE_QUOTES.length)];
  ctx.fillStyle = '#8888a0'; ctx.font = 'italic 13px Georgia,"Songti SC",serif'; ctx.fillText('"' + quote + '"', 20, 255);
  ctx.fillStyle = '#6a6a7e'; ctx.font = '11px Georgia,"Songti SC",serif'; ctx.fillText(SHARE_TEXTS.footer, 20, h - 16);
  domSharePreview.removeAttribute('hidden'); toast('长按图片即可保存，或点下方按钮保存到相册');
}
function saveShareImage() {
  const canvas = domShareCanvas;
  canvas.toBlob(blob => {
    if (!blob) { toast('保存失败'); return; }
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `浮生牌_${new Date().toISOString().slice(0,10)}.png`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); toast('分享图已保存');
  }, 'image/png');
}

function initSettingsPanel() {
  const s = getApiSettings();
  if (s) { state.selectedProvider = s.provider || 'deepseek'; $$('#providerGrid button').forEach(b => b.classList.toggle('selected', b.dataset.value === state.selectedProvider)); $('#apiKey').value = s.apiKey || ''; $('#apiEndpoint').value = s.endpoint || API_PROVIDERS[state.selectedProvider]?.endpoint || ''; $('#aiStyle').value = s.aiStyle || 'guide'; }
  updateApiStatus();
  const panel = $('#panelSettings');
  if (panel && !panel.querySelector('#sponsorBlock')) {
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
function initProfilePanel() {
  const p = getProfile(); $('#birthDate').value = p.birthDate || ''; $('#birthTime').value = p.birthTime || ''; updateBaziPreview();
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
function renderHistoryPanel() {
  const list = $('#historyList'); if (!list) return;
  const history = getHistory();
  if (!history.length) { list.innerHTML = `<p style="color:var(--dim)">${HISTORY_EMPTY}</p>`; return; }
  list.innerHTML = history.map((r, i) => `<div class="history-item" data-index="${i}"><strong>${new Date(r.time).toLocaleString()}</strong><span> - ${r.question || '未提问'} (${r.category || '无类别'})</span></div>`).join('');
}
function showHistoryDetail(index) {
  const history = getHistory(); const r = history[index]; if (!r) return;
  const savedLocalText = r.text || '';
  const buildHistoricalPrompt = (historyRecord, question) => { return `请根据以下浮生牌局象进行详细解读。\n\n历史牌局解读：${historyRecord.text}\n\n用户追问：${question}\n\n规则：纯文本格式，用自然语言。话不说死。`; };
  let aiBlock = '';
  if (r.chatHistory && r.chatHistory.length) { aiBlock = '<div class="result-block" style="max-height:150px;margin-top:10px">' + r.chatHistory.map(m => `<div class="chat-msg ${m.role === 'user' ? 'user' : 'ai'}">${m.content.replace(/\n/g, '<br>')}</div>`).join('') + '</div>'; } 
  else { aiBlock = '<p style="color:var(--dim)">暂无 AI 对话记录</p>'; }
  domModalContent.innerHTML = `<h3>历史详情</h3><p><strong>时间：</strong>${new Date(r.time).toLocaleString()}</p><p><strong>问题：</strong>${r.question || '未提问'}</p><p><strong>类别：</strong>${r.category || '无'}</p><div class="result-block">${(r.text || '').replace(/\n/g, '<br>')}</div><h4 style="margin-top:10px">AI 对话</h4>${aiBlock}<div style="margin-top:10px;display:flex;gap:8px"><input type="text" id="historyFollowUpInput" placeholder="${UI_TEXTS.placeholderFollowUp}" style="flex:1"><button id="historyFollowUpBtn" class="small">发送</button></div><div class="btn-row"><button data-action="deleteHistoryItem" data-history-index="${index}" class="outline small">删除此条</button><button data-action="closeModal" class="small">${UI_TEXTS.btnClose}</button></div>`;
  domModal.removeAttribute('hidden');
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

async function triggerAI() {
  const btn = $('#aiReadBtn'); if (!btn) return; btn.disabled = true; btn.textContent = '思考中...';
  const settings = getApiSettings(); if (!settings || !settings.apiKey) { toast('请先配置 API Key'); btn.disabled = false; btn.textContent = UI_TEXTS.btnAIDeepRead; return; }
  const provider = settings.provider || 'deepseek'; 
  let endpoint = settings.endpoint || API_PROVIDERS[provider]?.endpoint || '';
  if (endpoint.endsWith('/v1')) endpoint = endpoint.slice(0, -3); 
  if (endpoint.endsWith('/')) endpoint = endpoint.slice(0, -1);
  const model = settings.model || API_PROVIDERS[provider]?.model || '';
  const prompt = buildAIPrompt();
  try {
    const result = await requestReading({ provider, apiKey: settings.apiKey, endpoint, model, style: settings.aiStyle || 'guide', prompt });
    const container = $('#aiResultContainer'); const content = $('#aiResultContent');
    if (container) container.style.display = 'block'; if (content) content.innerHTML = '<strong>深层解读：</strong><br>' + result.replace(/\n/g, '<br>');
    state.chatHistory = [{ role: 'user', content: prompt }, { role: 'assistant', content: result }];
    const followUp = $('#followUpArea'); if (followUp) followUp.style.display = 'block';
    toast('解读完成');
  } catch (e) { const container = $('#aiResultContainer'); if (container) container.style.display = 'block'; const content = $('#aiResultContent'); if (content) content.innerHTML = `<span style="color:#d45050">${e.message}</span>`; toast(e.message, 3000); } 
  finally { btn.disabled = false; btn.textContent = UI_TEXTS.btnAIDeepRead; }
}
async function sendFollowUp() {
  const input = $('#followUpInput'); if (!input) return; const q = input.value.trim(); if (!q) return; input.value = '';
  const settings = getApiSettings(); if (!settings || !settings.apiKey) { toast('未配置 API Key'); return; }
  const history = state.chatHistory; if (!history || history.length < 2) { toast('请先进行一次 AI 解读'); return; }
  history.push({ role: 'user', content: q }); const chatBlock = $('#chatHistoryBlock'); if (chatBlock) chatBlock.innerHTML += `<div class="chat-msg user">${q}</div>`;
  const provider = settings.provider || 'deepseek'; 
  let endpoint = settings.endpoint || API_PROVIDERS[provider]?.endpoint || '';
  if (endpoint.endsWith('/v1')) endpoint = endpoint.slice(0, -3); 
  if (endpoint.endsWith('/')) endpoint = endpoint.slice(0, -1);
  const model = settings.model || API_PROVIDERS[provider]?.model || '';
  try { const result = await requestFollowUp({ history, provider, apiKey: settings.apiKey, endpoint, model }); history.push({ role: 'assistant', content: result }); if (chatBlock) { chatBlock.innerHTML += `<div class="chat-msg ai">${result.replace(/\n/g, '<br>')}</div>`; chatBlock.scrollTop = chatBlock.scrollHeight; } } 
  catch (e) { if (chatBlock) chatBlock.innerHTML += `<div class="chat-msg" style="color:#d45050">失败：${e.message}</div>`; }
}
function buildAIPrompt() {
  const localText = localInterpretation();
  return `请根据以下浮生牌局象进行详细解读。\n\n要求：纯文本格式，严禁使用任何Markdown符号。用自然语言分段。从体用生克、时空推演、宫位差值、旺相休囚、阴阳属性等方面展开。话不说死。\n\n${localText}\n\n规则：红桃火(阳) 方块金(阳) 梅花木(阴) 黑桃水(阴) JQK土 大王天(阳) 小王人(阴)。`;
}

async function handleTestApiConnection() {
  const btn = document.querySelector('[data-action="testApiConnection"]'); if (btn) { btn.disabled = true; btn.textContent = '测试中...'; }
  try {
    const provider = state.selectedProvider || 'deepseek'; 
    let endpoint = $('#apiEndpoint')?.value?.trim() || '';
    const apiKey = $('#apiKey')?.value?.trim() || '';
    if (!apiKey && provider !== 'custom') throw new Error('请先填写 API Key');
    if (!endpoint && API_PROVIDERS[provider]) endpoint = API_PROVIDERS[provider].endpoint; 
    if (endpoint.endsWith('/v1')) endpoint = endpoint.slice(0, -3); 
    if (endpoint.endsWith('/')) endpoint = endpoint.slice(0, -1);
    const model = API_PROVIDERS[provider]?.model || '';
    const msg = await testApiConnection({ provider, apiKey, endpoint, model }); toast(msg, 3000);
  } catch (e) { toast(`测试失败: ${e.message}`, 4000); } 
  finally { if (btn) { btn.disabled = false; btn.textContent = UI_TEXTS.btnTestApi; } }
}

// ===== 更新神签显示（持久化） =====
function updateDailySignDisplay(sign) {
  const card = $('#dailySignCard');
  if (!card) return;
  card.innerHTML = `
    <div style="color:var(--dim);font-size:0.8rem;">今日状态</div>
    <div style="font-size:1.4rem;color:var(--accent);margin:8px 0;">${sign.status}</div>
    <div style="font-size:0.9rem;color:#ddd;margin-bottom:8px;">“${sign.quote}”</div>
    <button data-action="dailyFortune" class="small outline" style="margin-top:0;">更新今日状态</button>
  `;
}

function showDailyFortune() {
  const today = new Date().toDateString(); let hash = 0; for (let i = 0; i < today.length; i++) { hash = ((hash << 5) - hash) + today.charCodeAt(i); hash |= 0; }
  const idx = Math.abs(hash) % Math.max(SIGN_LIBRARY.length, 1);
  const sign = SIGN_LIBRARY[idx];
  if (sign) {
    localStorage.setItem('fs_todays_sign_date', today);
    localStorage.setItem('fs_todays_sign', JSON.stringify(sign));
    updateDailySignDisplay(sign);

    domModalContent.innerHTML = `
      <div style="text-align:center;padding:10px;font-family:'Georgia',serif;">
        <h3 style="font-size:1.8rem;color:var(--accent);letter-spacing:4px;">今日御神签</h3>
        <div style="margin:12px 0;background:rgba(0,0,0,0.3);padding:12px;border-radius:4px;border:1px solid rgba(255,255,255,0.05);">
          <div style="font-size:1.2rem;margin-bottom:4px;">【 ${sign.status || '静观其变'} 】</div>
          <div style="font-size:0.9rem;color:#ddd;margin:8px 0;">“${sign.quote || ''}”</div>
          <div style="font-size:0.8rem;color:var(--dim);">— ${sign.author || '浮生牌'}</div>
          <div style="display:flex;justify-content:center;gap:16px;font-size:0.85rem;margin:12px 0;">
            <span style="color:#5a9a6a;">🌞 宜：${sign.advice?.split('；')[0]?.replace('宜：','') || ''}</span>
            <span style="color:#d45050;">🌙 忌：${sign.advice?.split('；')[1]?.replace('忌：','') || ''}</span>
          </div>
        </div>
        <button id="dailyAiBtn" class="primary small">✨ 呼唤AI深度解析</button>
        <div id="dailyAiResult" style="margin-top:8px;text-align:left;font-size:0.85rem;color:#ddd;"></div>
        <button data-action="closeModal" style="margin-top:12px;">关闭</button>
      </div>
    `;
    domModal.removeAttribute('hidden');

    document.getElementById('dailyAiBtn').addEventListener('click', async function() {
      this.disabled = true; this.textContent = '召唤中...';
      const settings = getApiSettings();
      if (!settings || !settings.apiKey) {
          toast('请先在设置中配置 AI API Key');
          this.disabled = false; this.textContent = '✨ 呼唤AI深度解析';
          return;
      }
      try {
        const provider = settings.provider || 'deepseek';
        let endpoint = settings.endpoint || API_PROVIDERS[provider]?.endpoint || '';
        if (endpoint.endsWith('/v1')) endpoint = endpoint.slice(0, -3); 
        if (endpoint.endsWith('/')) endpoint = endpoint.slice(0, -1);
        const model = settings.model || API_PROVIDERS[provider]?.model || '';
        const prompt = `请针对今日的占卜签文进行深度解读。\n状态词：${sign.status}\n名言：${sign.quote}\n宜忌：${sign.advice}\n要求：纯中文，话不说死，指出这对用户今天生活的具体心理暗示。`;
        const result = await requestReading({ provider, apiKey: settings.apiKey, endpoint, model, prompt });
        document.getElementById('dailyAiResult').innerHTML = `<div style="border-top:1px solid rgba(255,255,255,0.1);padding-top:8px;margin-top:8px;color:#e0e0e0;"><strong>AI 解签：</strong><br>${result}</div>`;
      } catch (e) { toast(e.message); }
      finally { this.disabled = false; this.textContent = '✨ 呼唤AI深度解析'; }
    });
  } else {
    toast('神签库尚未填充文案，待您亲笔撰写。', 3000);
  }
}

// ================================================================
// 长按拖拽、鼠标拖拽部分（修复乱飞 Bug）
// ================================================================
document.addEventListener('touchstart', function(e) {
  const cardEl = e.target.closest('.card-back, .card-face-small');
  if (!cardEl) return;
  const id = cardEl.dataset.cardid;
  const card = findCardById(id);
  if (!card || isCardPlaced(card)) return;
  isLongPress = false;
  longPressTimer = setTimeout(() => {
    isLongPress = true;
    ghostCard = cardEl.cloneNode(true);
    ghostCard.style.position = 'fixed';
    ghostCard.style.zIndex = 1000;
    ghostCard.style.pointerEvents = 'none';
    ghostCard.style.opacity = '0.7';
    ghostCard.style.width = cardEl.offsetWidth + 'px';
    ghostCard.style.height = cardEl.offsetHeight + 'px';
    document.body.appendChild(ghostCard);
    if (navigator.vibrate) navigator.vibrate(10);
  }, 300);
  const touch = e.touches[0];
  touchDragX = touch.clientX; touchDragY = touch.clientY;
}, { passive: true });

document.addEventListener('touchmove', function(e) {
  const touch = e.touches[0];
  const dx = touch.clientX - touchDragX; const dy = touch.clientY - touchDragY;
  if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
    clearTimeout(longPressTimer);
    if (isLongPress && ghostCard) {
      ghostCard.style.left = (touch.clientX - ghostCard.offsetWidth / 2) + 'px';
      ghostCard.style.top = (touch.clientY - ghostCard.offsetHeight / 2) + 'px';
      e.preventDefault();
    }
  }
}, { passive: false });

document.addEventListener('touchend', function(e) {
  clearTimeout(longPressTimer);
  if (isLongPress && ghostCard) {
    const touch = e.changedTouches[0];
    const dropTarget = document.elementFromPoint(touch.clientX, touch.clientY);
    const gong = dropTarget?.closest('.gong');
    const emptyDash = dropTarget?.closest('.empty-dash');
    
    let placed = false;
    if (gong && state.sel) { const g = parseInt(gong.dataset.gong); const card = findCardById(state.sel); if (card && !isCardPlaced(card)) placed = placeCardOnGong(card, g); } 
    else if (emptyDash && state.sel) { const card = findCardById(state.sel); if (card && !isCardPlaced(card)) { if (emptyDash.textContent.includes('体')) placed = placeCardOnTiYong(card, 'ti'); else placed = placeCardOnTiYong(card, 'yong'); } }

    // 修复：飞入动画与幽灵卡消除
    if (placed) {
      const targetRect = gong ? gong.getBoundingClientRect() : emptyDash.getBoundingClientRect();
      if (ghostCard) {
        ghostCard.style.transition = 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)';
        ghostCard.style.left = (targetRect.left + targetRect.width / 2 - ghostCard.offsetWidth / 2) + 'px';
        ghostCard.style.top = (targetRect.top + targetRect.height / 2 - ghostCard.offsetHeight / 2) + 'px';
        ghostCard.style.transform = 'scale(0.6)';
        ghostCard.style.opacity = '0';
        setTimeout(() => { if (ghostCard) ghostCard.remove(); ghostCard = null; }, 300);
      }
    } else {
      if (ghostCard) ghostCard.remove();
      ghostCard = null;
    }
    isLongPress = false; return;
  }
  const cardEl = e.target.closest('.card-back, .card-face-small');
  if (!isLongPress && cardEl) { const id = cardEl.dataset.cardid; const card = findCardById(id); if (card && !isCardPlaced(card)) selectCard(id); }
}, { passive: true });

document.addEventListener('mousedown', function(e) {
  const cardEl = e.target.closest('.card-back, .card-face-small');
  if (!cardEl) return;
  const id = cardEl.dataset.cardid; const card = findCardById(id);
  if (!card || isCardPlaced(card)) return;
  isLongPress = false;
  longPressTimer = setTimeout(() => {
    isLongPress = true;
    ghostCard = cardEl.cloneNode(true);
    ghostCard.style.position = 'fixed'; ghostCard.style.zIndex = 1000; ghostCard.style.pointerEvents = 'none';
    ghostCard.style.opacity = '0.7'; ghostCard.style.width = cardEl.offsetWidth + 'px'; ghostCard.style.height = cardEl.offsetHeight + 'px';
    document.body.appendChild(ghostCard);
  }, 300);
  mouseDragX = e.clientX; mouseDragY = e.clientY;
});

document.addEventListener('mousemove', function(e) {
  if (!isLongPress || !ghostCard) return;
  const dx = e.clientX - mouseDragX; const dy = e.clientY - mouseDragY;
  if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
    ghostCard.style.left = (e.clientX - ghostCard.offsetWidth / 2) + 'px';
    ghostCard.style.top = (e.clientY - ghostCard.offsetHeight / 2) + 'px';
  }
});

document.addEventListener('mouseup', function(e) {
  clearTimeout(longPressTimer);
  if (isLongPress && ghostCard) {
    const dropTarget = document.elementFromPoint(e.clientX, e.clientY);
    const gong = dropTarget?.closest('.gong'); const emptyDash = dropTarget?.closest('.empty-dash');
    let placed = false;
    if (gong && state.sel) { const g = parseInt(gong.dataset.gong); const card = findCardById(state.sel); if (card && !isCardPlaced(card)) placed = placeCardOnGong(card, g); } 
    else if (emptyDash && state.sel) { const card = findCardById(state.sel); if (card && !isCardPlaced(card)) { if (emptyDash.textContent.includes('体')) placed = placeCardOnTiYong(card, 'ti'); else placed = placeCardOnTiYong(card, 'yong'); } }
    if (placed) {
      const targetRect = gong ? gong.getBoundingClientRect() : emptyDash.getBoundingClientRect();
      if (ghostCard) {
        ghostCard.style.transition = 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)';
        ghostCard.style.left = (targetRect.left + targetRect.width / 2 - ghostCard.offsetWidth / 2) + 'px';
        ghostCard.style.top = (targetRect.top + targetRect.height / 2 - ghostCard.offsetHeight / 2) + 'px';
        ghostCard.style.transform = 'scale(0.6)'; ghostCard.style.opacity = '0';
        setTimeout(() => { if (ghostCard) ghostCard.remove(); ghostCard = null; }, 300);
      }
    } else { if (ghostCard) ghostCard.remove(); ghostCard = null; }
    isLongPress = false; return;
  }
  const cardEl = e.target.closest('.card-back, .card-face-small');
  if (!isLongPress && cardEl) { const id = cardEl.dataset.cardid; const card = findCardById(id); if (card && !isCardPlaced(card)) selectCard(id); }
});

document.addEventListener('click', function(e) {
  const btn = e.target.closest('button');
  if (btn) {
    if (btn.id === 'scrollLeftBtn' || btn.id === 'scrollRightBtn') return;
    if (btn.classList.contains('refinement-btn')) {
      const key = btn.dataset.key; const options = JSON.parse(btn.dataset.options || '[]');
      if (options.length > 0) { const btnText = btn.textContent; btn.parentNode.innerHTML = `<span style="color:var(--dim);margin-right:8px;">${btnText}</span>` + options.map(opt => `<button class="refinement-option-btn" data-key="${key}" data-value="${opt}" style="margin:4px;">${opt}</button>`).join(''); }
      return;
    }
    if (btn.classList.contains('refinement-option-btn')) { const key = btn.dataset.key; const value = btn.dataset.value; applyRefinement(key, value); btn.parentNode.innerHTML = `<span style="color:var(--accent);font-size:0.85rem;">✓ 已补充：${value}</span>`; return; }
    if (btn.classList.contains('tag-remove')) { const key = btn.dataset.remove; delete state.refinementTags[key]; btn.closest('.tag').remove(); return; }
    const action = btn.dataset.action; if (!action) return;
    switch (action) {
      case 'togglePanel': togglePanel(btn.dataset.panel); break;
      case 'resetAll': resetAll(); break;
      case 'confirmQuestion': startQuestion(); break;
      case 'lazyStart': lazyStart(); break;
      case 'manualEntry': startManualEntry(); break;
      case 'selectCategory': state.category = state.category === btn.dataset.category ? '' : btn.dataset.category; document.querySelectorAll('[data-action="selectCategory"]').forEach(b => b.classList.toggle('selected', b.dataset.category === state.category)); break;
      case 'confirmTiYong': confirmTiYong(); break;
      case 'resetStep2': resetStep2(); break;
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
  const historyItem = e.target.closest('.history-item'); if (historyItem && historyItem.dataset.index !== undefined) { showHistoryDetail(parseInt(historyItem.dataset.index)); return; }
  const lineBtn = e.target.closest('.line-btn'); if (lineBtn && lineBtn.dataset.line) { setLine(lineBtn.dataset.line.split(',').map(Number)); return; }
  const emptyDash = e.target.closest('.empty-dash'); if (emptyDash && state.sel) { const card = findCardById(state.sel); if (card && !isCardPlaced(card)) { if (emptyDash.textContent.includes('体')) placeCardOnTiYong(card, 'ti'); else placeCardOnTiYong(card, 'yong'); } return; }
  const gong = e.target.closest('.gong'); if (gong && state.sel) { const g = parseInt(gong.dataset.gong); const card = findCardById(state.sel); if (card && !isCardPlaced(card)) placeCardOnGong(card, g); }
});

function resetAll() {
  Object.assign(state, { question: '', category: '', deck: [], ti: null, yong: null, grid: {}, line: null, lineOrder: {}, step: 1, sel: null, possible: [], manualMode: false, gongOrder: [], chatHistory: [], uid: 0, editCount: 0, refinementTags: {}, intent: null });
  updateStep(1); renderStep1(); toast(UI_TEXTS.toastReset);
}
function startQuestion() { guardMidnight(proceedStartQuestion); }
function proceedStartQuestion() {
  const q = $('#questionInput')?.value?.trim() || ''; 
  if (q) { const check = checkEthicalBoundary(q); if (check.blocked) { domDynamic.innerHTML = `<div class="panel"><h3>提示</h3><p>${check.message}</p><button data-action="resetAll" class="small">返回</button></div>`; return; } }
  state.question = q; state.manualMode = false; state.uid = 0; 
  generateEntropySeed().then(seed => {
    state.deck = seededShuffle(createDeck(false), seed);
    state.ti = null; state.yong = null; state.grid = {}; state.line = null; state.lineOrder = {}; state.sel = null; state.possible = []; state.chatHistory = []; state.gongOrder = []; state.editCount = 0; state.refinementTags = {}; state.intent = null;
    updateStep(2); renderStep2();
  });
}
function startManualEntry() {
  guardMidnight(() => {
    state.question = $('#questionInput')?.value?.trim() || ''; state.manualMode = true; state.uid = 0; state.deck = createDeck(true);
    state.ti = null; state.yong = null; state.grid = {}; state.line = null; state.lineOrder = {}; state.sel = null; state.possible = []; state.chatHistory = []; state.gongOrder = []; state.editCount = 0; state.refinementTags = {}; state.intent = null;
    updateStep(2); renderStep2();
  });
}
function copyLocalResult() { const el = $('#interpretText'); if (!el) return; navigator.clipboard.writeText(el.innerText).then(() => toast(UI_TEXTS.toastCopied), () => toast(UI_TEXTS.toastCopyFailed)); }
function saveApiSettingsFromForm() {
  const p = state.selectedProvider || 'deepseek'; const info = API_PROVIDERS[p] || API_PROVIDERS.deepseek; let endpoint = $('#apiEndpoint')?.value?.trim() || info.endpoint || ''; if (endpoint.endsWith('/')) endpoint = endpoint.slice(0, -1);
  const settings = { provider: p, apiKey: $('#apiKey')?.value?.trim() || '', endpoint: endpoint, model: info.model || '', aiStyle: $('#aiStyle')?.value || 'guide' };
  saveApiSettings(settings); updateApiStatus(); toast(UI_TEXTS.toastSaved);
}
function saveProfileFromForm() { const bd = $('#birthDate')?.value || ''; const bt = $('#birthTime')?.value || ''; saveProfile({ birthDate: bd, birthTime: bt }); toast(UI_TEXTS.toastProfileSaved); }

document.addEventListener('click', function(e) { const b = e.target.closest('#providerGrid button'); if (!b || !b.dataset.value) return; state.selectedProvider = b.dataset.value; $$('#providerGrid button').forEach(x => x.classList.toggle('selected', x === b)); const info = API_PROVIDERS[state.selectedProvider]; if (info) { const ep = $('#apiEndpoint'); if (ep) ep.value = info.endpoint || ''; } });
document.addEventListener('click', function(e) { if (e.target === domModal) domModal.setAttribute('hidden', ''); });

function checkEthicalBoundary(question) { const q = question.toLowerCase(); for (const [key, entry] of Object.entries(REFUSAL_TEXTS.keywords)) { if (entry.trigger.some(word => q.includes(word))) return { blocked: true, message: entry.response }; } return { blocked: false }; }
function escapeHtml(str) { const div = document.createElement('div'); div.textContent = str; return div.innerHTML; }

function init() {
  try {
    cacheDom(); updateStep(1); renderStep1(); updateApiStatus();
    const ep = $('#apiEndpoint'); if (ep && !ep.value) ep.value = API_PROVIDERS.deepseek.endpoint;
    if (!hasCompletedOnboarding()) showOnboarding();

    // 检查并加载持久化的今日状态
    const storedDate = localStorage.getItem('fs_todays_sign_date');
    const storedSign = localStorage.getItem('fs_todays_sign');
    const today = new Date().toDateString();
    if (storedDate === today && storedSign) {
      try {
        updateDailySignDisplay(JSON.parse(storedSign));
      } catch(e) {}
    }

    const style = document.createElement('style');
    style.textContent = `
      @keyframes cardAppear {
        0% { opacity: 0; transform: scale(0.8); }
        100% { opacity: 1; transform: scale(1); }
      }
      button:active { transform: scale(0.95); transition: transform 0.1s ease; }
    `;
    document.head.appendChild(style);
  } catch (e) { document.body.innerHTML = '<div style="color:#d45050;padding:40px;text-align:center;font-family:sans-serif;"><h2>浮生牌启动失败</h2><p>请检查浏览器控制台（F12）的错误信息，并确认所有文件已正确保存。</p><p style="font-size:0.8rem;">' + e.message + '</p></div>'; console.error(e); }
}
document.addEventListener('DOMContentLoaded', init);