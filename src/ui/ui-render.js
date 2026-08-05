// ===== src/ui/ui-render.js · 全流程渲染（含AI高级参数回填 + 日运细选支持 + 牌灵卡显示） =====
import { state } from '../state.js';
import {
  GONG_ORDER, GONG_NAMES, GONG_WUXING, CATEGORIES,
  getShengKe, getShengKeLabel, getWuxing, getCardColor,
  getCardId, PERIODS, getCurrentPeriodKey,
  getPeriodTitle, getPeriodDesc,
  getRecommendedGongForCategory,
  DAILY_FORTUNE_TYPES, getDailyFortuneType
} from '../data.js';
import { createDeck, shuffle, calcFullBaZi, calcDiff, getDiffLevel, getDiffValue } from '../engine.js';
import { getApiSettings, getProfile, getHistory, getStoredPeriodCards, getDrawTimestamps } from '../storage.js';
import { getSeasonInfo, getHourGreeting, getVisitStreak, getYesterdayCard, cardLabel, applySeasonAccent } from '../season.js';
import { getClosingLine } from '../philosophy/covenant.js';
import { playClosingSound } from '../utils/sound.js';
import { UI_TEXTS, HISTORY_EMPTY, PHYSICAL_GUIDE, STATUS_POOL, REMINDER_POOL, ACTION_POOL } from '../texts/index.js';
import { pick } from '../constants.js';
import { calculateDurianIndex, getDurianColor } from '../durian.js';
import { getDailyFortune, getPokerPersona } from '../persona.js';
import { getFriendCircleHook, getFortuneTags, getPaiGeQuestion } from '../texts/social.js';
import { toast } from './ui-modal.js';
import { isCardPlaced } from './ui-drag.js';
import { escapeForHTML, setHTML } from '../utils/safe.js';
import { syncQuestionFromInput } from '../utils/flow-helpers.js';
import { getSystem, setSystem } from '../mahjong-ui.js';

// 旬：进店即换菜单——把季节 accent 应用到 :root（全站 --accent 跟随）
applySeasonAccent();

// ===== 新手教程 =====
export function renderTeachingPanel() {
  const container = document.getElementById('teachingContent');
  if (!container) return;
  const html = `
    <div style="max-width:680px;margin:0 auto;padding:8px 0;line-height:1.9;">
      <h3 style="color:var(--accent);margin-bottom:12px;">🃏 浮生牌 · 三分钟上手</h3>
      
      <div style="background:rgba(var(--accent-rgb),0.06);border:1px solid var(--border);border-radius:8px;padding:12px;margin-bottom:16px;">
        <strong style="color:var(--accent);">核心玩法一句话：</strong>
        <span style="color:var(--text);">选两张牌代表「你」和「所问之事」，再往九宫格放牌，找一条直线，看它提示的起因、经过与结果。</span>
      </div>

      <h4 style="color:var(--accent);">🎯 第一步：起念</h4>
      <p>1. 在输入框写下你的问题（可以留空）。</p>
      <p>2. 选一个领域：感情、事业、财运、健康……（不选也可以）。</p>
      <p>3. 点「抽牌」或「一键起局」开始。</p>

      <h4 style="color:var(--accent);">🃏 第二步：选牌（你 + 所问之事）</h4>
      <p>1. <strong>点击</strong>牌堆中任意一张牌选中，再<strong>点击</strong>上方「你」或「所问之事」位置放置。</p>
      <p>2. 桌面端也可以直接<strong>拖拽</strong>牌到目标位置。</p>
      <p>3. 如果你不知道选哪张，凭直觉选就行。</p>

      <h4 style="color:var(--accent);">🔮 第三步：查看结果</h4>
      <p>1. 点「放牌」后，牌堆里会出现大小王。</p>
      <p>2. 点击或拖拽剩余牌到九宫格任意宫位（每格最多3张）。</p>
      <p>3. 如果三个宫位连成直线，就自动连出一条主线（起因→经过→结果）。</p>
      <p>4. 点「生成解读」查看结果。</p>

      <h4 style="color:var(--accent);">🃏 牌灵</h4>
      <p>· 牌灵，是你潜意识在扑克牌上的投影——这张牌揭晓的，是你尚未完成的灵魂课题。</p>
      <p>· 理论上，拿一副真实的扑克牌抽，同样成立：那一刻，你的无意识借 54 张牌，选出了它想让你看见的那一张。</p>
      <p>· 重抽没有次数门槛，随时可以再来。</p>
      <p>· 点首页「牌灵」即可。</p>

      <h4 style="color:var(--accent);">☯ 单牌日运</h4>
      <p>· 日运支持<strong>细选类别</strong>：综合、财运、桃花、贵人、事业、健康、学业。</p>
      <p>· 每个类别独立抽牌、独立锁定。</p>
      <p>· 点击已抽牌面可直接查看解读。</p>
      <div style="background:rgba(var(--accent-rgb),0.06);border:1px solid var(--border);border-radius:8px;padding:10px;margin:8px 0;font-size:0.8rem;">
        <strong style="color:var(--accent);">周期判定方法：</strong><br>
        日运：今天（自然日）<br>
        周运：当前自然周（周一~周日）<br>
        月运：当前自然月（1日~月末）<br>
        季运：当前季度（1-3/4-6/7-9/10-12 月）<br>
        年运：当前自然年（1月1日~12月31日）
      </div>

      <h4 style="color:var(--accent);">📚 牌面对应：</h4>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:0.8rem;margin:8px 0;">
        <div>♥ 红桃 → 火（阳）</div>
        <div>♦ 方块 → 金（阳）</div>
        <div>♣ 梅花 → 木（阴）</div>
        <div>♠ 黑桃 → 水（阴）</div>
        <div>J/Q/K → 土（不分花色）</div>
        <div>大王 → 天（阳）</div>
        <div>小王 → 人（阴）</div>
        <div>红色 → 阳，黑色 → 阴</div>
      </div>
      <p style="font-size:0.72rem;color:var(--accent);">
        ※ A-10 按花色分五行；J/Q/K 不分花色，一律属土。
      </p>

      <h4 style="color:var(--accent);">💡 生克口诀：</h4>
      <p>木生火、火生土、土生金、金生水、水生木</p>
      <p>木克土、土克水、水克火、火克金、金克木</p>

      <h4 style="color:var(--accent);">🧭 九宫差值怎么算：</h4>
      <p>· 差值 = 宫位数 − 牌面数值，每张牌单独计算。</p>
      <p>· A 算 1，2~10 按面值；<strong>J 算 1、Q 算 2、K 算 3</strong>。</p>
      <p>· <strong>大小王（天/人）当 0 算</strong>。</p>
      <p>· 差值越小，牌越贴合宫位；差值越大，越说明此处有距离。</p>

      <h4 style="color:var(--accent);">🧭 其他功能：</h4>
      <p>· 张力指数：数值越高代表牌局张力越大，注意节奏。</p>
      <p>· AI解读：需要配置API Key（顶部「AI」按钮）。</p>
<p>· 数据备份：点顶部「备份」可导出/导入全部数据。</p>

      <h4 style="color:var(--accent);">🃏 实体牌对照（现实占卜入门）：</h4>
      ${PHYSICAL_GUIDE.sections.map(s => `
        <p style="margin:6px 0;"><strong>${escapeForHTML(s.heading)}</strong><br>${escapeForHTML(s.body)}</p>
      `).join('')}

      <h4 style="color:var(--accent);">🔄 重新开始（重开）</h4>
      <p>· 想清空当前牌局、重新起念？点顶部「<strong>↺ 重开</strong>」即可（会先弹出确认，不会误删）。</p>
      <p>· 重开只重置当前牌局，<strong>已保存的历史、日运、牌灵都不会被删除</strong>。</p>

      <h4 style="color:var(--accent);">⚠️ 重要提醒：</h4>
      <p>· 不测生死、不窥他人</p>
      <p>· 所有数据仅保存在你的浏览器本地</p>
      <p>· 牌是提示，不是命令</p>
      <p>· 最后决定权永远在你</p>
    </div>
  `;
  setHTML(container, html);
}

// ===== 更多周期运弹窗 =====
function showMorePeriodsModal() {
  const modal = document.getElementById('modal');
  const content = document.getElementById('modalContent');
  if (!modal || !content) return;

  const storedPeriods = getStoredPeriodCards();

  // 日运细选面板
  const dailyTypesHTML = DAILY_FORTUNE_TYPES.map(t => {
    const periodKey = getCurrentPeriodKey('daily');
    const stored = storedPeriods[`daily_${t.key}`];
    const hasCard = stored && stored.periodKey === periodKey && stored.card;
    const btnText = hasCard ? `${t.icon} ${t.label}·查看` : `${t.icon} ${t.label}·抽牌`;
    const action = hasCard ? 'openPeriodDetail' : 'openPeriodDeck';
    return `<button data-action="${action}" data-period="daily" data-fortune-type="${t.key}" class="small outline" style="width:100%;padding:10px;font-size:0.8rem;text-align:left;">${btnText}</button>`;
  }).join('');

  // 周月季年
  const otherPeriodsHTML = Object.entries(PERIODS).filter(([key]) => key !== 'daily').map(([key, p]) => {
    const periodKey = getCurrentPeriodKey(key);
    const stored = storedPeriods[key];
    const hasCard = stored && stored.periodKey === periodKey && stored.card;
    const btnText = hasCard ? `${p.label}·查看` : `${p.label}·抽牌`;
    const action = hasCard ? 'openPeriodDetail' : 'openPeriodDeck';
    return `<button data-action="${action}" data-period="${key}" class="small outline" style="width:100%;padding:10px;font-size:0.8rem;">${btnText}</button>`;
  }).join('');

  const html = `
    <h3 style="color:var(--accent);text-align:center;margin-bottom:12px;">选择周期运</h3>
    <div style="font-size:0.7rem;color:var(--dim);text-align:center;margin:4px 0 8px;">日运可细选类别，各自独立抽牌锁定</div>
    <div style="display:flex;flex-direction:column;gap:4px;max-height:40vh;overflow-y:auto;padding:4px;">
      <div style="font-size:0.7rem;color:var(--accent);margin:4px 0 2px;">☯ 日运细选</div>
      ${dailyTypesHTML}
      <div style="font-size:0.7rem;color:var(--accent);margin:8px 0 2px;">📅 周期运</div>
      ${otherPeriodsHTML}
      <button data-action="closeModal" class="small outline" style="width:100%;padding:10px;font-size:0.8rem;margin-top:6px;">取消</button>
    </div>
  `;
  setHTML(content, html);
  modal.removeAttribute('hidden');
}

// 进门迎客：节气副题 / 时段一句 + 昨日之牌回访 + 常客连续天数（安静的承认，不炫耀）
function buildHeroGreeting() {
  const info = getSeasonInfo();
  const main = info.jieqi ? `今日${info.jieqi.name}，${info.jieqi.ask}。` : getHourGreeting();
  const subs = [];
  const yesterdayCard = getYesterdayCard(getHistory());
  if (yesterdayCard) subs.push(`昨天那张${cardLabel(yesterdayCard)}，今天还在你心里吗。`);
  const stamps = [
    ...getDrawTimestamps(),
    ...getHistory().map(h => h && h.time).filter(Boolean),
    ...Object.values(getStoredPeriodCards()).map(p => p && p.drawnAt).filter(Boolean)
  ];
  const streak = getVisitStreak(stamps);
  if (streak >= 2) subs.push(`你已连续来 ${streak} 天。`);
  return { main, sub: subs.join(' ') };
}

// ===== 双体系 Hero：扑克 / 麻将（用户自选，丝滑切换，各自独立、可交叉验证） =====
function buildHeroHTML() {
  const greeting = buildHeroGreeting();
  const isMj = getSystem() === 'mahjong';
  return `
    <!-- 🃏 主入口区（普通人打开即用：一个大牌背，点一下） -->
    <div id="heroSection" class="hero">
      <div class="hero-eyebrow">· 浮 生 若 梦 ·</div>
      <div class="hero-gold-title">${isMj ? '摸 三 张 牌' : '抽 一 张 牌'}</div>
      <div class="hero-sub">${isMj ? '不预测命运，只按老牌馆的规矩，聊聊今天怎么过' : '不预测命运，只聊聊今天可以怎么过'}</div>
      <div class="hero-greeting">${escapeForHTML(greeting.main)}</div>
      ${greeting.sub ? `<div class="hero-greeting-sub">${escapeForHTML(greeting.sub)}</div>` : ''}
      <div class="hero-actions">
        <button id="quickDrawBtn" class="btn-hero btn-hero-gold">${isMj ? '🀄 摸三张' : '🃏 抽一张'}</button>
        <button id="quickDailyBtn" class="btn-hero btn-hero-cinnabar">${isMj ? '🀄 今日手气' : '☯ 今日运势'}</button>
      </div>
      <div class="hero-link-row">
        <button id="paigeBtn" class="btn-hero-link">我的牌灵 · 长期课题</button>
        <span class="sys-switch">
          <button id="sysPokerBtn" class="sys-btn ${isMj ? '' : 'on'}" title="扑克占卜">🃏 扑克</button>
          <button id="sysMahjongBtn" class="sys-btn ${isMj ? 'on' : ''}" title="麻将占卜 · 老牌馆">🀄 麻将</button>
        </span>
      </div>
      <div class="hero-note">${isMj ? '默念一件事，按住牌背 · 听牌片刻 · 只存本机' : '默念一件事，点一下 · 30 秒读完 · 只存本机'}</div>
    </div>`;
}

function bindHeroActions() {
  // 牌灵入口
  document.getElementById('paigeBtn')?.addEventListener('click', () => {
    import('./ui-paige.js').then(m => m.openPaiGe());
  });

  // 今日运势/今日手气：扑克=综合日运，麻将=每日一张手气
  document.getElementById('quickDailyBtn')?.addEventListener('click', () => {
    if (getSystem() === 'mahjong') {
      import('../mahjong-ui.js').then(m => m.openMahjongDaily());
    } else {
      import('../ui.js').then(m => m.openPeriodDeck('daily'));
    }
  });

  // 抽一张/摸三张：扑克=直抽，麻将=天地人三张
  document.getElementById('quickDrawBtn')?.addEventListener('click', () => {
    if (getSystem() === 'mahjong') {
      import('../mahjong-ui.js').then(m => m.openMahjongDraw());
    } else {
      import('../ui.js').then(m => m.lazyStart());
    }
  });

  // 双体系丝滑切换：独立且可交叉验证（各自存储，互不覆盖）
  document.getElementById('sysPokerBtn')?.addEventListener('click', () => {
    setSystem('poker');
    toast('已切换：扑克占卜', 1600, 'success');
    refreshHero();
  });
  document.getElementById('sysMahjongBtn')?.addEventListener('click', () => {
    setSystem('mahjong');
    toast('已切换：麻将占卜 · 老牌馆', 1600, 'success');
    refreshHero();
  });
}

/** 切换体系后只重渲染 Hero，其余面板原地不动（丝滑） */
export function refreshHero() {
  const hero = document.getElementById('heroSection');
  if (!hero) return;
  hero.innerHTML = buildHeroHTML();
  bindHeroActions();
}

// ===== 首页：窄Hero + 深度占卜台 =====
export function renderStep1() {
  const core = document.getElementById('coreArea');
  if (!core) return;
  // 首页在宽屏下全宽展示（与立极/观象的三栏布局区分开）
  const panels = document.getElementById('dynamicPanels');
  if (panels) panels.classList.add('step-home');

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
    ${buildHeroHTML()}

    <!-- 🃏 牌灵 + 🌤 今日日运（已抽则直接可见，无需点击；未抽给轻引导） -->
    <div id="dualStrip" style="margin-bottom: 14px;"></div>

    <!-- 🃏 已抽的签（牌灵/日运等快捷入口，不打扰，放在眼前） -->
    <div id="periodCardArea" style="margin: 0 0 14px; display: flex; justify-content: center;"></div>

    <!-- ⚙️ 进阶玩法（默认折叠：普通用户不打扰，行家自己进来） -->
    <details id="toolSection" class="tool-section">
      <summary class="tool-summary">🪷 进阶玩法 · 九宫占卜台 <span style="opacity:0.6;">（想认真玩的朋友点这里）</span></summary>
      <div style="padding: 0 2px;">
        <div style="display:flex;justify-content:center;gap:6px;margin-bottom:8px;">
          <button data-action="toggleConsultMode" class="small ${state.consultMode ? 'primary' : 'outline'}" style="font-size:0.7rem;">${state.consultMode ? '🧑 帮别人问 · 已开启' : '🧑 帮别人问'}</button>
        </div>
        ${state.consultMode ? `<input type="text" id="consultNameInput" placeholder="求测人称呼（可选，如：朋友小王）" autocomplete="off" value="${escapeForHTML(state.consultName)}" style="position:relative;z-index:2;pointer-events:auto;margin-bottom:6px;border:1px solid rgba(var(--accent-rgb),0.33);">` : ''}
        <input type="text" id="questionInput" placeholder="${escapeForHTML(state.consultMode ? '求测人想问什么？' : UI_TEXTS.placeholderQuestion)}" autocomplete="off" value="${escapeForHTML(state.question)}" style="position:relative;z-index:2;pointer-events:auto;">
        ${renderCatBtns(state.category, state.subCategory)}
        <div class="btn-row">
          <button data-action="confirmQuestion" class="primary">${escapeForHTML(UI_TEXTS.btnStartDraw)}</button>
          <button data-action="lazyStart" class="outline">${escapeForHTML(UI_TEXTS.btnLazy)}</button>
          <button data-action="manualEntry" class="outline">${escapeForHTML(UI_TEXTS.btnManual)}</button>
        </div>

        <!-- 周期运入口 -->
        <div style="display:flex;gap:6px;justify-content:center;margin-top:12px;flex-wrap:wrap;">
          <button id="morePeriodBtn" class="small outline">更多周期运</button>
        </div>
        <div class="tool-note" style="font-size:0.6rem;color:var(--ink-faint);text-align:center;margin-top:4px;">日运/周运/月运等抽一次即锁定，建议截图保存</div>
      </div>
    </details>

    <div style="text-align:center;font-size:0.7rem;color:var(--ink-faint);margin-top:6px;">
      <a href="#" id="helpClarifyBtn" style="color:var(--accent);">🤔 感觉自己没问清楚？</a>
    </div>
    <div id="clarifyGuide" style="display:none;margin-top:12px;padding:16px;background:rgba(var(--accent-rgb),0.05);border:1px solid var(--line-faint);border-radius:8px;font-size:0.8rem;color:var(--ink-faint);"></div>
  `;
  setHTML(core, html);

  // hero 全部交互（牌灵 / 摸三张 / 今日手气 / 双体系切换）
  bindHeroActions();

  // 更多周期运：弹出弹窗
  document.getElementById('morePeriodBtn')?.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    showMorePeriodsModal();
  });

  // 输入框：渲染后延迟绑定，避免与其他渲染/引导层事件竞争
  setTimeout(() => {
    // 求测人称呼（帮别人问时显示）
    const consultNameInput = document.getElementById('consultNameInput');
    if (consultNameInput) {
      consultNameInput.style.pointerEvents = 'auto';
      consultNameInput.style.zIndex = '3';
      consultNameInput.addEventListener('input', () => { state.consultName = consultNameInput.value; });
      consultNameInput.addEventListener('change', () => { state.consultName = consultNameInput.value; });
    }

    const questionInput = document.getElementById('questionInput');
    if (!questionInput) return;
    questionInput.style.pointerEvents = 'auto';
    questionInput.style.zIndex = '3';
    questionInput.removeAttribute('disabled');
    questionInput.setAttribute('aria-label', state.consultMode ? '求测人想问什么' : '输入你的问题');

    const persistQuestion = () => syncQuestionFromInput(questionInput, state);

    questionInput.addEventListener('focus', () => {
      questionInput.style.pointerEvents = 'auto';
      questionInput.style.zIndex = '3';
      questionInput.removeAttribute('disabled');
      persistQuestion();
    });
    questionInput.addEventListener('input', persistQuestion);
    questionInput.addEventListener('change', persistQuestion);
    questionInput.addEventListener('blur', () => {
      questionInput.style.pointerEvents = 'auto';
      questionInput.style.zIndex = '3';
      persistQuestion();
    });
  }, 0);

  renderPeriodCards();
  renderTodayFortuneStrip();

  document.getElementById('helpClarifyBtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    const guide = document.getElementById('clarifyGuide');
    if (!guide) return;
    guide.style.display = 'block';
    guide.innerHTML = `
      <div style="color:var(--accent);font-weight:bold;margin-bottom:8px;">🤔 理清问题</div>
      <h4 style="color:#c8c8d8;">5W2H</h4>
      <p><strong>What</strong> 你要问的事是什么？</p>
      <p><strong>Why</strong> 为什么现在问？</p>
      <p><strong>Who</strong> 这事涉及谁？</p>
      <p><strong>When</strong> 什么时候发生/需要决定？</p>
      <p><strong>Where</strong> 在什么场景下？</p>
      <p><strong>How</strong> 如果做，打算怎么做？</p>
      <p><strong>How much</strong> 你愿意付出多少？</p>
      <h4 style="color:#c8c8d8;margin-top:12px;">SWOT 自检</h4>
      <p><strong>S</strong> 优势：你手里有什么牌？</p>
      <p><strong>W</strong> 劣势：你怕什么？</p>
      <p><strong>O</strong> 机会：什么可能帮你？</p>
      <p><strong>T</strong> 威胁：最坏可能是什么？</p>
      <button data-action="closeClarify" class="small outline">收起</button>
    `;
  });
}

// ===== 牌灵 + 今日日运 双横幅（对等展示：已抽直接可见，未抽给轻引导） =====
// theme: 'tarot'（牌灵·墨绿竹青） / 'daily'（日运·宣纸朱砂）——两套美学各自独立
function bannerShell({ theme = 'tarot', label, sub, cardCls, cardText, goldBorder, title, line, tags, shareId, viewHTML }) {
  const isEast = theme === 'daily';
  const cardStyle = goldBorder
    ? 'width:58px;height:82px;font-size:1.2rem;border-radius:8px;border:2px solid var(--accent);'
    : 'width:58px;height:82px;font-size:1.2rem;border-radius:8px;';
  const boxStyle = isEast
    ? 'flex:1 1 300px;min-width:280px;background:rgba(17,26,21,0.85);border:1px solid #b03a2e88;border-radius:12px;padding:14px 16px;display:flex;gap:14px;align-items:center;backdrop-filter:blur(4px);'
    : 'flex:1 1 300px;min-width:280px;background:linear-gradient(135deg,var(--hero-bg0),var(--hero-bg1));border:1px solid rgba(var(--accent-rgb),0.4);border-radius:12px;padding:14px 16px;display:flex;gap:14px;align-items:center;';
  const labelColor = isEast ? '#e07a66' : 'var(--accent)';      // 朱砂(亮) vs 竹青
  const subColor = isEast ? '#a89a82' : 'var(--ink-ghost)';
  const titleColor = isEast ? '#d6cbb5' : 'var(--text)';
  const lineColor = isEast ? '#a89a82' : 'var(--dim)';
  const tagStyle = isEast
    ? 'border:1px solid #e07a6688;color:#e07a66;font-size:0.6rem;padding:2px 8px;border-radius:10px;'
    : 'border:1px solid rgba(var(--accent-rgb),0.33);color:var(--accent);font-size:0.6rem;padding:2px 8px;border-radius:10px;';
  const shareBtnHTML = isEast
    ? `background:rgba(176,58,46,0.15);color:#e07a66;border:1px solid #b03a2e88;font-weight:700;min-width:72px;`
    : `background:var(--accent-soft);color:var(--accent);border:1px solid var(--accent);font-weight:700;min-width:72px;`;
  return `
    <div style="${boxStyle}">
      <div class="mini-card ${cardCls}" style="${cardStyle}flex-shrink:0;">${escapeForHTML(cardText)}</div>
      <div style="flex:1;min-width:150px;">
        <div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;">
          <span style="color:${labelColor};font-weight:700;font-size:0.85rem;">${label}</span>
          <span style="font-size:0.72rem;color:${subColor};">${escapeForHTML(sub)}</span>
        </div>
        <div style="font-size:0.95rem;color:${titleColor};font-weight:600;margin-top:4px;">${escapeForHTML(title)}</div>
        <div style="font-size:0.8rem;color:${lineColor};margin-top:2px;line-height:1.5;">${escapeForHTML(line)}</div>
        <div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap;">
          ${tags.map(tag => `<span style="${tagStyle}">${escapeForHTML(tag)}</span>`).join('')}
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0;">
        <button id="${shareId}" class="small" style="${shareBtnHTML}">☯ 分享图</button>
        ${viewHTML}
      </div>
    </div>
  `;
}

export function renderTodayFortuneStrip() {
  const el = document.getElementById('dualStrip');
  if (!el) return;

  // ---- ① 牌灵横幅 ----
  let paigeBanner = '';
  let paigeCard = null;
  try {
    const raw = localStorage.getItem('fsp_paige');
    const paigeData = raw ? JSON.parse(raw) : null;
    if (paigeData && paigeData.card) {
      paigeCard = paigeData.card;
      const q = getPaiGeQuestion(paigeCard);
      const hook = getFriendCircleHook(paigeCard);
      const tags = (q?.keywords?.length ? q.keywords : hook.tags || []).slice(0, 3);
      const colorCls = getCardColor(paigeCard);
      const rank = paigeCard.isJoker ? paigeCard.type : paigeCard.rank;
      const suit = paigeCard.isJoker ? '' : paigeCard.suit;
      const wx = getWuxing(paigeCard);
      paigeBanner = bannerShell({
        theme: 'tarot',
        label: '🃏 我的牌灵',
        sub: `${wx} · 人生课题`,
        cardCls: colorCls, cardText: rank + suit, goldBorder: true,
        title: q?.title || hook.title,
        line: q?.question || hook.line,
        tags,
        shareId: 'paigeBannerShareBtn',
        viewHTML: '<button data-action="openPaiGe" class="small outline" style="color:var(--accent);border-color:rgba(var(--accent-rgb),0.4);">查看</button>',
      });
    }
  } catch (e) { paigeCard = null; }

  if (!paigeBanner) {
    paigeBanner = `
      <div style="flex:1 1 300px;min-width:280px;background:linear-gradient(135deg,var(--hero-bg0),var(--hero-bg1));border:1px dashed rgba(var(--accent-rgb),0.4);border-radius:12px;padding:14px 16px;display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;">
        <div style="font-size:0.78rem;color:var(--ink-ghost);">
          <span style="color:var(--accent);font-weight:700;">🃏 我的牌灵</span>
          <span style="opacity:0.85;"> · 一签守护 · 只存本机</span>
        </div>
        <button id="drawPaigeBannerBtn" style="background:var(--accent-soft);color:var(--accent);border:1px solid var(--accent);padding:7px 18px;border-radius:18px;font-size:0.8rem;font-weight:700;cursor:pointer;">抽一张</button>
      </div>
    `;
  }

  // ---- ② 今日日运横幅 ----
  const storedPeriods = getStoredPeriodCards();
  const todayKey = getCurrentPeriodKey('daily');
  const drawn = DAILY_FORTUNE_TYPES
    .map(t => ({ t, stored: storedPeriods[`daily_${t.key}`] }))
    .filter(x => x.stored && x.stored.periodKey === todayKey && x.stored.card);

  let dailyBanner = '';
  let dailyCard = null;
  let dailyTypeKey = 'overall';
  if (drawn.length) {
    const main = drawn.find(x => x.t.key === 'overall') || drawn[0];
    dailyCard = main.stored.card;
    dailyTypeKey = main.t.key;
    const fortune = getDailyFortune(dailyCard, main.t.key) || { grade: '中平', typeLabel: main.t.label };
    const hook = getFriendCircleHook(dailyCard);
    const tags = getFortuneTags(dailyCard, main.t.key).slice(0, 3);
    const colorCls = getCardColor(dailyCard);
    const rank = dailyCard.isJoker ? dailyCard.type : dailyCard.rank;
    const suit = dailyCard.isJoker ? '' : dailyCard.suit;
    const wx = getWuxing(dailyCard);
    dailyBanner = bannerShell({
      theme: 'daily',
      label: `🌤 今日日运 · ${main.t.icon}${main.t.label}`,
      sub: `${wx} · ${fortune.grade} · ${fortune.mood || ''}`,
      cardCls: colorCls, cardText: rank + suit, goldBorder: false,
      title: hook.title, line: hook.line, tags,
      shareId: 'dailyBannerShareBtn',
      viewHTML: `<button class="small outline" style="color:var(--cinnabar-text);border-color:rgba(var(--cinnabar-rgb),0.67);" data-action="openPeriodDetail" data-period="daily" data-fortune-type="${main.t.key}">查看解读</button>`,
    });
  }

  if (!dailyBanner) {
    dailyBanner = `
      <div style="flex:1 1 300px;min-width:280px;background:rgba(25,22,28,0.85);border:1px dashed rgba(var(--cinnabar-rgb),0.53);border-radius:12px;padding:14px 16px;display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;backdrop-filter:blur(4px);">
        <div style="font-size:0.78rem;color:var(--ink-ghost);">
          <span style="color:var(--cinnabar-text);font-weight:700;">🌤 今日日运</span>
          <span style="opacity:0.85;"> · 每天一签 · 只存本机</span>
        </div>
        <button id="drawDailyBannerBtn" style="background:var(--cinnabar);color:#f6efdd;border:none;padding:7px 18px;border-radius:18px;font-size:0.8rem;font-weight:700;cursor:pointer;">抽一张</button>
      </div>
    `;
  }

  setHTML(el, `
    <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:stretch;">
      ${paigeBanner}
      ${dailyBanner}
    </div>
  `);

  el.querySelector('#drawPaigeBannerBtn')?.addEventListener('click', () => {
    import('./ui-paige.js').then(m => m.openPaiGe());
  });
  el.querySelector('#drawDailyBannerBtn')?.addEventListener('click', () => {
    import('./ui-modal.js').then(m => m.showDailyFortunePicker());
  });
  el.querySelector('#paigeBannerShareBtn')?.addEventListener('click', () => {
    if (paigeCard) {
      import('./ui-modal.js').then(m => m.generateShareImage({ type: 'paige', card: paigeCard, template: 'tarot' }));
    }
  });
  el.querySelector('#dailyBannerShareBtn')?.addEventListener('click', () => {
    if (dailyCard) {
      import('./ui-modal.js').then(m => m.generateShareImage({ type: 'daily', card: dailyCard, typeKey: dailyTypeKey, fortuneType: dailyTypeKey, template: 'mint' }));
    }
  });
}

// ===== 周期卡渲染（牌灵卡 + 日运细选 + 周/月/季/年） =====

// 财运连续打卡天数（从今天向前数，断签即停）
function getDailyStreak(storedPeriods, typeKey, maxDays = 7) {
  let streak = 0;
  for (let i = 0; i < maxDays; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    const rec = storedPeriods[`daily_${typeKey}`];
    if (rec && rec.periodKey === key) streak++;
    else break;
  }
  return streak;
}

export function renderPeriodCards() {
  const area = document.getElementById('periodCardArea');
  if (!area) return;
  setHTML(area, '');

  const storedPeriods = getStoredPeriodCards();
  const todayKey = getCurrentPeriodKey('daily');

  // 1. 牌灵卡（独立存储 key 'fsp_paige'）
  let paigeHTML = '';
  try {
    const raw = localStorage.getItem('fsp_paige');
    if (raw) {
      const paigeData = JSON.parse(raw);
      if (paigeData && paigeData.card) {
        const card = paigeData.card;
        const colorCls = getCardColor(card);
        const rank = card.isJoker ? card.type : card.rank;
        const suit = card.isJoker ? '' : card.suit;
        const wx = getWuxing(card);
        paigeHTML = `
          <div style="display:flex;flex-direction:column;align-items:center;cursor:pointer;padding:6px;border-radius:8px;flex-shrink:0;" data-action="openPaiGe" title="我的牌灵">
            <div class="mini-card ${colorCls}" style="width:44px;height:62px;font-size:0.9rem;border-radius:6px;border:2px solid var(--accent);">${escapeForHTML(rank + suit)}</div>
            <div style="font-size:0.5rem;color:var(--accent);margin-top:3px;">♟ 牌灵</div>
            <div style="font-size:0.45rem;color:var(--ink-faint);">${wx}</div>
          </div>
        `;
      }
    }
  } catch (e) { /* 忽略损坏数据 */ }

  // 2. 日运细选卡
  let dailyCardsHTML = '';
  DAILY_FORTUNE_TYPES.forEach(t => {
    const stored = storedPeriods[`daily_${t.key}`];
    if (!stored || stored.periodKey !== todayKey || !stored.card) return;
    const card = stored.card;
    const colorCls = getCardColor(card);
    const rank = card.isJoker ? card.type : card.rank;
    const suit = card.isJoker ? '' : card.suit;
    const wx = getWuxing(card);
    dailyCardsHTML += `
      <div style="display:flex;flex-direction:column;align-items:center;cursor:pointer;padding:6px;border-radius:8px;flex-shrink:0;" data-action="openPeriodDetail" data-period="daily" data-fortune-type="${t.key}" title="${t.label}运势">
        <div class="mini-card ${colorCls}" style="width:44px;height:62px;font-size:0.9rem;border-radius:6px;">${escapeForHTML(rank + suit)}</div>
        <div style="font-size:0.5rem;color:var(--accent);margin-top:3px;">${t.icon} ${t.label}</div>
        <div style="font-size:0.45rem;color:var(--ink-faint);">${wx}</div>
      </div>
    `;
  });

  // 3. 周/月/季/年卡
  let otherCardsHTML = '';
  Object.entries(PERIODS).filter(([key]) => key !== 'daily').forEach(([key, p]) => {
    const periodKey = getCurrentPeriodKey(key);
    const stored = storedPeriods[key];
    if (!stored || stored.periodKey !== periodKey || !stored.card) return;
    const card = stored.card;
    const colorCls = getCardColor(card);
    const rank = card.isJoker ? card.type : card.rank;
    const suit = card.isJoker ? '' : card.suit;
    const wx = getWuxing(card);
    otherCardsHTML += `
      <div style="display:flex;flex-direction:column;align-items:center;cursor:pointer;padding:6px;border-radius:8px;flex-shrink:0;" data-action="openPeriodDetail" data-period="${key}" title="${p.label}">
        <div class="mini-card ${colorCls}" style="width:44px;height:62px;font-size:0.9rem;border-radius:6px;">${escapeForHTML(rank + suit)}</div>
        <div style="font-size:0.5rem;color:var(--accent);margin-top:3px;">${p.label}</div>
        <div style="font-size:0.45rem;color:var(--ink-faint);">${wx}</div>
      </div>
    `;
  });

  const html = paigeHTML + dailyCardsHTML + otherCardsHTML;

  // 收藏向心力：财运连续打卡徽章（灰 → 满 7 天变金）
  const wealthStreak = getDailyStreak(storedPeriods, 'wealth');
  const streakBadge = wealthStreak > 0
    ? `<div class="streak-badge ${wealthStreak >= 7 ? 'lit' : ''}">${wealthStreak >= 7 ? '🏆 财运连续 7 天' : `💰 财运打卡 ${wealthStreak}/7`}</div>`
    : '';

  if (!html && !streakBadge) {
    setHTML(area, `
      <div class="empty-state" style="flex:1 1 100%;">
        <div class="empty-card">◆</div>
        <div class="empty-text">还没有签：点上方「今日运势」或「抽一张」开始</div>
        <div class="empty-sub">日运 · 周运 · 月运 · 牌灵，都在这条横条里安家</div>
      </div>
    `);
    return;
  }
  setHTML(area, `<div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center;align-items:center;">${html}${streakBadge}</div>`);
}

// ===== 布阵步骤 =====
export function renderStep2() {
  const core = document.getElementById('coreArea');
  if (!core) return;
  const seqHint = state.manualMode
    ? (state.manualSeq
      ? '📋 顺序录入：依次点击牌堆——第 1 张＝「你」，第 2 张＝「所问之事」，第 3 张起自动按九宫顺序布入。'
      : '🎯 自由放置：先点一张牌选中，再点「你」「所问之事」或九宫宫位放置。')
    : '点击牌堆中的牌选中，再点击「你」或「所问之事」放置；桌面端可直接拖拽。放完点「放牌」。';
  const html = `
    <h3>${state.manualMode ? '手动录入 · 明牌模式' : '选牌 · 放牌'}</h3>
    <div style="font-size:0.8rem;color:var(--dim);margin-bottom:8px;">
      ${seqHint}
      ${state.manualMode ? `<button data-action="toggleManualSeq" class="outline small" style="margin-left:8px;font-size:0.7rem;">${state.manualSeq ? '切换为自由放置' : '切换为顺序录入'}</button>` : ''}
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
      </div>
    </div>
  `;
  setHTML(core, html);
  refreshAll();
}

// 结果页兜底摘要（正常情况下由 ui.js 传入，这里防御双保险）
function buildFallbackSummary() {
  return {
    status: pick(STATUS_POOL),
    reminder: pick(REMINDER_POOL),
    action: pick(ACTION_POOL),
  };
}

// ===== 完整解读结果（30 秒可读完：三句摘要在前，完整解读折叠） =====
export function renderFullReport(text, modules = null, summary = null) {
  if (!summary) summary = buildFallbackSummary();
  const result = document.getElementById('resultArea');
  if (!result) return;

  const summaryHTML = `
    <div style="background:rgba(var(--accent-rgb),0.06);border-left:3px solid var(--accent);padding:12px 16px;border-radius:4px;margin-bottom:12px;">
      <div style="font-size:0.7rem;color:var(--dim);">此刻的你</div>
      <div style="font-size:1.05rem;font-weight:bold;margin:4px 0;line-height:1.6;">${escapeForHTML(summary.status)}</div>
      <div style="font-size:0.7rem;color:var(--dim);margin-top:8px;">一个提醒</div>
      <div style="font-size:0.9rem;line-height:1.6;">${escapeForHTML(summary.reminder)}</div>
      <div style="font-size:0.7rem;color:var(--dim);margin-top:8px;">一句建议</div>
      <div style="font-size:0.9rem;line-height:1.6;color:var(--accent);">${escapeForHTML(summary.action)}</div>
    </div>
  `;

  const html = `
    <h3>${escapeForHTML(UI_TEXTS.step3)}</h3>
    ${state.consultMode && state.consultName ? `<p style="font-size:0.8rem;color:var(--dim);text-align:center;margin-bottom:6px;">🧑 为「${escapeForHTML(state.consultName)}」所问</p>` : ''}
    <div id="durianDisplay" style="margin-bottom:8px;"></div>
    ${summaryHTML}
    <details style="margin-top:8px;font-size:0.8rem;color:var(--dim);">
      <summary style="cursor:pointer;">查看完整解读</summary>
      <div class="result-block" id="interpretText" style="font-size:0.88rem;line-height:1.9;max-height:55vh;overflow-y:auto;padding:14px;margin-top:8px;white-space:pre-wrap;">${escapeForHTML(text)}</div>
    </details>
    <div class="closing-line">
      <div class="closing-mark">· — ·</div>
      <div class="closing-text">「${escapeForHTML(getClosingLine())}」</div>
    </div>
    <div class="btn-row actions-row">
      <button data-action="copyLocal" class="small">复制</button>
      <button data-action="shareImage" class="outline small">分享这一刻</button>
      <button data-action="shareCode" class="outline small">分享码</button>
      <button data-action="quickDraw" class="small">再抽一次</button>
    </div>
  `;
  setHTML(result, html);
  renderDurianDisplay();
  // 送客一声（尺八，收尾鞠躬）
  try { playClosingSound(); } catch (e) { /* 静默 */ }
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
  setHTML(bar, `<div class="slot" id="tiSlot">你 ${tiHTML}</div><span class="separator">⚡</span><div class="slot" id="yongSlot">所问之事 ${yongHTML}</div>${badge}`);
  const btn = document.getElementById('btnConfirmTY');
  if (btn) btn.disabled = !(state.ti && state.yong);
}

// ===== 九宫格（逐牌差值） =====
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
        return `<span class="diff-label" style="color:${level.color}">差值：${g} - ${getDiffValue(c)} = ${abs}（${level.label}，${direction}）</span>`;
      }).join('<br>');
      inner += diffLabels;
    } else {
      inner += '<span class="empty-label">空</span>';
    }

    if (lineLabel) inner += `<span style="display:block;font-size:0.55rem;color:var(--accent);">${lineLabel}</span>`;

    return `<div class="gong ${cls}" data-gong="${g}">${inner}</div>`;
  }).join('');
}

// ===== 九宫按钮区（动态渲染封印按钮，天机线连成后出现） =====
export function renderGridButtons() {
  const row = document.querySelector('#gridArea .btn-row');
  if (!row) return;
  const old = row.querySelector('[data-action="sealDeck"]');
  if (old) old.remove();
  if (!state.manualMode && state.line && !state.sealed) {
    const btn = document.createElement('button');
    btn.dataset.action = 'sealDeck';
    btn.className = 'outline small';
    btn.textContent = '🔒 封印';
    row.appendChild(btn);
  }
}

// ===== 刷新所有 =====
export function refreshAll() {
  renderDeck();
  renderTiYong();
  renderGrid();
  renderGridButtons();
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

// ===== 张力指数显示（克制：色条 + 数字，无装饰图形） =====
export function renderDurianDisplay() {
  const container = document.getElementById('durianDisplay');
  if (!container) return;
  if (!state.ti || !state.yong || Object.keys(state.grid).length === 0) {
    setHTML(container, '');
    return;
  }
  const result = calculateDurianIndex(state);
  state.durianIndex = result;
  const color = getDurianColor(result.score);
  const pct = Math.round(result.score * 10);
  const html = `<div style="display:flex;align-items:center;gap:10px;padding:8px 12px;background:rgba(0,0,0,0.2);border-radius:8px;margin:4px 0;">
    <div style="flex:1;min-width:0;">
      <div style="display:flex;justify-content:space-between;align-items:baseline;">
        <span style="font-size:0.75rem;color:var(--dim);">张力指数</span>
        <span class="num" style="font-weight:bold;font-size:0.9rem;">${result.score}/10 <span style="color:${color};font-size:0.7rem;">（${result.level}）</span></span>
      </div>
      <div style="height:4px;background:rgba(255,255,255,0.12);border-radius:2px;margin:6px 0 4px;overflow:hidden;">
        <div style="width:${pct}%;height:100%;background:${color};border-radius:2px;transition:width .3s ease;"></div>
      </div>
      <div style="font-size:0.7rem;color:var(--dim);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeForHTML(result.description)}</div>
    </div>
  </div>`;
  setHTML(container, html);
}

// ===== 设置面板（含AI高级参数回填） =====
export function initSettingsPanel() {
  const s = getApiSettings();
  if (s) {
    // 厂商按钮选中状态
    document.querySelectorAll('#providerGrid button').forEach(b => b.classList.toggle('selected', b.dataset.value === s.provider));

    // 基础字段
    const keyInput = document.getElementById('apiKey');
    if (keyInput) keyInput.value = s.apiKey || '';
    const endpointInput = document.getElementById('apiEndpoint');
    if (endpointInput) endpointInput.value = s.endpoint || '';
    const modelInput = document.getElementById('apiModel');
    if (modelInput) modelInput.value = s.model || '';
    const styleSelect = document.getElementById('aiStyle');
    if (styleSelect) styleSelect.value = s.aiStyle || 'guide';

    // AI高级参数回填
    const temperatureInput = document.getElementById('aiTemperature');
    if (temperatureInput) temperatureInput.value = s.temperature !== undefined ? s.temperature : 0.7;
    const maxTokensInput = document.getElementById('aiMaxTokens');
    if (maxTokensInput) maxTokensInput.value = s.maxTokens || 4096;
    const topPInput = document.getElementById('aiTopP');
    if (topPInput) topPInput.value = s.topP !== undefined ? s.topP : 0.9;
    const headersInput = document.getElementById('aiHeaders');
    if (headersInput) headersInput.value = s.headers ? JSON.stringify(s.headers) : '';

    // 如果选择了厂商默认模型，但 model 为空，自动填充默认模型
    if (!s.model && s.provider && API_PROVIDERS[s.provider]) {
      if (modelInput) modelInput.placeholder = API_PROVIDERS[s.provider].model || '';
    }
  }
  updateApiStatus();

  // 高级面板折叠切换
  const advToggle = document.getElementById('aiAdvToggle');
  const advPanel = document.getElementById('aiAdvPanel');
  if (advToggle && advPanel) {
    if (!advToggle.dataset.bound) {
      advToggle.addEventListener('click', function() {
        advPanel.classList.toggle('open');
        this.textContent = advPanel.classList.contains('open') ? '⚙ 高级参数 ▲' : '⚙ 高级参数';
      });
      advToggle.dataset.bound = 'true';
    }
  }
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
  const html = history.map((r, i) => `<div class="history-item" data-index="${i}" style="cursor:pointer;margin:8px 0;padding:10px 12px;background:rgba(255,255,255,0.03);border-radius:6px;border:1px solid rgba(255,255,255,0.05);"><strong class="num">${escapeForHTML(new Date(r.time).toLocaleString())}</strong><span style="color:var(--dim);margin-left:8px;">${escapeForHTML(r.question || '未提问')} (${escapeForHTML(r.category || '无')})</span></div>`).join('');
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