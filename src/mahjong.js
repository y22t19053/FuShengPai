// ===== src/mahjong.js · 麻将占卜核心（136 张牌墙 + 牌型判定 + 天/地/人合成） =====
// 牌型概率（真实概率，不是嘴硬）：
//   杂牌 ≈93%  对子 ≈6.6%（1/15）  顺子 ≈0.33%（1/300）  刻子 ≈0.033%（1/3000）
//   三元（中发白各一）与刻子同列「天命时刻」——整个 App 唯一允许「多」的位置。
// 读法：牌不成型，事无定数——你的牌自己说「没有天命」，比嘴硬诚实。
// 依赖：engine.shuffle（洗牌复用 deck 逻辑），无循环依赖。

import { shuffle } from './engine.js';

export const MJ_SUITS = ['wan', 'tiao', 'tong', 'feng', 'jian'];
export const WALL_COUNT = 136; // 万/条/筒 1-9 各4张 + 东南西北 各4张 + 中发白 各4张

const SUIT_CHAR = { wan: '万', tiao: '条', tong: '筒' };
const SUIT_DOMAIN = {
  wan: '事业', tiao: '人脉', tong: '财帛', feng: '时运', jian: '三元',
};
const FENG_CHAR = { 1: '东', 2: '南', 3: '西', 4: '北' };
const JIAN_CHAR = { 1: '中', 2: '发', 3: '白' };
const CN_NUM = { 1: '一', 2: '二', 3: '三', 4: '四', 5: '五', 6: '六', 7: '七', 8: '八', 9: '九' };

/** 牌面名：一万 / 幺鸡 / 三筒 / 东 / 中 */
export function tileName(tile) {
  if (!tile) return '';
  if (tile.suit === 'feng') return FENG_CHAR[tile.num];
  if (tile.suit === 'jian') return JIAN_CHAR[tile.num];
  if (tile.suit === 'tiao' && tile.num === 1) return '幺鸡';
  return `${CN_NUM[tile.num] || tile.num}${SUIT_CHAR[tile.suit]}`;
}

/** 单张义索引键：'wan:3' */
export function tileKey(tile) {
  return `${tile.suit}:${tile.num}`;
}

// ---------- 一、牌墙 ----------

/** 砌牌：136 张，每型 4 张（东南西北按 1-4，中发白按 1-3） */
export function buildWall() {
  const wall = [];
  let id = 0;
  for (const suit of ['wan', 'tiao', 'tong']) {
    for (let num = 1; num <= 9; num++) {
      for (let k = 0; k < 4; k++) wall.push({ id: id++, suit, num });
    }
  }
  for (let num = 1; num <= 4; num++) {
    for (let k = 0; k < 4; k++) wall.push({ id: id++, suit: 'feng', num });
  }
  for (let num = 1; num <= 3; num++) {
    for (let k = 0; k < 4; k++) wall.push({ id: id++, suit: 'jian', num });
  }
  return wall;
}

/** 摸牌：洗牌后从牌墙顶部弹 n 张（复用 deck 洗牌逻辑），返回 { drawn, wall } */
export function drawFromWall(wall, n = 3) {
  const copy = shuffle(wall.slice());
  return { drawn: copy.slice(0, n), wall: copy.slice(n) };
}

// ---------- 二、牌型判定 ----------

/**
 * 按 num 分组计数判型：刻子 > 三元 > 顺子 > 对子 > 杂牌
 * @param {{suit:string,num:number}[]} tiles 最多 3 张
 * @returns {'kezi'|'sanyuan'|'shunzi'|'duizi'|'zapai'}
 */
export function detectPattern(tiles) {
  const ts = tiles.slice(0, 3);
  const counts = {};
  for (const t of ts) {
    const k = tileKey(t);
    counts[k] = (counts[k] || 0) + 1;
  }
  const c = Object.values(counts);
  if (ts.length === 3) {
    if (c.some((v) => v === 3)) return 'kezi'; // 三张同数，定数已成
    const nums = ts.map((t) => t.num);
    if (ts.every((t) => t.suit === 'jian') && new Set(nums).size === 3) return 'sanyuan'; // 中发白俱在
    const sameSuit = ts.every((t) => t.suit === ts[0].suit);
    if (sameSuit && new Set(nums).size === 3 && Math.max(...nums) - Math.min(...nums) === 2) return 'shunzi';
    if (c.some((v) => v === 2)) return 'duizi';
    return 'zapai';
  }
  if (ts.length === 2) return c.some((v) => v === 2) ? 'duizi' : 'zapai';
  return 'zapai';
}

/** 判词：牌型总判（关系才是读法） */
export const PATTERN_VERDICTS = {
  kezi:    { name: '刻子', text: '三张同数，定数已成。', heaven: true,  odds: '三千分之一' },
  sanyuan: { name: '三元', text: '三关俱通。',           heaven: true,  odds: '天命时刻' },
  shunzi:  { name: '顺子', text: '三张相连，顺势而行。', heaven: false, odds: '三百分之一' },
  duizi:   { name: '对子', text: '一对有伴，一单无着。', heaven: false, odds: '十五分之一' },
  zapai:   { name: '杂牌', text: '牌不成型，事无定数。', heaven: false, odds: '十之八九' },
};

// ---------- 三、天/地/人 ----------

/** 摸牌位置：第一张=天（时运/大势），第二张=地（环境/身边人），第三张=人（自身/行动） */
export const POSITIONS = [
  { key: 'tian', name: '天牌', label: '时运', desc: '大势所趋，非人力可逆。' },
  { key: 'di',   name: '地牌', label: '环境', desc: '身边之人，眼前之地。' },
  { key: 'ren',  name: '人牌', label: '行动', desc: '自己这一步，走得如何。' },
];

// ---------- 四、34 张单牌义：每张「一句本义 + 一句宜 + 一句忌」 ----------

/** 数字即刻度：1=起点，5=中位，9=顶点。万=事业/功名/官禄，条=人脉/情感/成长，筒=财帛/物质/口粮，风=方位/时运/人，箭=功名/财/心 */
export const TILE_MEANINGS = {
  'wan:1': { name: '一万', domain: '事业', meaning: '起点，第一级台阶，微小但真实。', yi: '动手。', ji: '嫌小。' },
  'wan:2': { name: '二万', domain: '事业', meaning: '次第，一步之后第二步，靠得住。', yi: '跟进。', ji: '停步。' },
  'wan:3': { name: '三万', domain: '事业', meaning: '小成，三而众，人多好办事。', yi: '借力。', ji: '独扛。' },
  'wan:4': { name: '四万', domain: '事业', meaning: '四平，稳妥之数，守成有余。', yi: '守成。', ji: '冒进。' },
  'wan:5': { name: '五万', domain: '事业', meaning: '中位，不上不下，正是盘整。', yi: '稳盘。', ji: '躁动。' },
  'wan:6': { name: '六万', domain: '事业', meaning: '六顺，事有顺遂，可成一半。', yi: '推进。', ji: '分心。' },
  'wan:7': { name: '七万', domain: '事业', meaning: '转折，七上八下，变数初现。', yi: '变通。', ji: '固执。' },
  'wan:8': { name: '八万', domain: '事业', meaning: '将成，八面玲珑，只差一鼓。', yi: '冲刺。', ji: '泄气。' },
  'wan:9': { name: '九万', domain: '事业', meaning: '顶点，近顶思变，盛时当收。', yi: '收官。', ji: '恋战。' },
  'tiao:1': { name: '幺鸡', domain: '人脉', meaning: '孤鸟，独行自由也单薄。', yi: '立身。', ji: '硬凑。' },
  'tiao:2': { name: '二条', domain: '人脉', meaning: '成双，有人同行，路就不远。', yi: '结伴。', ji: '独断。' },
  'tiao:3': { name: '三条', domain: '人脉', meaning: '人众，三五成群，热气在。', yi: '入局。', ji: '清高。' },
  'tiao:4': { name: '四条', domain: '人脉', meaning: '四平，关系正处舒适区。', yi: '经营。', ji: '凉了。' },
  'tiao:5': { name: '五条', domain: '人脉', meaning: '中流，人脉正当用，不深不浅。', yi: '适度。', ji: '透支。' },
  'tiao:6': { name: '六条', domain: '人脉', meaning: '顺遂，旧交回暖，新识将熟。', yi: '走动。', ji: '失约。' },
  'tiao:7': { name: '七条', domain: '人脉', meaning: '涟漪，人心动了，且看落点。', yi: '试探。', ji: '说破。' },
  'tiao:8': { name: '八条', domain: '人脉', meaning: '聚拢，四面来投，众心可收。', yi: '纳人。', ji: '偏信。' },
  'tiao:9': { name: '九条', domain: '人脉', meaning: '长藤，绵延不断，旧缘未了。', yi: '续。', ji: '拖。' },
  'tong:1': { name: '一筒', domain: '财帛', meaning: '一口饭，基本盘，先吃饱。', yi: '保底。', ji: '空想。' },
  'tong:2': { name: '二筒', domain: '财帛', meaning: '两文钱，薄有余裕，够用即安。', yi: '量入。', ji: '贪多。' },
  'tong:3': { name: '三筒', domain: '财帛', meaning: '三餐，温饱之上有小闲。', yi: '置办。', ji: '铺张。' },
  'tong:4': { name: '四筒', domain: '财帛', meaning: '四平之财，进账稳当。', yi: '储蓄。', ji: '散财。' },
  'tong:5': { name: '五筒', domain: '财帛', meaning: '中富，不贫不奢，正当年。', yi: '周转。', ji: '囤积。' },
  'tong:6': { name: '六筒', domain: '财帛', meaning: '六顺之财，进多出顺。', yi: '投资。', ji: '赌性。' },
  'tong:7': { name: '七筒', domain: '财帛', meaning: '浮财，来去都急，抓不住根。', yi: '快进快出。', ji: '恋栈。' },
  'tong:8': { name: '八筒', domain: '财帛', meaning: '聚财，八方来财，盆满将至。', yi: '收拢。', ji: '露富。' },
  'tong:9': { name: '九筒', domain: '财帛', meaning: '满仓，财足防溢。', yi: '存。', ji: '露。' },
  'feng:1': { name: '东', domain: '时运', meaning: '起势，贵人初现。', yi: '趁早。', ji: '观望。' },
  'feng:2': { name: '南', domain: '时运', meaning: '正午，日中则移，把握当下。', yi: '主事。', ji: '退让。' },
  'feng:3': { name: '西', domain: '时运', meaning: '秋凉，事近收梢，该结算了。', yi: '收束。', ji: '恋战。' },
  'feng:4': { name: '北', domain: '时运', meaning: '蛰伏，冬藏之季。', yi: '蓄。', ji: '躁。' },
  'jian:1': { name: '中', domain: '功名', meaning: '中第，上进有应。', yi: '考、争。', ji: '自满。' },
  'jian:2': { name: '发', domain: '财帛', meaning: '起运，财门开，动手即应。', yi: '开张。', ji: '拖延。' },
  'jian:3': { name: '白', domain: '心', meaning: '空白，不是没有，是未定。', yi: '放下。', ji: '硬填。' },
};

// ---------- 五、合成：牌型→总判、位置→逐解、宜忌→合成一句 ----------

/**
 * 天地人合成读法（摸 3 张）
 * 宜忌合成规则：宜取天牌（顺势），忌取人牌（戒己）——合成一句，绝不叠加成大吉大利，
 * 永远是一句可执行的守而非搏的建议。
 */
export function composeReading(tiles) {
  const ts = tiles.slice(0, 3);
  const pattern = detectPattern(ts);
  const verdict = PATTERN_VERDICTS[pattern];
  const parts = ts.map((t, i) => {
    const m = TILE_MEANINGS[tileKey(t)] || {};
    return {
      position: POSITIONS[i],
      tile: t,
      name: tileName(t),
      domain: m.domain || SUIT_DOMAIN[t.suit],
      meaning: m.meaning || '',
      yi: m.yi || '',
      ji: m.ji || '',
    };
  });
  const yi = parts[0]?.yi; // 天牌之宜：顺势
  const ji = parts[2]?.ji; // 人牌之忌：戒己
  // 合成一句：数据自带标点，合成时去尾缀再加，绝不出现「。。」
  const clean = (s) => String(s || '').replace(/[。！!]+$/g, '');
  return {
    pattern,
    patternName: verdict.name,
    patternText: verdict.text,
    heaven: verdict.heaven,
    odds: verdict.odds,
    parts,
    advice: `宜：${clean(yi)}。忌：${clean(ji)}。`,
    closing: '牌已定，事在人。明日再来摸一张。',
  };
}

// ---------- 六、今日手气（单张版） ----------

/** 财神方位：风牌定方位；其余按五行方位推（万=金→西，条=木→东，筒=水→北，箭=土→中） */
export function fengDirection(tile) {
  if (tile.suit === 'feng') return `${FENG_CHAR[tile.num]}方`;
  const map = { wan: '西方', tiao: '东方', tong: '北方', jian: '中·本地' };
  return map[tile.suit] || '中·本地';
}

/** 每日手气——永远只说「守」，绝不说「去赢钱」 */
export const DAILY_MJ_VERDICT = '今日财气平稳，宜守不宜搏。';

/** 今日手气合成：摸 1 张 → 手气 + 财神方位 + 宜忌 */
export function composeDailyReading(tile) {
  const m = TILE_MEANINGS[tileKey(tile)] || {};
  return {
    tile,
    name: tileName(tile),
    domain: m.domain || SUIT_DOMAIN[tile.suit],
    meaning: m.meaning || '',
    direction: fengDirection(tile),
    verdict: DAILY_MJ_VERDICT,
    yi: m.yi || '',
    ji: m.ji || '',
  };
}
