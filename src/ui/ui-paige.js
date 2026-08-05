// ===== src/ui/ui-paige.js · 牌灵卡（盲抽版：背面朝上，点牌即开） =====
import { state } from '../state.js';
import { createDeck, shuffle } from '../engine.js';
import { getCardColor, getWuxing } from '../data.js';
import { getPaiGeQuestion, PAIGE_HASHTAGS } from '../texts/social.js';
import { toast } from './ui-modal.js';
import { escapeForHTML, setHTML } from '../utils/safe.js';
import { playCardSound } from '../utils/sound.js';

const STORAGE_KEY = 'fsp_paige';
const HISTORY_KEY = 'fsp_history';
const UNLOCK_THRESHOLD = 3;

export function getStoredPaiGe() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function savePaiGe(card) {
  const data = { card, drawnAt: Date.now() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  // 保存后通知首页刷新牌灵卡
  import('./ui-render.js').then(m => m.renderPeriodCards()).catch(() => {});
  return data;
}

export function clearPaiGe() {
  localStorage.removeItem(STORAGE_KEY);
  import('./ui-render.js').then(m => m.renderPeriodCards()).catch(() => {});
}

export function getRealReadingCount() {
  try {
    const history = JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
    return Array.isArray(history) ? history.length : 0;
  } catch { return 0; }
}

export function getPaiGeUnlockStatus() {
  const stored = getStoredPaiGe();
  const readings = getRealReadingCount();
  return {
    hasStored: !!stored,
    unlocked: true, // 已拆锁：随时可重新抽取，不再需要完成次数
    readings,
    threshold: 1,
    stored,
  };
}

// ---------- 入口 ----------
export function openPaiGe() {
  const status = getPaiGeUnlockStatus();
  const modal = document.getElementById('modal');
  const content = document.getElementById('modalContent');
  if (!modal || !content) { toast('弹窗未就绪', 2200, 'warning'); return; }

  if (!status.hasStored) {
    showPaiGeDraw(modal, content);
  } else {
    showPaiGeDetail(modal, content, status);
  }
}

// ---------- 盲抽：全部牌背朝上，点击翻牌 ----------
function showPaiGeDraw(modal, content) {
  const deck = shuffle(createDeck(false)); // 52张，不含大小王，保持简洁
  state.pendingPaiGeDeck = deck;

  const html = `
    <div style="text-align:center;"> 
      <h3 style="color:var(--accent);">🃏 盲抽你的牌灵</h3>
      <p id="paigeDeckHint" style="font-size:0.8rem;color:var(--dim);margin:8px 0 16px;">
        凭直觉，点一张牌背即开。<br>
        翻开的瞬间，你的无意识会借这张牌，
        说出它想让你看见的课题。
        <br>
        <span style="color:#d45050;font-size:0.7rem;">⚜️ 本命守护：可随时重新抽取</span>
      </p>
      <div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;max-height:320px;overflow-y:auto;padding:12px;" id="paigeDeckGrid">
        ${deck.map((_, idx) => `
          <div data-paige-card-idx="${idx}" class="card-back" style="
            width:64px;height:88px;cursor:pointer;flex-shrink:0;
            transition:transform 0.15s;
            animation:dealIn 0.4s var(--ease) backwards;animation-delay:${Math.min(idx * 12, 500)}ms;
          " onmouseover="this.style.transform='translateY(-4px)'" onmouseout="this.style.transform='translateY(0)'"></div>`).join('')}
      </div>
      <div style="margin-top:14px;">
        <button id="paigeRandomBtn" class="outline small">🎲 完全随机抽一张</button>
        <button data-action="closeModal" class="outline small">算了</button>
      </div>
    </div>
  `;
  setHTML(content, html);
  modal.removeAttribute('hidden');

  let paigeLocked = false;
  function flipPaiGeCard(idx, card) {
    if (paigeLocked) return;
    paigeLocked = true;
    const el = content.querySelector(`[data-paige-card-idx="${idx}"]`);
    content.querySelectorAll('#paigeDeckGrid .card-back').forEach(b => {
      b.style.pointerEvents = 'none';
      b.style.opacity = '0.4';
    });
    if (el) {
      el.style.opacity = '1';
      // 张力窗口：摸稳 → 牌背轻微抖动 → 才翻牌
      el.classList.add('card-tension');
      // 服务：想好了，就翻。
      const hint = content.querySelector('#paigeDeckHint');
      if (hint) hint.textContent = '想好了，就翻。';
      playCardSound('tap');
      setTimeout(() => {
        el.outerHTML = `<div class="card-face ${getCardColor(card)}" style="width:64px;height:88px;margin:0 auto;animation:cardFlip 0.5s;">${escapeForHTML(card.isJoker ? card.type : card.rank)}${escapeForHTML(card.isJoker ? '' : card.suit)}</div>`;
        playCardSound('flip');
      }, 420);
    }
    setTimeout(() => confirmPaiGePick(card), 420 + 550);
  }

  content.querySelectorAll('[data-paige-card-idx]').forEach(el => bindTapToFlip(el));

  // 摸牌手势：点牌即开（无需长按，简单直接）
  function bindTapToFlip(el) {
    const idx = parseInt(el.dataset.paigeCardIdx);
    const hint = content.querySelector('#paigeDeckHint');
    const onDown = (e) => {
      if (paigeLocked) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      el.classList.add('card-holding');
      if (hint) hint.textContent = '想好了，就翻。';
      if (navigator.vibrate) navigator.vibrate(20);
    };
    const onUp = (e) => {
      if (paigeLocked) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      el.classList.remove('card-holding');
      flipPaiGeCard(idx, deck[idx]);
    };
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', () => el.classList.remove('card-holding'));
  }

  document.getElementById('paigeRandomBtn')?.addEventListener('click', () => {
    const idx = Math.floor(Math.random() * deck.length);
    toast('✨ 天命已定，牌灵显现', 2400, 'success');
    flipPaiGeCard(idx, deck[idx]);
  });
}

// ---------- 确认抽取 ----------
export function confirmPaiGePick(card) {
  if (!card) return;
  savePaiGe(card);
  toast('🔒 牌灵已定——你的无意识，选出了它想让你看见的那一张', 2800, 'success');
  openPaiGe();
}

// ---------- 详情界面（牌灵 = 课题，不再混入人格） ----------
function showPaiGeDetail(modal, content, status) {
  const stored = status.stored;
  const card = stored.card;
  const question = getPaiGeQuestion(card);
  const rank = card.isJoker ? 'JOKER' : card.rank;
  const suit = card.isJoker ? '' : card.suit;
  const color = getCardColor(card);
  const colorText = color === 'red' ? '#e74c3c' : color === 'gold' ? '#f1c40f' : '#ecf0f1';

  let actionHTML = '';
  if (status.unlocked) {
    actionHTML = `<button id="paigeRedrawBtn" class="outline small" style="color:#d45050;border-color:#d45050;">🔄 重新抽取（已解锁）</button>`;
  } else {
    actionHTML = `<span style="font-size:0.7rem;color:var(--dim);">⚜️ 本命守护 · 可随时重新抽取</span>`;
  }

  const html = `
    <div style="text-align:center;">
      <div style="font-size:0.7rem;color:var(--dim);margin-bottom:4px;">你的牌灵 · 人生课题</div>
      <div style="
        width:110px;height:155px;
        background:rgba(255,255,255,0.7);
        border:2px solid var(--border);
        border-radius:var(--r-hand-sm);
        margin:12px auto;
        display:flex;
        flex-direction:column;
        align-items:center;
        justify-content:center;
        gap:4px;
        box-shadow:0 4px 20px rgba(111,174,156,0.22), 2px 3px 0 rgba(77,143,126,0.13);
      ">
        <span style="font-size:2.2rem;font-weight:bold;color:${colorText};">${escapeForHTML(rank)}${escapeForHTML(suit)}</span>
        <span style="font-size:0.7rem;color:var(--accent);">${escapeForHTML(question?.title || '')}</span>
      </div>

      <div style="font-size:1.2rem;font-weight:bold;color:var(--text);margin:8px 0;">${escapeForHTML(question?.title || '')}</div>
      <div style="font-size:0.9rem;color:var(--dim);line-height:1.8;padding:0 12px;white-space:pre-wrap;">“${escapeForHTML(question?.question || '')}”</div>

      <div style="display:flex;gap:4px;justify-content:center;margin:10px 0;">
        ${(question?.keywords || []).map(kw => `<span style="font-size:0.7rem;background:rgba(var(--accent-rgb),0.15);border:1px solid rgba(var(--accent-rgb),0.3);border-radius:var(--r-hand-btn);padding:4px 10px;color:var(--accent);">${escapeForHTML(kw)}</span>`).join('')}
      </div>

      <p class="num" style="font-size:0.65rem;color:var(--dim);">抽于 ${new Date(stored.drawnAt).toLocaleString()}</p>

      <div class="btn-row">
        <button id="paigeShareBtn" class="primary small">🃏 生成牌灵分享图</button>
        <button data-action="closeModal" class="outline small">关闭</button>
      </div>
      <div style="margin-top:8px;">${actionHTML}</div>
    </div>
  `;
  setHTML(content, html);
  modal.removeAttribute('hidden');

  document.getElementById('paigeShareBtn')?.addEventListener('click', () => {
    // 先收起详情弹窗，避免分享面板与弹窗叠加遮挡
    const modalEl = document.getElementById('modal');
    if (modalEl) modalEl.setAttribute('hidden', '');
    import('./ui-modal.js').then(mod => mod.generateShareImage({ 
      type: 'paige', 
      card, 
      template: 'tarot' // 牌灵专属：五行青典（本名五星，无拉丁符号）
    }));
  });

  document.getElementById('paigeRedrawBtn')?.addEventListener('click', () => {
    clearPaiGe();
    toast('旧牌灵已解除，可重新抽取', 2400, 'success');
    openPaiGe();
  });
}