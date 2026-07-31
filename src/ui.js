// ===== src/ui.js · 业务主控中心 + 事件绑定 + 动作分发 =====
import { state, $, $$ } from './state.js';
import { injectAnimations } from './ui/ui-anim.js';
import {
  renderStep1, renderStep2, renderStep3, renderHistoryPanel,
  initSettingsPanel, initProfilePanel, updateApiStatus, refreshAll,
  renderModeSelector, renderDurianDisplay, bindScrollButtons
} from './ui/ui-render.js';
import {
  toast, guardMidnight, showOnboarding, showPrivacyWarning,
  showTimeCapsule, showDurianReport, togglePanel,
  showDailyFortune, showHistoryDetail, generateShareCode, importShareCode,
  generateShareImage, saveShareImage, showAIGuideModal
} from './ui/ui-modal.js';
import { initDrag, destroyDrag, removeLineSelector, sealDeck, isCardPlaced, findCardById, placeCardOnGong, placeCardOnTiYong, setLine } from './ui/ui-drag.js';
import {
  getApiSettings, saveApiSettings, clearApiSettings, getProfile, saveProfile,
  hasCompletedOnboarding, completeOnboarding, getDrawTimestamps, addDrawTimestamp,
  saveReading, addTimelineEntry, saveTimeCapsule, getTimeCapsule,
  deleteHistoryItem, exportAllData
} from './storage.js';
import { requestReading, requestFollowUp, testApiConnection } from './ai.js';
import {
  createDeck, shuffle, drawTiYong, calcDiff, detectLines, calcFullBaZi,
  calcYearPillar, checkUsageFrequency, getDiffLevel
} from './engine.js';
import {
  API_PROVIDERS, getShengKe, getShengKeLabel, getWangState, getWuxing,
  getCardValue, GONG_NAMES, GONG_WUXING, ALL_LINES, TIME_LABELS, GONG_ORDER,
  CATEGORIES
} from './data.js';
import { MAX_DAILY_OBSERVATIONS, MODES } from './constants.js';
import { UI_TEXTS } from './texts/index.js';
import { calculateDurianIndex } from './durian.js';
import {
  generateChaosSeed, seedToX0, chaoticGenerator, chaoticShuffle,
  generateFingerprint, validateFingerprint
} from './chaos.js';
import { getEntropyBuffer, resetEntropy, startEntropyCollection, stopEntropyCollection } from './entropy.js';
import { interceptQuestion, checkDependency, getSealStatus } from './philosophy/ethics.js';
import { applyCovenant } from './philosophy/covenant.js';

// --- 基础函数 ---
function mulberry32(a) {
  return function() {
    a |= 0;
    a = a + 0x6D2B79F5 | 0;
    var t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

// --- 核心业务逻辑 ---
export function updateStep(n) {
  state.step = n;
  for (let i = 1; i <= 3; i++) {
    const el = document.getElementById('sd' + i);
    if (!el) continue;
    el.classList.remove('active', 'done');
    if (i < n) el.classList.add('done');
    if (i === n) el.classList.add('active');
  }
}

export function getBaziFromProfile() {
  try {
    const profile = getProfile();
    if (!profile || !profile.birthDate) return null;
    const parts = profile.birthDate.split('-');
    if (parts.length !== 3) return null;
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]);
    const day = parseInt(parts[2]);
    if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
    let hour = 12;
    if (profile.birthTime) {
      const tp = profile.birthTime.split(':');
      if (tp.length >= 1) hour = parseInt(tp[0]) || 12;
    }
    return calcFullBaZi(year, month, day, hour);
  } catch (e) { return null; }
}

export function detectIntent(question, category) {
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

// ===== 动态加载词库 =====
export async function localInterpretation() {
  const readings = await import('./texts/texts-readings.js');
  const tiWx = getWuxing(state.ti), yongWx = getWuxing(state.yong);
  const relation = getShengKe(tiWx, yongWx);
  const intent = detectIntent(state.question, state.category);
  state.intent = intent;
  let result = '';

  // 嵌入个人信息
  const profile = getProfile();
  if (profile) {
    let personalInfo = '';
    if (profile.name) personalInfo += `【求测人】${profile.name}`;
    if (profile.gender) personalInfo += `（${profile.gender}）`;
    if (profile.birthPlace) personalInfo += `，生于${profile.birthPlace}`;
    if (profile.currentPlace) personalInfo += `，现居${profile.currentPlace}`;
    if (personalInfo) result += personalInfo + '\n\n';
  }

  if (state.category) result += `【领域：${state.category}】\n\n`;
  const bazi = getBaziFromProfile();
  if (bazi) result += `【四柱】${bazi.fullText}\n\n`;
  result += `体牌为${tiWx}，代表你。用牌为${yongWx}，代表所问之事。\n`;
  if (relation) result += `（${relation} ${getShengKeLabel(relation)}）\n\n`;
  if (state.line) {
    result += `天机线：${state.line.map(g => GONG_NAMES[g] + '宫').join(' → ')}\n\n`;
  }
  const allGongs = state.gongOrder.length ? state.gongOrder : Object.keys(state.grid).map(Number);
  for (const g of allGongs) {
    const cards = state.grid[g] || [];
    if (!cards.length) continue;
    cards.forEach(card => {
      const diff = calcDiff(g, card);
      const wang = getWangState(getWuxing(card), GONG_WUXING[g]);
      const relToTi = getShengKe(tiWx, getWuxing(card));
      const linePos = state.line ? state.line.indexOf(g) : -1;
      const linePosition = linePos === 0 ? 'start' : linePos === 1 ? 'middle' : linePos === 2 ? 'end' : 'offline';
      const diffLevel = getDiffLevel(diff);
      const ctx = {
        gong: { id: g, name: GONG_NAMES[g], element: GONG_WUXING[g] },
        card: { element: getWuxing(card), value: getCardValue(card), suit: card.suit },
        tiYongRelation: relToTi || '同我',
        wangState: wang,
        linePosition: linePosition,
        diff: diff,
        intent: intent
      };
      const readingResult = readings.generateFullReading(ctx);
      const label = state.lineOrder[g] || GONG_NAMES[g] + '宫';
      result += `【${label}】差值 ${diff}（${diffLevel.desc}）\n${readingResult.light}\n\n---\n${readingResult.shadow}\n\n`;
    });
  }

  const durian = calculateDurianIndex(state);
  if (durian) {
    state.durianIndex = durian;
    result += `\n🍈 榴莲指数：${durian.score}/10（${durian.level}）\n${durian.description}\n`;
  }

  result = applyCovenant(result);
  return result.trim();
}

export async function generateInterpretation() {
  const seal = getSealStatus();
  if (seal && seal.sealed) {
    toast(`🔒 封卦中，剩余 ${seal.daysRemaining} 天`);
    return;
  }

  const timestamps = getDrawTimestamps();
  const depCheck = checkDependency(timestamps);
  if (depCheck.level === 'blocked') {
    toast(depCheck.message, 4000);
    return;
  }
  if (depCheck.level === 'warning') {
    toast(depCheck.message, 4000);
  }

  const todayCount = timestamps.filter(ts => new Date(ts).toDateString() === new Date().toDateString()).length;
  const usage = checkUsageFrequency(timestamps);
  if (!state.userCorpus.includes(state.question)) state.userCorpus.push(state.question);
  const text = await localInterpretation();
  updateStep(3);
  renderStep3(text);

  const interpretEl = document.getElementById('interpretText');
  if (interpretEl && todayCount >= MAX_DAILY_OBSERVATIONS && !localStorage.getItem('fs_limit_alert_today')) {
    const alertHTML = `<div style="margin-top:15px;font-size:0.75rem;color:var(--dim);border-top:1px solid rgba(255,255,255,0.05);padding-top:10px;">※ 今日已观测 ${MAX_DAILY_OBSERVATIONS} 次以上，镜面易起雾，请注意休息。</div>`;
    interpretEl.innerHTML += alertHTML;
    localStorage.setItem('fs_limit_alert_today', 'true');
  }
  if (usage.level !== 'normal') toast(usage.message, 4000);

  try {
    const readingData = {
      time: Date.now(),
      question: state.question,
      category: state.category,
      intent: state.intent,
      ti: state.ti,
      yong: state.yong,
      grid: state.grid,
      line: state.line,
      lineOrder: state.lineOrder,
      text,
      chatHistory: state.chatHistory.slice(),
      durianScore: state.durianIndex?.score || 0,
    };
    saveReading(readingData);
    addTimelineEntry(readingData);
  } catch (e) { toast('历史记录保存失败，但解读仍然有效'); }
  addDrawTimestamp(Date.now());

  if (!getTimeCapsule()) {
    saveTimeCapsule({
      question: state.question,
      text: text.slice(0, 500),
      timestamp: Date.now()
    });
  }
}

export async function buildAIPrompt() {
  const localText = await localInterpretation();
  const profile = getProfile();
  let personalPrefix = '';
  if (profile) {
    let parts = [];
    if (profile.name) parts.push(`姓名：${profile.name}`);
    if (profile.gender) parts.push(`性别：${profile.gender}`);
    if (profile.birthPlace) parts.push(`出生地：${profile.birthPlace}`);
    if (profile.currentPlace) parts.push(`现居地：${profile.currentPlace}`);
    if (parts.length) personalPrefix = '【求测人信息】' + parts.join('，') + '\n\n';
  }
  return `${personalPrefix}请根据以下浮生牌局象进行详细解读。\n\n要求：纯文本格式，严禁使用任何Markdown符号。用自然语言分段。从体用生克、时空推演、宫位差值、旺相休囚、阴阳属性等方面展开。话不说死。\n\n${localText}\n\n规则：红桃火(阳) 方块金(阳) 梅花木(阴) 黑桃水(阴) JQK土 大王天(阳) 小王人(阴)。`;
}

// ===== 【修正】resetAll：彻底清空残留 =====
export function resetAll() {
  if (!confirm('此阵一散，当下映照便消逝，确要重来吗？')) return;
  Object.assign(state, {
    question: '', category: '', deck: [], ti: null, yong: null,
    grid: {}, line: null, lineOrder: {}, step: 1, sel: null,
    possible: [], manualMode: false, gongOrder: [], chatHistory: [],
    uid: Date.now() % 1000000, editCount: 0, refinementTags: {},
    intent: null, fingerprint: null, entropyLevel: 0, chaosSeed: null,
    sealed: false, sealedAt: null, durianIndex: null
  });
  resetEntropy();
  // 强制清空结果区和体用栏
  const resultArea = document.getElementById('resultArea');
  if (resultArea) resultArea.innerHTML = '';
  const tiyongBar = document.getElementById('tiyongBar');
  if (tiyongBar) tiyongBar.innerHTML = '';
  updateStep(1);
  renderStep1();
  toast(UI_TEXTS.toastReset);
}

export function startQuestion() {
  guardMidnight(() => proceedStartQuestion());
}

function proceedStartQuestion() {
  const input = document.getElementById('questionInput');
  const q = input?.value?.trim() || '';
  if (q) {
    const intercept = interceptQuestion(q);
    if (intercept.blocked) {
      const core = document.getElementById('coreArea');
      if (core) {
        core.innerHTML = `<div class="panel"><h3>提示</h3><p style="color:var(--dim);font-size:0.9rem;">${intercept.message}</p><button data-action="resetAll" class="small">返回</button></div>`;
      }
      return;
    }
  }
  state.question = q;
  state.manualMode = false;
  state.uid = Date.now() % 1000000;
  state.fingerprint = null;
  state.sealed = false;

  (async () => {
    state.loading = true;
    try {
      startEntropyCollection();
      await new Promise(r => setTimeout(r, 300));
      const entropy = getEntropyBuffer();
      stopEntropyCollection();

      const seed = await generateChaosSeed(entropy.length > 0 ? entropy : new Uint8Array([Date.now() % 256]));
      state.chaosSeed = seed;
      const x0 = seedToX0(seed);
      const gen = chaoticGenerator(x0);
      const deck = createDeck(false);
      const shuffled = chaoticShuffle(deck, gen);
      state.deck = shuffled;
      state.fingerprint = generateFingerprint(shuffled);

      state.ti = null;
      state.yong = null;
      state.grid = {};
      state.line = null;
      state.lineOrder = {};
      state.sel = null;
      state.possible = [];
      state.chatHistory = [];
      state.gongOrder = [];
      state.editCount = 0;
      state.refinementTags = {};
      state.intent = null;

      updateStep(2);
      renderStep2();
    } finally {
      state.loading = false;
    }
  })();
}

export function startManualEntry() {
  guardMidnight(() => {
    const input = document.getElementById('questionInput');
    state.question = input?.value?.trim() || '';
    state.manualMode = true;
    state.uid = Date.now() % 1000000;
    state.deck = createDeck(true);
    state.ti = null;
    state.yong = null;
    state.grid = {};
    state.line = null;
    state.lineOrder = {};
    state.sel = null;
    state.possible = [];
    state.chatHistory = [];
    state.gongOrder = [];
    state.editCount = 0;
    state.refinementTags = {};
    state.intent = null;
    state.fingerprint = null;
    state.sealed = false;
    updateStep(2);
    renderStep2();
  });
}

export function lazyStart() {
  guardMidnight(() => proceedLazyStart());
}

async function proceedLazyStart() {
  const input = document.getElementById('questionInput');
  state.question = input?.value?.trim() || '';
  state.manualMode = false;
  startEntropyCollection();
  await new Promise(r => setTimeout(r, 300));
  const entropy = getEntropyBuffer();
  stopEntropyCollection();

  const seed = await generateChaosSeed(entropy.length > 0 ? entropy : new Uint8Array([Date.now() % 256]));
  state.chaosSeed = seed;
  const x0 = seedToX0(seed);
  const gen = chaoticGenerator(x0);
  let deck = createDeck(false);
  const shuffled = chaoticShuffle(deck, gen);
  state.fingerprint = generateFingerprint(shuffled);

  const { ti, yong, remaining } = drawTiYong(shuffled);
  state.ti = ti;
  state.yong = yong;
  let remainingDeck = remaining;
  remainingDeck.push({ isJoker: true, type: '大王', _uid: state.uid++ }, { isJoker: true, type: '小王', _uid: state.uid++ });
  remainingDeck = shuffle(remainingDeck);
  const line = ALL_LINES[Math.floor(mulberry32(seedToX0(seed) * 10000)() * ALL_LINES.length)];
  state.line = [...line];
  const key = line.join(',');
  const tl = TIME_LABELS[key] || {};
  state.lineOrder = {};
  state.lineOrder[line[0]] = '起因';
  state.lineOrder[line[1]] = '经过';
  state.lineOrder[line[2]] = '结果';
  for (let g = 1; g <= 9; g++) {
    if (!state.lineOrder[g]) state.lineOrder[g] = tl[g] || '';
  }
  for (const g of line) state.grid[g] = [remainingDeck.pop()];
  for (const g of GONG_ORDER) {
    if (!state.grid[g] && remainingDeck.length) state.grid[g] = [remainingDeck.pop()];
  }
  state.deck = remainingDeck;
  state.gongOrder = line.slice();
  state.sealed = true;

  updateStep(3);
  const text = await localInterpretation();
  renderStep3(text);
  toast(`🔒 牌局已自动封印`, 3000);
}

export function resetStep2() {
  if (state.sealed) {
    toast('牌局已封印，不可重置');
    return;
  }
  if (state.ti) {
    state.deck.push(state.ti);
    state.ti = null;
  }
  if (state.yong) {
    state.deck.push(state.yong);
    state.yong = null;
  }
  state.deck = shuffle(state.deck);
  state.sel = null;
  refreshAll();
  if (state.step === 2) {
    renderStep2();
  } else {
    updateStep(2);
    renderStep2();
  }
  toast('体用已重置，可重新选牌');
}

export function confirmTiYong() {
  if (!state.ti || !state.yong) {
    toast('请先选好体用牌');
    return;
  }
  if (state.sealed) {
    toast('牌局已封印');
    return;
  }
  state.deck.push({ isJoker: true, type: '大王', _uid: state.uid++ }, { isJoker: true, type: '小王', _uid: state.uid++ });
  state.deck = shuffle(state.deck);
  const gridArea = document.getElementById('gridArea');
  if (gridArea) gridArea.style.display = 'block';
  const deckEl = document.getElementById('deckContainer');
  if (deckEl) {
    deckEl.classList.add('shuffling');
    setTimeout(() => deckEl.classList.remove('shuffling'), 700);
  }
  toast(UI_TEXTS.toastJokersInjected);
  refreshAll();
}

export function resetGrid() {
  if (state.sealed) {
    toast('牌局已封印，不可修改');
    return;
  }
  for (const g in state.grid) {
    state.deck.push(...state.grid[g]);
  }
  state.grid = {};
  state.line = null;
  state.lineOrder = {};
  state.possible = [];
  state.gongOrder = [];
  state.sel = null;
  state.deck = state.manualMode ? state.deck : shuffle(state.deck);
  removeLineSelector();
  refreshAll();
  toast(UI_TEXTS.toastGridCleared);
}

export function sealDeckAction() { sealDeck(); }
export function switchMode(mode) {
  if (!Object.values(MODES).includes(mode)) return;
  state.mode = mode;
  refreshAll();
  toast(`切换到 ${mode} 模式`);
}
export function showTimeCapsuleAction() { showTimeCapsule(); }
export function showDurianReportAction() { showDurianReport(); }
export function copyLocalResult() {
  const el = document.getElementById('interpretText');
  if (!el) return;
  navigator.clipboard.writeText(el.innerText).then(
    () => toast(UI_TEXTS.toastCopied),
    () => toast(UI_TEXTS.toastCopyFailed)
  );
}

export function saveApiSettingsFromForm() {
  const p = state.selectedProvider || 'deepseek';
  const info = API_PROVIDERS[p] || API_PROVIDERS.deepseek;
  let endpoint = document.getElementById('apiEndpoint')?.value?.trim() || info.endpoint || '';
  if (endpoint.endsWith('/')) endpoint = endpoint.slice(0, -1);
  const apiKey = document.getElementById('apiKey')?.value?.trim() || '';
  const settings = {
    provider: p,
    apiKey: apiKey,
    endpoint: endpoint,
    model: info.model || '',
    aiStyle: document.getElementById('aiStyle')?.value || 'guide'
  };
  saveApiSettings(settings);
  updateApiStatus();
  toast(UI_TEXTS.toastSaved);
}

export function saveProfileFromForm() {
  const bd = document.getElementById('birthDate')?.value || '';
  const bt = document.getElementById('birthTime')?.value || '';
  const name = document.getElementById('profileName')?.value?.trim() || '';
  const gender = document.getElementById('profileGender')?.value || '';
  const birthPlace = document.getElementById('birthPlace')?.value?.trim() || '';
  const currentPlace = document.getElementById('currentPlace')?.value?.trim() || '';
  saveProfile({ birthDate: bd, birthTime: bt, name, gender, birthPlace, currentPlace });
  toast(UI_TEXTS.toastProfileSaved);
}

export function checkEthicalBoundary(question) {
  const intercept = interceptQuestion(question);
  return { blocked: intercept.blocked, message: intercept.message || '' };
}

// ===== 【修正】triggerAI：未配置时引导弹窗 =====
export async function triggerAI() {
  const btn = document.getElementById('aiReadBtn');
  if (!btn) return;
  const settings = getApiSettings();
  if (!settings || !settings.apiKey) {
    showAIGuideModal();
    return;
  }
  btn.disabled = true;
  btn.textContent = '思考中...';
  const provider = settings.provider || 'deepseek';
  let endpoint = settings.endpoint || API_PROVIDERS[provider]?.endpoint || '';
  if (endpoint.endsWith('/v1')) endpoint = endpoint.slice(0, -3);
  if (endpoint.endsWith('/')) endpoint = endpoint.slice(0, -1);
  const model = settings.model || API_PROVIDERS[provider]?.model || '';
  const prompt = await buildAIPrompt();
  try {
    const result = await requestReading({
      provider, apiKey: settings.apiKey, endpoint, model,
      style: settings.aiStyle || 'guide', prompt
    });
    const container = document.getElementById('aiResultContainer');
    const content = document.getElementById('aiResultContent');
    if (container) container.style.display = 'block';
    if (content) content.innerHTML = '<strong>深层解读：</strong><br>' + result.replace(/\n/g, '<br>');
    state.chatHistory = [{ role: 'user', content: prompt }, { role: 'assistant', content: result }];
    const followUp = document.getElementById('followUpArea');
    if (followUp) followUp.style.display = 'block';
    toast('解读完成');
  } catch (e) {
    const container = document.getElementById('aiResultContainer');
    if (container) container.style.display = 'block';
    const content = document.getElementById('aiResultContent');
    const fallbackText = await localInterpretation();
    if (content) {
      content.innerHTML =
        `<div style="color:#c9a060;border:1px solid #c9a060;padding:8px;border-radius:6px;margin-bottom:8px;font-size:0.85rem;">⚠️ AI 服务暂时无法连接，以下为规则引擎生成的原始解读：</div>${fallbackText.replace(/\n/g, '<br>')}`;
    }
    toast('AI 不可用，已展示规则解读', 3000);
  } finally {
    btn.disabled = false;
    btn.textContent = UI_TEXTS.btnAIDeepRead;
  }
}

export async function sendFollowUp() {
  const input = document.getElementById('followUpInput');
  if (!input) return;
  const q = input.value.trim();
  if (!q) return;
  input.value = '';
  const settings = getApiSettings();
  if (!settings || !settings.apiKey) {
    toast('未配置 API Key');
    return;
  }
  const history = state.chatHistory;
  if (!history || history.length < 2) {
    toast('请先进行一次 AI 解读');
    return;
  }
  history.push({ role: 'user', content: q });
  const chatBlock = document.getElementById('chatHistoryBlock');
  if (chatBlock) chatBlock.innerHTML += `<div class="chat-msg user">${q}</div>`;
  const provider = settings.provider || 'deepseek';
  let endpoint = settings.endpoint || API_PROVIDERS[provider]?.endpoint || '';
  if (endpoint.endsWith('/v1')) endpoint = endpoint.slice(0, -3);
  if (endpoint.endsWith('/')) endpoint = endpoint.slice(0, -1);
  const model = settings.model || API_PROVIDERS[provider]?.model || '';
  try {
    const result = await requestFollowUp({ history, provider, apiKey: settings.apiKey, endpoint, model });
    history.push({ role: 'assistant', content: result });
    if (chatBlock) {
      chatBlock.innerHTML += `<div class="chat-msg ai">${result.replace(/\n/g, '<br>')}</div>`;
      chatBlock.scrollTop = chatBlock.scrollHeight;
    }
  } catch (e) {
    if (chatBlock) chatBlock.innerHTML += `<div class="chat-msg" style="color:#d45050">失败：${e.message}</div>`;
  }
}

export async function handleTestApiConnection() {
  const btn = document.querySelector('[data-action="testApiConnection"]');
  if (btn) { btn.disabled = true; btn.textContent = '测试中...'; }
  try {
    const provider = state.selectedProvider || 'deepseek';
    let endpoint = document.getElementById('apiEndpoint')?.value?.trim() || '';
    const apiKey = document.getElementById('apiKey')?.value?.trim() || '';
    if (!apiKey && provider !== 'custom') throw new Error('请先填写 API Key');
    if (!endpoint && API_PROVIDERS[provider]) endpoint = API_PROVIDERS[provider].endpoint;
    if (endpoint.endsWith('/v1')) endpoint = endpoint.slice(0, -3);
    if (endpoint.endsWith('/')) endpoint = endpoint.slice(0, -1);
    const model = API_PROVIDERS[provider]?.model || '';
    const msg = await testApiConnection({ provider, apiKey, endpoint, model });
    toast(msg, 3000);
  } catch (e) {
    toast(`测试失败: ${e.message}`, 4000);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = UI_TEXTS.btnTestApi; }
  }
}

// ============================================
// 动作分发（已修复 break）
// ============================================
export function handleAction(action, dataset) {
  switch (action) {
    case 'togglePanel': togglePanel(dataset.panel); break;
    case 'resetAll': resetAll(); break;
    case 'confirmQuestion': startQuestion(); break;
    case 'lazyStart': lazyStart(); break;
    case 'manualEntry': startManualEntry(); break;
    case 'selectCategory':
      state.category = state.category === dataset.category ? '' : dataset.category;
      document.querySelectorAll('[data-action="selectCategory"]').forEach(b => b.classList.toggle('selected', b.dataset.category === state.category));
      break;
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
    case 'clearApiSettings':
      clearApiSettings();
      const keyInput = document.getElementById('apiKey');
      if (keyInput) keyInput.value = '';
      updateApiStatus();
      toast(UI_TEXTS.toastCleared);
      break;
    case 'testApiConnection': handleTestApiConnection(); break;
    case 'saveProfile': saveProfileFromForm(); break;
    case 'deleteHistoryItem':
      if (dataset.historyIndex !== undefined) {
        deleteHistoryItem(parseInt(dataset.historyIndex));
        renderHistoryPanel();
        document.getElementById('modal')?.setAttribute('hidden', '');
        toast('已删除');
      }
      break;
    case 'importCode': importShareCode(); break;
    case 'dailyFortune': showDailyFortune(); break;
    case 'closeModal': document.getElementById('modal')?.setAttribute('hidden', ''); break;
    case 'closeShare': document.getElementById('sharePreview')?.setAttribute('hidden', ''); break;
    case 'saveShareImage': saveShareImage(); break;
    case 'switchMode': switchMode(dataset.mode); break;
    case 'sealDeck': sealDeckAction(); break;
    case 'timeCapsule': showTimeCapsuleAction(); break;
    case 'durianReport': showDurianReportAction(); break;
  }
}

// ============================================
// 事件绑定
// ============================================
function bindAllEvents() {
  document.addEventListener('click', function(e) {
    const btn = e.target.closest('button');
    if (btn) {
      const action = btn.dataset.action;
      if (action) {
        handleAction(action, btn.dataset);
        return;
      }
    }
    const historyItem = e.target.closest('.history-item');
    if (historyItem && historyItem.dataset.index !== undefined) {
      showHistoryDetail(parseInt(historyItem.dataset.index));
      return;
    }
    const lineBtn = e.target.closest('.line-btn');
    if (lineBtn && lineBtn.dataset.line) {
      setLine(lineBtn.dataset.line.split(',').map(Number));
      return;
    }
    const emptyDash = e.target.closest('.empty-dash');
    if (emptyDash && state.sel) {
      const card = findCardById(state.sel);
      if (card && !isCardPlaced(card)) {
        if (emptyDash.textContent.includes('体')) {
          placeCardOnTiYong(card, 'ti');
        } else {
          placeCardOnTiYong(card, 'yong');
        }
      }
      return;
    }
    const gong = e.target.closest('.gong');
    if (gong && state.sel) {
      const g = parseInt(gong.dataset.gong);
      const card = findCardById(state.sel);
      if (card && !isCardPlaced(card)) {
        placeCardOnGong(card, g);
      }
    }
  });

  document.addEventListener('click', function(e) {
    const b = e.target.closest('#providerGrid button');
    if (b && b.dataset.value) {
      state.selectedProvider = b.dataset.value;
      document.querySelectorAll('#providerGrid button').forEach(x => x.classList.toggle('selected', x === b));
      const info = API_PROVIDERS[state.selectedProvider];
      if (info) {
        const ep = document.getElementById('apiEndpoint');
        if (ep) ep.value = info.endpoint || '';
      }
    }
    const modalEl = document.getElementById('modal');
    if (e.target === modalEl && modalEl) modalEl.setAttribute('hidden', '');
  });

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      const modal = document.getElementById('modal');
      if (modal && !modal.hasAttribute('hidden')) modal.setAttribute('hidden', '');
      const share = document.getElementById('sharePreview');
      if (share && !share.hasAttribute('hidden')) share.setAttribute('hidden', '');
      const onboard = document.querySelector('.onboard-overlay');
      if (onboard) onboard.remove();
    }
  });
}

// ============================================
// 初始化
// ============================================
function init() {
  try {
    updateStep(1);
    renderStep1();
    updateApiStatus();
    const ep = document.getElementById('apiEndpoint');
    if (ep && !ep.value) ep.value = API_PROVIDERS.deepseek.endpoint;
    if (!hasCompletedOnboarding()) showOnboarding();
    injectAnimations();
    bindAllEvents();
    initDrag();
    bindScrollButtons();

    const seal = getSealStatus();
    if (seal && seal.sealed) {
      setTimeout(() => {
        toast(`🔒 封卦中，剩余 ${seal.daysRemaining} 天`, 4000);
      }, 1000);
    }
  } catch (e) {
    document.body.innerHTML =
      '<div style="color:#d45050;padding:40px;text-align:center;font-family:sans-serif;"><h2>浮生牌启动失败</h2><p style="color:var(--dim);font-size:0.9rem;">请检查浏览器控制台（F12）的错误信息，并确认所有文件已正确保存。</p><p style="font-size:0.8rem;">' +
      e.message + '</p></div>';
    console.error(e);
  }
}
document.addEventListener('DOMContentLoaded', init);