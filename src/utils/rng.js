// ===== src/utils/rng.js · 随机源统一 =====
// 两类随机，杜绝"随机源分裂"：
//   · 内容判词（横幅/签语/比喻/结语/周期牌）→ 确定性种子（同一天同一句，见 texts/social.js 的 pickStable）
//   · 真实随机动作（洗牌/盲抽/摇一摇选牌）→ crypto.getRandomValues 真随机
// 不再散落 Math.random：内容稳定性靠种子，动作公平性靠 crypto。

let _crypto = null;
function getCrypto() {
  if (_crypto === null) {
    _crypto = (typeof globalThis !== 'undefined' && globalThis.crypto) || null;
  }
  return _crypto;
}

/** 真随机浮点 [0,1)（crypto 不可用时回退 Math.random） */
export function secureRandom() {
  const c = getCrypto();
  if (c && typeof c.getRandomValues === 'function') {
    const buf = new Uint32Array(1);
    c.getRandomValues(buf);
    return buf[0] / 4294967296;
  }
  return Math.random();
}

/** 真随机取一项（空数组返回 ''） */
export function pickRandom(arr) {
  if (!arr || arr.length === 0) return '';
  return arr[Math.floor(secureRandom() * arr.length)];
}

/** 真随机洗牌（Fisher–Yates，不改原数组） */
export function shuffleRandom(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(secureRandom() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
