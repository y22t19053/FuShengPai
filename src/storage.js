// ===== 浮生牌 · 存储层 =====
const KEYS = {
  HISTORY: 'fs_history',
  API_SETTINGS: 'fs_api',
  PROFILE: 'fs_profile',
  ONBOARDED: 'fs_onboarded',
  DRAW_TIMESTAMPS: 'fs_draw_timestamps',
};

// ----- 历史记录 -----
export function getHistory() {
  try {
    const raw = localStorage.getItem(KEYS.HISTORY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.warn('读取历史记录失败', e);
    return [];
  }
}

export function saveReading(record) {
  const history = getHistory();
  history.unshift(record);
  try {
    localStorage.setItem(KEYS.HISTORY, JSON.stringify(history));
  } catch (e) {
    console.error('保存历史失败', e);
    throw new Error('存储空间不足，请先导出并清除旧数据。');
  }
}

export function deleteHistoryItem(index) {
  const history = getHistory();
  if (index >= 0 && index < history.length) {
    history.splice(index, 1);
    localStorage.setItem(KEYS.HISTORY, JSON.stringify(history));
  }
  return history;
}

export function clearHistory() {
  localStorage.removeItem(KEYS.HISTORY);
}

// ----- 占卜时间戳 -----
export function getDrawTimestamps() {
  try {
    const raw = localStorage.getItem(KEYS.DRAW_TIMESTAMPS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) { return []; }
}

export function addDrawTimestamp(timestamp) {
  const stamps = getDrawTimestamps();
  stamps.push(timestamp);
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const recent = stamps.filter(t => t > cutoff);
  localStorage.setItem(KEYS.DRAW_TIMESTAMPS, JSON.stringify(recent));
}

// ----- API 设置 -----
export function getApiSettings() {
  try {
    const raw = localStorage.getItem(KEYS.API_SETTINGS);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) { return null; }
}

export function saveApiSettings(settings) {
  localStorage.setItem(KEYS.API_SETTINGS, JSON.stringify(settings));
}

export function clearApiSettings() {
  localStorage.removeItem(KEYS.API_SETTINGS);
}

// ----- 个人信息 -----
export function getProfile() {
  try {
    const raw = localStorage.getItem(KEYS.PROFILE);
    if (!raw) return { birthDate: '', birthTime: '' };
    return JSON.parse(raw);
  } catch (e) { return { birthDate: '', birthTime: '' }; }
}

export function saveProfile(profile) {
  localStorage.setItem(KEYS.PROFILE, JSON.stringify(profile));
}

// ----- 新手引导 -----
export function hasCompletedOnboarding() {
  return localStorage.getItem(KEYS.ONBOARDED) === '1';
}

export function completeOnboarding() {
  localStorage.setItem(KEYS.ONBOARDED, '1');
}

// ----- 数据导出 -----
export function exportAllData() {
  const data = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    history: getHistory(),
    profile: getProfile(),
    drawTimestamps: getDrawTimestamps(),
  };
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `浮生牌_数据导出_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function importData(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!data || !Array.isArray(data.history)) {
          reject(new Error('无效的数据文件'));
          return;
        }
        const existing = getHistory();
        const existingTimes = new Set(existing.map(r => r.time));
        let added = 0, skipped = 0;
        for (const record of data.history) {
          if (existingTimes.has(record.time)) { skipped++; }
          else { existing.push(record); added++; }
        }
        existing.sort((a, b) => b.time - a.time);
        localStorage.setItem(KEYS.HISTORY, JSON.stringify(existing));
        resolve({ added, skipped });
      } catch (err) { reject(new Error('文件解析失败')); }
    };
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsText(file);
  });
}

export function clearAllData() {
  Object.values(KEYS).forEach(key => localStorage.removeItem(key));
}