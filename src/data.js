// ===== src/data.js · 数据层：基础规则 + 时间弧系统 + 宫位大环境分析 =====

export const SUITS = ['♥', '♦', '♣', '♠'];
export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export const WUXING_MAP = {
  '♥': '火', '♦': '金', '♣': '木', '♠': '水',
  'J': '土', 'Q': '土', 'K': '土',
};

export const YIN_YANG = {
  '♥': '阳', '♦': '阳', '♣': '阴', '♠': '阴',
  '大王': '阳', '小王': '阴',
};

export const CARD_VALUES = {
  A: 1, '2': 2, '3': 3, '4': 4, '5': 5,
  '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
  J: 11, Q: 12, K: 13,
};
export const JOKER_VALUE = 0;

export const GONG_ORDER = [4, 9, 2, 3, 5, 7, 8, 1, 6];
export const GONG_NAMES = { 1: '坎', 2: '坤', 3: '震', 4: '巽', 5: '中', 6: '乾', 7: '兑', 8: '艮', 9: '离' };
export const GONG_WUXING = { 1: '水', 2: '土', 3: '木', 4: '木', 5: '土', 6: '金', 7: '金', 8: '土', 9: '火' };
export const GONG_DIRECTION = { 1: '北', 2: '西南', 3: '东', 4: '东南', 5: '中', 6: '西北', 7: '西', 8: '东北', 9: '南' };

export const ALL_LINES = [
  [4, 3, 8], [4, 9, 2], [3, 5, 7], [8, 1, 6],
  [9, 5, 1], [2, 7, 6], [4, 5, 6], [2, 5, 8],
];

export const TIME_LABELS = {
  '4,3,8': { 4: '起因', 3: '经过', 8: '结果' },
  '8,3,4': { 8: '起因', 3: '经过', 4: '结果' },
  '4,9,2': { 4: '起因', 9: '经过', 2: '结果' },
  '2,9,4': { 2: '起因', 9: '经过', 4: '结果' },
  '3,5,7': { 3: '起因', 5: '经过', 7: '结果' },
  '7,5,3': { 7: '起因', 5: '经过', 3: '结果' },
  '8,1,6': { 8: '起因', 1: '经过', 6: '结果' },
  '6,1,8': { 6: '起因', 1: '经过', 8: '结果' },
  '9,5,1': { 9: '起因', 5: '经过', 1: '结果' },
  '1,5,9': { 1: '起因', 5: '经过', 9: '结果' },
  '2,7,6': { 2: '起因', 7: '经过', 6: '结果' },
  '6,7,2': { 6: '起因', 7: '经过', 2: '结果' },
  '4,5,6': { 4: '起因', 5: '经过', 6: '结果' },
  '6,5,4': { 6: '起因', 5: '经过', 4: '结果' },
  '2,5,8': { 2: '起因', 5: '经过', 8: '结果' },
  '8,5,2': { 8: '起因', 5: '经过', 2: '结果' },
};

export const SHENG = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
export const KE = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };

export const WANG_STATES = { '同我': '旺', '我生': '相', '生我': '休', '我克': '囚', '克我': '死' };

// ===== 日运细选类别 =====
export const DAILY_FORTUNE_TYPES = [
  { key: 'overall', label: '综合', icon: '☯' },
  { key: 'wealth', label: '财运', icon: '💰' },
  { key: 'love', label: '桃花', icon: '🌸' },
  { key: 'noble', label: '贵人', icon: '🤝' },
  { key: 'career', label: '事业', icon: '⚡' },
  { key: 'health', label: '健康', icon: '🌿' },
  { key: 'study', label: '学业', icon: '📚' },
];

export function getDailyFortuneType(key) {
  return DAILY_FORTUNE_TYPES.find(t => t.key === key) || DAILY_FORTUNE_TYPES[0];
}

// ===== API 厂商配置（含推荐模型）=====
export const API_PROVIDERS = {
  deepseek: { endpoint: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
  qwen: { endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-plus' },
  openai: { endpoint: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  claude: { endpoint: 'https://api.anthropic.com/v1', model: 'claude-3-haiku-20240307' },
  gemini: { endpoint: 'https://generativelanguage.googleapis.com/v1beta', model: 'gemini-1.5-flash' },
  kimi: { endpoint: 'https://api.moonshot.cn/v1', model: 'moonshot-v1-8k' },
  zhipu: { endpoint: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4' },
  custom: { endpoint: '', model: '' },
};

// ===== 热门模型快捷列表 =====
export const POPULAR_MODELS = [
  { provider: 'deepseek', label: 'DeepSeek-V3', model: 'deepseek-chat', desc: '旗舰·平衡' },
  { provider: 'deepseek', label: 'DeepSeek-R1', model: 'deepseek-reasoner', desc: '推理增强' },
  { provider: 'gemini', label: 'Gemini 2.0 Flash', model: 'gemini-2.0-flash-exp', desc: '极速·免费' },
  { provider: 'gemini', label: 'Gemini 1.5 Pro', model: 'gemini-1.5-pro', desc: '深度·长文本' },
  { provider: 'openai', label: 'GPT-4o-mini', model: 'gpt-4o-mini', desc: '轻量·高性价比' },
  { provider: 'openai', label: 'GPT-4o', model: 'gpt-4o', desc: '旗舰·全能' },
  { provider: 'claude', label: 'Claude 3.7 Sonnet', model: 'claude-3-7-sonnet-20250219', desc: '最强推理' },
  { provider: 'qwen', label: '千问 2.5-72B', model: 'qwen-plus', desc: '国产·均衡' },
];

// ===== 周期抽牌配置（公历自然周期） =====
export const PERIODS = {
  daily: {
    label: '日运', key: 'daily', title: '今日状态', desc: '当日能量聚焦，给一个提醒。', drawCount: 1,
    periodKeyFn: (d) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`,
  },
  weekly: {
    label: '周运', key: 'weekly', title: '本周状态', desc: '本周趋势展望，给一个关键关注点。', drawCount: 1,
    periodKeyFn: (d) => {
      const oneJan = new Date(d.getFullYear(), 0, 1);
      const week = Math.ceil(((d - oneJan) / 86400000 + oneJan.getDay() + 1) / 7);
      return `${d.getFullYear()}-W${week}`;
    },
  },
  monthly: {
    label: '月运', key: 'monthly', title: '本月状态', desc: '本月整体走向，给一个宏观视角。', drawCount: 1,
    periodKeyFn: (d) => `${d.getFullYear()}-${d.getMonth() + 1}`,
  },
  seasonal: {
    label: '季运', key: 'seasonal', title: '本季状态', desc: '季度主题，给一个长期观察角度。', drawCount: 1,
    periodKeyFn: (d) => `${d.getFullYear()}-Q${Math.ceil((d.getMonth() + 1) / 3)}`,
  },
  yearly: {
    label: '年运', key: 'yearly', title: '本年状态', desc: '年度基调，给一个整体方向。', drawCount: 1,
    periodKeyFn: (d) => `${d.getFullYear()}`,
  },
};

export function getCurrentPeriodKey(periodType) {
  const cfg = PERIODS[periodType];
  if (!cfg || !cfg.periodKeyFn) return null;
  return cfg.periodKeyFn(new Date());
}

export function getPeriodLabel(periodType) { return PERIODS[periodType]?.label || ''; }
export function getPeriodTitle(periodType) { return PERIODS[periodType]?.title || ''; }
export function getPeriodDesc(periodType) { return PERIODS[periodType]?.desc || ''; }

// ===== 时间弧 =====
export const TIME_ARC_GROUPS = [
  { arc: '438', gongs: [4, 3, 8], label: '起始之弧' },
  { arc: '951', gongs: [9, 5, 1], label: '当令之弧' },
  { arc: '276', gongs: [2, 7, 6], label: '延展之弧' },
];

export function getArcForGong(gongId) {
  const g = Number(gongId);
  for (const group of TIME_ARC_GROUPS) {
    if (group.gongs.includes(g)) return group.arc;
  }
  return null;
}

export function getTimeMapping(nowArc = '951') {
  const arcOrder = ['438', '951', '276'];
  const idx = arcOrder.indexOf(nowArc);
  if (idx === -1) return null;
  const cycle = [...arcOrder.slice(idx), ...arcOrder.slice(0, idx)];
  const pastArc = cycle[2];
  const presentArc = cycle[0];
  const futureArc = cycle[1];
  return {
    past: TIME_ARC_GROUPS.find(g => g.arc === pastArc)?.gongs || [],
    present: TIME_ARC_GROUPS.find(g => g.arc === presentArc)?.gongs || [],
    future: TIME_ARC_GROUPS.find(g => g.arc === futureArc)?.gongs || [],
    arcs: { past: pastArc, present: presentArc, future: futureArc },
  };
}

export function determineNowArc({ ti = null, line = null, grid = {} }) {
  if (ti && ti.gong) {
    const arc = getArcForGong(ti.gong);
    if (arc) return arc;
  }
  if (line && line.length >= 3) {
    const arc = getArcForGong(line[1]);
    if (arc) return arc;
  }
  const filledGongs = Object.keys(grid).map(Number).sort((a, b) => a - b);
  for (const g of filledGongs) {
    const arc = getArcForGong(g);
    if (arc) return arc;
  }
  return '951';
}

export function getGongTimeRole(gongId, nowArc = '951') {
  const mapping = getTimeMapping(nowArc);
  if (!mapping) return '';
  const g = Number(gongId);
  if (mapping.past.includes(g)) return '过去';
  if (mapping.present.includes(g)) return '现在';
  if (mapping.future.includes(g)) return '未来';
  return '';
}

// ===== 统一推荐宫位数据源 =====
export const CATEGORIES = [
  { name: '感情', sub: ['复合', '脱单', '正缘', '暧昧', '前任', '分手', '关系沟通'], gongFocus: 7, weight: { diff: 0.35, ke: 0.3, trend: 0.15, tension: 0.2 }, promptHint: '关注感情中的沟通模式、互相理解、情绪流动以及关系的发展阶段。' },
  { name: '财运', sub: ['正财', '偏财', '投资', '借贷', '破财', '合作', '加薪'], gongFocus: 2, weight: { diff: 0.4, ke: 0.2, trend: 0.25, tension: 0.15 }, promptHint: '关注收入、支出、资金流动趋势、风险管理、长期稳定性。' },
  { name: '事业', sub: ['跳槽', '创业', '升职', '面试', '辞职', '同事关系', '学业考试'], gongFocus: 6, weight: { diff: 0.35, ke: 0.25, trend: 0.25, tension: 0.15 }, promptHint: '关注职业方向、竞争力、贵人助力、长期发展潜力。' },
  { name: '健康', sub: ['身体', '心理', '作息', '运动', '康复'], gongFocus: 8, weight: { diff: 0.2, ke: 0.4, trend: 0.15, tension: 0.25 }, promptHint: '关注身体能量的平衡、压力来源、恢复能力和生活节奏的合理性。' },
  { name: '家宅', sub: ['阳宅风水', '阴宅风水', '搬迁', '装修', '邻里关系'], gongFocus: 5, weight: { diff: 0.2, ke: 0.35, trend: 0.2, tension: 0.25 }, promptHint: '关注居住环境的气场、家庭成员之间的能量互动、空间的稳定感。' },
  { name: '决策', sub: ['该不该做', '选哪个', '什么时候做', '放弃还是坚持'], gongFocus: 5, weight: { diff: 0.3, ke: 0.2, trend: 0.3, tension: 0.2 }, promptHint: '关注选择背后的关键因素、利弊权衡、决策时机和长期影响。' },
  { name: '人际关系', sub: ['朋友', '同事', '家庭', '社交活动', '贵人'], gongFocus: 7, weight: { diff: 0.25, ke: 0.3, trend: 0.2, tension: 0.25 }, promptHint: '关注人际中的信任、边界、合作模式和潜在冲突。' },
  { name: '寻物', sub: ['物品', '宠物', '证件', '文件'], gongFocus: 1, weight: { diff: 0.3, ke: 0.15, trend: 0.4, tension: 0.15 }, promptHint: '关注东西丢失的方向、环境中的隐藏因素、可能被忽略的位置。' },
  { name: '学业', sub: ['考试', '考研', '考公', '论文', '毕业', '职业证书'], gongFocus: 4, weight: { diff: 0.35, ke: 0.2, trend: 0.3, tension: 0.15 }, promptHint: '关注学习状态、备考策略、知识吸收效率和信息筛选能力。' },
  { name: '官非', sub: ['诉讼', '纠纷', '合同', '举报'], gongFocus: 3, weight: { diff: 0.25, ke: 0.4, trend: 0.15, tension: 0.2 }, promptHint: '关注法律事务中的主动权、证据链、谈判策略和外部阻力。' },
  { name: '出行', sub: ['旅行', '出差', '搬移', '远行'], gongFocus: 3, weight: { diff: 0.25, ke: 0.25, trend: 0.3, tension: 0.2 }, promptHint: '关注出行安全性、时机选择、旅途顺利度和目的地环境。' },
  { name: '灵异', sub: ['梦境', '直觉', '感应', '前世'], gongFocus: 1, weight: { diff: 0.1, ke: 0.2, trend: 0.3, tension: 0.4 }, promptHint: '关注潜意识的信号、直觉的可靠性、内在感知的指向。' },
  { name: '技能', sub: ['学习新技能', '精进练习', '参加比赛'], gongFocus: 4, weight: { diff: 0.3, ke: 0.2, trend: 0.3, tension: 0.2 }, promptHint: '关注技能发展的可行性、刻意练习的方向、是否有良师指引。' },
  { name: '运势', sub: ['日运', '周运', '月运', '季运', '年运'], gongFocus: 9, weight: { diff: 0.1, ke: 0.1, trend: 0.6, tension: 0.2 }, promptHint: '关注整体能量走势、吉凶波动、适合的节奏、需要避开的时段。' },
  { name: '风水', sub: ['阳宅风水', '阴宅风水', '布局调整', '气场观察'], gongFocus: 8, weight: { diff: 0.2, ke: 0.35, trend: 0.2, tension: 0.25 }, promptHint: '关注居住环境的气场流动、空间布局的合理性、家庭成员间的能量互动。' },
  { name: '射覆', sub: ['物件藏匿', '失物方向', '猜测验证', '直觉测试'], gongFocus: 9, weight: { diff: 0.1, ke: 0.2, trend: 0.4, tension: 0.3 }, promptHint: '关注物件的方位线索、直觉的指向、被忽略的环境细节。' },
];

export function getCategoryConfig(name) {
  return CATEGORIES.find(c => c.name === name) || null;
}

export function getSubCategoryConfig(categoryName, subName) {
  const cat = getCategoryConfig(categoryName);
  if (!cat) return null;
  if (!subName || !cat.sub.includes(subName)) return cat;
  return { ...cat, activeSub: subName };
}

export function getRecommendedGongForCategory(categoryName) {
  const cat = getCategoryConfig(categoryName);
  return cat?.gongFocus || null;
}

// ===== 宫位大环境分析 =====
export function getGongEnvironment(gongWx, cardWx) {
  if (!gongWx || !cardWx) return null;
  const rel = getShengKe(cardWx, gongWx);
  const map = {
    '生我': { key: 'gongSheng',  label: '宫生牌', plain: '宫滋养牌', desc: '此宫如沃土，滋养牌的能量，环境助力，顺势可成。', score: 2 },
    '我生': { key: 'cardSheng',  label: '牌生宫', plain: '牌滋养宫', desc: '牌在此宫为宫供能，事在推进但自身有所消耗，宜掌握节奏。', score: 1 },
    '克我': { key: 'gongKe',     label: '宫克牌', plain: '宫压着牌', desc: '此宫的能量压过牌，环境阻力明显，宜守不宜攻。', score: -2 },
    '我克': { key: 'cardKe',     label: '牌克宫', plain: '牌压过宫', desc: '牌的能量压过此宫，需主动破局方能施展。', score: 1 },
    '同我': { key: 'biHe',       label: '比和',   plain: '与宫同气', desc: '牌与宫能量同频、相互共振，顺势增强，最为稳妥。', score: 3 },
  };
  return map[rel] || null;
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
  if (!card) return 0;
  if (card.isJoker) return card.type === '大王' ? 14 : 15;
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

// 体用关系的白话版（用户可见；内部仍用 生我/我生/克我/我克 计算）
export function getRelationPlain(relation) {
  const map = { '生我': '它滋养你', '我生': '你在滋养它', '克我': '它在压着你', '我克': '你能掌控它', '同我': '与你同气' };
  return map[relation] || '—';
}

export function getWangState(cardWx, gongWx) {
  const rel = getShengKe(cardWx, gongWx);
  const map = { '同我': '旺', '我生': '相', '生我': '休', '我克': '囚', '克我': '死' };
  return map[rel] || '平';
}

// 旺衰状态的白话版（用户可见；内部仍用 旺/相/休/囚/死 计算）
export function getWangStatePlain(state) {
  const map = { '旺': '正旺', '相': '在上升', '休': '在休整', '囚': '被困住', '死': '在停滞' };
  return map[state] || state;
}