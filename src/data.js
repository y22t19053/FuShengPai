// ===== 浮生牌 · 数据层 =====
// 本文件只定义静态规则和常量，不持有应用状态

// ----- 花色与点数 -----
export const SUITS = ['♥', '♦', '♣', '♠'];
export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

// ----- 五行映射 -----
export const WUXING_MAP = {
  '♥': '火',
  '♦': '金',
  '♣': '木',
  '♠': '水',
  'J': '土',
  'Q': '土',
  'K': '土',
};

export const YIN_YANG = {
  '♥': '阳',
  '♦': '阳',
  '♣': '阴',
  '♠': '阴',
  '大王': '阳',
  '小王': '阴',
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

// ----- 时间标签映射 (16条) -----
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
  '同我': '旺',
  '我生': '相',
  '生我': '休',
  '我克': '囚',
  '克我': '死',
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

export const API_PATH_MAP = {
  claude: '/messages',
  gemini: '/models/gemini-pro:generateContent',
};

// ----- 问题分类 -----
export const CATEGORIES = [
  '财运', '感情', '事业', '健康', '学业', '决策',
  '人际关系', '家宅', '运势', '寻物', '官非', '出行', '灵异', '技能',
];

// ----- 性别选项 -----
export const GENDER_OPTIONS = ['男', '女', '其他'];

// ----- 精神力系统常量 -----
export const SPIRIT_MAX = 100;
export const SPIRIT_DRAIN_PER_DRAW = 5;
export const SPIRIT_WARN_THRESHOLD = 30;
export const SPIRIT_BAN_THRESHOLD = 10;
export const SPIRIT_RECOVER_PER_HOUR = 3;
export const SPIRIT_BAN_DURATION_HOURS = 4;

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
  if (card.rank === 'J' || card.rank === 'Q' || card.rank === 'K') return YIN_YANG[card.suit];
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
  if (!meWx || !otherWx || meWx === '天' || meWx === '人' || otherWx === '天' || otherWx === '人') return null;
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