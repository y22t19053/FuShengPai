// ===== src/metaphor.js · 比喻生成器 =====
// 核心原则：只说画面，不做评价。让用户自己完成解码。

import { GONG_NAMES, GONG_WUXING } from './data.js';
import { WUXING_FORTUNE_POOLS } from './texts/fortune-pools.js';

const TIYONG_METAPHORS = {
  '生我': ['有一条河在推着你往前走，你不需要用力。', '你背后有一阵风，方向刚好是你想去的方向。', '有人默默把门给你推开了。'],
  '我生': ['你手里有一杯水，而你正在把它倒出去。', '你在给一盏灯加油，但灯不是你的。', '你像一棵树，把果子给别人摘走了。'],
  '克我': ['你觉得被什么压住了，但不是石头，是一块铁板。', '有一个人站在你前面，你走不过去。', '你像在逆风里骑自行车，很累但不敢停。'],
  '我克': ['你面前有一团乱麻，但你手里有一把刀。', '你像骑在一匹马上，它不太听你的话，但你能控制它。', '你面前有一扇门，门后有声音，但门你推得开。'],
  '同我': ['你和你面对的东西站在同一个高度。', '你们站的位置一样高，谁也不用先低头。', '你和这个局面像两面镜子对着。'],
};

const GONG_METAPHORS = {
  1: '你正站在一条河边，水面很静，但不知道下面有什么。',
  2: '你脚下的土地很厚，但你发现自己很难抬脚。',
  3: '你心里有一根弹簧，已经压了很久。',
  4: '有一阵风从你身边吹过，你抓不住它，但它确实吹动了你。',
  5: '你站在十字路口，每条路看起来都差不多。',
  6: '你站在高处，看得很远，但下来的楼梯不太好走。',
  7: '你嘴边有话，开了口可能就变味。',
  8: '你面前有座山，但你不一定需要翻它。',
  9: '你身上带着一团火，自己觉得烫，别人觉得亮。',
};

// 差值隐喻：原来每档只有 2 句，同一局面二次必撞句；现扩到 5 句并新增「中差值」档。
const HIGH_DIFF_METAPHORS = [
  '你手里的地图和你站的地方对不上。',
  '你心里的钟表和墙上的钟差了几分钟。',
  '天气预报说晴天，你出门带把伞也不是不行。',
  '鞋码差半号，能穿，但走远路脚会知道。',
  '两个人说话，一个在夏天，一个在冬天。',
];
const MID_DIFF_METAPHORS = [
  '路是对的，就是比预计多两个弯。',
  '火候差一点，再添一把柴，或者再等五分钟，都行。',
  '声音差半拍，不是走调，是还没到该合上的那一段。',
];
const LOW_DIFF_METAPHORS = [
  '你们之间的距离很近，近到快看不见。',
  '一切都很顺，顺到你有点不放心。',
  '两片叶子几乎叠在一起，只差一阵风。',
  '拼图只差最后一块，而且它就在手边。',
  '水已经烧到 98 度，剩下两度不用守着看。',
];
const WANG_METAPHORS = [
  '你现在火很旺，风小了反而更好烧。',
  '你正站在自己的节奏上，别被谁带跑。',
  '顺风的时候帆要吃饱，但舵别松。',
  '灯已经亮到你身上了，就把它演完。',
];
const DEAD_METAPHORS = [
  '这是一潭水，好久没有动过了。',
  '你握着一把土，越紧越漏。',
  '钟摆还在走，只是没人给它上发条了。',
  '炉子里还有余温，先添柴，别急着封火。',
];

export function generateMetaphor(context) {
  const parts = [];
  const rel = context.tiYongRelation;
  if (rel && TIYONG_METAPHORS[rel]) parts.push(pick(TIYONG_METAPHORS[rel]));
  const gongId = context.gong?.id;
  if (gongId && GONG_METAPHORS[gongId]) parts.push(GONG_METAPHORS[gongId]);

  if (context.diff !== undefined && context.diff !== null) {
    const absDiff = Math.abs(context.diff);
    if (absDiff > 5) parts.push(pick(HIGH_DIFF_METAPHORS));
    else if (absDiff >= 3 && absDiff <= 5) parts.push(pick(MID_DIFF_METAPHORS));
    else if (absDiff <= 2) parts.push(pick(LOW_DIFF_METAPHORS));
  }

  if (context.wangState === '旺' || context.wangState === '相') parts.push(pick(WANG_METAPHORS));
  if (context.wangState === '死' || context.wangState === '囚') parts.push(pick(DEAD_METAPHORS));
  if (parts.length === 0) parts.push('牌面没有说一句话，但你已经感觉到了什么。');
  return parts.slice(0, 2).join(' ');
}

/** 随机取一条（九宫体用局比喻保留随机，单牌判词走确定性） */
function pick(arr) {
  if (!arr || arr.length === 0) return '';
  return arr[Math.floor(Math.random() * arr.length)];
}

// ===== 单张周期牌的比喻（轻量版·支持日运细选类别） =====
// 判词按「牌面 × 周期标签 × 日期」确定性取（同一天同牌面 → 同一句），不再随机；
// 与页内横幅/分享图/AI 提示词共用同一套种子体系，保证同一天观感统一。
export function generateSingleCardMetaphor(card, wx, periodLabel, fortuneType = 'overall', dateStr = '') {
  const rank = card.isJoker ? card.type : card.rank;
  const suit = card.isJoker ? '' : card.suit;
  const label = `${rank}${suit}`;

  const pool = (WUXING_FORTUNE_POOLS[wx] && (WUXING_FORTUNE_POOLS[wx][fortuneType] || WUXING_FORTUNE_POOLS[wx].overall))
    || WUXING_FORTUNE_POOLS['土'].overall;
  const base = pickStable(`${label}|${wx}|${fortuneType}|${periodLabel || ''}|${dateStr || todayDate()}`, pool);

  const typeLabelMap = {
    overall: '综合', wealth: '财运', love: '桃花', noble: '贵人', career: '事业', health: '健康', study: '学业'
  };

  return `【${periodLabel} · ${typeLabelMap[fortuneType] || '综合'} · ${label} · ${wx}】\n${base}`;
}

/** 今天日期（YYYY-MM-DD，与 social.js todaySeed 同源语义） */
function todayDate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** 种子归一化：'2026-8-6' / '2026-8-6|xxx' → 补零（与 social.js / persona.js 同口径） */
function normalizeSeed(s) {
  const str = String(s ?? '');
  const m = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(.*)$/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}${m[4] || ''}`;
  return str;
}

/** 确定性取句：同一种子永远同一句（FNV-1a，与 social.js pickStable 同算法） */
function pickStable(seedText, arr) {
  if (!arr || !arr.length) return '';
  const seed = normalizeSeed(String(seedText || ''));
  let h = 0x811c9dc5;
  for (const ch of seed) {
    h ^= ch.charCodeAt(0);
    h = (h * 0x01000193) >>> 0;
  }
  return arr[h % arr.length];
}