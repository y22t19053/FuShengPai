// ===== src/entropy.js · 熵采集系统 =====
let entropyBuffer = [];
let isCollecting = false;
let entropyLevel = 0;

export function startEntropyCollection() {
  isCollecting = true;
  entropyBuffer = [];
  entropyLevel = 0;
  document.addEventListener('mousemove', collectEntropy);
  document.addEventListener('touchmove', collectTouchEntropy, { passive: true });
}

export function stopEntropyCollection() {
  isCollecting = false;
  document.removeEventListener('mousemove', collectEntropy);
  document.removeEventListener('touchmove', collectTouchEntropy);
}

function collectEntropy(e) {
  if (!isCollecting) return;
  const mix = `${e.clientX},${e.clientY},${e.movementX},${e.movementY},${performance.now()}`;
  const bytes = new TextEncoder().encode(mix);
  entropyBuffer.push(...bytes);
  entropyLevel = Math.min(100, entropyBuffer.length / 10);
}

function collectTouchEntropy(e) {
  if (!isCollecting || !e.touches.length) return;
  const touch = e.touches[0];
  const mix = `${touch.clientX},${touch.clientY},${performance.now()}`;
  const bytes = new TextEncoder().encode(mix);
  entropyBuffer.push(...bytes);
  entropyLevel = Math.min(100, entropyBuffer.length / 10);
}

export function getEntropyLevel() {
  return entropyLevel;
}

export function getEntropyBuffer() {
  return new Uint8Array(entropyBuffer);
}

export function getEntropyStats() {
  return {
    level: entropyLevel,
    size: entropyBuffer.length,
    isCollecting
  };
}

export function resetEntropy() {
  entropyBuffer = [];
  entropyLevel = 0;
}