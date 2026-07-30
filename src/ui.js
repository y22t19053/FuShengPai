// ===== src/ui.js · 业务主控中心 =====
import { state, $, $$ } from './state.js';
import { cacheDom, domCore } from './domCache.js';
import { injectAnimations } from './ui/ui-anim.js';
import { renderStep1, renderStep2, renderStep3, renderHistoryPanel, initSettingsPanel, initProfilePanel, updateApiStatus, updateDailySignDisplay } from './ui/ui-render.js';
import { toast, guardMidnight, showOnboarding, showPrivacyWarning } from './ui/ui-modal.js';
import { startPress, moveDrag, endDrag } from './ui/ui-drag.js';
import { bindAll } from './controllers/EventBinder.js';
import { getApiSettings, saveApiSettings, clearApiSettings, getProfile, saveProfile, hasCompletedOnboarding, completeOnboarding } from './storage.js';
import { requestReading, requestFollowUp, testApiConnection } from './ai.js';
import { createDeck, shuffle, drawTiYong, calcDiff, detectLines, calcFullBaZi, calcYearPillar } from './engine.js';
import { API_PROVIDERS, getShengKe, getShengKeLabel, getWangState, getWuxing, getCardValue, GONG_NAMES, GONG_WUXING } from './data.js';
import { MAX_DAILY_OBSERVATIONS } from './constants.js';
import { REFUSAL_TEXTS, UI_TEXTS, generateFullReading } from './texts/index.js';

// --- 基础函数 ---
function mulberry32(a) {
  return function() {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    var t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}
function seededShuffle(array, seed) {
  let arr = [...array]; let rng = mulberry32(seed);
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

// --- 核心业务逻辑 ---
export function updateStep(n) { state.step = n; for (let i = 1; i <= 3; i++) { const el = $('#sd' + i); if (!el) continue; el.classList.remove('active', 'done'); if (i < n) el.classList.add('done'); if (i === n) el.classList.add('active'); } }
export function getBaziFromProfile() {
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
  for (const [intent, keywords] of Object.entries(intentMap)) { if (keywords.some(k => q.includes(k))) return intent; }
  return null;
}
export async function localInterpretation() {
  const readings = await import('./texts/texts-readings.js');
  const tiWx = getWuxing(state.ti), yongWx = getWuxing(state.yong);
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
      const diff = calcDiff(g, card); const wang = getWangState(getWuxing(card), GONG_WUXING[g]); const relToTi = getShengKe(tiWx, getWuxing(card));
      const linePos = state.line ? state.line.indexOf(g) : -1; const linePosition = linePos === 0 ? 'start' : linePos === 1 ? 'middle' : linePos === 2 ? 'end' : 'offline';
      const ctx = { gong: { id: g, name: GONG_NAMES[g], element: GONG_WUXING[g] }, card: { element: getWuxing(card), value: getCardValue(card), suit: card.suit }, tiYongRelation: relToTi || '同我', wangState: wang, linePosition: linePosition, diff: diff, intent: intent };
      const readingResult = readings.generateFullReading(ctx);
      const label = state.lineOrder[g] || GONG_NAMES[g] + '宫';
      result += `【${label}】\n${readingResult.light}\n\n---\n${readingResult.shadow}\n\n`;
    });
  }
  return result.trim();
}
export async function generateInterpretation() {
  const timestamps = getDrawTimestamps(); 
  const todayCount = timestamps.filter(ts => new Date(ts).toDateString() === new Date().toDateString()).length;
  const usage = checkUsageFrequency(timestamps);
  if (!state.userCorpus.includes(state.question)) state.userCorpus.push(state.question);
  const text = await localInterpretation(); updateStep(3);
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
export async function buildAIPrompt() {
  const localText = await localInterpretation();
  return `请根据以下浮生牌局象进行详细解读。\n\n要求：纯文本格式，严禁使用任何Markdown符号。用自然语言分段。从体用生克、时空推演、宫位差值、旺相休囚、阴阳属性等方面展开。话不说死。\n\n${localText}\n\n规则：红桃火(阳) 方块金(阳) 梅花木(阴) 黑桃水(阴) JQK土 大王天(阳) 小王人(阴)。`;
}
export function resetAll() {
  if (!confirm('此阵一散，当下映照便消逝，确要重来吗？')) return;
  Object.assign(state, { question: '', category: '', deck: [], ti: null, yong: null, grid: {}, line: null, lineOrder: {}, step: 1, sel: null, possible: [], manualMode: false, gongOrder: [], chatHistory: [], uid: 0, editCount: 0, refinementTags: {}, intent: null });
  updateStep(1); renderStep1(); toast(UI_TEXTS.toastReset);
}
export function startQuestion() { guardMidnight(proceedStartQuestion); }
export function startManualEntry() { guardMidnight(() => { state.question = $('#questionInput')?.value?.trim() || ''; state.manualMode = true; state.uid = 0; state.deck = createDeck(true); state.ti = null; state.yong = null; state.grid = {}; state.line = null; state.lineOrder = {}; state.sel = null; state.possible = []; state.chatHistory = []; state.gongOrder = []; state.editCount = 0; state.refinementTags = {}; state.intent = null; updateStep(2); renderStep2(); }); }
export function lazyStart() { guardMidnight(proceedLazyStart); }

function proceedStartQuestion() {
  const q = $('#questionInput')?.value?.trim() || ''; 
  if (q) { const check = checkEthicalBoundary(q); if (check.blocked) { domCore.innerHTML = `<div class="panel"><h3>提示</h3><p>${check.message}</p><button data-action="resetAll" class="small">返回</button></div>`; return; } }
  state.question = q; state.manualMode = false; state.uid = 0; 
  generateEntropySeed().then(seed => {
    state.deck = seededShuffle(createDeck(false), seed); state.ti = null; state.yong = null; state.grid = {}; state.line = null; state.lineOrder = {}; state.sel = null; state.possible = []; state.chatHistory = []; state.gongOrder = []; state.editCount = 0; state.refinementTags = {}; state.intent = null;
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
export function resetStep2() {
  for (const g in state.grid) { state.deck.push(...state.grid[g]); }
  state.grid = {}; state.line = null; state.lineOrder = {}; state.gongOrder = []; state.sel = null; state.possible = [];
  state.deck = shuffle(state.deck); removeLineSelector(); refreshAll(); toast(UI_TEXTS.toastGridCleared);
}

// 【关键修复】把 confirmTiYong 的 export 明确加在这里，让 ActionHandler 能读到
export function confirmTiYong() {
  if (!state.ti || !state.yong) return;
  state.deck.push({ isJoker: true, type: '大王', _uid: state.uid++ }, { isJoker: true, type: '小王', _uid: state.uid++ });
  state.deck = shuffle(state.deck);
  const gridArea = $('#gridArea'); if (gridArea) gridArea.style.display = 'block';
  const deckEl = $('#deckContainer'); if (deckEl) { deckEl.classList.add('shuffling'); setTimeout(() => deckEl.classList.remove('shuffling'), 700); }
  toast(UI_TEXTS.toastJokersInjected); refreshAll();
}

export function resetGrid() {
  for (const g in state.grid) state.deck.push(...state.grid[g]);
  state.grid = {}; state.line = null; state.lineOrder = {}; state.possible = []; state.gongOrder = []; state.sel = null;
  state.deck = state.manualMode ? state.deck : shuffle(state.deck); removeLineSelector(); refreshAll(); toast(UI_TEXTS.toastGridCleared);
}
export function copyLocalResult() { const el = $('#interpretText'); if (!el) return; navigator.clipboard.writeText(el.innerText).then(() => toast(UI_TEXTS.toastCopied), () => toast(UI_TEXTS.toastCopyFailed)); }
export function saveApiSettingsFromForm() {
  const p = state.selectedProvider || 'deepseek'; const info = API_PROVIDERS[p] || API_PROVIDERS.deepseek; let endpoint = $('#apiEndpoint')?.value?.trim() || info.endpoint || ''; if (endpoint.endsWith('/')) endpoint = endpoint.slice(0, -1);
  const settings = { provider: p, apiKey: $('#apiKey')?.value?.trim() || '', endpoint: endpoint, model: info.model || '', aiStyle: $('#aiStyle')?.value || 'guide' };
  saveApiSettings(settings); updateApiStatus(); toast(UI_TEXTS.toastSaved);
}
export function saveProfileFromForm() { const bd = $('#birthDate')?.value || ''; const bt = $('#birthTime')?.value || ''; saveProfile({ birthDate: bd, birthTime: bt }); toast(UI_TEXTS.toastProfileSaved); }
export function checkEthicalBoundary(question) { const q = question.toLowerCase(); for (const [key, entry] of Object.entries(REFUSAL_TEXTS.keywords)) { if (entry.trigger.some(word => q.includes(word))) return { blocked: true, message: entry.response }; } return { blocked: false }; }

export async function triggerAI() {
  const btn = $('#aiReadBtn'); if (!btn) return; btn.disabled = true; btn.textContent = '思考中...';
  const settings = getApiSettings(); if (!settings || !settings.apiKey) { toast('请先配置 API Key'); btn.disabled = false; btn.textContent = UI_TEXTS.btnAIDeepRead; return; }
  const provider = settings.provider || 'deepseek'; 
  let endpoint = settings.endpoint || API_PROVIDERS[provider]?.endpoint || '';
  if (endpoint.endsWith('/v1')) endpoint = endpoint.slice(0, -3); 
  if (endpoint.endsWith('/')) endpoint = endpoint.slice(0, -1);
  const model = settings.model || API_PROVIDERS[provider]?.model || '';
  const prompt = await buildAIPrompt();
  try {
    const result = await requestReading({ provider, apiKey: settings.apiKey, endpoint, model, style: settings.aiStyle || 'guide', prompt });
    const container = $('#aiResultContainer'); const content = $('#aiResultContent');
    if (container) container.style.display = 'block'; if (content) content.innerHTML = '<strong>深层解读：</strong><br>' + result.replace(/\n/g, '<br>');
    state.chatHistory = [{ role: 'user', content: prompt }, { role: 'assistant', content: result }];
    const followUp = $('#followUpArea'); if (followUp) followUp.style.display = 'block';
    toast('解读完成');
  } catch (e) {
    const container = $('#aiResultContainer'); if (container) container.style.display = 'block';
    const content = $('#aiResultContent');
    const fallbackText = await localInterpretation();
    if (content) content.innerHTML = `<div style="color:#c9a060;border:1px solid #c9a060;padding:8px;border-radius:6px;margin-bottom:8px;font-size:0.8rem;">⚠️ AI 服务暂时无法连接，以下为规则引擎生成的原始解读：</div>${fallbackText.replace(/\n/g, '<br>')}`;
    toast('AI 不可用，已展示规则解读', 3000);
  } finally { btn.disabled = false; btn.textContent = UI_TEXTS.btnAIDeepRead; }
}
export async function sendFollowUp() {
  const input = $('#followUpInput'); if (!input) return; const q = input.value.trim(); if (!q) return; input.value = '';
  const settings = getApiSettings(); if (!settings || !settings.apiKey) { toast('未配置 API Key'); return; }
  const history = state.chatHistory; if (!history || history.length < 2) { toast('请先进行一次 AI 解读'); return; }
  history.push({ role: 'user', content: q });
  const chatBlock = $('#chatHistoryBlock'); if (chatBlock) chatBlock.innerHTML += `<div class="chat-msg user">${q}</div>`;
  const provider = settings.provider || 'deepseek'; let endpoint = settings.endpoint || API_PROVIDERS[provider]?.endpoint || ''; if (endpoint.endsWith('/v1')) endpoint = endpoint.slice(0, -3); if (endpoint.endsWith('/')) endpoint = endpoint.slice(0, -1); const model = settings.model || API_PROVIDERS[provider]?.model || '';
  try { const result = await requestFollowUp({ history, provider, apiKey: settings.apiKey, endpoint, model }); history.push({ role: 'assistant', content: result }); if (chatBlock) { chatBlock.innerHTML += `<div class="chat-msg ai">${result.replace(/\n/g, '<br>')}</div>`; chatBlock.scrollTop = chatBlock.scrollHeight; } } catch (e) { if (chatBlock) chatBlock.innerHTML += `<div class="chat-msg" style="color:#d45050">失败：${e.message}</div>`; }
}
export async function handleTestApiConnection() {
  const btn = document.querySelector('[data-action="testApiConnection"]'); if (btn) { btn.disabled = true; btn.textContent = '测试中...'; }
  try {
    const provider = state.selectedProvider || 'deepseek'; let endpoint = $('#apiEndpoint')?.value?.trim() || ''; const apiKey = $('#apiKey')?.value?.trim() || '';
    if (!apiKey && provider !== 'custom') throw new Error('请先填写 API Key');
    if (!endpoint && API_PROVIDERS[provider]) endpoint = API_PROVIDERS[provider].endpoint; if (endpoint.endsWith('/v1')) endpoint = endpoint.slice(0, -3); if (endpoint.endsWith('/')) endpoint = endpoint.slice(0, -1);
    const model = API_PROVIDERS[provider]?.model || '';
    const msg = await testApiConnection({ provider, apiKey, endpoint, model }); toast(msg, 3000);
  } catch (e) { toast(`测试失败: ${e.message}`, 4000); } finally { if (btn) { btn.disabled = false; btn.textContent = UI_TEXTS.btnTestApi; } }
}

// 启动初始化
function init() {
  try {
    cacheDom();
    try { const testKey = '__fs_test__'; localStorage.setItem(testKey, '1'); localStorage.removeItem(testKey); } catch (e) { showPrivacyWarning(); }
    updateStep(1); renderStep1(); updateApiStatus();
    const ep = document.getElementById('apiEndpoint'); if (ep && !ep.value) ep.value = API_PROVIDERS.deepseek.endpoint;
    if (!hasCompletedOnboarding()) showOnboarding();
    injectAnimations();
    bindAll();
    import('./environment.js').then(env => env.initEnvironmentMonitor());
  } catch (e) { 
    document.body.innerHTML = '<div style="color:#d45050;padding:40px;text-align:center;font-family:sans-serif;"><h2>浮生牌启动失败</h2><p>请检查浏览器控制台（F12）的错误信息，并确认所有文件已正确保存。</p><p style="font-size:0.8rem;">' + e.message + '</p></div>'; console.error(e); 
  }
}
document.addEventListener('DOMContentLoaded', init);