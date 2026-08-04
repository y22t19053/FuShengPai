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
// size: 输出边长；maskable: true 时背景铺满全幅 + 主体缩放至安全区（Android maskable 图标）
function render(size, opts = {}) {
  const { maskable = false } = opts;
  const SCALE = 512; // 设计分辨率（所有形状坐标基于 512 设计稿）
  const px = Buffer.alloc(size * (1 + size * 4));
  for (let y = 0; y < size; y++) {
    const rowStart = y * (1 + size * 4);
    px[rowStart] = 0; // filter: None
    for (let x = 0; x < size; x++) {
      const X = ((x + 0.5) / size) * SCALE;
      const Y = ((y + 0.5) / size) * SCALE;
      const o = rowStart + 1 + x * 4;

      // 背景：对角渐变，非 maskable 时裁切在外层圆角矩形内；maskable 时全幅铺满
      let c = gradColor(X, Y, BG0, BG1);
      let a = maskable ? 1 : cov(sdRoundRect(X, Y, 256, 256, 240, 240, 104));
      const gold = gradColor(X, Y, GOLD0, GOLD1);

      // maskable 安全区：主体（卡/月/眼）整体缩小至 72% 并居中，避开系统裁切圈
      const k = maskable ? 1 / 0.72 : 1;
      const MX = 256 + (X - 256) * k;
      const MY = 256 + (Y - 256) * k;

      // 内框描边（16px，圆角 36）
      const frame =
        cov(sdRoundRect(MX, MY, 256, 256, 160, 160, 36)) *
        cov(-sdRoundRect(MX, MY, 256, 256, 152, 152, 28));
      if (frame > 0) { c = mix(c, gold, frame); a = Math.max(a, frame); }

      // 半月（圆 r62 @262,216 减去 背景圆 r68 @236,188）
      const moon =
        cov(sdCircle(MX, MY, 262, 216, 62)) *
        cov(-sdCircle(MX, MY, 236, 188, 68));
      if (moon > 0) { c = mix(c, gold, moon); a = Math.max(a, moon); }

      // 眼（椭圆描边 12px）
      const eye =
        cov(sdEllipse(MX, MY, 256, 352, 42, 26)) *
        cov(-sdEllipse(MX, MY, 256, 352, 36, 20));
      if (eye > 0) { c = mix(c, gold, eye); a = Math.max(a, eye); }

      // 瞳孔（r11 实心）
      const pupil = cov(sdCircle(MX, MY, 256, 352, 11));
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
function encodePNG(raw, size) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
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

// ---------- 主流程：生成 PWA 所需全套图标 ----------
// 输出：
//   fsp-icon.png            512x512  常规（manifest any）
//   fsp-icon-192.png        192x192  常规（manifest any，Chrome 安装必需）
//   fsp-icon-maskable.png   512x512  maskable（Android 自适应图标）
//   apple-touch-icon.png    180x180  iOS 主屏图标（PNG，不支持 SVG）
const iconDir = join(__dirname, '..', 'public', 'icons');
mkdirSync(iconDir, { recursive: true });

const targets = [
  { file: 'fsp-icon.png', size: 512 },
  { file: 'fsp-icon-192.png', size: 192 },
  { file: 'apple-touch-icon.png', size: 180 },
  { file: 'fsp-icon-maskable.png', size: 512, maskable: true },
];

for (const t of targets) {
  const raw = render(t.size, { maskable: !!t.maskable });
  const png = encodePNG(raw, t.size);
  const out = join(iconDir, t.file);
  writeFileSync(out, png);
  console.log(`icon written: ${out} (${png.length} bytes)`);
}
