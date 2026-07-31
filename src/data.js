// ===== 浮生牌 · 数据层 =====
// 本文件只定义静态规则和常量，不持有应用状态

// ----- 花色与点数 -----
export const SUITS = ['♥', '♦', '♣', '♠'];
export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

// ----- 五行映射 -----
export const WUXING_MAP = {
  '♥': '火', '♦': '金', '♣': '木', '♠': '水',
  'J': '土', 'Q': '土', 'K': '土',
};

export const YIN_YANG = {
  '♥': '阳', '♦': '阳', '♣': '阴', '♠': '阴',
  '大王': '阳', '小王': '阴',
};

// ----- 牌面数值 -----
export const CARD_VALUES = {
  A: 1, '2': 2, '3': 3, '4': 4, '5': 5,
  '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
  J: 1, Q: 2, K: 3,
};
export const JOKER_VALUE = 0;

// ----- 九宫洛书 -----
export const GONG_ORDER = [4, 9, 2, 3, 5, 7, 8, 1, 6];
export const GONG_NAMES = {
  1: '坎', 2: '坤', 3: '震', 4: '巽',
  5: '中', 6: '乾', 7: '兑', 8: '艮', 9: '离',
};
export const GONG_WUXING = {
  1: '水', 2: '土', 3: '木', 4: '木',
  5: '土', 6: '金', 7: '金', 8: '土', 9: '火',
};
export const GONG_DIRECTION = {
  1: '北', 2: '西南', 3: '东', 4: '东南',
  5: '中', 6: '西北', 7: '西', 8: '东北', 9: '南',
};

// ----- 天机线 -----
export const ALL_LINES = [
  [4, 3, 8], [4, 9, 2], [3, 5, 7], [8, 1, 6],
  [9, 5, 1], [2, 7, 6], [4, 5, 6], [2, 5, 8],
];

// ----- 时间标签映射 -----
export const TIME_LABELS = {
  '4,3,8': { 4: '起因', 3: '经过', 8: '结果', 9: '起因的未来', 5: '经过的未来', 7: '经过的更远未来', 1: '结果的未来', 6: '结果的更远未来', 2: '远位' },
  '8,3,4': { 8: '起因', 3: '经过', 4: '结果', 1: '起因的未来', 5: '经过的未来', 7: '经过的更远未来', 9: '结果的未来', 2: '结果的更远未来', 6: '远位' },
  '4,9,2': { 4: '起因', 9: '经过', 2: '结果', 3: '起因的过去', 5: '经过的未来', 7: '经过的更远未来', 8: '结果的过去', 1: '结果的未来', 6: '结果的更远未来' },
  '2,9,4': { 2: '起因', 9: '经过', 4: '结果', 8: '起因的过去', 5: '经过的未来', 3: '经过的更远未来', 6: '结果的过去', 1: '结果的未来', 7: '结果的更远未来' },
  '3,5,7': { 3: '起因', 5: '经过', 7: '结果', 4: '起因的过去', 9: '起因的未来', 2: '起因的更远未来', 8: '结果的过去', 1: '结果的未来', 6: '结果的更远未来' },
  '7,5,3': { 7: '起因', 5: '经过', 3: '结果', 6: '起因的过去', 9: '起因的未来', 4: '起因的更远未来', 2: '结果的过去', 1: '结果的未来', 8: '结果的更远未来' },
  '8,1,6': { 8: '起因', 1: '经过', 6: '结果', 4: '起因的更远过去', 9: '起因的过去', 3: '经过的过去', 5: '经过的未来', 2: '结果的过去', 7: '结果的未来' },
  '6,1,8': { 6: '起因', 1: '经过', 8: '结果', 2: '起因的更远过去', 5: '起因的过去', 7: '经过的过去', 9: '经过的未来', 4: '结果的过去', 3: '结果的未来' },
  '9,5,1': { 9: '起因', 5: '经过', 1: '结果', 4: '起因的过去', 2: '起因的未来', 3: '经过的过去', 7: '经过的未来', 8: '结果的过去', 6: '结果的未来' },
  '1,5,9': { 1: '起因', 5: '经过', 9: '结果', 6: '起因的过去', 4: '起因的未来', 7: '经过的过去', 3: '经过的未来', 2: '结果的过去', 8: '结果的未来' },
  '2,7,6': { 2: '起因', 7: '经过', 6: '结果', 4: '起因的更远过去', 9: '起因的过去', 3: '经过的过去', 5: '经过的未来', 8: '结果的过去', 1: '结果的未来' },
  '6,7,2': { 6: '起因', 7: '经过', 2: '结果', 8: '起因的更远过去', 5: '起因的过去', 9: '经过的过去', 1: '经过的未来', 4: '结果的过去', 3: '结果的未来' },
  '4,5,6': { 4: '起因', 5: '经过', 6: '结果', 9: '起因的未来', 3: '经过的过去', 7: '经过的未来', 8: '结果的更远过去', 1: '结果的过去', 2: '起因的更远未来' },
  '6,5,4': { 6: '起因', 5: '经过', 4: '结果', 7: '起因的未来', 9: '经过的过去', 1: '经过的未来', 2: '结果的更远过去', 3: '结果的过去', 8: '起因的更远未来' },
  '2,5,8': { 2: '起因', 5: '经过', 8: '结果', 4: '起因的更远过去', 9: '起因的过去', 3: '经过的过去', 7: '经过的未来', 1: '结果的过去', 6: '结果的未来' },
  '8,5,2': { 8: '起因', 5: '经过', 2: '结果', 6: '起因的更远过去', 1: '起因的过去', 9: '经过的过去', 3: '经过的未来', 4: '结果的过去', 7: '结果的未来' },
};

// ----- 生克关系 -----
export const SHENG = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
export const KE = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };

// ----- 旺相休囚死 -----
export const WANG_STATES = {
  '同我': '旺', '我生': '相', '生我': '休', '我克': '囚', '克我': '死',
};

// ----- API 厂商配置 -----
export const API_PROVIDERS = {
  deepseek: { endpoint: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
  qwen: { endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-plus' },
  openai: { endpoint: 'https://api.openai.com/v1', model: 'gpt-3.5-turbo' },
  claude: { endpoint: 'https://api.anthropic.com/v1', model: 'claude-3-haiku-20240307' },
  gemini: { endpoint: 'https://generativelanguage.googleapis.com/v1beta', model: 'gemini-pro' },
  kimi: { endpoint: 'https://api.moonshot.cn/v1', model: 'moonshot-v1-8k' },
  zhipu: { endpoint: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4' },
  custom: { endpoint: '', model: '' },
};

// ===== 两级分类体系 =====
// 分类不再只是“标签”，而是决定解读逻辑和提示词的权重参数

export const CATEGORIES = [
  {
    name: '感情', sub: ['复合', '脱单', '正缘', '暧昧', '前任', '分手', '关系沟通'],
    gongFocus: 7, // 兑宫（口舌/喜悦/关系）
    weight: { diff: 0.35, ke: 0.3, trend: 0.15, tension: 0.2 },
    promptHint: '关注感情中的沟通模式、互相理解、情绪流动以及关系的发展阶段。',
  },
  {
    name: '财运', sub: ['正财', '偏财', '投资', '借贷', '破财', '合作', '加薪'],
    gongFocus: 2, // 坤宫（承载/藏财）
    weight: { diff: 0.4, ke: 0.2, trend: 0.25, tension: 0.15 },
    promptHint: '关注收入、支出、资金流动趋势、风险管理、长期稳定性。',
  },
  {
    name: '事业', sub: ['跳槽', '创业', '升职', '面试', '辞职', '同事关系', '学业考试'],
    gongFocus: 6, // 乾宫（权力/上升）
    weight: { diff: 0.35, ke: 0.25, trend: 0.25, tension: 0.15 },
    promptHint: '关注职业方向、竞争力、贵人助力、长期发展潜力。',
  },
  {
    name: '健康', sub: ['身体', '心理', '作息', '运动', '康复'],
    gongFocus: 8, // 艮宫（止/养）
    weight: { diff: 0.2, ke: 0.4, trend: 0.15, tension: 0.25 },
    promptHint: '关注身体能量的平衡、压力来源、恢复能力和生活节奏的合理性。',
  },
  {
    name: '家宅', sub: ['阳宅风水', '阴宅风水', '搬迁', '装修', '邻里关系'],
    gongFocus: 5, // 中宫（中心/稳定）
    weight: { diff: 0.2, ke: 0.35, trend: 0.2, tension: 0.25 },
    promptHint: '关注居住环境的气场、家庭成员之间的能量互动、空间的稳定感。',
  },
  {
    name: '决策', sub: ['该不该做', '选哪个', '什么时候做', '放弃还是坚持'],
    gongFocus: 5, // 中宫（决策/权衡）
    weight: { diff: 0.3, ke: 0.2, trend: 0.3, tension: 0.2 },
    promptHint: '关注选择背后的关键因素、利弊权衡、决策时机和长期影响。',
  },
  {
    name: '人际关系', sub: ['朋友', '同事', '家庭', '社交活动', '贵人'],
    gongFocus: 7, // 兑宫（口舌/连接）
    weight: { diff: 0.25, ke: 0.3, trend: 0.2, tension: 0.25 },
    promptHint: '关注人际中的信任、边界、合作模式和潜在冲突。',
  },
  {
    name: '寻物', sub: ['物品', '宠物', '证件', '文件'],
    gongFocus: 1, // 坎宫（隐匿/下落）
    weight: { diff: 0.3, ke: 0.15, trend: 0.4, tension: 0.15 },
    promptHint: '关注东西丢失的方向、环境中的隐藏因素、可能被忽略的位置。',
  },
  {
    name: '学业', sub: ['考试', '考研', '考公', '论文', '毕业', '职业证书'],
    gongFocus: 4, // 巽宫（文书/信息）
    weight: { diff: 0.35, ke: 0.2, trend: 0.3, tension: 0.15 },
    promptHint: '关注学习状态、备考策略、知识吸收效率和信息筛选能力。',
  },
  {
    name: '官非', sub: ['诉讼', '纠纷', '合同', '举报'],
    gongFocus: 3, // 震宫（变动/冲突）
    weight: { diff: 0.25, ke: 0.4, trend: 0.15, tension: 0.2 },
    promptHint: '关注法律事务中的主动权、证据链、谈判策略和外部阻力。',
  },
  {
    name: '出行', sub: ['旅行', '出差', '搬移', '远行'],
    gongFocus: 3, // 震宫（移动）
    weight: { diff: 0.25, ke: 0.25, trend: 0.3, tension: 0.2 },
    promptHint: '关注出行安全性、时机选择、旅途顺利度和目的地环境。',
  },
  {
    name: '灵异', sub: ['梦境', '直觉', '感应', '前世'],
    gongFocus: 1, // 坎宫（潜藏）
    weight: { diff: 0.1, ke: 0.2, trend: 0.3, tension: 0.4 },
    promptHint: '关注潜意识的信号、直觉的可靠性、内在感知的指向。',
  },
  {
    name: '技能', sub: ['学习新技能', '精进练习', '参加比赛'],
    gongFocus: 4, // 巽宫（学习）
    weight: { diff: 0.3, ke: 0.2, trend: 0.3, tension: 0.2 },
    promptHint: '关注技能发展的可行性、刻意练习的方向、是否有良师指引。',
  },
  {
    name: '运势', sub: ['日运', '周运', '月运', '季运', '年运'],
    gongFocus: 9, // 离宫（未来/时运）
    weight: { diff: 0.1, ke: 0.1, trend: 0.6, tension: 0.2 },
    promptHint: '关注整体能量走势、吉凶波动、适合的节奏、需要避开的时段。',
  },
];

// 新增：根据分类名称快速查找分类配置
export function getCategoryConfig(name) {
  return CATEGORIES.find(c => c.name === name) || null;
}

// 新增：二级分类匹配（用于精确查找）
export function getSubCategoryConfig(categoryName, subName) {
  const cat = getCategoryConfig(categoryName);
  if (!cat) return null;
  if (!subName || !cat.sub.includes(subName)) return cat;
  return { ...cat, activeSub: subName };
}

// ===== 判定函数 =====
export function getWuxing(card) {
  if (!card) return '?';
  if (card.isJoker) return card.type === '大王' ? '天' : '人';
  if (card.rank === 'J' || card.rank === 'Q' || card.rank === 'K') return '土';
  return WUXING_MAP[card.suit] || '?';
}

export function getYinYang(card) {
  if (!card) return null;
  if (card.isJoker) return YIN_YANG[card.type];
  return YIN_YANG[card.suit];
}

export function getCardValue(card) {
  if (!card || card.isJoker) return JOKER_VALUE;
  return CARD_VALUES[card.rank] || 0;
}

export function getCardId(card) {
  if (!card) return '';
  if (card.isJoker) return card.type;
  return card.suit + card.rank + (card._uid !== undefined ? card._uid : '');
}

export function getCardColor(card) {
  if (!card) return 'black';
  if (card.isJoker) return 'gold';
  return (card.suit === '♥' || card.suit === '♦') ? 'red' : 'black';
}

export function getShengKe(meWx, otherWx) {
  if (!meWx || !otherWx) return null;
  if (meWx === '天' || meWx === '人' || otherWx === '天' || otherWx === '人') return null;
  if (SHENG[otherWx] === meWx) return '生我';
  if (SHENG[meWx] === otherWx) return '我生';
  if (KE[otherWx] === meWx) return '克我';
  if (KE[meWx] === otherWx) return '我克';
  if (meWx === otherWx) return '同我';
  return null;
}

export function getShengKeLabel(relation) {
  const map = { '生我': '大吉', '我生': '小凶', '克我': '大凶', '我克': '小吉', '同我': '平' };
  return map[relation] || '—';
}

export function getWangState(cardWx, gongWx) {
  const rel = getShengKe(cardWx, gongWx);
  const map = { '同我': '旺', '我生': '相', '生我': '休', '我克': '囚', '克我': '死' };
  return map[rel] || '平';
}

// ===== 周期抽牌配置 =====
export const PERIODS = {
  daily: {
    label: '日运', key: 'daily', monthOffset: 0, day: null,
    desc: '当日能量聚焦，给一个提醒。',
    drawCount: 1,
    title: '今日状态',
    storageKey: 'fs_period_daily',
  },
  weekly: {
    label: '周运', key: 'weekly', monthOffset: 0, day: null,
    desc: '本周趋势展望，给一个关键关注点。',
    drawCount: 1,
    title: '本周状态',
    storageKey: 'fs_period_weekly',
  },
  monthly: {
    label: '月运', key: 'monthly', monthOffset: 0, day: null,
    desc: '本月整体走向，给一个宏观视角。',
    drawCount: 1,
    title: '本月状态',
    storageKey: 'fs_period_monthly',
  },
  seasonal: {
    label: '季运', key: 'seasonal', monthOffset: 0, day: null,
    desc: '季度主题，给一个长期观察角度。',
    drawCount: 1,
    title: '本季状态',
    storageKey: 'fs_period_seasonal',
  },
  yearly: {
    label: '年运', key: 'yearly', monthOffset: 0, day: null,
    desc: '年度基调，给一个整体方向。',
    drawCount: 1,
    title: '本年状态',
    storageKey: 'fs_period_yearly',
  },
};

// 获取当下所在的季度标识
export function getCurrentSeasonKey() {
  const d = new Date();
  const m = d.getMonth() + 1;
  return `Q${Math.ceil(m / 3)}`;
}

export function getCurrentPeriodKey(periodType) {
  const d = new Date();
  switch (periodType) {
    case 'daily': return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    case 'weekly': {
      const oneJan = new Date(d.getFullYear(), 0, 1);
      const week = Math.ceil(((d - oneJan) / 86400000 + oneJan.getDay() + 1) / 7);
      return `${d.getFullYear()}-W${week}`;
    }
    case 'monthly': return `${d.getFullYear()}-${d.getMonth() + 1}`;
    case 'seasonal': return `${d.getFullYear()}-${getCurrentSeasonKey()}`;
    case 'yearly': return `${d.getFullYear()}`;
    default: return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  }
}