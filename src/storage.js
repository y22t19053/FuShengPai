// ===== src/storage.js · 本地存储封装（完整版：降级/迁移/周期锁定/数据导出） =====

const HISTORY_KEY = 'fsp_history';
const PROFILE_KEY = 'fsp_profile';
const SETTINGS_KEY = 'fsp_api';
const TIMELINE_KEY = 'fsp_timeline';
const TIMECAPSULE_KEY = 'fsp_timecapsule';
const DRAW_TIMESTAMPS_KEY = 'fsp_draw_timestamps';
const PERIOD_CARDS_KEY = 'fsp_period_cards';
const ONBOARDING_KEY = 'fsp_onboarding_done';
const PAIGE_KEY = 'fsp_paige';

const MAX_HISTORY = 200;
const MAX_TIMELINE = 100;

// ---------- 存储可用性检测 ----------
function storageAvailable() {
  try {
    const x = '__fsp_test__';
    localStorage.setItem(x, x);
    localStorage.removeItem(x);
    return true;
  } catch (e) {
    return false;
  }
}

const useLocalStorage = storageAvailable();

// ---------- 内存降级存储 ----------
const memoryStore = new Map();

function safeSet(key, value) {
  try {
    if (useLocalStorage) {
      localStorage.setItem(key, JSON.stringify(value));
    } else {
      memoryStore.set(key, JSON.stringify(value));
    }
    return true;
  } catch (e) {
    console.warn('存储失败，数据未持久化:', e);
    return false;
  }
}

function safeGet(key) {
  try {
    const raw = useLocalStorage ? localStorage.getItem(key) : memoryStore.get(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.warn('读取存储失败:', e);
    return null;
  }
}

function safeRemove(key) {
  try {
    if (useLocalStorage) localStorage.removeItem(key);
    else memoryStore.delete(key);
  } catch (e) {
    console.warn('删除存储失败:', e);
  }
}

// ---------- 历史记录 ----------
/** periodKey 归一化：旧格式 '2026-8-6' → '2026-08-06'（与新 periodKeyFn 补零口径一致，兼容旧数据） */
function normalizePeriodKey(key) {
  const str = String(key ?? '');
  const m = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(.*)$/);
  return m ? `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}${m[4] || ''}` : str;
}

export function getHistory() {
  const list = safeGet(HISTORY_KEY) || [];
  // 兼容迁移：period 项的旧 periodKey（不补零）统一为补零格式
  let changed = false;
  const out = list.map(h => {
    if (h && h.type === 'period' && h.periodKey) {
      const k = normalizePeriodKey(h.periodKey);
      if (k !== h.periodKey) { changed = true; return { ...h, periodKey: k }; }
    }
    return h;
  });
  if (changed) safeSet(HISTORY_KEY, out);
  return out;
}

export function saveReading(data) {
  const history = getHistory();
  if (history.some(item => item.time === data.time)) return;
  history.unshift(data);
  if (history.length > MAX_HISTORY) history.length = MAX_HISTORY;
  return safeSet(HISTORY_KEY, history);
}

export function deleteHistoryItem(index) {
  const history = getHistory();
  if (index < 0 || index >= history.length) return false;
  history.splice(index, 1);
  return safeSet(HISTORY_KEY, history);
}

export function addPeriodHistoryEntry(entry) {
  const history = getHistory();
  const entryKey = normalizePeriodKey(entry.periodKey);
  const existingIndex = history.findIndex(h => h.type === 'period' && h.periodType === entry.periodType && h.periodKey === entryKey && (h.fortuneType || 'overall') === (entry.fortuneType || 'overall'));
  const fullEntry = {
    type: 'period',
    periodType: entry.periodType,
    periodKey: entryKey,
    fortuneType: entry.fortuneType || 'overall',
    card: entry.card,
    fortune: entry.fortune || '',
    question: entry.question || '',
    text: entry.fortune || '',
    time: entry.time || Date.now(),
    chatHistory: entry.chatHistory || []
  };
  if (existingIndex >= 0) {
    const old = history[existingIndex];
    fullEntry.time = old.time;
    history[existingIndex] = fullEntry;
  } else {
    history.unshift(fullEntry);
  }
  if (history.length > MAX_HISTORY) history.length = MAX_HISTORY;
  return safeSet(HISTORY_KEY, history);
}

export function updateHistoryChat(chatHistory) {
  try {
    const history = getHistory();
    if (!history.length) return false;
    history[0].chatHistory = Array.isArray(chatHistory) ? chatHistory.slice() : [];
    return safeSet(HISTORY_KEY, history);
  } catch (e) {
    console.error('更新历史AI对话失败:', e);
    return false;
  }
}

export function updateHistoryChatAt(index, chatHistory) {
  try {
    const history = getHistory();
    if (index < 0 || index >= history.length) return false;
    history[index].chatHistory = Array.isArray(chatHistory) ? chatHistory.slice() : [];
    return safeSet(HISTORY_KEY, history);
  } catch (e) {
    console.error('更新历史AI对话失败:', e);
    return false;
  }
}

// ---------- 个人信息 ----------
export function getProfile() {
  return safeGet(PROFILE_KEY) || {};
}

export function saveProfile(profile) {
  const old = getProfile();
  const merged = { ...old, ...profile };
  return safeSet(PROFILE_KEY, merged);
}

// ---------- AI 设置 ----------
export function getApiSettings() {
  return safeGet(SETTINGS_KEY) || null;
}

export function saveApiSettings(settings) {
  return safeSet(SETTINGS_KEY, settings);
}

export function clearApiSettings() {
  safeRemove(SETTINGS_KEY);
}

// ---------- 观测时间戳 ----------
export function getDrawTimestamps() {
  return safeGet(DRAW_TIMESTAMPS_KEY) || [];
}

export function addDrawTimestamp(ts) {
  const stamps = getDrawTimestamps();
  stamps.push(ts);
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const filtered = stamps.filter(x => x > cutoff);
  return safeSet(DRAW_TIMESTAMPS_KEY, filtered);
}

// ---------- 时间线 ----------
export function getTimeline() {
  return safeGet(TIMELINE_KEY) || [];
}

export function addTimelineEntry(entry) {
  const timeline = getTimeline();
  timeline.unshift({
    time: entry.time,
    durianScore: entry.durianScore || 0,
    durianComponents: entry.durianComponents || null,
    question: entry.question || ''
  });
  if (timeline.length > MAX_TIMELINE) timeline.length = MAX_TIMELINE;
  return safeSet(TIMELINE_KEY, timeline);
}

// ---------- 时间胶囊 ----------
export function getTimeCapsule() {
  return safeGet(TIMECAPSULE_KEY) || null;
}

export function saveTimeCapsule(data) {
  return safeSet(TIMECAPSULE_KEY, data);
}

// ---------- 周期卡 & 日运细选存储 ----------
function migratePeriodCards(cards) {
  const migrated = { ...(cards || {}) };
  if (migrated.daily && !migrated.daily_overall) {
    migrated.daily_overall = migrated.daily;
    delete migrated.daily;
  }
  // periodKey 归一化迁移：旧格式 '2026-8-6' → '2026-08-06'（不补零数据自动升级，避免跨版本丢失当日签）
  for (const [k, v] of Object.entries(migrated)) {
    if (v && typeof v === 'object' && v.periodKey) {
      const nk = normalizePeriodKey(v.periodKey);
      if (nk !== v.periodKey) migrated[k] = { ...v, periodKey: nk };
    }
  }
  return migrated;
}

export function getStoredPeriodCards() {
  const cards = migratePeriodCards(safeGet(PERIOD_CARDS_KEY) || {});
  if (JSON.stringify(cards) !== JSON.stringify(safeGet(PERIOD_CARDS_KEY) || {})) {
    safeSet(PERIOD_CARDS_KEY, cards);
  }
  return cards;
}

// 存储键：日运细选为 daily_${类别key}；周/月/季/年仍为 weekly/monthly/seasonal/yearly
export function saveStoredPeriodCard(periodType, data, fortuneType = 'overall') {
  const cards = getStoredPeriodCards();
  let key = periodType;
  if (periodType === 'daily') key = `daily_${fortuneType || 'overall'}`;
  cards[key] = data;
  return safeSet(PERIOD_CARDS_KEY, cards);
}

// 读取日运细选的存储数据
export function getStoredDailyCard(fortuneType = 'overall') {
  const cards = getStoredPeriodCards();
  return cards[`daily_${fortuneType}`] || null;
}

// ---------- 新手引导 ----------
export function hasCompletedOnboarding() {
  return safeGet(ONBOARDING_KEY) === true;
}

export function completeOnboarding() {
  return safeSet(ONBOARDING_KEY, true);
}

// ---------- 牌灵 ----------
export function getPaige() {
  return safeGet(PAIGE_KEY) || null;
}

// ---------- 导出 / 导入（UIGF 风格统一格式：info 元数据 + records 记录数组） ----------
const APP_VERSION = '1.0.0';

function buildInfo() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return {
    export_app: '浮生牌',
    export_app_version: APP_VERSION,
    export_timestamp: Date.now(),
    export_date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    version: 'v2.0.0',
    lang: 'zh-cn'
  };
}

// history → records（统一记录数组，第三方/脚本可直接消费；缺失字段留空不报错）
function historyToRecords(history) {
  return (history || [])
    .map(h => {
      if (!h || typeof h !== 'object') return null;
      return {
        type: h.type || 'reading',
        periodType: h.periodType || null,
        periodKey: h.periodKey || null,
        fortuneType: h.fortuneType || null,
        spreadType: h.spreadType || null,
        card: h.card || null,
        threeCards: h.threeCards || null,
        question: h.question || '',
        text: h.text || '',
        time: h.time,
        durianScore: h.durianScore || 0
      };
    })
    .filter(Boolean);
}

export function exportAllDataJson() {
  const history = getHistory();
  const data = {
    info: buildInfo(),
    version: 2,
    records: historyToRecords(history),
    history,
    profile: getProfile(),
    settings: getApiSettings(),
    timeline: getTimeline(),
    timeCapsule: getTimeCapsule(),
    drawTimestamps: getDrawTimestamps(),
    periodCards: getStoredPeriodCards(),
    paige: getPaige()
  };
  return JSON.stringify(data, null, 2);
}

// 历史合并：按周期键/时间+问题去重，保留较新的一条
function mergeHistory(a, b) {
  const map = new Map();
  for (const h of [...(a || []), ...(b || [])]) {
    if (!h || typeof h !== 'object') continue;
    const key = h.periodKey
      ? `p:${h.periodType}:${h.periodKey}:${h.fortuneType || 'overall'}`
      : `q:${h.time}:${h.question || ''}`;
    const prev = map.get(key);
    if (!prev || (h.time || 0) >= (prev.time || 0)) map.set(key, h);
  }
  return [...map.values()].sort((x, y) => (y.time || 0) - (x.time || 0));
}

// 合并导入（合并去重，不覆盖本机已有数据）：
// - history/timeline/drawTimestamps：双向合并去重
// - periodCards：本机已有周期保留，缺的补上
// - profile：字段补全（本机优先）
// - settings/timeCapsule/paige：本机已有保留，缺的才导入
export function importAllData(jsonStr) {
  try {
    const data = JSON.parse(jsonStr);
    // v1 = 旧格式；v2 = UIGF 风格（info + records），两者都兼容
    if (!data || (data.version !== 1 && data.version !== 2)) throw new Error('版本不兼容');

    // 历史记录：合并去重，保留较新
    if (Array.isArray(data.history)) {
      const merged = mergeHistory(getHistory(), data.history);
      safeSet(HISTORY_KEY, merged.slice(0, MAX_HISTORY));
    }
    // 时间线：按 time 去重合并
    if (Array.isArray(data.timeline)) {
      const map = new Map();
      for (const t of [...getTimeline(), ...data.timeline]) {
        if (t && typeof t === 'object') map.set(t.time, t);
      }
      safeSet(TIMELINE_KEY, [...map.values()].sort((a, b) => (b.time || 0) - (a.time || 0)).slice(0, MAX_TIMELINE));
    }
    // 观测时间戳：去重合并
    if (Array.isArray(data.drawTimestamps)) {
      const set = new Set([...getDrawTimestamps(), ...data.drawTimestamps]);
      safeSet(DRAW_TIMESTAMPS_KEY, [...set].sort((a, b) => b - a));
    }
    // 周期卡：导入的只补缺口，不覆盖本机当前周期的牌；同 key 取更晚抽取的
    if (data.periodCards && typeof data.periodCards === 'object') {
      const local = getStoredPeriodCards();
      const merged = { ...local };
      for (const [k, v] of Object.entries(data.periodCards)) {
        if (!v || typeof v !== 'object') continue;
        if (!merged[k]) {
          merged[k] = v;
        } else if ((v.time || v.drawnAt || 0) > (merged[k].time || merged[k].drawnAt || 0)) {
          merged[k] = v;
        }
      }
      safeSet(PERIOD_CARDS_KEY, merged);
    }
    // 个人信息：字段补全，本机已有字段不被覆盖
    if (data.profile && typeof data.profile === 'object') {
      safeSet(PROFILE_KEY, { ...data.profile, ...getProfile() });
    }
    // AI 设置：本机已有则保留（避免 API Key 被冲掉），无则导入
    if (data.settings && !getApiSettings()) safeSet(SETTINGS_KEY, data.settings);
    // 时间胶囊：本机已有保留
    if (data.timeCapsule && !getTimeCapsule()) safeSet(TIMECAPSULE_KEY, data.timeCapsule);
    // 牌灵：本机已抽保留，未抽才导入
    if (data.paige && !safeGet(PAIGE_KEY)) safeSet(PAIGE_KEY, data.paige);
    return true;
  } catch (e) {
    console.error('导入失败:', e);
    return false;
  }
}

// 导出全部数据（触发下载）
export function exportAllData() {
  const json = exportAllDataJson();
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `浮生牌备份_${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return true;
}