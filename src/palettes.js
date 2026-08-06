// ===== src/palettes.js · 十组动态配色（日期轮换 · 每组必登场） =====
// 设计规则：
//  · 每天按「日期序号」确定性选出 4 组（≤4 组/屏）：深色组（背景微染/边框/牌背）、
//    动作红组（按钮/警示/日运）、亮色组（强调/标签/高亮）、情绪结构组（日运卡/状态卡/分享图）。
//  · 角色分工：深色 → 背景/边框/牌背；红系 → 动作；亮色 → 小处强调（先莫兰迪调和防晃眼）；
//    粉黄 → 情绪（日运卡/状态/分享图）；绿紫 → 结构（九宫格/体用槽）。
//  · 同日刷新稳定；跨日轮换；10 组在 3~5 天内全部登场（60 天覆盖全部组合）。
//  · 高饱和亮色不直接做大面积：--accent 用「莫兰迪调和版」，原亮色只做小点缀（--accent-bright）。

/** 十组新配色（用户指定 20 色，含角色标签） */
export const PALETTE_GROUPS = [
  { id: 1,  name: '包豪斯红·哑光黑',  deep: '#222222', action: '#D82E2F' },
  { id: 2,  name: '高饱和紫·薄荷绿', structure: '#7B2CBF', bright: '#80ED99' },
  { id: 3,  name: '马尔济斯绿·玫瑰粉', structure: '#01847F', mood: '#F9D2E4' },
  { id: 4,  name: '荷叶绿·朝霞粉',  structure: '#1A6840', mood: '#FFB7C5' },
  { id: 5,  name: '甜酷玫粉·炭黑',  deep: '#1A1A1D', action: '#E6397C' },
  { id: 6,  name: '克莱因蓝·蒂芙尼蓝', deep: '#012696', bright: '#66D4C8' },
  { id: 7,  name: '鹤顶红·女贞黄',  action: '#D24735', mood: '#F7EEAD' },
  { id: 8,  name: '茶绿·荧光蓝',    bright: '#05A5FA', bright2: '#D3FFAF' },
  { id: 9,  name: '象牙白·朱砂红',  paper: '#FFFFF0', action: '#C01E25' },
  { id: 10, name: '紫罗兰·柠檬黄',  structure: '#8A2BE2', mood: '#FFED00' },
];

// 角色候选池（槽位轮换用；每组按角色只进一个池，10 组各归其位）
const DEEP_POOL = [1, 5, 6, 3, 4];   // 深色：哑光黑/炭黑/克莱因蓝/马尔济斯绿/荷叶绿
const ACTION_POOL = [1, 5, 7, 9];    // 动作：包豪斯红/甜酷玫粉/鹤顶红/朱砂红
const BRIGHT_POOL = [2, 6, 8];       // 亮色：薄荷绿/蒂芙尼蓝/荧光蓝（茶绿随行）
const MOOD_POOL = [3, 4, 7, 10];     // 情绪：玫瑰粉/朝霞粉/女贞黄/柠檬黄

/** 亮色原色 → 莫兰迪调和 accent（压饱和、降明度，手绘绘本风不晃眼） */
const ACCENT_FROM_BRIGHT = {
  '#80ED99': '#6FAE9C', // 薄荷绿 → 鼠尾草薄荷
  '#66D4C8': '#5FA8B5', // 蒂芙尼蓝 → 雾蓝
  '#05A5FA': '#4E7FAA', // 荧光蓝 → 雾蓝灰
  '#D3FFAF': '#A8C08A', // 茶绿 → 灰茶绿
};

// ---------- 颜色工具 ----------

function clamp(n) { return Math.max(0, Math.min(255, Math.round(n))); }

/** '#RRGGBB' → [r,g,b]（容忍 #RGB / 大写） */
export function hexToRgb(hex) {
  let h = String(hex || '').replace('#', '').trim();
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return [58, 52, 37];
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}

/** [r,g,b] → '#rrggbb' */
export function rgbToHex(rgb) {
  return '#' + rgb.map((n) => clamp(n).toString(16).padStart(2, '0')).join('');
}

/** 两 hex 按 t 线性插值（t=0 → a，t=1 → b） */
export function mixColor(a, b, t) {
  const ra = hexToRgb(a);
  const rb = hexToRgb(b);
  const k = Math.max(0, Math.min(1, t));
  return rgbToHex(ra.map((v, i) => v + (rb[i] - v) * k));
}

/** 'r,g,b' 字符串（供 rgba(var(...)/ rgba(...) 使用） */
export function rgbStr(hex) {
  return hexToRgb(hex).join(', ');
}

/** rgba() 字符串 */
export function rgbaStr(hex, alpha) {
  return `rgba(${rgbStr(hex)}, ${alpha})`;
}

// ---------- 日期序号（2000-01-01 起的天数，同日稳定） ----------

export function dayIndex(d = new Date()) {
  const start = Date.UTC(2000, 0, 1);
  const now = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.floor((now - start) / 86400000);
}

function pickPool(pool, i, used) {
  let k = i % pool.length;
  let guard = 0;
  while (used.has(pool[k]) && guard++ < pool.length) k = (k + 1) % pool.length;
  used.add(pool[k]);
  return pool[k];
}

// ---------- 当日调色板 ----------

/**
 * 返回当日配色（确定性、同日稳定）：
 * ids / groupNames / deep / action / bright / accentBright / mood / structure /
 * accent（莫兰迪调和）/ paper（象牙白组激活时用 #FFFFF0）
 */
export function getTodayPalette(d = new Date()) {
  const i = dayIndex(d);
  const used = new Set();
  const deepId = pickPool(DEEP_POOL, i, used);
  const actionId = pickPool(ACTION_POOL, i, used);
  const brightId = pickPool(BRIGHT_POOL, i, used);
  const moodId = pickPool(MOOD_POOL, i, used);
  const ids = [deepId, actionId, brightId, moodId];
  const g = (id) => PALETTE_GROUPS.find((x) => x.id === id) || PALETTE_GROUPS[0];
  const deepG = g(deepId);
  const actionG = g(actionId);
  const brightG = g(brightId);
  const moodG = g(moodId);

  const deep = deepG.deep || deepG.structure || '#1A1A1D';
  const action = actionG.action;
  const bright = brightG.bright;
  const bright2 = brightG.bright2 || '';
  const mood = moodG.mood;
  const structG = ids.map(g).find((x) => x.structure);
  const structure = structG ? structG.structure : mixColor(deep, '#8A2BE2', 0.45);
  const accent = ACCENT_FROM_BRIGHT[bright.toUpperCase()] || mixColor(bright, '#3a3425', 0.3);
  const accentBright = bright;
  const paper = ids.map(g).find((x) => x.paper) ? '#FFFFF0' : '#FDFAF1';

  return {
    ids,
    groupNames: ids.map((id) => g(id).name),
    deep,
    action,
    bright,
    bright2,
    accentBright,
    mood,
    structure,
    accent,
    paper,
  };
}

// ---------- 应用到 :root ----------

/**
 * 由调色板派生全部 CSS 变量（值展开写死，不依赖 var 嵌套）。
 * 只覆盖与色相相关的 token；手绘笔触（圆角/字体/层级）保持不动。
 */
export function paletteToCssVars(p = getTodayPalette()) {
  const { deep, action, mood, structure, accent, accentBright, paper } = p;
  const goldBright = mixColor(accent, '#ffffff', 0.32);
  const goldMute = mixColor(accent, '#3a3425', 0.22);   // = --good
  const goldDim = mixColor(accent, '#3a3425', 0.42);
  const cinnabarText = mixColor(action, '#3a3425', 0.2);
  const candyMint = mixColor(accent, '#ffffff', 0.25);
  const candyLav = mixColor(structure, '#ffffff', 0.38);
  const candyYellow = mixColor(mood, '#3a3425', 0.08);
  const candyBlue = mixColor('#8fb0c3', deep, 0.3);
  const wood = mixColor('#c9bca0', deep, 0.12);
  const woodFrame = mixColor('#cfc3a9', deep, 0.16);
  const heroBg1 = mixColor(accent, '#ffffff', 0.72);
  // 背景以浅纸为主、向深色组微染 4%~10%（深色只做边框/牌背/点缀，不破坏浅纸暖底）
  const bg = mixColor('#efe9d8', deep, 0.08);
  const bg2 = mixColor('#e6ddc9', deep, 0.07);
  const bg3 = mixColor('#dbd0b6', deep, 0.1);
  const panel = mixColor('#f6f0e2', deep, 0.04);
  const panel2 = mixColor('#eae2cf', deep, 0.05);
  const border = mixColor('#aa9d80', deep, 0.25);
  const borderSoft = mixColor('#d5cbb2', deep, 0.14);
  const dim = mixColor('#857a63', deep, 0.2);
  const inkFaint = mixColor('#887d65', deep, 0.16);
  const inkGhost = mixColor('#a0937b', deep, 0.12);
  const lineFaint = mixColor('#e2d9c2', deep, 0.1);

  return {
    '--bg': bg,
    '--bg2': bg2,
    '--bg3': bg3,
    '--panel': panel,
    '--panel2': panel2,
    '--border': border,
    '--border-soft': borderSoft,
    '--dim': dim,
    '--accent': accent,
    '--accent-rgb': rgbStr(accent),
    '--accent-bright': accentBright,
    '--accent-bright-rgb': rgbStr(accentBright),
    '--gold': accent,
    '--gold-bright': goldBright,
    '--gold-mute': goldMute,
    '--gold-mute-rgb': rgbStr(goldMute),
    '--gold-dim': goldDim,
    '--candy-mint': candyMint,
    '--candy-mint-rgb': rgbStr(candyMint),
    '--candy-lav': candyLav,
    '--candy-lav-rgb': rgbStr(candyLav),
    '--candy-yellow': candyYellow,
    '--candy-blue': candyBlue,
    '--candy-blue-rgb': rgbStr(candyBlue),
    '--cinnabar': action,
    '--cinnabar-rgb': rgbStr(action),
    '--cinnabar-text': cinnabarText,
    '--cinnabar-light': mixColor(action, '#ffffff', 0.55),
    '--cinnabar-soft': rgbaStr(action, 0.12),
    '--wood': wood,
    '--wood-frame': woodFrame,
    '--line-faint': lineFaint,
    '--ink-faint': inkFaint,
    '--ink-ghost': inkGhost,
    '--hero-bg0': '#f8f2e5',
    '--hero-bg1': heroBg1,
    '--good': goldMute,
    '--bad': action,
    '--bad-rgb': rgbStr(action),
    '--paper-deep': mixColor('#ded4ba', deep, 0.12),
    '--card-bg-2': heroBg1,
    '--red-paper-0': mixColor(action, '#ffffff', 0.82),
    '--red-paper-1': mixColor(action, '#ffffff', 0.7),
    '--ink-border': mixColor('#d8cdb6', deep, 0.14),
    '--cream-0': mixColor('#f8f4ea', deep, 0.03),
    '--cream-1': mixColor('#f0eadb', deep, 0.04),
    '--shimmer-1': mixColor(accent, '#ffffff', 0.78),
    '--felt-0': mixColor(accent, '#ffffff', 0.88),
    '--felt-1': mixColor(accent, '#ffffff', 0.76),
    '--felt-2': mixColor(accent, '#ffffff', 0.6),
    '--overlay': rgbaStr(deep, 0.52),
    '--tape': rgbaStr(mood, 0.34),
    '--cut-lg': `4px 5px 0 ${rgbaStr(goldMute, 0.16)}`,
    '--cut-md': `3px 4px 0 ${rgbaStr(goldMute, 0.14)}`,
    '--cut-sm': `2px 3px 0 ${rgbaStr(goldMute, 0.13)}`,
    '--cut-btn': `0 4px 0 ${rgbaStr(goldMute, 0.22)}`,
    '--cut-btn-cin': `0 4px 0 ${rgbaStr(action, 0.22)}`,
    // 结构（九宫格/体用槽）与情绪（日运/状态卡）专用 token
    '--structure': structure,
    '--structure-rgb': rgbStr(structure),
    '--structure-soft': rgbaStr(structure, 0.1),
    '--mood': mood,
    '--mood-rgb': rgbStr(mood),
    '--mood-soft': rgbaStr(mood, 0.14),
    '--paper': paper,
  };
}

/** 把当日配色写入 document.documentElement.style（:root） */
export function applyPaletteToRoot(p = getTodayPalette()) {
  if (typeof document === 'undefined') return p;
  const vars = paletteToCssVars(p);
  const root = document.documentElement;
  for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
  return p;
}

// ---------- 分享图色板（share2/style.js 用） ----------

/**
 * 由当日配色生成分享图 PAPER 双色板：
 * light = 日运（浅纸）、dark = 牌灵/解读（暖纸）。
 * qrLight 恒为近白，保证二维码可扫（用户首要修复项）。
 */
export function buildSharePaper(p = getTodayPalette()) {
  const { deep, action, mood, structure, accent, accentBright, paper } = p;
  const goldDeep = mixColor(accent, '#3a3425', 0.22);
  const ink = '#3a3425';
  return {
    dark: {
      bg0: mixColor('#efe9d8', deep, 0.09),
      bg1: mixColor('#e6ddc9', deep, 0.08),
      bg2: mixColor('#dbd0b6', deep, 0.12),
      ink,
      inkDim: mixColor('#6b6352', deep, 0.22),
      inkFaint: mixColor('#887d65', deep, 0.24),
      gold: accent,
      goldDeep,
      red: action,
      paper,
      line: rgbaStr(ink, 0.16),
      border: rgbaStr(deep, 0.42),
      cardShadow: rgbaStr(ink, 0.16),
      qrLight: '#FFFFFF',
      pillBg: rgbaStr(accent, 0.1),
      pillRed: rgbaStr(action, 0.08),
      mood,
      structure,
      accentBright,
    },
    light: {
      bg0: mixColor('#f6f0e2', deep, 0.06),
      bg1: mixColor('#eae2cf', deep, 0.06),
      bg2: mixColor('#efe9d8', deep, 0.07),
      ink,
      inkDim: mixColor('#6b6352', deep, 0.18),
      inkFaint: mixColor('#887d65', deep, 0.2),
      gold: goldDeep,
      goldDeep: mixColor(accent, '#3a3425', 0.34),
      red: action,
      paper,
      line: rgbaStr(ink, 0.14),
      border: rgbaStr(deep, 0.36),
      cardShadow: rgbaStr(ink, 0.14),
      qrLight: '#FFFFFF',
      pillBg: rgbaStr(goldDeep, 0.1),
      pillRed: rgbaStr(action, 0.07),
      mood,
      structure,
      accentBright,
    },
  };
}
