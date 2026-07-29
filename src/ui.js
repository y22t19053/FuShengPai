// ===== src/ui.js · 业务主控中心 =====
// 【核心修复】移除对 domModal 的模块导入，改用它最安全的原生获取方式
import { state, $, $$, cacheDom } from './state.js'; 
import { injectAnimations } from './ui/ui-anim.js';
import {
  renderTeachingPanel, renderStep1, renderStep2, renderStep3,
  initSettingsPanel, initProfilePanel, renderHistoryPanel,
  refreshAll, updateDailySignDisplay, updateApiStatus, escapeHtml
} from './ui/ui-render.js';
import {
  selectCard, placeCardOnGong, placeCardOnTiYong, removeCardFromGong,
  checkLines, setLine, renderLineSelector, removeLineSelector,
  startPress, moveDrag, endDrag
} from './ui/ui-drag.js';
import {
  toast, togglePanel, showOnboarding, guardMidnight, showDailyFortune,
  showHistoryDetail, generateShareCode, importShareCode,
  generateShareImage, saveShareImage
} from './ui/ui-modal.js';
import {
  getHistory, saveReading, addDrawTimestamp,
  getApiSettings, saveApiSettings, clearApiSettings,
  getProfile, saveProfile, hasCompletedOnboarding, completeOnboarding,
  exportAllData, getDrawTimestamps
} from './storage.js';
import { checkUsageFrequency } from './engine.js'; 
import { requestReading, requestFollowUp, testApiConnection } from './ai.js';
import {
  createDeck, shuffle, drawTiYong, calcDiff, detectLines, calcFullBaZi, calcYearPillar
} from './engine.js';
import {
  SUITS, RANKS, GONG_ORDER, GONG_NAMES, GONG_WUXING, GONG_DIRECTION,
  ALL_LINES, TIME_LABELS, API_PROVIDERS, CATEGORIES,
  getWuxing, getCardValue, getCardId, getCardColor,
  getShengKe, getShengKeLabel, getWangState
} from './data.js';
import {
  UI_TEXTS, RULES_TEXTS, TUTORIAL_TEXTS, PHYSICAL_GUIDE,
  REFUSAL_TEXTS, USAGE_REMINDERS, SHARE_TEXTS, SHARE_QUOTES,
  TIME_RESTRICTION, HISTORY_EMPTY, PRIVACY_NOTICE, AI_STYLES,
  AI_GUIDE_TEXT, ONBOARDING_STEPS, generateFullReading,
  MIRROR_QUESTIONS, RITUAL_COSTS, PERSONALITY_TONES,
  OBSERVER_COVENANT, SIGN_LIBRARY, INTENT_QUESTIONS
} from './texts/index.js';
import { MAX_DAILY_OBSERVATIONS } from './constants.js';

// 算法工具函数（补全）
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

// ================================================================
// 核心业务逻辑（已补全实际代码）
// ================================================================

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

function generateInterpretation() {
  const timestamps = getDrawTimestamps(); 
  const todayCount = timestamps.filter(ts => new Date(ts).toDateString() === new Date().toDateString()).length;
  const usage = checkUsageFrequency(timestamps);
  if (!state.userCorpus.includes(state.question)) state.userCorpus.push(state.question);
  const text = localInterpretation(); updateStep(3);
  renderStep3(text);
  const interpretEl = $('#interpretText');
  if (interpretEl && todayCount >= MAX_DAILY_OBSERVATIONS && !localStorage.getItem('fs_limit_alert_today')) {
    const alertHTML = `<div style="margin-top:15px;font-size:0.7rem;color:var(--dim);border-top:1px solid rgba(255,255,255,0.05);padding-top:10px;">※ 今日已观测 ${MAX_DAILY_OBSERVATIONS} 次以上，镜面易起雾，请注意休息。</div>`;
    interpretEl.innerHTML += alertHTML;
    localStorage.setItem('fs_limit_alert_today', 'true');
  }
  if (usage.level !== 'normal') toast(usage.message, 4000);
  try {
    saveReading({ time: Date.now(), question: state.question, category: state.category, intent: state.intent, ti: state.ti, yong: state.yong, grid: state.grid, line: state.line, lineOrder: state.lineOrder, text, chatHistory: state.chatHistory.slice() });
  } catch(e) { toast('历史记录保存失败，但解读仍然有效'); }
  addDrawTimestamp(Date.now()); 
}

function buildAIPrompt() {
  const localText = localInterpretation();
  return `请根据以下浮生牌局象进行详细解读。\n\n要求：纯文本格式，严禁使用任何Markdown符号。用自然语言分段。从体用生克、时空推演、宫位差值、旺相休囚、阴阳属性等方面展开。话不说死。\n\n${localText}\n\n规则：红桃火(阳) 方块金(阳) 梅花木(阴) 黑桃水(阴) JQK土 大王天(阳) 小王人(阴)。`;
}

function resetAll() {
  Object.assign(state, { question: '', category: '', deck: [], ti: null, yong: null, grid: {}, line: null, lineOrder: {}, step: 1, sel: null, possible: [], manualMode: false, gongOrder: [], chatHistory: [], uid: 0, editCount: 0, refinementTags: {}, intent: null });
  updateStep(1); renderStep1(); toast(UI_TEXTS.toastReset);
}

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

function startQuestion() { guardMidnight(proceedStartQuestion); }

function startManualEntry() {
  guardMidnight(() => {
    state.question = $('#questionInput')?.value?.trim() || ''; state.manualMode = true; state.uid = 0; state.deck = createDeck(true);
    state.ti = null; state.yong = null; state.grid = {}; state.line = null; state.lineOrder = {}; state.sel = null; state.possible = []; state.chatHistory = []; state.gongOrder = []; state.editCount = 0; state.refinementTags = {}; state.intent = null;
    updateStep(2); renderStep2();
  });
}

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

function lazyStart() { guardMidnight(proceedLazyStart); }

function resetStep2() {
  for (const g in state.grid) { state.deck.push(...state.grid[g]); }
  state.grid = {}; state.line = null; state.lineOrder = {}; state.gongOrder = []; state.sel = null; state.possible = [];
  state.deck = shuffle(state.deck); removeLineSelector(); refreshAll(); toast(UI_TEXTS.toastGridCleared);
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

function copyLocalResult() { const el = $('#interpretText'); if (!el) return; navigator.clipboard.writeText(el.innerText).then(() => toast(UI_TEXTS.toastCopied), () => toast(UI_TEXTS.toastCopyFailed)); }

function saveApiSettingsFromForm() {
  const p = state.selectedProvider || 'deepseek'; const info = API_PROVIDERS[p] || API_PROVIDERS.deepseek; let endpoint = $('#apiEndpoint')?.value?.trim() || info.endpoint || ''; if (endpoint.endsWith('/')) endpoint = endpoint.slice(0, -1);
  const settings = { provider: p, apiKey: $('#apiKey')?.value?.trim() || '', endpoint: endpoint, model: info.model || '', aiStyle: $('#aiStyle')?.value || 'guide' };
  saveApiSettings(settings); updateApiStatus(); toast(UI_TEXTS.toastSaved);
}

function saveProfileFromForm() { const bd = $('#birthDate')?.value || ''; const bt = $('#birthTime')?.value || ''; saveProfile({ birthDate: bd, birthTime: bt }); toast(UI_TEXTS.toastProfileSaved); }

function checkEthicalBoundary(question) { const q = question.toLowerCase(); for (const [key, entry] of Object.entries(REFUSAL_TEXTS.keywords)) { if (entry.trigger.some(word => q.includes(word))) return { blocked: true, message: entry.response }; } return { blocked: false }; }

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

document.addEventListener('click', function(e) {
  const btn = e.target.closest('button');
  if (btn) {
    if (btn.id === 'scrollLeftBtn' || btn.id === 'scrollRightBtn') return;
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
      /* 【核心修复】下面两个使用 domModal 的地方全部改成原生获取方式 */
      case 'closeModal': 
        const modalEl = document.getElementById('modal');
        if (modalEl) modalEl.setAttribute('hidden', '');
        break;
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

document.addEventListener('touchstart', function(e) {
  const cardEl = e.target.closest('.card-back, .card-face-small');
  if (cardEl) startPress(e.touches[0].clientX, e.touches[0].clientY, cardEl);
}, { passive: true });
document.addEventListener('touchmove', function(e) { moveDrag(e.touches[0].clientX, e.touches[0].clientY, e); }, { passive: false });
document.addEventListener('touchend', function(e) { endDrag(e.changedTouches[0].clientX, e.changedTouches[0].clientY); });

document.addEventListener('mousedown', function(e) { const cardEl = e.target.closest('.card-back, .card-face-small'); if (cardEl) startPress(e.clientX, e.clientY, cardEl); });
document.addEventListener('mousemove', function(e) { moveDrag(e.clientX, e.clientY, e); });
document.addEventListener('mouseup', function(e) { endDrag(e.clientX, e.clientY); });

document.addEventListener('click', function(e) { const b = e.target.closest('#providerGrid button'); if (b && b.dataset.value) { state.selectedProvider = b.dataset.value; $$('#providerGrid button').forEach(x => x.classList.toggle('selected', x === b)); const info = API_PROVIDERS[state.selectedProvider]; if (info) { const ep = $('#apiEndpoint'); if (ep) ep.value = info.endpoint || ''; } } });

/* 【核心修复】点击模态框背景关闭的逻辑，同样改为原生获取 */
document.addEventListener('click', function(e) {
  const modalEl = document.getElementById('modal');
  if (e.target === modalEl && modalEl) {
    modalEl.setAttribute('hidden', '');
  }
});

function init() {
  try {
    cacheDom(); 
    updateStep(1); renderStep1(); updateApiStatus();
    const ep = $('#apiEndpoint'); if (ep && !ep.value) ep.value = API_PROVIDERS.deepseek.endpoint;
    if (!hasCompletedOnboarding()) showOnboarding();
    injectAnimations();
  } catch (e) { document.body.innerHTML = '<div style="color:#d45050;padding:40px;text-align:center;font-family:sans-serif;"><h2>浮生牌启动失败</h2><p>请检查浏览器控制台（F12）的错误信息，并确认所有文件已正确保存。</p><p style="font-size:0.8rem;">' + e.message + '</p></div>'; console.error(e); }
}
document.addEventListener('DOMContentLoaded', init);