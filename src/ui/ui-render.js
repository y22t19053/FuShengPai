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

// ===== 详细新手教程（不覆盖主界面，只嵌入面板） =====
export function renderTeachingPanel() {
  const container = document.getElementById('teachingContent');
  if (!container) return;

  container.innerHTML = `
    <div style="max-width:600px;margin:0 auto;padding:8px 0;">

      <h3 style="color:var(--accent);margin-bottom:12px;">📖 浮生牌·完整入门教程</h3>
      <p style="font-size:0.9rem;color:var(--dim);margin-bottom:16px;">
        这个教程会让一个完全没接触过占卜的新手，也能拿一副普通扑克牌在现实中独立完成一次观测。
      </p>

      <!-- ① 准备阶段 -->
      <div style="background:rgba(0,0,0,0.2);border-radius:8px;padding:12px 14px;margin-bottom:12px;">
        <h4 style="color:var(--accent);margin-bottom:8px;">① 准备阶段</h4>
        <ol style="font-size:0.8rem;color:var(--dim);line-height:1.8;padding-left:18px;">
          <li><strong>找到一副扑克牌</strong>（去掉大小王，共52张）。</li>
          <li><strong>找一个安静的环境</strong>，放下手机，深呼吸三次。</li>
          <li><strong>想清楚你要问的问题</strong>。比如“我该不该跳槽？”而不是“我今年运势如何”。</li>
          <li><strong>选择领域</strong>：感情、事业、财运、健康等（有助于系统更聚焦地解读）。</li>
        </ol>
      </div>

      <!-- ② 起念 -->
      <div style="background:rgba(0,0,0,0.2);border-radius:8px;padding:12px 14px;margin-bottom:12px;">
        <h4 style="color:var(--accent);margin-bottom:8px;">② 起念（安静下来）</h4>
        <ol style="font-size:0.8rem;color:var(--dim);line-height:1.8;padding-left:18px;">
          <li>把牌放在面前，双手轻按牌背。</li>
          <li>心里默念你的问题，注意：不要出声，也不要怀疑。</li>
          <li>如果你现在脑子里一片混乱，就先深呼吸 10 次，等念头清晰了再开始。</li>
          <li>确认自己已经准备好，再进入下一步。</li>
        </ol>
        <div style="background:rgba(201,160,96,0.08);border-radius:4px;padding:6px 8px;font-size:0.7rem;color:var(--accent);margin-top:6px;">
          💡 问题越具体，答案越清晰。我们强烈建议你说出一个明确的问题，而不是“随便看看”。
        </div>
      </div>

      <!-- ③ 立极（体与用） -->
      <div style="background:rgba(0,0,0,0.2);border-radius:8px;padding:12px 14px;margin-bottom:12px;">
        <h4 style="color:var(--accent);margin-bottom:8px;">③ 立极（选出代表你和事情的牌）</h4>
        <p style="font-size:0.8rem;color:var(--dim);margin-bottom:8px;">
          在浮生牌里，<strong>“体”代表你自己，“用”代表你问的事情</strong>。这是整个占卜的基石。
        </p>
        <ol style="font-size:0.8rem;color:var(--dim);line-height:1.8;padding-left:18px;">
          <li>洗牌，感受牌背的触感。</li>
          <li>当你觉得可以了，把牌摊开在桌面上（牌背朝上）。</li>
          <li>当你内心感觉有一张牌在“召唤”你时，抽出它，这就是你的<strong>体牌</strong>（代表你现在的状态）。</li>
          <li>不要犹豫，再从剩下的牌中抽出第二张，这就是你的<strong>用牌</strong>（代表你问的事情的状态）。</li>
          <li>记住这两张牌的数字和花色。</li>
        </ol>
      </div>

      <!-- ④ 布阵（九宫格） -->
      <div style="background:rgba(0,0,0,0.2);border-radius:8px;padding:12px 14px;margin-bottom:12px;">
        <h4 style="color:var(--accent);margin-bottom:8px;">④ 布阵（把剩下的牌放进九宫格）</h4>
        <ol style="font-size:0.8rem;color:var(--dim);line-height:1.8;padding-left:18px;">
          <li>在纸上画一个 3×3 的九宫格，按洛书顺序标好数字（见下方）</li>
          <li style="list-style:none;text-align:center;margin:8px 0;">
            <div style="display:inline-grid;grid-template-columns:repeat(3,40px);gap:4px;">
              <div style="background:rgba(255,255,255,0.05);border:1px solid var(--border);border-radius:4px;padding:4px;text-align:center;color:var(--accent);">4</div>
              <div style="background:rgba(255,255,255,0.05);border:1px solid var(--border);border-radius:4px;padding:4px;text-align:center;color:var(--accent);">9</div>
              <div style="background:rgba(255,255,255,0.05);border:1px solid var(--border);border-radius:4px;padding:4px;text-align:center;color:var(--accent);">2</div>
              <div style="background:rgba(255,255,255,0.05);border:1px solid var(--border);border-radius:4px;padding:4px;text-align:center;color:var(--accent);">3</div>
              <div style="background:rgba(255,255,255,0.05);border:1px solid var(--border);border-radius:4px;padding:4px;text-align:center;color:var(--accent);">5</div>
              <div style="background:rgba(255,255,255,0.05);border:1px solid var(--border);border-radius:4px;padding:4px;text-align:center;color:var(--accent);">7</div>
              <div style="background:rgba(255,255,255,0.05);border:1px solid var(--border);border-radius:4px;padding:4px;text-align:center;color:var(--accent);">8</div>
              <div style="background:rgba(255,255,255,0.05);border:1px solid var(--border);border-radius:4px;padding:4px;text-align:center;color:var(--accent);">1</div>
              <div style="background:rgba(255,255,255,0.05);border:1px solid var(--border);border-radius:4px;padding:4px;text-align:center;color:var(--accent);">6</div>
            </div>
          </li>
          <li>把剩下的 50 张牌重新洗匀，然后依次发到九宫格里。</li>
          <li>可以从1号位开始，也可以从你心里有感觉的宫位开始。</li>
          <li>每个宫位可以放 1～3 张牌，放满为止。</li>
          <li>最后观察：哪几个宫位有牌，哪几个是空的。</li>
        </ol>
      </div>

      <!-- ⑤ 观察天机线 -->
      <div style="background:rgba(0,0,0,0.2);border-radius:8px;padding:12px 14px;margin-bottom:12px;">
        <h4 style="color:var(--accent);margin-bottom:8px;">⑤ 观察天机线（找出主线）</h4>
        <ol style="font-size:0.8rem;color:var(--dim);line-height:1.8;padding-left:18px;">
          <li>九宫格中有牌的位置如果连成一条直线（横/竖/斜），这条线就是<strong>天机线</strong>。</li>
          <li>天机线代表事情的<strong>起因 → 经过 → 结果</strong>。</li>
          <li>线上第一个有牌的宫位是“起因”，中间的是“经过”，最后的是“结果”。</li>
          <li>如果没有直线，说明事情还在混沌期，不好判断方向。</li>
        </ol>
      </div>

      <!-- ⑥ 读数 -->
      <div style="background:rgba(0,0,0,0.2);border-radius:8px;padding:12px 14px;margin-bottom:12px;">
        <h4 style="color:var(--accent);margin-bottom:8px;">⑥ 解读（看牌与宫位的关系）</h4>
        <ol style="font-size:0.8rem;color:var(--dim);line-height:1.8;padding-left:18px;">
          <li><strong>看五行</strong>：牌的五行 vs 宫位的五行（生我则吉，克我则凶，同我则平）。</li>
          <li><strong>看差值</strong>：宫位数 - 牌点数。差值越大，说明现实和理想的差距越大。</li>
          <li><strong>看方位</strong>：每个宫位都有自己的方位和含义（坎北、坤西南、震东等）。</li>
          <li><strong>综合判断</strong>：结合体用关系和天机线，得出一个整体的判断。</li>
        </ol>
      </div>

      <!-- 速查表 -->
      <div style="background:rgba(201,160,96,0.06);border-radius:8px;padding:12px 14px;margin-bottom:12px;">
        <h4 style="color:var(--accent);margin-bottom:8px;">速查表</h4>
        <div style="font-size:0.7rem;color:var(--dim);">
          <strong>牌面五行：</strong>
          <span style="color:#F44336;">♥火</span>、
          <span style="color:#9E9E9E;">♦金</span>、
          <span style="color:#4CAF50;">♣木</span>、
          <span style="color:#2196F3;">♠水</span>、
          J/Q/K 为<span style="color:#FF9800;">土</span>。
        </div>
        <div style="font-size:0.7rem;color:var(--dim);margin-top:4px;">
          <strong>生克关系：</strong>
          木生火、火生土、土生金、金生水、水生木<br>
          木克土、土克水、水克火、火克金、金克木
        </div>
        <div style="font-size:0.7rem;color:var(--dim);margin-top:4px;">
          <strong>吉凶速断：</strong>
          生我=吉、同我=平、我生=耗、克我=凶、我克=弱
        </div>
      </div>

      <!-- 差值速查 -->
      <div style="background:rgba(201,160,96,0.06);border-radius:8px;padding:12px 14px;margin-bottom:12px;">
        <h4 style="color:var(--accent);margin-bottom:8px;">差值速查</h4>
        <div style="font-size:0.7rem;color:var(--dim);">
          差值 = | 宫位数 - 牌点数 |<br>
          A=1、2-10=本身、J=1、Q=2、K=3
        </div>
        <div style="font-size:0.7rem;color:var(--dim);margin-top:4px;">
          差值 0-1：贴合，事情顺利<br>
          差值 2-5：偏差，需要调整<br>
          差值 6-9：脱节，不宜强求
        </div>
      </div>

      <!-- 使用技巧与禁忌 -->
      <div style="background:rgba(0,0,0,0.15);border-radius:8px;padding:12px 14px;">
        <h4 style="color:var(--accent);margin-bottom:8px;">✨ 使用技巧与禁忌</h4>
        <ul style="font-size:0.8rem;color:var(--dim);line-height:1.8;padding-left:18px;">
          <li><strong>一卦一断</strong>：一个卦只回答一个问题，不要反复占卜。</li>
          <li><strong>善易者不卜</strong>：不要把占卜当成依赖，它只是辅助决策的工具。</li>
          <li><strong>不测生死</strong>：不占涉及死亡、疾病诊断等重大问题。</li>
          <li><strong>不测他人</strong>：不占别人的隐私（比如“他对我怎么想的”）。</li>
          <li><strong>心态平静</strong>：愤怒或激动时不适合占卜。</li>
        </ul>
      </div>

    </div>
  `;
}

// ===== 牌堆（无闪烁渲染） =====
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

// ===== 体用 =====
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

  let gongsToShow = GONG_ORDER;
  if (state.mode === MODES.SIMPLE && state.line && state.line.length === 3) {
    gongsToShow = state.line;
  }

  const recommendedGong = state.intent ? getRecommendedGong(state.intent) : null;

  el.innerHTML = gongsToShow.map(g => {
    const cards = state.grid[g] || [];
    let cls = '';
    if (state.line && state.line.includes(g)) cls = 'confirmed';
    if (recommendedGong === g) cls += ' recommended';

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
      inner += '<span class="empty-label">置一念于阵中</span>';
    }

    if (state.lineOrder[g]) inner += `<span class="time-tag">${state.lineOrder[g]}</span>`;
    if (recommendedGong === g) inner += `<span class="recommend-tag">⭐</span>`;

    return `<div class="gong ${cls}" data-gong="${g}">${inner}</div>`;
  }).join('');

  if (state.mode !== MODES.SIMPLE && Object.keys(state.grid).length > 0) {
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
      <span style="color:var(--dim);width:100%;text-align:center;margin-bottom:4px;">⚡ 张力地图</span>
      ${tensions.map(t => {
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

// ===== 模式选择 =====
export function renderModeSelector() {
  const container = document.getElementById('modeSelector');
  if (!container) return;

  const modes = [
    { key: 'simple', label: '🌱 简化', desc: '只看天机线' },
    { key: 'standard', label: '📊 标准', desc: '全部九宫' },
    { key: 'pro', label: '🔬 专业', desc: '全部+关系链' }
  ];

  container.innerHTML = `
    <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:center;margin:8px 0;">
      ${modes.map(m => `
        <button data-action="switchMode" data-mode="${m.key}"
                class="small ${state.mode === m.key ? 'primary' : 'outline'}">
          ${m.label}
        </button>
      `).join('')}
    </div>
    <div style="text-align:center;font-size:0.6rem;color:var(--dim);">
      ${modes.find(m => m.key === state.mode)?.desc || ''}
    </div>
  `;
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

// ===== 刷新所有 =====
export function refreshAll() {
  renderDeck();
  renderTiYong();
  renderGrid();
  renderDurianDisplay();
  renderModeSelector();
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
    <div class="guide-tip" style="font-size:0.8rem;color:var(--dim);margin-bottom:6px;">默念你的问题，选个领域</div>
    <div style="font-size:0.65rem;color:#666;text-align:center;margin-bottom:8px;">💡 问题越具体，答案越清晰</div>
    <input type="text" id="questionInput" placeholder="${UI_TEXTS.placeholderQuestion}" autocomplete="off" value="${escapeHtml(state.question)}">
    <div class="category-grid">${CATEGORIES.map(c => `<button data-action="selectCategory" data-category="${c}" class="${state.category === c ? 'selected' : ''}">${c}</button>`).join('')}</div>
    <div class="btn-row">
      <button data-action="confirmQuestion" class="primary">${UI_TEXTS.btnStartDraw}</button>
      <button data-action="manualEntry" class="outline">${UI_TEXTS.btnManual}</button>
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
    <div class="guide-tip">${state.manualMode ? UI_TEXTS.guideManual : UI_TEXTS.guideSelectTiYong}</div>
    <div id="modeSelector"></div>
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
      <div class="guide-tip">${UI_TEXTS.guideAfterTiYong}</div>
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
      <button id="aiReadBtn" data-action="triggerAI" class="primary small">✨ AI 深度解读</button>
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