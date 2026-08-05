// ===== src/persona.js · 扑克牌人格 + 单牌运势体系 =====
import { getWuxing, DAILY_FORTUNE_TYPES } from './data.js';
import { WUXING_FORTUNE_POOLS, WUXING_MOOD_SHORTS } from './texts/fortune-pools.js';

// 确定性取句：同一张牌同一天 → 同一判词（与页内横幅/分享图/AI 提示词同种子体系）
function hashText(s) {
  let h = 0x811c9dc5;
  for (const ch of String(s || '')) {
    h ^= ch.charCodeAt(0);
    h = (h * 0x01000193) >>> 0;
  }
  return h;
}
function todaySeed() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function normalizeSeed(s) {
  const str = String(s ?? '');
  const m = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(.*)$/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}${m[4] || ''}`;
  return str;
}
function pickStable(seedText, arr) {
  if (!arr || !arr.length) return '';
  return arr[hashText(normalizeSeed(String(seedText ?? todaySeed()))) % arr.length];
}
function cardSeed(card, extra = '') {
  if (!card) return `cardless|${extra}`;
  const base = card.isJoker ? `joker-${card.type || '小'}` : `${card.rank || ''}${card.suit || ''}`;
  return `${base}|${normalizeSeed(extra || todaySeed())}`;
}

// ---- 花色气质 ----
const SUIT_PERSONA = {
  '♠': { name: '谋', element: '水', trait: '隐忍深邃', core: '你习惯把答案藏在水面之下。' },
  '♥': { name: '烈', element: '火', trait: '炽热直率', core: '你烧得快，也亮得久。' },
  '♣': { name: '韧', element: '木', trait: '迂回生长', core: '你从不硬闯，你绕开所有墙。' },
  '♦': { name: '锐', element: '金', trait: '锋利务实', core: '你在的地方，规则会被重写。' }
};

// ---- 点数阶段 ----
const RANK_PERSONA = {
  'A':  { name: '原点', desc: '一切的起点，你自带开创者的孤独。' },
  '2':  { name: '两面', desc: '你总在两种立场之间，比谁都清醒。' },
  '3':  { name: '联结', desc: '你天生是节点，人和事因你而相遇。' },
  '4':  { name: '框架', desc: '你建造秩序，也囚禁自己。' },
  '5':  { name: '动荡', desc: '变化是你的宿命，你从不原地停留。' },
  '6':  { name: '转折', desc: '你总在关键时刻出现，然后改变一切。' },
  '7':  { name: '沉淀', desc: '你习惯独处，孤独是你的蓄力期。' },
  '8':  { name: '扩张', desc: '你要的东西很多，你也不怕扛。' },
  '9':  { name: '巅峰', desc: '你离顶点最近，也最怕坠落。' },
  '10': { name: '圆满', desc: '你追求完整，但完整往往意味着结束。' },
  'J':  { name: '谋士', desc: '你不亲自上场，你在棋盘外看着。' },
  'Q':  { name: '执棋', desc: '你掌控节奏，温柔里全是计算。' },
  'K':  { name: '君主', desc: '你生来要定义规则，而非服从。' }
};

// ---- 大小王 ----
const JOKER_PERSONA = {
  '大王': { name: '天命', desc: '你站在规则之外，看众生走棋。', element: '天' },
  '小王': { name: '人间', desc: '你混迹人群，却从不当真。', element: '人' }
};

// ---- 人格生成 ----
export function getPokerPersona(card) {
  if (!card) return null;
  if (card.isJoker) {
    const p = JOKER_PERSONA[card.type] || JOKER_PERSONA['大王'];
    return {
      title: `${card.type} · ${p.name}`,
      shortTitle: p.name,
      keywords: ['超然', '旁观', '格局'],
      element: p.element,
      core: p.desc
    };
  }
  const suit = SUIT_PERSONA[card.suit] || SUIT_PERSONA['♠'];
  const rank = RANK_PERSONA[card.rank] || RANK_PERSONA['A'];
  return {
    title: `${card.suit}${card.rank} · ${suit.name}${rank.name}`,
    shortTitle: `${suit.name}${rank.name}`,
    keywords: [suit.trait, rank.name],
    element: suit.element,
    core: `${suit.core}\n${rank.desc}`
  };
}

// ---- 单牌运势类别（含学业）：与 data.js DAILY_FORTUNE_TYPES 同源，避免两处维护 ----
export const FORTUNE_TYPES = DAILY_FORTUNE_TYPES;

// ---- 吉凶判定 ----
function fortuneGrade(wx) {
  const grades = { '木': '中吉', '火': '小吉', '土': '中平', '金': '小吉', '水': '中平', '天': '上吉', '人': '中吉' };
  return grades[wx] || '中平';
}

// ---- 单牌运势生成（支持细选类别，判词按「牌面 × 类别 × 日期」确定性取，每日固定不重样） ----
export function getDailyFortune(card, typeKey = 'overall', seedText = '') {
  if (!card) return null;
  const wx = getWuxing(card);
  const pool = (WUXING_FORTUNE_POOLS[wx] && (WUXING_FORTUNE_POOLS[wx][typeKey] || WUXING_FORTUNE_POOLS[wx].overall))
    || WUXING_FORTUNE_POOLS['土'].overall;
  const seed = seedText || cardSeed(card, typeKey);
  const text = pickStable(seed, pool);
  const mood = pickStable(`${seed}|mood`, WUXING_MOOD_SHORTS[wx] || WUXING_MOOD_SHORTS['土']);
  const type = FORTUNE_TYPES.find(t => t.key === typeKey) || FORTUNE_TYPES[0];
  return {
    wx,
    grade: fortuneGrade(wx),
    mood,
    typeKey: type.key,
    typeLabel: type.label,
    typeIcon: type.icon,
    text
  };
}