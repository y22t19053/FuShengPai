// ===== src/metaphor.js · 比喻生成器 =====
// 核心原则：只说画面，不做评价。让用户自己完成解码。

import { GONG_NAMES, GONG_WUXING } from './data.js';

const TIYONG_METAPHORS = {
  '生我': ['有一条河在推着你往前走，你不需要用力。', '你背后有一阵风，方向刚好是你想去的方向。', '有人默默把门给你推开了。'],
  '我生': ['你手里有一杯水，而你正在把它倒出去。', '你在给一盏灯加油，但灯不是你的。', '你像一棵树，把果子给别人摘走了。'],
  '克我': ['你觉得被什么压住了，但不是石头，是一块铁板。', '有一个人站在你前面，你走不过去。', '你像在逆风里骑自行车，很累但不敢停。'],
  '我克': ['你面前有一团乱麻，但你手里有一把刀。', '你像骑在一匹马上，它不太听你的话，但你能控制它。', '你面前有一扇门，门后有声音，但门你推得开。'],
  '同我': ['你和你面对的东西站在同一个高度。', '你们是两条并肩的河，谁也不快，谁也不慢。', '你和这个局面像两面镜子对着。'],
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

const HIGH_DIFF_METAPHORS = ['你手里的地图和你站的地方对不上。', '你心里的钟表和墙上的钟差了几分钟。'];
const LOW_DIFF_METAPHORS = ['你们之间的距离很近，近到快看不见。', '一切都很顺，顺到你有点不放心。'];
const WANG_METAPHORS = ['你现在火很旺，风小了反而更好烧。', '你正站在自己的节奏上，别被谁带跑。'];
const DEAD_METAPHORS = ['这是一潭水，好久没有动过了。', '你握着一把土，越紧越漏。'];

export function generateMetaphor(context) {
  const parts = [];
  const rel = context.tiYongRelation;
  if (rel && TIYONG_METAPHORS[rel]) parts.push(pick(TIYONG_METAPHORS[rel]));
  const gongId = context.gong?.id;
  if (gongId && GONG_METAPHORS[gongId]) parts.push(GONG_METAPHORS[gongId]);
  if (context.diff !== undefined && context.diff !== null) {
    if (context.diff > 5) parts.push(pick(HIGH_DIFF_METAPHORS));
    else if (context.diff <= 2) parts.push(pick(LOW_DIFF_METAPHORS));
  }
  if (context.wangState === '旺' || context.wangState === '相') parts.push(pick(WANG_METAPHORS));
  if (context.wangState === '死' || context.wangState === '囚') parts.push(pick(DEAD_METAPHORS));
  if (parts.length === 0) parts.push('牌面没有说一句话，但你已经感觉到了什么。');
  return parts.slice(0, 2).join(' ');
}

// ===== 单张周期牌的比喻（轻量版） =====
export function generateSingleCardMetaphor(card, wx, periodLabel) {
  const rank = card.isJoker ? card.type : card.rank;
  const suit = card.isJoker ? '' : card.suit;
  const label = `${rank}${suit}`;

  const wxMetaphors = {
    '火': ['这一周期，你会带着一盏灯行走，光够亮，但别烧到自己。', '火在烧，说明你还有热情。问题是这热情要往哪放。'],
    '金': ['这段时间，你在打磨一把刀。刀快了，但也要小心别伤到自己。', '金气重，决断会变多，适合做切割和清理。'],
    '木': ['这是一段生长的时期。根扎得越深，以后长得越稳。', '别急着开花，先把枝干长结实。'],
    '水': ['这段时间适合流动，不适合硬撑。该转弯就转弯。', '你的直觉最近会比较准，试着听一下。'],
    '土': ['这是一段需要稳住的日子。少动，多观察。', '你需要在不确定中守住一件确定的事。'],
    '天': ['这段时间的大势在你这边，适合定方向、许承诺。', '天气清朗，你做判断的时候不容易被情绪带偏。'],
    '人': ['这段时间的关键在人。多沟通，别猜。', '人事变动带来的影响，会比事情本身更大。'],
  };

  const base = wxMetaphors[wx] ? wxMetaphors[wx][Math.floor(Math.random() * wxMetaphors[wx].length)] : '保持清醒，平常心看待。';
  return `【${periodLabel} · ${label} · ${wx}】\n${base}`;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}