// ===== src/storage.js · 本地数据持久化 =====
const STORAGE_KEYS = {
  HISTORY: 'fs_history',
  TIMESTAMPS: 'fs_timestamps',
  API_SETTINGS: 'fs_api_settings',
  PROFILE: 'fs_profile',
  ONBOARDING: 'fs_onboarding',
  TIMELINE: 'fs_timeline',
  SYMBOL_PROFILE: 'fs_symbol_profile',
  TIME_CAPSULE: 'fs_time_capsule',
};

function obfuscate(str) {
  if (!str) return str;
  return btoa(encodeURIComponent(str));
}
function deobfuscate(str) {
  if (!str) return str;
  try { return decodeURIComponent(atob(str)); } catch { return null; }
}

// ===== 历史记录 =====
export function getHistory() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.HISTORY)) || []; } catch (e) { return []; }
}
export function saveReading(reading) {
  const history = getHistory();
  history.unshift(reading);
  if (history.length > 200) history.pop();
  localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
}
export function deleteHistoryItem(index) {
  const history = getHistory();
  if (index >= 0 && index < history.length) {
    history.splice(index, 1);
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
  }
}

// ===== 时间戳 =====
export function getDrawTimestamps() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.TIMESTAMPS)) || []; } catch (e) { return []; }
}
export function addDrawTimestamp(ts) {
  const list = getDrawTimestamps();
  list.push(ts);
  if (list.length > 100) list.shift();
  localStorage.setItem(STORAGE_KEYS.TIMESTAMPS, JSON.stringify(list));
}

// ===== API设置 =====
export function getApiSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.API_SETTINGS);
    if (!raw) return null;
    const settings = JSON.parse(raw);
    if (settings.apiKey) {
      const deobf = deobfuscate(settings.apiKey);
      if (deobf) settings.apiKey = deobf;
      else return null;
    }
    return settings;
  } catch (e) { return null; }
}
export function saveApiSettings(settings) {
  if (settings.apiKey) settings.apiKey = obfuscate(settings.apiKey);
  localStorage.setItem(STORAGE_KEYS.API_SETTINGS, JSON.stringify(settings));
}
export function clearApiSettings() {
  localStorage.removeItem(STORAGE_KEYS.API_SETTINGS);
}

// ===== 个人档案 =====
export function getProfile() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.PROFILE)) || {}; } catch (e) { return {}; }
}
export function saveProfile(profile) {
  localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
}

// ===== 新手引导 =====
export function hasCompletedOnboarding() {
  return localStorage.getItem(STORAGE_KEYS.ONBOARDING) === 'true';
}
export function completeOnboarding() {
  localStorage.setItem(STORAGE_KEYS.ONBOARDING, 'true');
}

// ===== 数据导出 =====
export function exportAllData() {
  const data = {
    history: getHistory(),
    timestamps: getDrawTimestamps(),
    apiSettings: getApiSettings(),
    profile: getProfile(),
    timeline: getTimeline(),
    symbolProfile: getSymbolProfile(),
    timeCapsule: getTimeCapsule(),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `fushangpai_backup_${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ===== 行动力记录 =====
export function saveActionTimestamp(type) {
  const actionKey = `fs_actions_${type}`;
  let actions = JSON.parse(localStorage.getItem(actionKey) || '[]');
  actions.push(Date.now());
  if (actions.length > 100) actions.shift();
  localStorage.setItem(actionKey, JSON.stringify(actions));
}
export function getActionTimestamps(type) {
  const actionKey = `fs_actions_${type}`;
  try {
    return JSON.parse(localStorage.getItem(actionKey) || '[]');
  } catch (e) { return []; }
}

// ===== 时间胶囊 =====
export function saveTimeCapsule(data) {
  localStorage.setItem(STORAGE_KEYS.TIME_CAPSULE, JSON.stringify(data));
}
export function getTimeCapsule() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.TIME_CAPSULE));
  } catch { return null; }
}

// ===== 占卜时间线 =====
export function getTimeline() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.TIMELINE)) || []; } catch { return []; }
}
export function addTimelineEntry(entry) {
  const timeline = getTimeline();
  timeline.push({ ...entry, timestamp: Date.now() });
  localStorage.setItem(STORAGE_KEYS.TIMELINE, JSON.stringify(timeline));
}

// ===== 符号档案 =====
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

// ===== 全域清理 =====
export function clearAllData() {
  const accent = localStorage.getItem('fs_custom_accent');
  localStorage.clear();
  if (accent) localStorage.setItem('fs_custom_accent', accent);
}