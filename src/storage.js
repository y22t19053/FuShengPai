// ===== src/storage.js · 本地存储封装（完整版：降级/迁移/周期锁定/数据导出） =====

// 存储 keys
const HISTORY_KEY = 'fsp_history';
const PROFILE_KEY = 'fsp_profile';
const SETTINGS_KEY = 'fsp_api';
const TIMELINE_KEY = 'fsp_timeline';
const TIMECAPSULE_KEY = 'fsp_timecapsule';
const DRAW_TIMESTAMPS_KEY = 'fsp_draw_timestamps';
const PERIOD_CARDS_KEY = 'fsp_period_cards';
const ONBOARDING_KEY = 'fsp_onboarding_done';

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
export function getHistory() {
  return safeGet(HISTORY_KEY) || [];
}

export function saveReading(data) {
  const history = getHistory();
  // 避免重复（同一时间戳）
  if (history.some(item => item.time === data.time)) return;
  history.unshift(data);
  // 保留最近 MAX_HISTORY 条
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
  // 检查是否已有相同周期记录（避免覆盖已有周期记录时重复添加）
  const existingIndex = history.findIndex(h => h.type === 'period' && h.periodType === entry.periodType && h.periodKey === entry.periodKey);
  const fullEntry = {
    type: 'period',
    periodType: entry.periodType,
    periodKey: entry.periodKey,
    card: entry.card,
    fortune: entry.fortune || '',
    question: entry.question || '',
    text: entry.fortune || '',
    time: entry.time || Date.now(),
    chatHistory: entry.chatHistory || []
  };
  if (existingIndex >= 0) {
    // 更新已有记录，保留原时间
    const old = history[existingIndex];
    fullEntry.time = old.time;
    history[existingIndex] = fullEntry;
  } else {
    history.unshift(fullEntry);
  }
  if (history.length > MAX_HISTORY) history.length = MAX_HISTORY;
  return safeSet(HISTORY_KEY, history);
}

// 更新历史记录中的 AI 对话（供 triggerAI/sendFollowUp 使用）
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
  // 仅保留最近 30 天
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const filtered = stamps.filter(x => x > cutoff);
  return safeSet(DRAW_TIMESTAMPS_KEY, filtered);
}

// ---------- 时间线（榴莲报告） ----------
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

// ---------- 周期卡 ----------
export function getStoredPeriodCards() {
  return safeGet(PERIOD_CARDS_KEY) || {};
}

export function saveStoredPeriodCard(periodType, data) {
  const cards = getStoredPeriodCards();
  cards[periodType] = data;
  return safeSet(PERIOD_CARDS_KEY, cards);
}

// ---------- 新手引导 ----------
export function hasCompletedOnboarding() {
  return safeGet(ONBOARDING_KEY) === true;
}

export function completeOnboarding() {
  return safeSet(ONBOARDING_KEY, true);
}

// ---------- 导出 / 导入 ----------
export function exportAllDataJson() {
  const data = {
    version: 1,
    exportedAt: Date.now(),
    history: getHistory(),
    profile: getProfile(),
    settings: getApiSettings(),
    timeline: getTimeline(),
    timeCapsule: getTimeCapsule(),
    drawTimestamps: getDrawTimestamps(),
    periodCards: getStoredPeriodCards()
  };
  return JSON.stringify(data, null, 2);
}

export function importAllData(jsonStr) {
  try {
    const data = JSON.parse(jsonStr);
    if (!data || data.version !== 1) throw new Error('版本不兼容');
    const keys = [
      ['history', HISTORY_KEY],
      ['profile', PROFILE_KEY],
      ['settings', SETTINGS_KEY],
      ['timeline', TIMELINE_KEY],
      ['timeCapsule', TIMECAPSULE_KEY],
      ['drawTimestamps', DRAW_TIMESTAMPS_KEY],
      ['periodCards', PERIOD_CARDS_KEY]
    ];
    for (const [field, key] of keys) {
      if (data[field] !== undefined) safeSet(key, data[field]);
    }
    return true;
  } catch (e) {
    console.error('导入失败:', e);
    return false;
  }
}

// 导出全部数据（触发下载）——给 ui.js 的 exportData 使用
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