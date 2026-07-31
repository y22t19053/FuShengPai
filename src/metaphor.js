// ===== src/metaphor.js · 比喻生成器（简洁版） =====
// 只在用户需要一句“点破”时给一句话，不堆砌。

import { GONG_NAMES, GONG_WUXING } from './data.js';

const TIYONG_METAPHORS = {
  '生我': [
    '有人在背后推了你一把，方向刚好对。',
    '你像坐在一条船上，水流正合适。',
    '这件事正朝你走来，你不用追。',
  ],
  '我生': [
    '你在负责往火里加柴，但火不是你的。',
    '你手里有一杯水，正在倒给别人。',
    '你一直在发热，但不知道暖气给谁。',
  ],
  '克我': [
    '你前面有一堵看不见的墙，推不动但绕不开。',
    '你正逆着风蹬自行车，很累但不敢停。',
    '有东西压在你肩上，不是石头，是责任。',
  ],
  '我克': [
    '你这把刀快，但还没找到合适的刀鞘。',
    '你能控制局面，但得花点力气。',
    '你像骑着一匹不太听话的马，但你骑得住。',
  ],
  '同我': [
    '你和这件事站在同一条线上。',
    '你们是两条并行的河，各有各的流。',
    '你和这个局面互相看着，谁也不欠谁。',
  ],
};

const GONG_METAPHORS = {
  1: '你站在河边，水面很静，但不知道下面有什么。',
  2: '你脚下的土地很厚，但你发现自己很难抬脚。',
  3: '你心里有一根弹簧，已经压了很久。',
  4: '有一阵风吹过，你抓不住它，但它确实吹动了你。',
  5: '你站在十字路口，每条路看起来都差不多。',
  6: '你站在高处，看得很远，但下来的楼梯不太好走。',
  7: '你嘴边有话，开了口可能就变味。',
  8: '你面前有座山，但你不一定需要翻它。',
  9: '你身上带着一团火，自己觉得烫，别人觉得亮。',
};

const HIGH_DIFF_METAPHORS = [
  '你手里的地图和你站的地方对不上。',
  '你心里的钟表和墙上的钟差了几分钟。',
  '你想去的地方，路标指的方向兜了一个圈。',
];

const LOW_DIFF_METAPHORS = [
  '你和这件事离得很近，近到快看不见。',
  '一切都很顺，顺到你有点不放心。',
  '你和它之间只隔着一层纱。',
];

const WANG_METAPHORS = [
  '你现在火很旺，风小了反而更好烧。',
  '你正站在自己的节奏上，别被谁带跑。',
];

const DEAD_METAPHORS = [
  '这是一潭水，好久没有动过了。',
  '你握着一把土，越紧越漏。',
  '门从那边锁上了，你得换个方向看。',
];

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

  // 最多两句，避免堆砌
  return parts.slice(0, 2).join(' ');
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}