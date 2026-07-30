// ===== src/storage.js · 本地数据持久化 =====
// 包含 API Key 的混淆/去混淆，以及隐私模式检测
const STORAGE_KEYS = {
  HISTORY: 'fs_history',
  TIMESTAMPS: 'fs_timestamps',
  API_SETTINGS: 'fs_api_settings',
  PROFILE: 'fs_profile',
  ONBOARDING: 'fs_onboarding',
};

// 【安全修复】使用 Base64 进行简单的混淆，防止直接在 localStorage 中肉眼读取 Key
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

// ===== 精神力/抽卡次数 =====
export function getDrawTimestamps() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.TIMESTAMPS)) || []; } catch (e) { return []; }
}
export function addDrawTimestamp(ts) {
  const list = getDrawTimestamps();
  list.push(ts);
  if (list.length > 100) list.shift();
  localStorage.setItem(STORAGE_KEYS.TIMESTAMPS, JSON.stringify(list));
}

// ===== API 配置（含修复） =====
export function getApiSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.API_SETTINGS);
    if (!raw) return null;
    const settings = JSON.parse(raw);
    // 如果存在混淆过的 API Key，则尝试还原
    if (settings.apiKey) {
      const deobf = deobfuscate(settings.apiKey);
      if (deobf) settings.apiKey = deobf;
      else settings.apiKey = null;
    }
    return settings;
  } catch (e) { return null; }
}
export function saveApiSettings(settings) {
  // 保存时对 API Key 进行混淆处理（非加密，仅防肉眼读取）
  if (settings.apiKey) {
    settings.apiKey = obfuscate(settings.apiKey);
  }
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