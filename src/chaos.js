// ===== src/chaos.js · 混沌引擎 =====
// 目的：模拟真实洗牌的不可预测性，确保每局牌局都有唯一且可验证的指纹

// ===== 随机种子生成 =====
export async function generateChaosSeed(entropyBytes) {
  // 如果提供了额外熵源，则混合使用
  if (entropyBytes && entropyBytes.length > 0) {
    const combined = new Uint8Array([...entropyBytes, ...new Uint8Array(32).fill(0)]);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', combined);
    return new Uint8Array(hashBuffer);
  }
  // 否则使用纯 crypto 生成 32 字节真随机种子
  const seed = new Uint8Array(32);
  window.crypto.getRandomValues(seed);
  return seed;
}

export function seedToX0(seedArray) {
  // 将 SHA-256 哈希转换为混沌系统的初始条件
  let sum = 0;
  for (let i = 0; i < seedArray.length; i++) {
    sum = (sum * 256 + seedArray[i]) % 10007;
  }
  return sum / 10007;
}

export function* chaoticGenerator(x0) {
  // Logistic 混沌映射 + 抖动混合，确保分布均匀
  let x = x0;
  let y = 0.12345;
  while (true) {
    // 标准 Logistic 映射
    x = 4 * x * (1 - x);
    // 抖动混合（避免低精度下的退化）
    y = Math.sin(y * 10000 + x) * 0.5 + 0.5;
    // 输出混合后的值
    yield (x + y * 0.0001) % 1;
  }
}

export function chaoticShuffle(deck, generator, skipSteps = 3) {
  const arr = [...deck];
  let currentIndex = arr.length;
  while (currentIndex > 1) {
    // 每一步跳过若干混沌迭代，增强不可预测性
    for (let i = 0; i < skipSteps; i++) {
      generator.next();
    }
    const rand = generator.next().value;
    const randomIndex = Math.floor(rand * currentIndex);
    currentIndex--;
    [arr[currentIndex], arr[randomIndex]] = [arr[randomIndex], arr[currentIndex]];
  }
  return arr;
}

export function generateFingerprint(deck) {
  // 生成 8 位十六进制指纹，用于验证牌局真实性和可复现性
  const str = JSON.stringify(deck.map(c => ({ r: c.rank, s: c.suit, t: c.type })));
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const hex = (hash >>> 0).toString(16).padStart(8, '0').toUpperCase();
  return `FS-${hex}`;
}

export function validateFingerprint(deck, fingerprint) {
  const computed = generateFingerprint(deck);
  return computed === fingerprint;
}