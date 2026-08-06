// ===== src/mahjong-ui.js · 麻将占卜（老牌馆：绿呢桌面 · 摸牌手势 · 说书人读牌） =====
// 仪式流程：问事 → 砌牌（136 洗牌砌成牌墙，绿呢桌面，洗牌声）→ 摸牌（点牌即开，逐张翻，
// 竹/骨/玉三种牌声各应一张）→ 读牌（五段判词，说书人语气）→ 收牌（「牌已定，事在人。
// 明日再来摸一张。」——送客词）。
// 双体系：扑克/麻将并存，用户在首页自行切换（fsp_system），互不干扰、可交叉验证。

import {
  buildWall, drawFromWall, composeReading, composeDailyReading, tileName,
} from './mahjong.js';
import { escapeForHTML, setHTML } from './utils/safe.js';
import {
  playWashSound, playMoPaiSound, playKaiPaiSound, playJokerSound, playClosingSound,
} from './utils/sound.js';

const SYS_KEY = 'fsp_system';
const MJ_DAILY_KEY = 'fsp_mj_daily';

/** 占卜体系：'poker' | 'mahjong'（用户自选，丝滑切换） */
export function getSystem() {
  try { return localStorage.getItem(SYS_KEY) === 'mahjong' ? 'mahjong' : 'poker'; }
  catch { return 'poker'; }
}

export function setSystem(sys) {
  try { localStorage.setItem(SYS_KEY, sys); } catch { /* ignore */ }
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getModal() {
  return {
    modal: document.getElementById('modal'),
    content: document.getElementById('modalContent'),
  };
}

// ---------- 牌面渲染 ----------

/** 花色色板：万/筒/风/中=朱砂，条/发=鼠尾草绿；白板=雾蓝空框 */
const SUIT_COLOR = {
  'wan':   '#c96f52',
  'tiao':  '#5c8a7a',
  'tong':  '#c96f52',
  'feng':  '#c96f52',
  'jian1': '#c96f52',
  'jian2': '#5c8a7a',
};
const WHITE_BOARD = '#8fb0c3';

/** 筒子点数布局（传统骰点：6=3+3，7=3+1+3，8=3+2+3，9=3+3+3） */
const DOT_LAYOUT = {
  1: [[50, 50]],
  2: [[38, 38], [62, 62]],
  3: [[38, 36], [50, 50], [62, 64]],
  4: [[38, 38], [62, 38], [38, 62], [62, 62]],
  5: [[38, 38], [62, 38], [50, 50], [38, 62], [62, 62]],
  6: [[38, 28], [62, 28], [38, 50], [62, 50], [38, 72], [62, 72]],
  7: [[38, 30], [62, 30], [50, 50], [38, 50], [62, 50], [38, 70], [62, 70]],
  8: [[38, 28], [62, 28], [50, 42], [50, 58], [38, 50], [62, 50], [38, 72], [62, 72]],
  9: [[38, 28], [50, 28], [62, 28], [38, 50], [50, 50], [62, 50], [38, 72], [50, 72], [62, 72]],
};

/** 条子竹棍布局（三列码棍：4=2+2，5=2+1+2，6=3+3，7=2+2+3，8=3+2+3，9=3+3+3） */
const STICK_LAYOUT = {
  2: [[36, 38], [64, 62]],
  3: [[36, 36], [50, 50], [64, 64]],
  4: [[36, 38], [64, 38], [36, 62], [64, 62]],
  5: [[36, 36], [64, 36], [36, 64], [64, 64], [50, 50]],
  6: [[36, 36], [64, 36], [36, 50], [64, 50], [36, 64], [64, 64]],
  7: [[36, 36], [64, 36], [36, 50], [64, 50], [36, 64], [64, 64], [50, 50]],
  8: [[36, 36], [64, 36], [36, 50], [64, 50], [36, 64], [64, 64], [50, 36], [50, 64]],
  9: [[36, 36], [64, 36], [36, 50], [64, 50], [36, 64], [64, 64], [50, 36], [50, 50], [50, 64]],
};

/** 一枚筒子（朱砂钱币圈，白心高光） */
const dotSVG = (cx, cy) =>
  `<circle cx="${cx}" cy="${cy}" r="8" fill="#c96f52"/><circle cx="${cx}" cy="${cy}" r="5.4" fill="#fdfaf1" opacity="0.92"/>`;

/** 一条竹棍（鼠尾草绿竹 + 三节雾蓝结） */
function bambooStickSVG(cx, cy) {
  return `
    <rect x="${cx - 4.5}" y="${cy - 19}" width="9" height="38" rx="4.5" fill="#5c8a7a"/>
    <circle cx="${cx}" cy="${cy - 8}" r="2.6" fill="#7ba0b8"/>
    <circle cx="${cx}" cy="${cy + 4}" r="2.6" fill="#7ba0b8"/>
    <circle cx="${cx}" cy="${cy + 12}" r="2" fill="#7ba0b8"/>`;
}

/** 幺鸡：简笔鸟（身体+头+喙+尾+腿） */
function jiBirdSVG() {
  return `
    <ellipse cx="47" cy="60" rx="13" ry="11" fill="#5c8a7a"/>
    <circle cx="58" cy="44" r="8" fill="#5c8a7a"/>
    <path d="M65 43 L73 41 L65 48 Z" fill="#c96f52"/>
    <circle cx="60" cy="42" r="1.8" fill="#fdfaf1"/>
    <path d="M34 56 q-8 4 -14 2 M34 62 q-7 6 -12 10" stroke="#5c8a7a" stroke-width="2.6" stroke-linecap="round" fill="none"/>
    <path d="M42 70 l-3 10 M52 70 l-2 10" stroke="#c96f52" stroke-width="2.4" stroke-linecap="round"/>
    <circle cx="45" cy="33" r="2" fill="#7ba0b8"/>`;
}

/**
 * 单张牌面（真实牌型：筒=钱币圈、条=竹棍/幺鸡、万/字=汉字、白板=空框）
 * 全 SVG/CSS 绘制，dom-to-image 截图零依赖；尺寸按 1:1.4 缩放。
 */
function tileFaceHTML(tile, size = 54) {
  const name = tileName(tile);
  const color = SUIT_COLOR[tile.suit === 'jian' ? `jian${tile.num}` : tile.suit] || 'var(--text)';
  const style = `width:${size}px;height:${Math.round(size * 1.4)}px;`;

  // 筒子：钱币圈点数
  if (tile.suit === 'tong') {
    const dots = (DOT_LAYOUT[tile.num] || DOT_LAYOUT[1]).map(([cx, cy]) => dotSVG(cx, cy)).join('');
    return `
      <div class="mj-tile-face" style="${style}">
        <svg viewBox="0 0 100 140" style="width:100%;height:100%;" aria-hidden="true">${dots}</svg>
      </div>`;
  }

  // 条子：竹棍点数（幺鸡=简笔鸟）
  if (tile.suit === 'tiao') {
    const body = tile.num === 1
      ? jiBirdSVG()
      : (STICK_LAYOUT[tile.num] || []).map(([cx, cy]) => bambooStickSVG(cx, cy)).join('');
    return `
      <div class="mj-tile-face" style="${style}">
        <svg viewBox="0 0 100 140" style="width:100%;height:100%;" aria-hidden="true">${body}</svg>
      </div>`;
  }

  // 白板：雾蓝空框
  if (tile.suit === 'jian' && tile.num === 3) {
    return `
      <div class="mj-tile-face" style="${style}">
        <svg viewBox="0 0 100 140" style="width:100%;height:100%;" aria-hidden="true">
          <rect x="31" y="26" width="38" height="88" rx="9" fill="none" stroke="${WHITE_BOARD}" stroke-width="4.5"/>
          <rect x="39" y="34" width="22" height="72" rx="6" fill="none" stroke="${WHITE_BOARD}" stroke-width="2.4" opacity="0.65"/>
        </svg>
      </div>`;
  }

  // 万子 / 字牌：汉字牌面（万字：大数字 + 小「万」；字牌：单字居中）
  const big = name;
  const small = tile.suit === 'wan' ? '万' : '';
  return `
    <div class="mj-tile-face" style="${style}">
      <span class="mj-tile-num" style="font-size:${Math.round(size * 0.46)}px;color:${color};">${escapeForHTML(big)}</span>
      ${small ? `<span class="mj-tile-suit" style="color:${color};font-size:${Math.round(size * 0.16)}px;">${escapeForHTML(small)}</span>` : ''}
    </div>`;
}

/** 牌背（绿呢面上的墨绿牌背，四边留码牌虚线） */
function tileBackHTML(idx, label) {
  return `
    <div class="mj-tile-back" data-mj-idx="${idx}" style="width:64px;height:90px;">
      <span class="mj-tile-label">${escapeForHTML(label)}</span>
    </div>`;
}

// ---------- 摸牌手势：点牌即开 ----------

function bindTapToFlip(el, { locked, onFire, hint }) {
  const onDown = (e) => {
    if (locked()) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    el.classList.add('mj-holding');
    if (hint) hint.textContent = '想好了，就翻。';
    if (navigator.vibrate) navigator.vibrate(20);
  };
  const onUp = (e) => {
    if (locked()) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    el.classList.remove('mj-holding');
    playMoPaiSound(); // 摸牌一声轻竹
    onFire();
  };
  el.addEventListener('pointerdown', onDown);
  el.addEventListener('pointerup', onUp);
  el.addEventListener('pointercancel', () => el.classList.remove('mj-holding'));
}

// ---------- 读牌：五段判词（说书人） ----------

function readingHTML(r) {
  const partsHTML = r.parts.map(p => `
    <div style="display:flex;gap:10px;align-items:center;padding:10px 0;border-bottom:1px dashed var(--line-faint);">
      ${tileFaceHTML(p.tile, 44)}
      <div style="flex:1;min-width:0;">
        <div style="font-size:0.72rem;color:var(--accent);font-weight:700;">
          ${escapeForHTML(p.position.name)} · ${escapeForHTML(p.position.label)}
          <span style="color:var(--dim);font-weight:400;">（${escapeForHTML(p.name)} · ${escapeForHTML(p.domain)}）</span>
        </div>
        <div style="font-size:0.85rem;color:var(--text);margin:3px 0;">${escapeForHTML(p.meaning)}</div>
        <div style="font-size:0.7rem;color:var(--dim);">宜：${escapeForHTML(p.yi)}　忌：${escapeForHTML(p.ji)}</div>
      </div>
    </div>`).join('');

  const heavenBadge = r.heaven
    ? `<div class="mj-heaven" style="margin:8px auto 2px;">⚡ 天命时刻 · ${escapeForHTML(r.odds)}</div>`
    : `<div style="text-align:center;font-size:0.62rem;color:var(--ink-faint);margin-top:6px;">（${escapeForHTML(r.odds)}）</div>`;

  return `
    <div style="text-align:center;">
      <div class="bamboo-rail" style="margin:4px auto 10px;width:70%;"></div>
      <div style="font-size:1.05rem;font-weight:700;color:var(--text);">
        <span style="color:var(--accent);">${escapeForHTML(r.patternName)}</span>　${escapeForHTML(r.patternText)}
      </div>
      ${heavenBadge}
      <div style="text-align:left;margin:10px 0;">${partsHTML}</div>
      <div style="font-size:0.95rem;color:var(--text);font-weight:600;margin:12px 0 4px;">${escapeForHTML(r.advice)}</div>
      <div class="closing-line" style="font-size:0.85rem;color:var(--accent);font-style:italic;margin:8px 0 12px;">${escapeForHTML(r.closing)}</div>
      <div class="btn-row">
        <button id="mjAgainBtn" class="primary small">🀄 再摸一局</button>
        <button data-action="closeModal" class="outline small">收牌</button>
      </div>
      <div style="font-size:0.62rem;color:var(--ink-faint);margin-top:8px;">老牌馆 · 竹/骨/玉三材牌 · 只存本机</div>
    </div>`;
}

// ---------- 一局摸三张：天/地/人 ----------

const POS_LABELS = [
  { label: '天 · 时运', material: 'bamboo' },
  { label: '地 · 环境', material: 'bone' },
  { label: '人 · 行动', material: 'jade' },
];

export function openMahjongDraw() {
  const { modal, content } = getModal();
  if (!modal || !content) return;

  const { drawn, wall } = drawFromWall(buildWall(), 3);
  const lockedFlag = { on: false };

  const html = `
    <div style="text-align:center;">
      <h3 style="color:var(--accent);">🀄 摸三张 · 天/地/人</h3>
      <p id="mjHint" style="font-size:0.8rem;color:var(--dim);margin:6px 0 12px;">
        默念一件事。点牌即开，逐张翻。<br>
        左起第一张为天，二为地，三为人。
      </p>
      <div class="felt-table" style="padding:20px 14px 16px;">
        <div style="display:flex;gap:16px;justify-content:center;">
          ${drawn.map((_, i) => tileBackHTML(i, POS_LABELS[i].label)).join('')}
        </div>
        <div style="font-size:0.6rem;color:rgba(231,236,228,0.35);margin-top:12px;">
          牌墙余 ${wall.length} 张 · 三材牌：竹 · 骨 · 玉
        </div>
      </div>
      <div style="margin-top:12px;">
        <button data-action="closeModal" class="outline small">收牌</button>
      </div>
    </div>
  `;
  setHTML(content, html);
  modal.removeAttribute('hidden');

  playWashSound(); // 砌牌：洗牌声

  const hint = document.getElementById('mjHint');
  const tiles = drawn;
  let flippedCount = 0;
  const backs = content.querySelectorAll('.mj-tile-back');

  backs.forEach((el, i) => {
    bindTapToFlip(el, {
      locked: () => lockedFlag.on,
      hint,
      onFire: () => {
        if (lockedFlag.on) return;
        // 开牌：竹/骨/玉各应一张
        playKaiPaiSound(POS_LABELS[i].material);
        const tile = tiles[i];
        el.outerHTML = `<div style="animation:dealIn 0.4s var(--ease);">${tileFaceHTML(tile, 64)}</div>`;
        flippedCount += 1;
        if (flippedCount === 3) {
          lockedFlag.on = true;
          const reading = composeReading(tiles);
          if (reading.heaven) {
            playJokerSound(); // 天命时刻：自摸/三元——整局唯一允许「多」的位置
          }
          setTimeout(() => {
            setHTML(content, readingHTML(reading));
            playClosingSound(); // 收牌：送客
            document.getElementById('mjAgainBtn')?.addEventListener('click', () => openMahjongDraw());
          }, 900);
        } else {
          if (hint) hint.textContent = `摸稳了 ${flippedCount} 张，再摸下一张…`;
        }
      },
    });
  });
}

// ---------- 今日手气（单张版，每日一张） ----------

export function openMahjongDaily() {
  const { modal, content } = getModal();
  if (!modal || !content) return;

  // 今日已摸过 → 直接出示，不再重摸（每日只问一次）
  let stored = null;
  try {
    const raw = localStorage.getItem(MJ_DAILY_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed && parsed.date === todayKey()) stored = parsed;
  } catch { /* ignore */ }

  if (stored) {
    const r = composeDailyReading(stored.tile);
    const html = dailyReadingHTML(r, true);
    setHTML(content, html);
    modal.removeAttribute('hidden');
    document.getElementById('mjDailyDone')?.addEventListener('click', () => openMahjongDraw());
    return;
  }

  const { drawn } = drawFromWall(buildWall(), 1);
  const tile = drawn[0];

  const html = `
    <div style="text-align:center;">
      <h3 style="color:var(--accent);">🀄 今日手气</h3>
      <p id="mjDailyHint" style="font-size:0.8rem;color:var(--dim);margin:6px 0 12px;">
        每日一张，摸完即定。点牌即开。
      </p>
      <div class="felt-table" style="padding:26px 14px;">
        <div style="display:flex;justify-content:center;" id="mjDailyBack">
          ${tileBackHTML(0, '今日一牌')}
        </div>
      </div>
      <div style="margin-top:12px;">
        <button data-action="closeModal" class="outline small">收牌</button>
      </div>
    </div>
  `;
  setHTML(content, html);
  modal.removeAttribute('hidden');

  playWashSound();

  const hint = document.getElementById('mjDailyHint');
  const back = content.querySelector('.mj-tile-back');
  let done = false;

  bindTapToFlip(back, {
    locked: () => done,
    hint,
    onFire: () => {
      if (done) return;
      done = true;
      playKaiPaiSound('jade'); // 每日一牌：玉声（亮、有余韵）
      back.outerHTML = `<div style="animation:dealIn 0.4s var(--ease);">${tileFaceHTML(tile, 64)}</div>`;
      const r = composeDailyReading(tile);
      try {
        localStorage.setItem(MJ_DAILY_KEY, JSON.stringify({ date: todayKey(), tile, drawnAt: Date.now() }));
      } catch { /* ignore */ }
      setTimeout(() => {
        setHTML(content, dailyReadingHTML(r, false));
        playClosingSound();
        document.getElementById('mjDailyDone')?.addEventListener('click', () => openMahjongDraw());
      }, 900);
    },
  });
}

function dailyReadingHTML(r, alreadyDrawn) {
  return `
    <div style="text-align:center;">
      <div class="bamboo-rail" style="margin:4px auto 10px;width:70%;"></div>
      <div style="font-size:0.72rem;color:var(--dim);">
        ${alreadyDrawn ? '今日已摸过' : '今日手气'} · ${escapeForHTML(r.name)} · ${escapeForHTML(r.domain)}
      </div>
      <div style="margin:10px 0;">${tileFaceHTML(r.tile, 64)}</div>
      <div style="font-size:0.9rem;color:var(--text);line-height:1.8;padding:0 12px;">${escapeForHTML(r.meaning)}</div>
      <div style="font-size:0.85rem;color:var(--cinnabar,#c96f52);font-weight:600;margin:10px 0 4px;">${escapeForHTML(r.verdict)}</div>
      <div style="font-size:0.8rem;color:var(--accent);margin:4px 0;">🧭 财神方位：${escapeForHTML(r.direction)}</div>
      <div style="font-size:0.78rem;color:var(--dim);margin:8px 0;">宜：${escapeForHTML(r.yi)}　忌：${escapeForHTML(r.ji)}</div>
      <div class="closing-line" style="font-size:0.85rem;color:var(--accent);font-style:italic;margin:10px 0 12px;">牌已定，事在人。明日再来摸一张。</div>
      <div class="btn-row">
        <button id="mjDailyDone" class="primary small">🀄 摸一局三张</button>
        <button data-action="closeModal" class="outline small">收牌</button>
      </div>
    </div>`;
}
