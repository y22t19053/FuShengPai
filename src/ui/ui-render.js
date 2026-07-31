// ===== src/ui/ui-render.js · 所有页面的绘制逻辑 =====
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
import {
  UI_TEXTS, HISTORY_EMPTY, AI_GUIDE_TEXT
} from '../texts/index.js';
import { calculateDurianIndex, getDurianIcon } from '../durian.js';
import { toast } from './ui-modal.js';
import { isCardPlaced } from './ui-drag.js';
import { MODES } from '../constants.js';

export const escapeHtml = (str) => {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
};

// ===== 浮生牌使用手册（新手友好版） =====
export function renderTeachingPanel() {
  const container = document.getElementById('teachingContent');
  if (!container) return;

  container.innerHTML = `
    <div style="max-width:680px;margin:0 auto;padding:8px 0;line-height:1.9;">

      <h3 style="color:var(--accent);margin-bottom:8px;">🃏 浮生牌使用手册</h3>
      <p style="font-size:0.85rem;color:var(--dim);margin-bottom:16px;border-left:3px solid var(--accent);padding-left:10px;">
        这是一个帮助你在不确定时看清自己处境的工具。<br>它不算命，不预言，只是给你一面镜子。
      </p>

      <!-- 0 -->
      <div style="background:rgba(0,0,0,0.2);border-radius:8px;padding:12px 14px;margin-bottom:12px;">
        <h4 style="color:var(--accent);margin-bottom:6px;">在最开始</h4>
        <p style="font-size:0.8rem;color:var(--dim);">
          这里没有大师。没有人知道你的命运。没有任何牌面可以替你做决定。
        </p>
        <p style="font-size:0.8rem;color:var(--dim);margin-top:6px;">
          浮生牌做的事情很简单：提供一个观察自己处境的角度。
        </p>
        <p style="font-size:0.8rem;color:var(--dim);margin-top:6px;">
          古人创造占卜，是为了面对未知。现代人打开工具，很多时候也是因为犹豫、焦虑、不知道下一步。这很正常。但请记住：
        </p>
        <p style="font-size:0.85rem;color:var(--text);margin-top:6px;font-weight:bold;">
          镜子可以照见你，镜子不能替你走路。
        </p>
      </div>

      <!-- 1 -->
      <div style="background:rgba(0,0,0,0.2);border-radius:8px;padding:12px 14px;margin-bottom:12px;">
        <h4 style="color:var(--accent);margin-bottom:6px;">占卜的核心原则</h4>
        <ul style="font-size:0.8rem;color:var(--dim);padding-left:18px;">
          <li><strong>不是未来机器</strong>：更好的问题是“它有没有帮助我看到之前忽略的东西？”</li>
          <li><strong>不问错误的问题</strong>：别问“他一定爱我吗？”。改为“我和他之间目前存在什么问题？”</li>
          <li><strong>一件事不要无限重复问</strong>：一次问题，一次记录，等待现实反馈。</li>
          <li><strong>牌是提示，不是命令</strong>：“牌说不能去”不如“牌让我想到某个风险，我重新检查一下”。</li>
        </ul>
      </div>

      <!-- 2 -->
      <div style="background:rgba(0,0,0,0.2);border-radius:8px;padding:12px 14px;margin-bottom:12px;">
        <h4 style="color:var(--accent);margin-bottom:6px;">如何开始</h4>
        <ol style="font-size:0.8rem;color:var(--dim);padding-left:18px;">
          <li><strong>确定一个问题</strong>：越具体越好。“我该不该跳槽？”优于“我的事业怎么样”。</li>
          <li><strong>选领域</strong>：感情、事业、财运……只是为了聚焦。</li>
          <li><strong>抽牌</strong>：系统会从54张牌中随机给你体牌（代表你）和用牌（代表事情）。</li>
          <li><strong>布九宫</strong>：把剩下的牌放入九个宫位，每个宫位可以放0～3张。</li>
          <li><strong>看天机线</strong>：如果你愿意，可以选一条三连直线作为主线（起因→经过→结果）。</li>
        </ol>
      </div>

      <!-- 3 -->
      <div style="background:rgba(0,0,0,0.2);border-radius:8px;padding:12px 14px;margin-bottom:12px;">
        <h4 style="color:var(--accent);margin-bottom:6px;">九宫是什么？</h4>
        <p style="font-size:0.8rem;color:var(--dim);">
          九宫就是一张3×3的网格。在浮生牌中，每个宫位有它自己的五行属性：
        </p>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:4px;max-width:280px;margin:8px auto;font-size:0.65rem;">
          ${[4,9,2,3,5,7,8,1,6].map(g => `
            <div style="background:rgba(0,0,0,0.2);border-radius:4px;padding:4px;text-align:center;border:1px solid rgba(255,255,255,0.05);">
              <div style="font-weight:bold;color:var(--accent);">${g}</div>
              <div style="color:var(--dim);">${GONG_NAMES[g]}</div>
              <div style="color:#888;font-size:0.5rem;">${GONG_WUXING[g]}</div>
            </div>
          `).join('')}
        </div>
        <p style="font-size:0.75rem;color:var(--dim);margin-top:6px;">
          你可以把牌放进去，每个宫位最多放3张。放多少、放哪宫，都凭你的感觉。
        </p>
        <p style="font-size:0.75rem;color:var(--dim);margin-top:4px;">
          💡 有纸的话画出来会更直观，但闭上眼睛在脑中想象九宫也可以。
        </p>
      </div>

      <!-- 4 -->
      <div style="background:rgba(0,0,0,0.2);border-radius:8px;padding:12px 14px;margin-bottom:12px;">
        <h4 style="color:var(--accent);margin-bottom:6px;">天机线是什么？</h4>
        <p style="font-size:0.8rem;color:var(--dim);">
          天机线是九宫中的一条直线（横/竖/斜）。如果你选择的三个有牌宫位恰好连成一条直线，就构成了天机线。它可以帮助你梳理事情的：
        </p>
        <div style="display:flex;justify-content:center;gap:14px;margin:8px 0;font-size:0.85rem;color:var(--text);">
          <span style="color:var(--good);">起因</span>
          <span style="color:#888;">→</span>
          <span>经过</span>
          <span style="color:#888;">→</span>
          <span style="color:var(--accent);">结果</span>
        </div>
        <p style="font-size:0.75rem;color:var(--dim);">
          这并不是一个硬性规则。如果你不想选天机线，完全可以把九宫看作一个整体来观察。你可以自己决定：
        </p>
      </div>

      <!-- 5 -->
      <div style="background:rgba(0,0,0,0.2);border-radius:8px;padding:12px 14px;margin-bottom:12px;">
        <h4 style="color:var(--accent);margin-bottom:6px;">怎么解牌？</h4>
        <ol style="font-size:0.8rem;color:var(--dim);padding-left:18px;">
          <li><strong>第一层，观察</strong>：先看牌面的数字、花色、五行。感觉是什么？</li>
          <li><strong>第二层，联系宫位</strong>：这牌落在哪一宫？该宫的五行和牌的五行的关系是生还是克？</li>
          <li><strong>第三层，连接问题</strong>：最重要一步——这和你最初问的有什么关系？</li>
        </ol>
        <div style="font-size:0.7rem;color:var(--dim);margin-top:8px;background:rgba(255,255,255,0.03);padding:8px;border-radius:6px;">
          <strong>速查：</strong><br>
          牌的五行：♥火 ♦金 ♣木 ♠水；J/Q/K=土；大王=天；小王=人<br>
          生我=吉（有人帮你），同我=平（用力均衡），我生=耗（你会付出），克我=凶（有压力），我克=弱（你能掌控）
        </div>
      </div>

      <!-- 6 -->
      <div style="background:rgba(0,0,0,0.2);border-radius:8px;padding:12px 14px;margin-bottom:12px;">
        <h4 style="color:var(--accent);margin-bottom:6px;">榴莲指数是什么？</h4>
        <p style="font-size:0.8rem;color:var(--dim);">
          它不是人生难度，也不是倒霉指数。它代表这次解读可能有多“刺”。
        </p>
        <div style="display:flex;justify-content:center;gap:14px;margin:8px 0;font-size:0.85rem;">
          <span>🥭 1-3 温和</span>
          <span>🍍 4-6 有点扎</span>
          <span>🍈 7-10 准备好接受难听的话</span>
        </div>
        <p style="font-size:0.75rem;color:var(--dim);">
          榴莲指数高，不代表坏。有时候难听的话比好听的话更有价值。
        </p>
      </div>

      <!-- 7 -->
      <div style="background:rgba(0,0,0,0.2);border-radius:8px;padding:12px 14px;margin-bottom:12px;">
        <h4 style="color:var(--accent);margin-bottom:6px;">基本规则</h4>
        <ul style="font-size:0.8rem;color:var(--dim);padding-left:18px;">
          <li><strong>不测生死</strong>：涉及死亡、重病的问题请寻求专业帮助。</li>
          <li><strong>不窥探他人</strong>：不要占卜“他是不是出轨了”。未经允许的窥探没有意义。</li>
          <li><strong>不替代专业意见</strong>：身体问题找医生，法律问题找律师，投资问题做研究。</li>
          <li><strong>不制造依赖</strong>：如果你发现自己每天必须占卜才能行动，那该暂停一下了。</li>
        </ul>
      </div>

      <!-- 8 -->
      <div style="background:rgba(0,0,0,0.15);border-radius:8px;padding:12px 14px;">
        <h4 style="color:var(--accent);margin-bottom:6px;">最后</h4>
        <p style="font-size:0.8rem;color:var(--dim);">
          浮生牌不认为人生可以被评分，不认为代码可以替代智慧，不认为一副牌可以决定你的命运。
        </p>
        <p style="font-size:0.8rem;color:var(--dim);margin-top:6px;">
          我们只是制作了一面镜子。镜子可能有灰尘，可能有裂纹，但它仍然可以帮助你看见一些东西。
        </p>
      </div>

    </div>
  `;
}

// ===== 牌堆渲染 =====
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
    if (rel) {
      badge = `<span class="relation-badge ${rel === '生我' ? 'good' : rel === '克我' ? 'bad' : ''}">${rel} ${getShengKeLabel(rel)}</span>`;
    }
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
    const isOnLine = state.line && state.line.includes(g);
    if (isOnLine) cls = 'confirmed';

    let inner = `
      <span class="num">${g}</span>
      <span class="name">${GONG_NAMES[g]}</span>
      <span class="wx">${GONG_WUXING[g]}</span>
    `;

    if (cards.length) {
      inner += '<div class="card-stack">';
      cards.forEach(c => {
        inner += `<div class="mini-card ${getCardColor(c)}">${c.isJoker ? c.type : c.rank}${c.isJoker ? '' : c.suit}</div>`;
      });
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

  // 天机线引导（仅提示，不强制）
  const lineGuide = document.getElementById('lineGuide');
  const filledGongs = Object.keys(state.grid).filter(g => state.grid[g] && state.grid[g].length > 0).map(Number);
  if (filledGongs.length >= 3) {
    const possibleLines = state.possible || [];
    if (possibleLines.length > 0 && !state.line) {
      if (!lineGuide) {
        const guide = document.createElement('div');
        guide.id = 'lineGuide';
        guide.style.cssText = 'margin-top:8px;padding:10px 12px;background:rgba(201,160,96,0.08);border-radius:6px;font-size:0.8rem;color:var(--accent);'; 
        guide.innerHTML = `✨ 检测到可连成天机线。如果你想选一条，点击下方按钮；不想选也没关系，牌局照样有效。`;
        el.parentNode.insertBefore(guide, el.nextSibling);
      }
    } else {
      if (lineGuide) lineGuide.remove();
    }
  } else {
    if (lineGuide) lineGuide.remove();
  }

  if (Object.keys(state.grid).length > 0) {
    renderTensionMap(el);
  }
}

function getRecommendedGong(intent) {
  const map = {
    '财运': 2, '感情': 7, '事业': 6, '健康': 8,
    '学业': 4, '决策': 5, '人际关系': 7, '家宅': 8,
    '运势': 9, '寻物': 1, '官非': 3, '出行': 3,
    '灵异': 1, '技能': 4
  };
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
        const bg = intensity < 20 ? 'rgba(76,175,80,0.2)' :
                   intensity < 40 ? 'rgba(139,195,74,0.4)' :
                   intensity < 60 ? 'rgba(255,193,7,0.6)' :
                   intensity < 80 ? 'rgba(255,152,0,0.8)' : 'rgba(244,67,54,0.9)';
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

// ===== 滚动按钮绑定 =====
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
          <span style="color:${result.score < 3 ? '#4CAF50' : result.score < 5 ? '#8BC34A' : result.score < 7 ? '#FFC107' : result.score < 9 ? '#FF9800' : '#F44336'};font-size:0.75rem;">
            （${result.level}）
          </span>
        </div>
        <div style="font-size:0.7rem;color:var(--dim);">${result.description}</div>
      </div>
    </div>
  `;
}

// ===== Step1：首页 =====
export function renderStep1() {
  const today = new Date().toDateString();
  const storedDate = localStorage.getItem('fs_todays_sign_date');
  const storedSign = localStorage.getItem('fs_todays_sign');
  let sign = null;
  if (storedDate === today && storedSign) {
    try { sign = JSON.parse(storedSign); } catch(e) {}
  }

  let dailyHTML = `<div style="color:var(--dim);font-size:0.85rem;">今日状态</div>`;
  if (sign) {
    const colorCls = getCardColor(sign);
    const rank = sign.isJoker ? sign.type : sign.rank;
    const suit = sign.isJoker ? '' : sign.suit;
    dailyHTML += `
      <div class="card-face-small ${colorCls}" style="margin:8px auto;width:60px;height:84px;display:flex;align-items:center;justify-content:center;flex-direction:column;border-radius:6px;border:1px solid rgba(255,255,255,0.1);background:rgba(0,0,0,0.3);">
        <span class="rank" style="font-size:1.6rem;font-weight:bold;">${rank}</span>
        <span class="suit" style="font-size:1rem;">${suit}</span>
      </div>
      <div style="font-size:0.8rem;color:#aaa;margin-bottom:4px;">${sign.quote || '静观其变'}</div>
      <button data-action="dailyFortune" class="small outline">重新抽牌</button>
    `;
  } else {
    dailyHTML += `
      <div style="font-size:1.2rem;color:var(--accent);margin:8px 0;">待观测</div>
      <button data-action="dailyFortune" class="small outline">获取今日状态</button>
    `;
  }

  const core = document.getElementById('coreArea');
  if (!core) return;
  core.innerHTML = `
    <div id="dailySignCard" style="margin-bottom:16px;background:rgba(255,255,255,0.02);border-radius:8px;padding:16px;text-align:center;border:1px solid rgba(255,255,255,0.05);">${dailyHTML}</div>
    <h3 style="margin-top:0;">${UI_TEXTS.step1}</h3>
    <div style="font-size:0.75rem;color:var(--dim);margin-bottom:8px;">默念一个问题，选择一个领域，然后开始。</div>
    <input type="text" id="questionInput" placeholder="${UI_TEXTS.placeholderQuestion}" autocomplete="off" value="${escapeHtml(state.question)}">
    <div class="category-grid">${CATEGORIES.map(c => `<button data-action="selectCategory" data-category="${c}" class="${state.category === c ? 'selected' : ''}">${c}</button>`).join('')}</div>
    <div class="btn-row">
      <button data-action="confirmQuestion" class="primary">${UI_TEXTS.btnStartDraw}</button>
      <button data-action="lazyStart" class="outline">${UI_TEXTS.btnLazy}</button>
    </div>
    <div class="import-row">
      <input type="text" id="importCode" placeholder="${UI_TEXTS.placeholderImport}" autocomplete="off">
      <button data-action="importCode" class="small outline">${UI_TEXTS.btnImport}</button>
      <button data-action="dailyFortune" class="small outline">${UI_TEXTS.btnDailyFortune}</button>
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
        每个宫位最多3张牌。放多少、放哪宫，凭你的直觉。也可以留空。
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

// ===== Step3：结果 =====
export function renderStep3(text) {
  const aiSettings = getApiSettings();
  const hasKey = aiSettings && aiSettings.apiKey;
  const result = document.getElementById('resultArea');
  if (!result) return;

  result.innerHTML = `
    <h3>${UI_TEXTS.step3}</h3>
    <div id="durianDisplay" style="margin-bottom:8px;"></div>
    <div class="result-block" id="interpretText">${text.replace(/\n/g, '<br>')}</div>
    <div class="btn-row">
      <button data-action="copyLocal" class="small">${UI_TEXTS.btnCopy}</button>
      <button id="copyPromptBtn" class="small outline" style="font-size:0.6rem;">📋 复制提示词</button>
      <button data-action="shareImage" class="outline small">${UI_TEXTS.btnShareImage}</button>
      <button data-action="shareCode" class="outline small">${UI_TEXTS.btnShareCode}</button>
      <button data-action="exportData" class="outline small">完整数据</button>
      <button data-action="timeCapsule" class="outline small">📦 胶囊</button>
      <button id="aiReadBtn" data-action="triggerAI" class="primary small">${hasKey ? 'AI 深度解读' : '✨ 接入 AI 深度解读'}</button>
      <button data-action="resetAll" class="small">${UI_TEXTS.btnNewQuestion}</button>
    </div>
    <div class="ai-guide-card" style="font-size:0.6rem;color:var(--dim);text-align:center;padding:4px 0;">${AI_GUIDE_TEXT}</div>
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
      () => toast('✅ 提示词已复制，可粘贴到任何 AI 工具使用'),
      () => toast('复制失败')
    );
  });
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