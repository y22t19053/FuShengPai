// ===== src/share/fingerprint.js · 命运指纹（不可复制的唯一标识） =====

// 基于牌面、时间、随机熵生成唯一指纹（与 chaos.js 的 generateFingerprint 区分）
export function buildShareFingerprint(seedArray = [], entropy = '') {
  const base = [...seedArray.map(c => `${c.rank || c.type}${c.suit || ''}`), entropy, Date.now().toString()].join('|');
  let hash = 0;
  for (let i = 0; i < base.length; i++) {
    const char = base.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const hex = Math.abs(hash).toString(16).toUpperCase().padStart(8, '0');
  return `FS-${hex.slice(0, 8)}`;
}

// 生成不可追踪的短指纹（用于收藏卡编号）
export function buildShortFingerprint(seed = '') {
  const base = `${seed}${Date.now()}${Math.random().toString(36).slice(2)}`;
  let hash = 0;
  for (let i = 0; i < base.length; i++) {
    hash = ((hash << 5) - hash) + base.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36).toUpperCase().slice(0, 6);
}