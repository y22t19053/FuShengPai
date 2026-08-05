// ===== src/utils/sound.js · 合成音效（WebAudio，零资源文件，离线可用） =====
// 只在用户手势（点击/触摸）内触发，懒创建 AudioContext，静默降级。
let ctx = null;

function getCtx() {
  try {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  } catch (e) {
    return null;
  }
}

// 一段白噪声 → 滤波 → 指数衰减（纸牌/桌面质感）
function noise(c, dur, gain, filterType, freq, q = 1) {
  const len = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = filterType;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = c.createGain();
  g.gain.setValueAtTime(gain, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
  src.connect(f);
  f.connect(g);
  g.connect(c.destination);
  src.start();
  return src;
}

/**
 * 纸牌声
 * @param {'tap'|'flip'} kind - tap=点击闷响（30ms）· flip=纸牌翻动（0.1s）
 */
export function playCardSound(kind = 'flip') {
  const c = getCtx();
  if (!c) return;
  try {
    if (kind === 'tap') {
      noise(c, 0.03, 0.22, 'lowpass', 900);
    } else {
      noise(c, 0.09, 0.28, 'bandpass', 1400, 2.5);
      noise(c, 0.05, 0.1, 'highpass', 3500);
    }
  } catch (e) { /* 静默降级 */ }
}

/**
 * 天命时刻：金色上行三音（大小王专属，纸牌声 + 高远钟声感）
 */
export function playJokerSound() {
  const c = getCtx();
  if (!c) return;
  try {
    const notes = [523.25, 659.25, 783.99];
    notes.forEach((freq, i) => {
      const t = c.currentTime + i * 0.09;
      const o = c.createOscillator();
      o.type = 'sine';
      o.frequency.value = freq;
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.16, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      o.connect(g);
      g.connect(c.destination);
      o.start(t);
      o.stop(t + 0.4);
    });
    noise(c, 0.08, 0.14, 'bandpass', 2200, 2);
  } catch (e) { /* 静默降级 */ }
}

// 落牌确认的轻叩（周期抽牌确认 / 布牌落定）
export function playPlaceSound() {
  const c = getCtx();
  if (!c) return;
  try {
    noise(c, 0.05, 0.16, 'lowpass', 700);
  } catch (e) { /* 静默降级 */ }
}
