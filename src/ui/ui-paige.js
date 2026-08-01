// ===== src/ui/ui-paige.js · 牌格卡（巨型扑克牌风格·人生课题） =====
import { state } from '../state.js';
import { createDeck, shuffle } from '../engine.js';
import { getCardColor, getWuxing } from '../data.js';
import { getPaiGeQuestion, PAIGE_HASHTAGS } from '../texts/social.js';
import { toast } from './ui-modal.js';
import { escapeForHTML, setHTML } from '../utils/safe.js';

// ---------- 存储（独立key，不依赖storage.js内部结构） ----------
const STORAGE_KEY = 'fsp_paige';
const HISTORY_KEY = 'fsp_history'; // 与storage.js中history的key保持一致
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
  return data;
}

export function clearPaiGe() {
  localStorage.removeItem(STORAGE_KEY);
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
    unlocked: readings >= UNLOCK_THRESHOLD,
    readings,
    threshold: UNLOCK_THRESHOLD,
    stored,
  };
}

// ---------- 入口 ----------
export function openPaiGe() {
  const status = getPaiGeUnlockStatus();
  const modal = document.getElementById('modal');
  const content = document.getElementById('modalContent');
  if (!modal || !content) { toast('弹窗未就绪'); return; }

  if (!status.hasStored) {
    showPaiGeDraw(modal, content);
  } else {
    showPaiGeDetail(modal, content, status);
  }
}

// ---------- 抽牌界面 ----------
function showPaiGeDraw(modal, content) {
  const deck = shuffle(createDeck(true));
  state.pendingPaiGeDeck = deck;

  const html = `
    <div style="text-align:center;"> 
      <h3 style="color:var(--accent);">🃏 抽取你的牌格</h3>
      <p style="font-size:0.8rem;color:var(--dim);margin:8px 0 16px;">
        凭直觉选一张——它将揭示你未完成的人生课题。<br>
        <span style="color:#d45050;font-size:0.7rem;">⚠️ 抽取后锁定，需完成至少 ${UNLOCK_THRESHOLD} 次真正占卜才可重抽。</span>
      </p>
      <div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;max-height:300px;overflow-y:auto;padding:8px;">
        ${deck.map((c, idx) => {
          const rank = c.isJoker ? (c.type === '大王' ? 'JOKER' : 'joker') : c.rank;
          const suit = c.isJoker ? '' : c.suit;
          const color = getCardColor(c);
          const wx = getWuxing(c);
          return `<button data-paige-card-idx="${idx}" style="
            background:rgba(255,255,255,0.1);
            border:1px solid var(--border);
            border-radius:8px;
            width:52px;height:74px;
            font-size:0.8rem;
            font-weight:bold;
            color:${color === 'red' ? '#e74c3c' : color === 'gold' ? '#f1c40f' : '#ecf0f1'};
            cursor:pointer;
            display:flex;flex-direction:column;
            align-items:center;justify-content:center;
            gap:2px;
            transition:transform 0.1s;
          " onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
            <span>${escapeForHTML(rank)}${escapeForHTML(suit)}</span>
            <span style="font-size:0.5rem;color:var(--dim);">${escapeForHTML(wx)}</span>
          </button>`;
        }).join('')}
      </div>
      <div style="margin-top:12px;">
        <button id="paigeRandomBtn" class="outline small">🎲 随机抽一张</button>
        <button data-action="closeModal" class="outline small">算了</button>
      </div>
    </div>
  `;
  setHTML(content, html);
  modal.removeAttribute('hidden');

  content.querySelectorAll('[data-paige-card-idx]').forEach(btn => {
    btn.addEventListener('click', function() {
      const card = deck[parseInt(this.dataset.paigeCardIdx)];
      confirmPaiGePick(card);
    });
  });

  document.getElementById('paigeRandomBtn')?.addEventListener('click', () => {
    const card = deck[Math.floor(Math.random() * deck.length)];
    confirmPaiGePick(card);
  });
}

// ---------- 确认抽取 ----------
export function confirmPaiGePick(card) {
  if (!card) return;
  savePaiGe(card);
  toast('🔒 牌格已锁定——这是你此刻的人生课题');
  openPaiGe();
}

// ---------- 详情界面 ----------
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
    actionHTML = `<span style="font-size:0.7rem;color:var(--dim);">🔒 需完成至少 ${status.threshold} 次真正占卜才可重抽<br>（当前 ${status.readings} 次）</span>`;
  }

  const html = `
    <div style="text-align:center;">
      <div style="font-size:0.7rem;color:var(--dim);margin-bottom:4px;">你的牌格 · 人生课题</div>
      
      <div style="
        width:120px;height:170px;
        background:rgba(255,255,255,0.05);
        border:2px solid var(--border);
        border-radius:12px;
        margin:12px auto;
        display:flex;
        flex-direction:column;
        align-items:center;
        justify-content:center;
        gap:4px;
        box-shadow:0 4px 20px rgba(0,0,0,0.3);
      ">
        <span style="font-size:2.4rem;font-weight:bold;color:${colorText};">${escapeForHTML(rank)}${escapeForHTML(suit)}</span>
        <span style="font-size:0.7rem;color:var(--accent);">${escapeForHTML(question?.title || '')}</span>
      </div>

      <div style="font-size:1.2rem;font-weight:bold;color:var(--text);margin:8px 0;">${escapeForHTML(question?.title || '')}</div>
      <div style="font-size:0.9rem;color:var(--dim);line-height:1.8;padding:0 12px;white-space:pre-wrap;">“${escapeForHTML(question?.question || '')}”</div>

      <div style="display:flex;gap:4px;justify-content:center;margin:10px 0;">
        ${(question?.keywords || []).map(kw => `<span style="font-size:0.7rem;background:rgba(201,160,96,0.15);border:1px solid rgba(201,160,96,0.3);border-radius:12px;padding:4px 10px;color:var(--accent);">${escapeForHTML(kw)}</span>`).join('')}
      </div>

      <p style="font-size:0.65rem;color:var(--dim);">抽于 ${new Date(stored.drawnAt).toLocaleString()}</p>

      <div class="btn-row">
        <button id="paigeShareBtn" class="primary small">🃏 生成牌格分享图</button>
        <button data-action="closeModal" class="outline small">关闭</button>
      </div>
      <div style="margin-top:8px;">${actionHTML}</div>
    </div>
  `;
  setHTML(content, html);
  modal.removeAttribute('hidden');

  document.getElementById('paigeShareBtn')?.addEventListener('click', () => {
    import('./ui-modal.js').then(m => m.generateShareImage({ type: 'paige', card }));
  });

  document.getElementById('paigeRedrawBtn')?.addEventListener('click', () => {
    clearPaiGe();
    toast('旧牌格已解除，可重新抽取');
    openPaiGe();
  });
}

// ---------- 首页按钮状态 ----------
export function getPaiGeBtnInfo() {
  const status = getPaiGeUnlockStatus();
  if (!status.hasStored) return { text: '🃏 抽牌格', action: 'openPaiGe' };
  if (status.unlocked) return { text: '🔄 牌格 · 重抽', action: 'openPaiGe' };
  return { text: '🔒 牌格 · 查看', action: 'openPaiGe' };
}