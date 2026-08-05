// ===== src/utils/sound.js · 老牌馆声音系统（WebAudio 合成，零资源，离线可用） =====
// 两层声音，各司其职：
//   1. 牌声（主）：麻将牌碰撞的「嗒」——竹的闷、骨的脆、玉的亮，三种材质。
//      洗牌一声、摸牌一声、开牌各一声。这是中国人刻进 DNA 的声音记忆。
//   2. 尺八（留白）：只用于天命时刻（大小王/自摸）与送客收尾——气声、衰减、不循环。
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

// ---------- 一、牌声：竹 / 骨 / 玉 ----------

/** 三材质参数：竹（闷）/ 骨（脆）/ 玉（亮） */
const TILE_MATERIALS = {
  bamboo: { freq: 190,  dur: 0.06, gain: 0.22, bright: 0.15 }, // 闷：木质重，低频
  bone:   { freq: 460,  dur: 0.045, gain: 0.3, bright: 0.4  }, // 脆：中频干脆
  jade:   { freq: 900,  dur: 0.09, gain: 0.26, bright: 0.6  }, // 亮：高频有余韵
};

/**
 * 一声牌相击（嗒）：阻尼振荡主体 + 高八度泛音（材质亮度）+ 木质噪声瞬态
 * @param {AudioContext} c
 * @param {string} material 'bamboo'|'bone'|'jade'
 * @param {number} [vol] 音量倍率（洗牌时压低）
 */
function tileClick(c, material = 'bone', vol = 1) {
  const p = TILE_MATERIALS[material] || TILE_MATERIALS.bone;
  const t0 = c.currentTime;
  const dur = p.dur;

  // 主体：短促阻尼振荡（嗒的基音）
  const osc = c.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(p.freq, t0);
  osc.frequency.exponentialRampToValueAtTime(p.freq * 0.8, t0 + dur);
  const og = c.createGain();
  og.gain.setValueAtTime(0.0001, t0);
  og.gain.exponentialRampToValueAtTime(p.gain * vol, t0 + 0.003);
  og.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(og);

  // 泛音：高八度三角波，决定「脆/亮」程度
  const osc2 = c.createOscillator();
  osc2.type = 'triangle';
  osc2.frequency.setValueAtTime(p.freq * 2.4, t0);
  const og2 = c.createGain();
  og2.gain.setValueAtTime(0.0001, t0);
  og2.gain.exponentialRampToValueAtTime(p.gain * p.bright * vol, t0 + 0.002);
  og2.gain.exponentialRampToValueAtTime(0.0001, t0 + dur * 0.7);
  osc2.connect(og2);

  // 木质噪声瞬态（骨牌碰撞的「嗒」气口）
  const ns = c.createBufferSource();
  ns.buffer = makeNoiseBuf(c, 0.03);
  const nf = c.createBiquadFilter();
  nf.type = 'highpass';
  nf.frequency.value = 900;
  const ng = c.createGain();
  ng.gain.setValueAtTime(0.0001, t0);
  ng.gain.exponentialRampToValueAtTime(p.gain * 0.5 * vol, t0 + 0.002);
  ng.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.025);
  ns.connect(nf);
  nf.connect(ng);

  og.connect(c.destination);
  og2.connect(c.destination);
  ng.connect(c.destination);

  osc.start(t0); osc2.start(t0); ns.start(t0);
  osc.stop(t0 + dur + 0.03); osc2.stop(t0 + dur * 0.75 + 0.03); ns.stop(t0 + 0.03);
}

/**
 * 洗牌声：六七声低响错落的「嗒」——牌在绿呢上被归拢的动静
 */
export function playWashSound() {
  const c = getCtx();
  if (!c) return;
  try {
    const mat = ['bamboo', 'bone', 'bamboo', 'jade', 'bone', 'bamboo'];
    for (let i = 0; i < mat.length; i++) {
      window.setTimeout(() => {
        const cc = getCtx();
        if (cc) tileClick(cc, mat[i], 0.35 + Math.random() * 0.15);
      }, i * 85);
    }
  } catch (e) { /* 静默降级 */ }
}

/**
 * 摸牌声：一声极轻的竹闷——手指按住牌背的瞬间
 */
export function playMoPaiSound() {
  const c = getCtx();
  if (!c) return;
  try {
    tileClick(c, 'bamboo', 0.28);
  } catch (e) { /* 静默降级 */ }
}

/**
 * 开牌声：按材质出牌（竹/骨/玉）
 * @param {'bamboo'|'bone'|'jade'} material
 */
export function playKaiPaiSound(material = 'bone') {
  const c = getCtx();
  if (!c) return;
  try {
    tileClick(c, material, 1);
  } catch (e) { /* 静默降级 */ }
}

// ---------- 二、尺八：天命与送客 ----------

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
 * @param {'tap'|'flip'|'place'} kind - tap=摸牌一声轻竹 / flip=开牌一声骨牌 / place 静音
 */
export function playCardSound(kind = 'flip') {
  const c = getCtx();
  if (!c) return;
  try {
    if (kind === 'flip') { tileClick(c, 'bone', 1); return; }
    if (kind === 'tap') { tileClick(c, 'bamboo', 0.28); return; }
    // place：落子无声（寂）
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
