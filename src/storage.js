// ===== 在 src/storage.js 末尾追加 =====
// 行动力记录（使用频率统计）
export function saveActionTimestamp(type) {
  const list = getDrawTimestamps();
  // 记录特定类型的行动（例如生成解读）
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