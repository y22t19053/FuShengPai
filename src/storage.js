// ===== src/storage.js · 本地数据持久化（修复） =====
const STORAGE_KEYS = {
  HISTORY: 'fs_history',
  TIMESTAMPS: 'fs_timestamps',
  API_SETTINGS: 'fs_api_settings',
  PROFILE: 'fs_profile',
  ONBOARDING: 'fs_onboarding',
  TIMELINE: 'fs_timeline',
  SYMBOL_PROFILE: 'fs_symbol_profile',
  TIME_CAPSULE: 'fs_time_capsule',
  PERIOD_CARDS: 'fs_period_cards',
  PERIOD_HISTORY: 'fs_period_history',
};

const MAX_HISTORY = 100;
const MAX_TIMELINE = 200;

export function getHistory() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.HISTORY)) || []; } catch { return []; }
}
export function saveReading(reading) {
  const history = getHistory();
  history.unshift(reading);
  if (history.length > MAX_HISTORY) history.pop();
  localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
}
export function deleteHistoryItem(index) {
  const history = getHistory();
  if (index >= 0 && index < history.length) {
    history.splice(index, 1);
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
  }
}

export function getDrawTimestamps() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.TIMESTAMPS)) || []; } catch { return []; }
}
export function addDrawTimestamp(ts) {
  const list = getDrawTimestamps();
  list.push(ts);
  if (list.length > 100) list.shift();
  localStorage.setItem(STORAGE_KEYS.TIMESTAMPS, JSON.stringify(list));
}

export function getApiSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.API_SETTINGS);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}
export function saveApiSettings(settings) {
  localStorage.setItem(STORAGE_KEYS.API_SETTINGS, JSON.stringify(settings));
}
export function clearApiSettings() {
  localStorage.removeItem(STORAGE_KEYS.API_SETTINGS);
}

export function getProfile() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PROFILE);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch { return {}; }
}
export function saveProfile(profile) {
  localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
}

export function hasCompletedOnboarding() {
  return localStorage.getItem(STORAGE_KEYS.ONBOARDING) === 'true';
}
export function completeOnboarding() {
  localStorage.setItem(STORAGE_KEYS.ONBOARDING, 'true');
}

export function exportAllData() {
  const data = {
    history: getHistory(),
    timestamps: getDrawTimestamps(),
    apiSettings: getApiSettings(),
    profile: getProfile(),
    timeline: getTimeline(),
    symbolProfile: getSymbolProfile(),
    timeCapsule: getTimeCapsule(),
    periodCards: getStoredPeriodCards(),
    periodHistory: getStoredPeriodHistory(),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `fushangpai_backup_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function saveTimeCapsule(data) {
  localStorage.setItem(STORAGE_KEYS.TIME_CAPSULE, JSON.stringify(data));
}
export function getTimeCapsule() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.TIME_CAPSULE)); } catch { return null; }
}

export function getTimeline() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.TIMELINE)) || []; } catch { return []; }
}
export function addTimelineEntry(entry) {
  const timeline = getTimeline();
  timeline.push({ ...entry, timestamp: Date.now(), durianScore: entry.durianScore || 0 });
  if (timeline.length > MAX_TIMELINE) {
    timeline.splice(0, timeline.length - MAX_TIMELINE);
  }
  localStorage.setItem(STORAGE_KEYS.TIMELINE, JSON.stringify(timeline));
}

export function getSymbolProfile() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.SYMBOL_PROFILE)) || {}; } catch { return {}; }
}
export function saveSymbolProfile(profile) {
  localStorage.setItem(STORAGE_KEYS.SYMBOL_PROFILE, JSON.stringify(profile));
}
export function updateSymbolProfile(key, value) {
  const profile = getSymbolProfile();
  profile[key] = value;
  saveSymbolProfile(profile);
}

export function getStoredPeriodCards() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.PERIOD_CARDS)) || {}; } catch { return {}; }
}
export function saveStoredPeriodCard(periodType, data) {
  const all = getStoredPeriodCards();
  all[periodType] = data;
  localStorage.setItem(STORAGE_KEYS.PERIOD_CARDS, JSON.stringify(all));
}
export function getStoredPeriodHistory() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.PERIOD_HISTORY)) || []; } catch { return []; }
}
export function addPeriodHistoryEntry(entry) {
  const history = getStoredPeriodHistory();
  history.unshift(entry);
  if (history.length > MAX_HISTORY) history.pop();
  localStorage.setItem(STORAGE_KEYS.PERIOD_HISTORY, JSON.stringify(history));
}