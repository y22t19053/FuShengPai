// ===== src/chaos.js · 混沌引擎 =====
export async function generateChaosSeed(entropyBytes) {
  const external = new Uint8Array(32);
  window.crypto.getRandomValues(external);
  const combined = new Uint8Array([...entropyBytes, ...external]);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', combined);
  return new Uint8Array(hashBuffer);
}

export function seedToX0(seedArray) {
  let sum = 0;
  for (let i = 0; i < seedArray.length; i++) {
    sum = (sum * 256 + seedArray[i]) % 10007;
  }
  return sum / 10007;
}

export function* chaoticGenerator(x0) {
  let x = x0;
  while (true) {
    x = 4 * x * (1 - x);
    x = x < 0.5 ? 2 * x : 2 * (1 - x);
    yield x;
  }
}

export function chaoticShuffle(deck, generator, skipSteps = 3) {
  const arr = [...deck];
  let currentIndex = arr.length;
  while (currentIndex > 1) {
    for (let i = 0; i < skipSteps; i++) { generator.next(); }
    const rand = generator.next().value;
    const randomIndex = Math.floor(rand * currentIndex);
    currentIndex--;
    [arr[currentIndex], arr[randomIndex]] = [arr[randomIndex], arr[currentIndex]];
  }
  return arr;
}

export function generateFingerprint(deck) {
  const str = JSON.stringify(deck);
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