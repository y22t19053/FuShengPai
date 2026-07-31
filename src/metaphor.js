// ===== src/metaphor.js · 比喻生成器 =====
// 核心原则：只说画面，不做评价。让用户自己完成解码。
import { GONG_NAMES, GONG_WUXING } from './data.js';

// ===== 五行关系 → 画面 =====
const TIYONG_METAPHORS = {
  '生我': [
    '有一条河在推着你往前走，你不需要用力。',
    '你背后有一阵风，方向刚好是你想去的方向。',
    '有人默默把门给你推开了。',
    '你正在被什么东西抱着一样，很稳。',
  ],
  '我生': [
    '你手里有一杯水，而你正在把它倒出去。',
    '你在给一盏灯加油，但灯不是你的。',
    '你像一棵树，把果子给别人摘走了。',
    '你在不停地发热，但房间不是你的。',
  ],
  '克我': [
    '你觉得被什么压住了，但不是石头，是一块铁板。',
    '有一个人站在你前面，你走不过去。',
    '你像在逆风里骑自行车，很累但不敢停。',
    '你的力量被一根绳子拴着，但你看不见绳子。',
  ],
  '我克': [
    '你面前有一团乱麻，但你手里有一把刀。',
    '你像骑在一匹马上，它不太听你的话，但你能控制它。',
    '你面前有一扇门，门后有声音，但门你推得开。',
    '你在水面上踩水，还没沉下去，但也不是岸上。',
  ],
  '同我': [
    '你和你面对的东西站在同一个高度。',
    '你们是两条并肩的河，谁也不快，谁也不慢。',
    '你和这个局面像两面镜子对着，你从里面看到自己。',
    '没有谁高谁低，只有你和这件事在互相看着。',
  ],
};

// ===== 宫位 → 画面 =====
const GONG_METAPHORS = {
  1: '你正站在一条河边，水面平静，但你不知道下面有多深。',
  2: '你脚下是土地，很稳，但你发现自己走不动了。',
  3: '你心里有一根弹簧，已经压了很久，正在颤抖。',
  4: '有一阵风从你身边吹过，你抓不住它，但它弄乱了你的头发。',
  5: '你站在所有路的交叉口，但每条路都一模一样。',
  6: '你站在屋顶上，看得远，但没有梯子。',
  7: '你嘴里有话，但说出来就会变成另一种意思。',
  8: '你面前是一座山，但你其实不需要翻过去。',
  9: '你身上带着一团火，太亮，甚至有点烫到自己。',
};

// ===== 高差值 → 画面 =====
const HIGH_DIFF_METAPHORS = [
  '你手里有一张地图，但地图上标的地方和你现在站着的地方不一样。',
  '你心里有一个钟，但实际的时间已经不对了。',
  '你站在台阶上，但发现台阶是歪的。',
  '你握着方向盘，但车已经不在路上了。',
];

// ===== 低差值 → 画面 =====
const LOW_DIFF_METAPHORS = [
  '你们之间的距离很近，近到可能看不见彼此。',
  '你摸到一样东西，但你觉得它太顺滑了，反而不真实。',
  '你和水面靠得很近，能看到自己的倒影。',
  '一切都很细，像一根头发丝，但不一定会断。',
];

// ===== 旺 → 画面 =====
const WANG_METAPHORS = [
  '你现在是一盆火，不太需要加柴。',
  '你手里的线很紧，但不是紧绷，是满弦。',
  '你现在正在自己的节拍上，不用看别人。',
];

// ===== 死/囚 → 画面 =====
const DEAD_METAPHORS = [
  '你面前这盆水，很多天没有动过了。',
  '你像站在一扇门前，但门从那边锁住了。',
  '你手里握着一把土，握得越紧，漏得越快。',
];

// ===== 主函数 =====
export function generateMetaphor(context) {
  const parts = [];

  // 1. 体用关系
  const rel = context.tiYongRelation;
  if (rel && TIYONG_METAPHORS[rel]) {
    parts.push(pick(TIYONG_METAPHORS[rel]));
  }

  // 2. 宫位画面
  const gongId = context.gong?.id;
  if (gongId && GONG_METAPHORS[gongId]) {
    parts.push(GONG_METAPHORS[gongId]);
  }

  // 3. 差值
  if (context.diff !== undefined && context.diff !== null) {
    if (context.diff > 5) parts.push(pick(HIGH_DIFF_METAPHORS));
    else if (context.diff <= 2) parts.push(pick(LOW_DIFF_METAPHORS));
  }

  // 4. 旺衰
  if (context.wangState === '旺' || context.wangState === '相') parts.push(pick(WANG_METAPHORS));
  if (context.wangState === '死' || context.wangState === '囚') parts.push(pick(DEAD_METAPHORS));

  // 兜底
  if (parts.length === 0) parts.push('牌面没有给出一句话，但你已经知道了一些东西。');

  return parts.slice(0, 3).join(' ');
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}