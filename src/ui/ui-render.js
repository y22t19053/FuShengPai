// ===== src/ui/ui-render.js · 全流程渲染（窄Hero + 牌格入口 + 九宫逐牌差值 + 拖拽 + 教程同步） =====
import { state } from '../state.js';
import {
  GONG_ORDER, GONG_NAMES, GONG_WUXING, CATEGORIES,
  getShengKe, getShengKeLabel, getWuxing, getCardColor,
  getCardId, PERIODS, getCurrentPeriodKey,
  getPeriodTitle, getPeriodDesc,
  getRecommendedGongForCategory
} from '../data.js';
import { createDeck, shuffle, calcFullBaZi, calcDiff, getDiffLevel, getCardValue } from '../engine.js';
import { getApiSettings, getProfile, getHistory, getStoredPeriodCards } from '../storage.js';
import { UI_TEXTS, HISTORY_EMPTY } from '../texts/index.js';
import { calculateDurianIndex, getDurianIcon } from '../durian.js';
import { toast } from './ui-modal.js';
import { isCardPlaced } from './ui-drag.js';
import { escapeForHTML, setHTML } from '../utils/safe.js';

// ===== 新手教程 =====
export function renderTeachingPanel() {
  const container = document.getElementById('teachingContent');
  if (!container) return;
  const html = `
    <div style="max-width:680px;margin:0 auto;padding:8px 0;line-height:1.9;">
      <h3 style="color:var(--accent);margin-bottom:12px;">🃏 浮生牌 · 三分钟上手</h3>
      
      <div style="background:rgba(201,160,96,0.06);border:1px solid var(--border);border-radius:8px;padding:12px;margin-bottom:16px;">
        <strong style="color:var(--accent);">核心玩法一句话：</strong>
        <span style="color:var(--text);">选两张牌代表「你」和「所问之事」，再往九宫格放牌，找一条直线（天机线），看牌面五行与宫位生克。</span>
      </div>

      <h4 style="color:var(--accent);">🎯 第一步：起念</h4>
      <p>1. 在输入框写下你的问题（可以留空）。</p>
      <p>2. 选一个领域：感情、事业、财运、健康……（不选也可以）。</p>
      <p>3. 点「抽牌」或「一键起局」开始。</p>

      <h4 style="color:var(--accent);">🃏 第二步：立极</h4>
      <p>1. <strong>点击</strong>牌堆中任意一张牌选中，再<strong>点击</strong>上方「你」或「所问之事」位置放置。</p>
      <p>2. 桌面端也可以直接<strong>拖拽</strong>牌到目标位置。</p>
      <p>3. 如果你不知道选哪张，凭直觉选就行。</p>

      <h4 style="color:var(--accent);">🔮 第三步：布阵</h4>
      <p>1. 点「布阵」后，牌堆里会出现大小王。</p>
      <p>2. 点击或拖拽剩余牌到九宫格任意宫位（每格最多3张）。</p>
      <p>3. 如果三个宫位形成直线，就自动连成「天机线」（起因→经过→结果）。</p>
      <p>4. 点「生成解读」查看结果。</p>

      <h4 style="color:var(--accent);">🃏 牌格</h4>
      <p>· 牌格是你当前未完成的人生课题，抽一张牌即锁定。</p>
      <p>· 完成至少3次真正占卜后，可以重新抽取。</p>
      <p>· 点首页「抽牌格」即可。</p>

      <h4 style="color:var(--accent);">☯ 单牌日运</h4>
      <p>· 在首页点日/周/月/季/年，抽一张牌。</p>
      <p>· 抽完即锁定，本周期不可重抽。</p>
      <p>· 可分别查看财运、桃花、贵人、事业、健康、综合运势。</p>

      <h4 style="color:var(--accent);">📚 牌面对应：</h4>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:0.8rem;margin:8px 0;">
        <div>♥ 红桃 → 火（阳）</div>
        <div>♦ 方块 → 金（阳）</div>
        <div>♣ 梅花 → 木（阴）</div>
        <div>♠ 黑桃 → 水（阴）</div>
        <div>J / Q / K → 土</div>
        <div>大王 → 天（阳）</div>
        <div>小王 → 人（阴）</div>
        <div>红色 → 阳，黑色 → 阴</div>
      </div>

      <h4 style="color:var(--accent);">💡 生克口诀：</h4>
      <p>木生火、火生土、土生金、金生水、水生木</p>
      <p>木克土、土克水、水克火、火克金、金克木</p>

      <h4 style="color:var(--accent);">🔄 其他功能：</h4>
      <p>· 榴莲指数：数值越高代表牌局张力越大，注意节奏。</p>
      <p>· AI解读：需要配置API Key（顶部「AI」按钮）。</p>
      <p>· 数据迁移：点「📦 迁移」可导出/导入全部数据。</p>

      <h4 style="color:var(--accent);">⚠️ 重要提醒：</h4>
      <p>· 不测生死、不窥他人</p>
      <p>· 所有数据仅保存在你的浏览器本地</p>
      <p>· 牌是提示，不是命令</p>
      <p>· 最后决定权永远在你</p>
    </div>
  `;
  setHTML(container, html);
}

// ===== 首页：窄Hero + 深度占卜台 =====
export function renderStep1() {
  const core = document.getElementById('coreArea');
  if (!core) return;

  const renderCatBtns = (curCat, curSub) => {
    let html = '<div class="category-grid">';
    CATEGORIES.forEach(c => {
      html += `<button data-action="selectCategory" data-category="${escapeForHTML(c.name)}" class="${curCat === c.name ? 'selected' : ''}">${escapeForHTML(c.name)}</button>`;
    });
    html += '</div>';
    if (curCat) {
      const catConfig = CATEGORIES.find(c => c.name === curCat);
      if (catConfig && catConfig.sub && catConfig.sub.length > 0) {
        html += `<div style="display:flex;flex-wrap:wrap;gap:4px;justify-content:center;margin-top:6px;">`;
        catConfig.sub.forEach(sub => {
          html += `<button data-action="selectSubCategory" data-sub="${escapeForHTML(sub)}" class="small ${curSub === sub ? 'primary' : 'outline'}">${escapeForHTML(sub)}</button>`;
        });
        html += `<button data-action="clearSubCategory" class="small outline">清除</button></div>`;
      }
    }
    return html;
  };

  const storedPeriods = getStoredPeriodCards();

  const html = `
    <!-- 🎨 玄学封面区（窄版） -->
    <div id="heroSection" style="
      background: linear-gradient(135deg, #f5efe6 0%, #e8dfd1 100%);
      border-radius: 10px;
      padding: 10px 12px;
      margin-bottom: 14px;
      text-align: center;
      border: 1px solid #d4c5a0;
      box-shadow: 0 2px 8px rgba(0,0,0,0.04);
      color: #2c2c2c;
    ">
      <div style="font-size: 0.55rem; color: #b8a080; letter-spacing: 2px; margin-bottom: 2px;">· 浮 生 若 梦 ·</div>
      <div style="font-size: 1.1rem; font-weight: bold; font-family: 'KaiTi', 'PingFang SC', serif; margin: 0; color: #1a1a1a;">抽 一 张 牌 · 见 一 个 课 题</div>
      <div style="width: 28px; height: 1px; background: #c0392b; margin: 6px auto;"></div>
      <div style="font-size: 0.7rem; color: #5a4a3a; margin-bottom: 8px;">你的牌格 · 揭示未完成的人生课题</div>
      <div style="display: flex; gap: 6px; justify-content: center; flex-wrap: wrap;">
        <button id="paigeBtn" style="
          background: linear-gradient(135deg, #1a1a1a, #2d2d2d);
          color: #f5efe6;
          border: none;
          padding: 6px 18px;
          border-radius: 24px;
          font-size: 0.8rem;
          font-family: 'KaiTi', 'PingFang SC', serif;
          box-shadow: 0 2px 8px rgba(0,0,0,0.18);
          cursor: pointer;
        ">🃏 抽牌格</button>
        <button id="quickDailyBtn" style="
          background: transparent;
          color: #1a1a1a;
          border: 1px solid #b8a080;
          padding: 6px 18px;
          border-radius: 24px;
          font-size: 0.8rem;
          font-family: 'KaiTi', 'PingFang SC', serif;
          cursor: pointer;
        ">☯ 今日运势</button>
      </div>
      <div style="margin-top: 6px; font-size: 0.5rem; color: #b8a080;">💡 完成 3 次真实占卜后可重抽</div>
    </div>

    <!-- ⚙️ 深度工具区（完整功能） -->
    <div id="toolSection" style="border-top: 1px dashed #e0d5c5; padding-top: 20px;">
      <div style="font-size: 0.75rem; color: #b8a080; text-align: center; margin-bottom: 12px;">🪷 深 度 占 卜 台</div>
      <input type="text" id="questionInput" placeholder="${escapeForHTML(UI_TEXTS.placeholderQuestion)}" autocomplete="off" value="${escapeForHTML(state.question)}">
      ${renderCatBtns(state.category, state.subCategory)}
      <div class="btn-row">
        <button data-action="confirmQuestion" class="primary">${escapeForHTML(UI_TEXTS.btnStartDraw)}</button>
        <button data-action="lazyStart" class="outline">${escapeForHTML(UI_TEXTS.btnLazy)}</button>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:4px;justify-content:center;margin-top:12px;">
        ${Object.entries(PERIODS).map(([key, p]) => {
          const periodKey = getCurrentPeriodKey(key);
          const stored = storedPeriods[key];
          const hasCard = stored && stored.periodKey === periodKey && stored.card;
          const btnText = hasCard ? `${p.label}·查看` : `${p.label}·抽牌`;
          const action = hasCard ? 'openPeriodDetail' : 'openPeriodDeck';
          return `<button data-action="${action}" data-period="${key}" class="small outline">${escapeForHTML(btnText)}</button>`;
        }).join('')}
      </div>
      <div style="font-size:0.6rem;color:var(--dim);text-align:center;margin-top:4px;">周期运抽一次即锁定，建议截图保存</div>
      <div id="periodCardArea" style="margin-top:12px;display:flex;flex-wrap:wrap;gap:12px;justify-content:center;"></div>
    </div>

    <div style="text-align:center;font-size:0.7rem;color:var(--dim);margin-top:6px;">
      <a href="#" id="helpClarifyBtn" style="color:var(--accent);">🤔 感觉自己没问清楚？</a>
    </div>
    <div id="clarifyGuide" style="display:none;margin-top:12px;padding:16px;background:rgba(201,160,96,0.05);border:1px solid var(--border);border-radius:8px;font-size:0.8rem;color:var(--dim);"></div>
  `;
  setHTML(core, html);

  // 牌格入口
  document.getElementById('paigeBtn')?.addEventListener('click', () => {
    import('./ui-paige.js').then(m => m.openPaiGe());
  });

  // 今日运势
  document.getElementById('quickDailyBtn')?.addEventListener('click', () => {
    const btn = document.querySelector('[data-action="openPeriodDeck"][data-period="daily"]');
    if (btn) btn.click();
  });

  const questionInput = document.getElementById('questionInput');
  if (questionInput) {
    questionInput.addEventListener('input', function() {
      state.question = this.value;
    });
  }

  renderPeriodCards();

  document.getElementById('helpClarifyBtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    const guide = document.getElementById('clarifyGuide');
    if (!guide) return;
    guide.style.display = 'block';
    guide.innerHTML = `
      <div style="color:var(--accent);font-weight:bold;margin-bottom:8px;">🤔 理清问题</div>
      <h4 style="color:var(--text);">5W2H</h4>
      <p><strong>What</strong> 你要问的事是什么？</p>
      <p><strong>Why</strong> 为什么现在问？</p>
      <p><strong>Who</strong> 这事涉及谁？</p>
      <p><strong>When</strong> 什么时候发生/需要决定？</p>
      <p><strong>Where</strong> 在什么场景下？</p>
      <p><strong>How</strong> 如果做，打算怎么做？</p>
      <p><strong>How much</strong> 你愿意付出多少？</p>
      <h4 style="color:var(--text);margin-top:12px;">SWOT 自检</h4>
      <p><strong>S</strong> 优势：你手里有什么牌？</p>
      <p><strong>W</strong> 劣势：你怕什么？</p>
      <p><strong>O</strong> 机会：什么可能帮你？</p>
      <p><strong>T</strong> 威胁：最坏可能是什么？</p>
      <button data-action="closeClarify" class="small outline">收起</button>
    `;
  });
}

// ===== 周期卡渲染（锁定状态显示） =====
export function renderPeriodCards() {
  const area = document.getElementById('periodCardArea');
  if (!area) return;
  setHTML(area, '');

  const isTouch = window.matchMedia('(pointer: coarse)').matches;
  if (isTouch) {
    area.style.cssText = 'display:flex;flex-wrap:nowrap;gap:12px;justify-content:flex-start;overflow-x:auto;overflow-y:hidden;padding:8px 4px;-webkit-overflow-scrolling:touch;scrollbar-width:none;touch-action:pan-x;overscroll-behavior:contain;';
  } else {
    area.style.cssText = 'display:flex;flex-wrap:wrap;gap:12px;justify-content:center;';
  }

  const storedPeriods = getStoredPeriodCards();

  Object.entries(PERIODS).forEach(([key, p]) => {
    const periodKey = getCurrentPeriodKey(key);
    const stored = storedPeriods[key];
    const title = getPeriodTitle(key);

    if (stored && stored.periodKey === periodKey && stored.card) {
      const card = stored.card;
      const colorCls = getCardColor(card);
      const rank = card.isJoker ? card.type : card.rank;
      const suit = card.isJoker ? '' : card.suit;
      const wx = getWuxing(card);

      const html = `
        <div style="display:flex;flex-direction:column;align-items:center;cursor:pointer;flex-shrink:0;min-width:60px;padding:6px;border-radius:8px;touch-action:manipulation;" data-action="openPeriodDetail" data-period="${key}" title="${escapeForHTML(title)}">
          <div class="mini-card ${colorCls}" style="width:52px;height:72px;font-size:1rem;border-radius:6px;">${escapeForHTML(rank + suit)}</div>
          <div style="font-size:0.55rem;color:var(--dim);margin-top:4px;">${escapeForHTML(p.label)}</div>
          <div style="font-size:0.5rem;color:var(--accent);">${escapeForHTML(wx)}</div>
        </div>
      `;
      setHTML(area, area.innerHTML + html);
    } else {
      const html = `
        <div style="display:flex;flex-direction:column;align-items:center;cursor:pointer;flex-shrink:0;min-width:60px;padding:6px;border-radius:8px;touch-action:manipulation;" data-action="openPeriodDeck" data-period="${key}" title="${escapeForHTML(title)}">
          <div class="card-back" style="width:52px;height:72px;border-radius:6px;"></div>
          <div style="font-size:0.55rem;color:var(--dim);margin-top:4px;">${escapeForHTML(p.label)}</div>
        </div>
      `;
      setHTML(area, area.innerHTML + html);
    }
  });
}

// ===== 布阵步骤 =====
export function renderStep2() {
  const core = document.getElementById('coreArea');
  if (!core) return;
  const html = `
    <h3>${state.manualMode ? '手动录入 · 明牌选阵' : '立极·布阵'}</h3>
    <div style="font-size:0.8rem;color:var(--dim);margin-bottom:8px;">
      点击牌堆中的牌选中，再点击「你」或「所问之事」放置；桌面端可直接拖拽。放完点「布阵」。
    </div>
    <div id="durianDisplay" style="margin-bottom:8px;"></div>
    <div class="deck-grid" id="deckContainer"></div>
    <div class="btn-row">
      <button id="scrollLeftBtn" class="outline small">‹</button>
      <button data-action="resetStep2" class="outline small">重置选牌</button>
      ${state.manualMode ? '' : '<button id="btnConfirmTY" disabled data-action="confirmTiYong" class="small primary">' + escapeForHTML(UI_TEXTS.btnConfirmTiYong) + '</button>'}
      <button id="scrollRightBtn" class="outline small">›</button>
      ${state.manualMode ? '<button data-action="generateInterpretation" class="small primary">' + escapeForHTML(UI_TEXTS.btnInterpret) + '</button>' : ''}
    </div>

    <div id="gridArea" ${state.manualMode ? '' : 'style="display:none;"'}>
      <div style="font-size:0.75rem;color:var(--dim);margin:6px 0;">每个宫位最多3张牌，可以留空。三个宫位连成直线即天机线。</div>
      <div class="grid-9" id="gridContainer"></div>
      <div class="btn-row">
        <button data-action="resetGrid" class="outline small">清九宫</button>
        ${state.manualMode ? '' : '<button data-action="generateInterpretation" class="small primary">' + escapeForHTML(UI_TEXTS.btnInterpret) + '</button>'}
        ${!state.manualMode && state.line ? '<button data-action="sealDeck" class="outline small">🔒 封印</button>' : ''}
      </div>
    </div>
  `;
  setHTML(core, html);
  refreshAll();
}

// ===== 完整解读结果 =====
export function renderFullReport(text, modules = null) {
  const aiSettings = getApiSettings();
  const hasKey = aiSettings && aiSettings.apiKey;
  const result = document.getElementById('resultArea');
  if (!result) return;

  const html = `
    <h3>${escapeForHTML(UI_TEXTS.step3)}</h3>
    <div id="durianDisplay" style="margin-bottom:8px;"></div>
    <div class="result-block" id="interpretText" style="font-size:0.9rem;line-height:1.9;max-height:60vh;overflow-y:auto;padding:16px;white-space:pre-wrap;">${escapeForHTML(text)}</div>
    <div class="btn-row">
      <button data-action="copyLocal" class="small">复制</button>
      <button id="copyPromptBtn" class="small outline">📋 复制提示词</button>
      <button data-action="shareImage" class="outline small">分享图</button>
      <button data-action="shareCode" class="outline small">分享码</button>
      <button data-action="exportData" class="outline small">完整数据</button>
      <button id="aiReadBtn" data-action="triggerAI" class="primary small">${hasKey ? 'AI深度解读' : '✨ 接入AI深度解读'}</button>
      <button data-action="resetAll" class="small">新问题</button>
    </div>
    <div id="aiResultContainer" style="display:none;margin-top:10px">
      <div class="result-block" id="aiResultContent"></div>
      <div id="followUpArea" style="display:none;margin-top:8px">
        <div class="btn-row" style="gap:8px">
          <input type="text" id="followUpInput" placeholder="${escapeForHTML(UI_TEXTS.placeholderFollowUp)}">
          <button data-action="sendFollowUp" class="small">发送</button>
        </div>
        <div class="result-block" id="chatHistoryBlock" style="margin-top:6px;max-height:200px;font-size:0.85rem;"></div>
      </div>
    </div>
  `;
  setHTML(result, html);
  renderDurianDisplay();
  document.getElementById('copyPromptBtn')?.addEventListener('click', async () => {
    const prompt = await import('../ui.js').then(m => m.buildAIPrompt());
    navigator.clipboard.writeText(prompt).then(
      () => toast('✅ 提示词已复制'),
      () => toast('复制失败')
    );
  });
}

// ===== 牌堆渲染（含 draggable 属性） =====
let deckCache = [];
let deckCacheIds = '';

export function renderDeck() {
  const el = document.getElementById('deckContainer');
  if (!el) return;
  if (!state.deck || state.deck.length === 0) {
    deckCache = [];
    deckCacheIds = '';
    setHTML(el, '<span style="color:#666;padding:10px;">镜中牌已尽，可重置。</span>');
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

  el.style.cssText = `display:flex;flex-wrap:nowrap;gap:10px;overflow-x:auto;overflow-y:hidden;padding:10px 8px;touch-action:pan-x;overscroll-behavior:contain;scrollbar-width:none;`;
  setHTML(el, '');
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
      div.style.cssText = `${placed ? 'opacity:0.25;pointer-events:none;' : ''} flex-shrink:0;width:60px;height:84px;touch-action:pan-x;`;
      div.dataset.cardid = id;
      div.dataset.cardindex = index;
      div.draggable = !placed;
      div.innerHTML = `<span class="rank">${rank}</span><span class="suit">${suit}</span><span class="wx-tag">${wx}</span>`;
    } else {
      div.className = `card-back${sel ? ' selected' : ''}${placed ? ' used' : ''}`;
      div.style.cssText = `${placed ? 'opacity:0.25;pointer-events:none;' : ''} flex-shrink:0;width:60px;height:84px;touch-action:pan-x;`;
      div.dataset.cardid = id;
      div.dataset.cardindex = index;
      div.draggable = !placed;
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
  const tiHTML = state.ti ? `<div class="mini-card ${getCardColor(state.ti)}">${state.ti.isJoker ? state.ti.type : state.ti.rank}${state.ti.isJoker ? '' : state.ti.suit}</div>` : `<div class="empty-dash" data-drop="ti">你</div>`;
  const yongHTML = state.yong ? `<div class="mini-card ${getCardColor(state.yong)}">${state.yong.isJoker ? state.yong.type : state.yong.rank}${state.yong.isJoker ? '' : state.yong.suit}</div>` : `<div class="empty-dash" data-drop="yong">所问之事</div>`;
  let badge = '';
  if (state.ti && state.yong) {
    const rel = getShengKe(getWuxing(state.ti), getWuxing(state.yong));
    if (rel) badge = `<span class="relation-badge ${rel === '生我' ? 'good' : rel === '克我' ? 'bad' : ''}">${rel} ${getShengKeLabel(rel)}</span>`;
  }
  setHTML(bar, `<div class="slot">你 ${tiHTML}</div><span class="separator">⚡</span><div class="slot">所问之事 ${yongHTML}</div>${badge}`);
  const btn = document.getElementById('btnConfirmTY');
  if (btn) btn.disabled = !(state.ti && state.yong);
}

// ===== 九宫格（逐牌差值，显示绝对值+方向，无星号） =====
export function renderGrid() {
  const el = document.getElementById('gridContainer');
  if (!el) return;

  const recommendedGong = getRecommendedGongForCategory(state.category);

  el.innerHTML = GONG_ORDER.map(g => {
    const cards = state.grid[g] || [];
    let cls = '';
    if (state.line && state.line.includes(g)) cls = 'confirmed';

    const lineLabel = state.lineOrder[g] || '';

    let inner = `<span class="num">${g}</span><span class="name">${GONG_NAMES[g]}</span><span class="wx">${GONG_WUXING[g]}</span>`;

    if (cards.length) {
      inner += '<div class="card-stack">';
      cards.forEach(c => {
        inner += `<div class="mini-card ${getCardColor(c)}">${c.isJoker ? c.type : c.rank}${c.isJoker ? '' : c.suit}</div>`;
      });
      inner += '</div>';
      const diffLabels = cards.map(c => {
        const d = calcDiff(g, c);
        const abs = Math.abs(d);
        const direction = d > 0 ? '大于' : d < 0 ? '小于' : '等于';
        const level = getDiffLevel(d);
        return `<span class="diff-label" style="color:${level.color}">差值：${g} - ${getCardValue(c)} = ${abs}（${level.label}，${direction}）</span>`;
      }).join('<br>');
      inner += diffLabels;
    } else {
      inner += '<span class="empty-label">空</span>';
    }

    if (lineLabel) inner += `<span style="display:block;font-size:0.55rem;color:var(--accent);">${lineLabel}</span>`;

    return `<div class="gong ${cls}" data-gong="${g}">${inner}</div>`;
  }).join('');
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
  if (leftBtn) { e.stopPropagation(); const deck = document.getElementById('deckContainer'); if (deck) deck.scrollBy({ left: -180, behavior: 'smooth' }); return; }
  const rightBtn = e.target.closest('#scrollRightBtn');
  if (rightBtn) { e.stopPropagation(); const deck = document.getElementById('deckContainer'); if (deck) deck.scrollBy({ left: 180, behavior: 'smooth' }); return; }
}

// ===== 榴莲指数显示 =====
export function renderDurianDisplay() {
  const container = document.getElementById('durianDisplay');
  if (!container) return;
  if (!state.ti || !state.yong || Object.keys(state.grid).length === 0) {
    setHTML(container, '');
    return;
  }
  const result = calculateDurianIndex(state);
  state.durianIndex = result;
  const icon = getDurianIcon(result.score);
  const html = `<div style="display:flex;align-items:center;gap:12px;padding:8px 12px;background:rgba(0,0,0,0.2);border-radius:8px;margin:4px 0;"><span style="font-size:1.8rem;">${icon}</span><div><div style="font-weight:bold;font-size:1rem;">榴莲指数 ${result.score}/10 <span style="color:${result.score < 3 ? '#4CAF50' : result.score < 5 ? '#8BC34A' : result.score < 7 ? '#FFC107' : result.score < 9 ? '#FF9800' : '#F44336'};font-size:0.75rem;">（${result.level}）</span></div><div style="font-size:0.75rem;color:var(--dim);">${escapeForHTML(result.description)}</div></div></div>`;
  setHTML(container, html);
}

// ===== 设置面板 =====
export function initSettingsPanel() {
  const s = getApiSettings();
  if (s) {
    document.querySelectorAll('#providerGrid button').forEach(b => b.classList.toggle('selected', b.dataset.value === s.provider));
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
  if (birthDate) birthDate.value = p.birthDate || '';
  const birthTime = document.getElementById('birthTime');
  if (birthTime) birthTime.value = p.birthTime || '';
  const name = document.getElementById('profileName');
  if (name) name.value = p.name || '';
  const gender = document.getElementById('profileGender');
  if (gender) gender.value = p.gender || '';
  const birthPlace = document.getElementById('birthPlace');
  if (birthPlace) birthPlace.value = p.birthPlace || '';
  const currentPlace = document.getElementById('currentPlace');
  if (currentPlace) currentPlace.value = p.currentPlace || '';
  updateBaziPreview();
}

export function updateBaziPreview() {
  const preview = document.getElementById('baziPreview');
  if (!preview) return;
  const bd = document.getElementById('birthDate')?.value;
  const bt = document.getElementById('birthTime')?.value || '12:00';
  if (!bd) { setHTML(preview, ''); return; }
  const parts = bd.split('-');
  if (parts.length !== 3) { setHTML(preview, ''); return; }
  const year = parseInt(parts[0]);
  const month = parseInt(parts[1]);
  const day = parseInt(parts[2]);
  const tp = bt.split(':');
  const hour = tp.length >= 1 ? parseInt(tp[0]) || 12 : 12;
  try {
    const bazi = calcFullBaZi(year, month, day, hour);
    setHTML(preview, `四柱预览：${escapeForHTML(bazi.fullText)} | 生肖：${escapeForHTML(bazi.yearPillar.shengXiao)}`);
  } catch (e) { setHTML(preview, '日期无效'); }
}

// ===== 历史面板 =====
export function renderHistoryPanel() {
  const list = document.getElementById('historyList');
  if (!list) return;
  const history = getHistory();
  if (!history.length) {
    setHTML(list, `<p style="color:var(--dim);">${escapeForHTML(HISTORY_EMPTY)}</p>`);
    return;
  }
  const html = history.map((r, i) => `<div class="history-item" data-index="${i}" style="cursor:pointer;margin:8px 0;padding:10px 12px;background:rgba(255,255,255,0.03);border-radius:6px;border:1px solid rgba(255,255,255,0.05);"><strong>${escapeForHTML(new Date(r.time).toLocaleString())}</strong><span style="color:var(--dim);margin-left:8px;">${escapeForHTML(r.question || '未提问')} (${escapeForHTML(r.category || '无')})</span></div>`).join('');
  setHTML(list, html);
}

// ===== 状态提示 =====
export function updateApiStatus() {
  const s = getApiSettings();
  const st = document.getElementById('apiStatus');
  if (!st) return;
  st.textContent = s && s.apiKey ? UI_TEXTS.apiStatusConfigured : UI_TEXTS.apiStatusNotConfigured;
  st.style.color = s && s.apiKey ? '#5a9a6a' : '';
}