// ===== src/utils/sound.js · 尺八单音（WebAudio 合成，零资源，离线可用） =====
// 寂：声音只留一个——尺八感短音（气声、衰减、不循环）。
//   翻牌一声、收尾一声，其余时刻全静音。安静本身就是仪式的一部分。
// 尺八特点：气声起振 + 基频 + 轻微音高下滑（meri）+ 长指数衰减。
// 只在用户手势内触发，懒创建 AudioContext，静默降级。

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

/** 一段白噪声（气声素材） */
function makeNoiseBuf(c, dur) {
  const len = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

/**
 * 尺八单音：基频 sine + 气声（噪声→带通）→ 各自指数衰减到长尾
 * @param {number} dur     总时长（秒）
 * @param {number} freq    基频（Hz，翻牌 F4≈349，收尾 D4≈294，天命 Bb4≈466）
 * @param {number} gain    峰值音量 0~1
 * @param {object} [opts]  glideFrom 起振音高倍数（>1 更高）、glideTo 落音高倍数（<1 下滑）
 */
function shakuTone(c, dur, freq, gain, opts = {}) {
  const t0 = c.currentTime;
  const glideFrom = opts.glideFrom || 1;
  const glideTo = opts.glideTo || 0.985;

  // 基频（sine，微下滑如 meri）
  const osc = c.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq * glideFrom, t0);
  osc.frequency.exponentialRampToValueAtTime(freq * glideTo, t0 + dur);
  const og = c.createGain();
  og.gain.setValueAtTime(0.0001, t0);
  og.gain.exponentialRampToValueAtTime(gain * 0.85, t0 + 0.03);
  og.gain.exponentialRampToValueAtTime(gain * 0.1, t0 + dur * 0.6);
  og.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(og);

  // 气声（白噪声 → 带通 1300Hz，音量远低于基频）
  const ns = c.createBufferSource();
  ns.buffer = makeNoiseBuf(c, dur);
  const nf = c.createBiquadFilter();
  nf.type = 'bandpass';
  nf.frequency.value = 1300;
  nf.Q.value = 0.8;
  const ng = c.createGain();
  ng.gain.setValueAtTime(0.0001, t0);
  ng.gain.exponentialRampToValueAtTime(gain * 0.35, t0 + 0.04);
  ng.gain.exponentialRampToValueAtTime(gain * 0.04, t0 + dur * 0.5);
  ng.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  ns.connect(nf);
  nf.connect(ng);

  // 柔和的空间尾（一层非常淡的混响感，不循环）
  const tail = c.createGain();
  tail.gain.value = 0.6;
  og.connect(tail);
  ng.connect(tail);
  tail.connect(c.destination);

  osc.start(t0);
  ns.start(t0);
  osc.stop(t0 + dur + 0.05);
  ns.stop(t0 + dur + 0.05);
}

/**
 * 纸牌声（兼容旧签名）
 * @param {'tap'|'flip'|'place'} kind - tap/place 一律静音（寂），flip 出尺八一声
 */
export function playCardSound(kind = 'flip') {
  const c = getCtx();
  if (!c) return;
  if (kind !== 'flip') return; // 寂：点击、落子无声，只留翻牌
  try {
    shakuTone(c, 0.9, 349.23, 0.2, { glideFrom: 1.02 }); // F4 翻牌一声
  } catch (e) { /* 静默降级 */ }
}

/**
 * 收尾一声（送客）：读完卷宗，店家鞠一躬——更低、更长的尺八尾音
 */
export function playClosingSound() {
  const c = getCtx();
  if (!c) return;
  try {
    shakuTone(c, 1.5, 293.66, 0.18, { glideFrom: 1.03, glideTo: 0.97 }); // D4 慢收
  } catch (e) { /* 静默降级 */ }
}

/**
 * 天命时刻（大小王）：同一支尺八，只是更长、更亮、气声更足——不换乐器，只换呼吸
 */
export function playJokerSound() {
  const c = getCtx();
  if (!c) return;
  try {
    shakuTone(c, 1.9, 466.16, 0.24, { glideFrom: 1.07, glideTo: 0.96 }); // Bb4 长叹
  } catch (e) { /* 静默降级 */ }
}

// 兼容保留：落子确认的轻叩——寂，静音（不再发声）
export function playPlaceSound() {
  // 寂：落子无声。放菜时欠身的是 toast，不是声音。
}
