// ===== src/share2/style.js · 分享图 DOM 设计系统（暖纸手绘绘本，HTML/CSS 版） =====
// 新一代分享图引擎：HTML+CSS 排版 → html-to-image 截图。
// 本文件只存设计 token 与文案池（无 canvas、无 DOM 副作用），模板与 stage 共用。
// 色板与旧 canvas 版 theme.js 同源：暖纸米白 / 鼠尾草薄荷 / 暖墨棕 / 朱砂。
// 动态配色：getPaper() 从 src/palettes.js 按日期取当日双色板（每日轮换，同日稳定）。

import { buildSharePaper } from '../palettes.js';

/** 圆润无衬线字体栈（与主站一致，手绘绘本风不留尖角） */
export const FONT_SANS =
  `'PingFang SC','HarmonyOS Sans SC','MiSans','Noto Sans SC','Microsoft YaHei','Segoe UI',sans-serif`;

/** 双色板：dark = 暖纸（牌灵/解读）、light = 浅纸（日运） */
export const PAPER = {
  dark: {
    bg0: '#efe9d8', bg1: '#e6ddc9', bg2: '#dbd0b6',
    ink: '#3a3425', inkDim: '#6b6352', inkFaint: '#887d65',
    gold: '#6fae9c', goldDeep: '#4d8f7e', red: '#c96f52',
    paper: '#f6f0e2',          // 卡片纸面
    line: 'rgba(58,52,37,0.16)',
    border: 'rgba(58,52,37,0.42)',
    cardShadow: 'rgba(58,52,37,0.16)',
    qrLight: '#efe9d8',        // QR 底（白纸墨点里的「白」）
    pillBg: 'rgba(111,174,156,0.10)',
  },
  light: {
    bg0: '#f6f0e2', bg1: '#eae2cf', bg2: '#efe9d8',
    ink: '#3a3425', inkDim: '#6b6352', inkFaint: '#887d65',
    gold: '#4d8f7e', goldDeep: '#3f7a6c', red: '#c96f52',
    paper: '#fdfaf1',
    line: 'rgba(58,52,37,0.14)',
    border: 'rgba(58,52,37,0.36)',
    cardShadow: 'rgba(58,52,37,0.14)',
    qrLight: '#f6f0e2',
    pillBg: 'rgba(77,143,126,0.10)',
  },
};

let _paperCache = null;

/** 当日分享图双色板（动态配色：深/动作/亮/情绪四组按日期轮换；qrLight 恒白保证可扫） */
export function getPaper() {
  if (!_paperCache) _paperCache = buildSharePaper();
  return _paperCache;
}

/** 二维码目标（钉死，不用 window.location，防本地环境干扰） */
export const QR_TARGET = 'https://y22t19053.github.io/FuShengPai/';

// ---------- 文案池（疏离哲学人设——牌是镜子不是灯） ----------

/** 落款金句池：同一天稳定不变（pickBySeed 按日期取） */
export const FOOTER_NOTES = [
  '牌是提示，不是命令。',
  '牌不替你活，路是你走的。',
  '观牌知势，不语已明。',
  '你抽到的，只是你已知道的。',
  '牌是镜子，照见的是你自己。',
  '问牌不如问心，牌只是引子。',
  '这一签，与今天的你有约。',
  '命如纸，笔在你手。',
  '牌落无声，心照不宣。',
  '浮生若梦，牌是醒着做的梦。',
];

/** 简易字符串哈希（FNV-1a 变体） */
function hashStr(s) {
  let h = 0x811c9dc5;
  for (const ch of String(s || '')) {
    h ^= ch.charCodeAt(0);
    h = (h * 0x01000193) >>> 0;
  }
  return h;
}

/** 按种子确定性挑选（同一种子永远同一条） */
export function pickBySeed(seedText, arr) {
  if (!arr || !arr.length) return '';
  return arr[hashStr(String(seedText || '')) % arr.length];
}

/** 五行 → 宜/忌（传统取象，平实可读） */
export const YI_JI = {
  '木': { yi: '生长', ji: '壅塞' },
  '火': { yi: '明动', ji: '虚浮' },
  '土': { yi: '承载', ji: '停滞' },
  '金': { yi: '收敛', ji: '刚愎' },
  '水': { yi: '流动', ji: '泛滥' },
  '天': { yi: '定志', ji: '游移' },
  '人': { yi: '和合', ji: '独断' },
};

/** 五行 → 气象（日运标题意象） */
export const WEATHER = { '木': '风', '火': '暑', '土': '湿', '金': '燥', '水': '寒', '天': '清', '人': '和' };

/** 金句意象标签：五行 → 地点意象（花样但贴题） */
export const TAG_BY_WX = { 木: '林间一句', 火: '炉边一句', 土: '檐下一句', 金: '枰上一句', 水: '渡口一句' };

/** 暖纸纸纹背景（多层径向渐变模拟宣纸光斑，克制不夺目） */
export function paperBackground(p, over = '') {
  return `
    background:
      radial-gradient(circle at 18% 8%, rgba(255,255,255,0.5), transparent 34%),
      radial-gradient(circle at 88% 92%, ${p.gold}12, transparent 40%),
      radial-gradient(circle at 70% 30%, rgba(255,255,255,0.22), transparent 28%),
      linear-gradient(158deg, ${p.bg0} 0%, ${p.bg1} 58%, ${p.bg2} 100%)${over};`;
}
