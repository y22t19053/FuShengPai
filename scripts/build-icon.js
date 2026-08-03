// ===== build-icon.js · 纯 Node 光栅化应用图标 =====
// 将 fsp-icon.svg 的图形（深色圆角卡 + 金色半月眼）渲染为 512x512 PNG
// 无第三方依赖：SDF 形状 + 手写 PNG 编码（zlib 内置）
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SIZE = 512;
const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------- 颜色 ----------
const BG0 = [0x1a, 0x16, 0x26];
const BG1 = [0x2c, 0x27, 0x42];
const GOLD0 = [0xec, 0xcf, 0x8a];
const GOLD1 = [0xa9, 0x83, 0x3f];

const lerp = (a, b, t) => a + (b - a) * t;
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const clamp01 = (v) => Math.max(0, Math.min(1, v));

function gradColor(x, y, c0, c1) {
  const t = (x + y) / (2 * SIZE);
  return [lerp(c0[0], c1[0], t), lerp(c0[1], c1[1], t), lerp(c0[2], c1[2], t)];
}

// ---------- SDF ----------
function sdRoundRect(px, py, cx, cy, hw, hh, r) {
  const qx = Math.abs(px - cx) - (hw - r);
  const qy = Math.abs(py - cy) - (hh - r);
  const ox = Math.max(qx, 0);
  const oy = Math.max(qy, 0);
  return Math.hypot(ox, oy) + Math.min(Math.max(qx, qy), 0) - r;
}
function sdCircle(px, py, cx, cy, r) {
  return Math.hypot(px - cx, py - cy) - r;
}
function sdEllipse(px, py, cx, cy, rx, ry) {
  const x = (px - cx) / rx;
  const y = (py - cy) / ry;
  return (Math.hypot(x, y) - 1) * Math.min(rx, ry);
}
const cov = (d) => clamp01(0.5 - d); // 1px 过渡带覆盖率

// ---------- 像素合成 ----------
function render() {
  const px = Buffer.alloc(SIZE * (1 + SIZE * 4));
  for (let y = 0; y < SIZE; y++) {
    const rowStart = y * (1 + SIZE * 4);
    px[rowStart] = 0; // filter: None
    for (let x = 0; x < SIZE; x++) {
      const X = x + 0.5;
      const Y = y + 0.5;
      const o = rowStart + 1 + x * 4;

      // 背景：对角渐变，裁切在外层圆角矩形内
      let c = gradColor(X, Y, BG0, BG1);
      let a = cov(sdRoundRect(X, Y, 256, 256, 240, 240, 104));
      const gold = gradColor(X, Y, GOLD0, GOLD1);

      // 内框描边（16px，圆角 36）
      const frame =
        cov(sdRoundRect(X, Y, 256, 256, 160, 160, 36)) *
        cov(-sdRoundRect(X, Y, 256, 256, 152, 152, 28));
      if (frame > 0) { c = mix(c, gold, frame); a = Math.max(a, frame); }

      // 半月（圆 r62 @262,216 减去 背景圆 r68 @236,188）
      const moon =
        cov(sdCircle(X, Y, 262, 216, 62)) *
        cov(-sdCircle(X, Y, 236, 188, 68));
      if (moon > 0) { c = mix(c, gold, moon); a = Math.max(a, moon); }

      // 眼（椭圆描边 12px）
      const eye =
        cov(sdEllipse(X, Y, 256, 352, 42, 26)) *
        cov(-sdEllipse(X, Y, 256, 352, 36, 20));
      if (eye > 0) { c = mix(c, gold, eye); a = Math.max(a, eye); }

      // 瞳孔（r11 实心）
      const pupil = cov(sdCircle(X, Y, 256, 352, 11));
      if (pupil > 0) { c = mix(c, gold, pupil); a = Math.max(a, pupil); }

      px[o] = Math.round(c[0] * a + 255 * (1 - a));
      px[o + 1] = Math.round(c[1] * a + 255 * (1 - a));
      px[o + 2] = Math.round(c[2] * a + 255 * (1 - a));
      px[o + 3] = Math.round(a * 255);
    }
  }
  return px;
}

// ---------- PNG 编码 ----------
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crc]);
}
function encodePNG(raw) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(SIZE, 0);
  ihdr.writeUInt32BE(SIZE, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------- 主流程 ----------
const raw = render();
const png = encodePNG(raw);
const out = join(__dirname, '..', 'public', 'icons', 'fsp-icon.png');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, png);
console.log(`icon written: ${out} (${png.length} bytes)`);
