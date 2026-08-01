// ===== src/persona.js · 扑克牌人格 + 单牌运势体系 =====
import { getWuxing } from './data.js';

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

// ---- 单牌运势类别 ----
export const FORTUNE_TYPES = [
  { key: 'wealth',  label: '财运', icon: '💰' },
  { key: 'love',    label: '桃花', icon: '🌸' },
  { key: 'noble',   label: '贵人', icon: '🤝' },
  { key: 'career',  label: '事业', icon: '⚡' },
  { key: 'health',  label: '健康', icon: '🌿' },
  { key: 'overall', label: '综合', icon: '☯' }
];

// ---- 五行 × 运势类别 判词 ----
const WUXING_FORTUNE = {
  '木': { wealth: '细水长流，利正财', love: '桃花渐显，宜主动', noble: '身边有引路人', career: '宜学习进修', health: '注意肝气郁结', overall: '向上生长的一天' },
  '火': { wealth: '偏财活跃，见好就收', love: '炽热开场，易上头', noble: '贵人主动靠近', career: '宜展示表现', health: '注意心火上炎', overall: '热烈但有损耗' },
  '土': { wealth: '稳中求进，不宜投机', love: '平淡是真，别急', noble: '贵人来自旧识', career: '宜守成积累', health: '注意脾胃', overall: '安守本分的一天' },
  '金': { wealth: '财星得力，宜谈合作', love: '锋利言辞易伤人', noble: '贵人带资源来', career: '宜决断清理', health: '注意呼吸道', overall: '宜断舍离' },
  '水': { wealth: '财来财去，留三分', love: '情绪涌动，宜沟通', noble: '贵人隐于暗处', career: '宜布局未来', health: '注意肾气', overall: '随波逐流但有灵光' },
  '天': { wealth: '格局打开，利大额', love: '缘分可遇不可求', noble: '遇高层提携', career: '宜定大方向', health: '精神饱满', overall: '大气运的一天' },
  '人': { wealth: '人脉生财', love: '贵人即是桃花', noble: '众人相助', career: '宜社交协作', health: '宜放松', overall: '借力的一天' }
};

// ---- 吉凶判定 ----
function fortuneGrade(wx) {
  const grades = { '木': '中吉', '火': '小吉', '土': '中平', '金': '小吉', '水': '中平', '天': '上吉', '人': '中吉' };
  return grades[wx] || '中平';
}

// ---- 单牌运势生成 ----
export function getDailyFortune(card, typeKey = 'overall') {
  if (!card) return null;
  const wx = getWuxing(card);
  const map = WUXING_FORTUNE[wx] || WUXING_FORTUNE['土'];
  const text = map[typeKey] || map.overall;
  const type = FORTUNE_TYPES.find(t => t.key === typeKey) || FORTUNE_TYPES[FORTUNE_TYPES.length - 1];
  return {
    wx,
    grade: fortuneGrade(wx),
    typeKey: type.key,
    typeLabel: type.label,
    typeIcon: type.icon,
    text
  };
}