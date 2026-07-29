// ============ texts.js · 完整文案库与语法生成引擎 ============
// 设计原则：去神秘化、去恐惧化、巴纳姆映射、冷眼热心。
// 本版本实现“语法生成”替代“句子检索”，所有用户可见文案均为纯中文。

// ================================================================
// 一、UI 文案（结构性，不变）
// ================================================================
export const UI_TEXTS = {
  appName: '浮生牌',
  step1: '第一步 · 起念',
  step2: '第二步 · 立极',
  step3: '第三步 · 观象',
  labelTi: '体',
  labelYong: '用',
  labelSeparator: '⚡',
  labelEmpty: '空',
  labelDiffPrefix: '差',
  placeholderQuestion: '默念你的问题（可不填）',
  placeholderImport: '粘贴分享码',
  placeholderFollowUp: '追问或补充信息',
  btnStartDraw: '抽牌',
  btnManual: '手动录入',
  btnLazy: '随机一局',
  btnConfirmTiYong: '布阵',
  btnInterpret: '生成解读',
  btnCopy: '复制',
  btnShareImage: '生成分享图',
  btnShareCode: '生成分享码',
  btnImport: '导入',
  btnDailyFortune: '今日运势',
  btnAIDeepRead: '深层解读',
  btnNewQuestion: '新问题',
  btnClose: '关闭',
  btnTestApi: '测试连接',
  btnSave: '保存',
  toastReset: '已重置，开始新的一局',
  toastCopied: '已复制到剪贴板',
  toastCopyFailed: '复制失败，请手动复制',
  toastJokersInjected: '大小王已加入牌局，可落位九宫',
  toastGridCleared: '九宫已清空',
  toastShareCodeCopied: '分享码已复制到剪贴板',
  toastImportSuccess: '导入成功',
  toastImportFail: '分享码无效或已过期',
  toastSaved: '已保存',
  toastProfileSaved: '个人资料已保存',
  toastCleared: '已清除',
  toastAnyCount: '牌已落位',
  toastLineConfirmed: '天机线已确认',
  toastLinesMultiple: '发现多条天机线，请选择一条',
  guideSelectTiYong: '从牌堆中选出体牌与用牌，代表“我”与“事”。',
  guideManual: '手动模式，双击牌可抽取，明牌选阵。',
  guideAfterTiYong: '将剩余牌依次放入九宫，差异值反映能量状态。',
  apiStatusConfigured: '已配置',
  apiStatusNotConfigured: '未配置',
};

export const RULES_TEXTS = {
  intro: '浮生牌基于五行生克、宫位取象与天机线动态组合生成解读。每一张牌都有体用、旺衰、差值三个观测维度。',
  gongRules: '九宫与五行：坎水（险陷）、坤土（承载）、震木（震动）、巽木（渗透）、中土（枢纽）、乾金（刚健）、兑金（口舌）、艮土（停止）、离火（明亮）。',
  lineRules: '天机线由三宫组成：起因→经过→结果。落在线上的宫位受时间轴影响。'
};

export const TUTORIAL_TEXTS = {
  intro: '欢迎来到浮生牌。这是一面镜子，不是一个断言机。',
  steps: [
    '第一步：安静下来，想一个问题（或什么都不想）。',
    '第二步：选定体用——体是你，用是事。',
    '第三步：往九宫中布牌，观察天机线的出现。',
    '第四步：阅读解读，保持清醒。记得：牌只是投影。'
  ],
  offlineHint: '无需网络，本地运行。所有解读都基于本机生成。'
};

export const PHYSICAL_GUIDE = {
  title: '实体牌操作指南',
  sections: [
    { heading: '洗牌', body: '将牌打乱，边洗边默念问题。' },
    { heading: '抽体用', body: '从牌堆中任意抽出两张，第一张为体，第二张为用。' },
    { heading: '布九宫', body: '将剩余牌依次放入九宫格中，注意空宫。' },
    { heading: '读取天机线', body: '如果三个宫位形成直线，则视为天机线。' }
  ]
};

export const READING_TEXTS = {
  default: '牌局已就位，请查看下方动态生成的解读。'
};

export const SHARE_TEXTS = {
  appName: '浮生牌',
  summaryMap: { '生我': '承托', '克我': '砥砺', '我生': '付出', '我克': '掌控', '同我': '共振' },
  linePrefix: '天机线：',
  footer: '—— 来自浮生牌的投影'
};

export const SHARE_QUOTES = [
  '牌不预言未来，它只照见你心中的种子。',
  '真正的答案不在牌里，在你决定相信什么的那一刻。',
  '每一张牌都是你内心的一面镜子。',
  '冷读不是欺骗，是帮你看见自己。',
  '随鬼入墓而不死，是困局也是转机。'
];

export const REFUSAL_TEXTS = {
  keywords: {
    death: { trigger: ['死', '自杀', '杀人'], response: '这种问题不在牌面讨论范围内。请珍惜生命。' },
    medical: { trigger: ['药', '癌症', '手术'], response: '牌不能替代医疗诊断。请咨询专业医生。' },
    curse: { trigger: ['诅咒', '下降头', '报复'], response: '浮生牌不为仇恨提供燃料。请回。' }
  }
};

export const USAGE_REMINDERS = {
  maxDaily: 8,
  message: '精神力预警：今日已观测8次以上，镜面易起雾，请注意休息。'
};

export const TIME_RESTRICTION = {
  active: true,
  message: '子时观测效应可能衰减，结果仅供参考。'
};

export const AI_STYLES = { guide: '温和引导', direct: '直述', poetic: '诗意' };

export const HISTORY_EMPTY = '还没有历史记录。开始一次占卜吧。';

export const PRIVACY_NOTICE = '所有数据仅存储在本地，不会上传。';

export const AI_GUIDE_TEXT = 'AI解读需要配置API Key（在设置中填写）。每次解读会消耗token。';

export const ONBOARDING_STEPS = [
  { title: '欢迎来到浮生牌', body: '这是一面镜子，不是一个独断的机器。', btn: '开始' },
  { title: '体与用', body: '你要选两张牌：一张代表你（体），一张代表你问的事（用）。', btn: '知道了' },
  { title: '九宫与天机线', body: '把剩下的牌布进九个宫位。如果有三个宫位形成一条线，那就是天机线。', btn: '开始占卜' },
];

export const CROSS_INTERPRETATION = {
  conflict: ['两条线交叉时，你面对的是一个选择点。'],
  support: ['宫位之间的相生关系暗示着潜在的支持。']
};

export const TIME_SPACE_TEXTS = {
  past: ['种子在这里落下，你甚至没有听到它的声音。'],
  present: ['能量在流动中变化，你正在经历一个转化的时刻。'],
  future: ['结果不是终点，而是能量的暂时汇聚。']
};

export const ETHICAL_CORE = {
  disclaimer: '浮生牌不代替专业心理咨询或医疗诊断。所有解读仅供参考，最终决定权在你。',
  principle: '观测而非预言，觉察而非断言。'
};

export const MIRROR_QUESTIONS = [
  '你有没有想过，你一直以为的“问题”，可能恰恰是你的“资源”？',
  '如果这张牌代表的是你内心某个角色的声音，它在说什么？',
  '你是在追逐某样东西，还是在躲避某种感觉？'
];

export const RITUAL_COSTS = { base: 0, extra: '无' };

export const PERSONALITY_TONES = Object.freeze({
  analytical: { name: '分析型', prefix: '从数据上看' },
  poetic: { name: '诗意型', prefix: '像一缕烟' },
  direct: { name: '直述型', prefix: '直接说' }
});

// ================================================================
// 二、辅助函数
// ================================================================
function pick(arr) {
  if (!arr || arr.length === 0) return '';
  return arr[Math.floor(Math.random() * arr.length)];
}

function getIntensityLevel(diff) {
  if (diff <= 1) return 'tiny';
  if (diff <= 3) return 'small';
  if (diff <= 5) return 'medium';
  if (diff <= 8) return 'large';
  return 'huge';
}

function getPhraseSet(phrasesObj, phraseType, intent) {
  const sets = phrasesObj[phraseType];
  if (!sets) return [];
  if (intent && sets[intent] && Math.random() < 0.6) return sets[intent];
  return sets.default || [];
}

// ================================================================
// 三、九宫词汇池
// ================================================================
const gongPhrases = { /* 此处保留您原有完整的宫位语料，太长省略 */ };
// 提示：此处您自己的 `gongPhrases` 数组完全保留不动。

// ================================================================
// 四、五行词汇池
// ================================================================
const elementPhrases = { /* 此处保留您原有完整的五行语料，太长省略 */ };

// ================================================================
// 五、体用关系词汇池
// ================================================================
const tiYongPhrases = { /* 此处保留您原有完整的体用语料，太长省略 */ };

// ================================================================
// 六、旺衰状态词汇池
// ================================================================
const wangPhrases = { /* 此处保留您原有完整的旺衰语料，太长省略 */ };

// ================================================================
// 七、天机线词汇池
// ================================================================
const linePhrases = { /* 此处保留您原有完整的天机线语料，太长省略 */ };

// ================================================================
// 八、差值映射表
// ================================================================
const intensityMap = { /* 此处保留您原有完整的差值映射，太长省略 */ };

// ================================================================
// 九、情绪连接词
// ================================================================
const emotionWords = [ /* 保留原文 */ ];
const dialoguePhrases = [ /* 保留原文 */ ];
const reflectionPrompts = [ /* 保留原文 */ ];
const barnumTemplates = [ /* 保留原文 */ ];
const closingLines = [ /* 保留原文 */ ];

// ================================================================
// 十、核心生成函数
// ================================================================
export function generateGongText(context) { /* 保留原函数 */ }
export function generateElementTiYongText(context) { /* 保留原函数 */ }
export function generateWangText(context) { /* 保留原函数 */ }
export function generateLineText(context) { /* 保留原函数 */ }
export function generateDiffText(context) { /* 保留原函数 */ }

function injectEmotionAndDialogue() { /* 保留原函数 */ }
function injectBarnum() { /* 保留原函数 */ }

export function generateFullReading(context) { /* 保留原函数 */ }

// ================================================================
// 十一、新增结构（神签与公约）
// ================================================================

export const OBSERVER_COVENANT = {
  title: '观测者公约',
  items: [
    { tag: '渊源', body: '浮生牌借鉴了古代易学中的体用思维，但不等于算命。你观测到的不是未来，而是你与当前事物的关系。' },
    { tag: '清明', body: '每次占卜前，做三次深呼吸。让问题像水一样澄澈。正如《冷读》所说，观察者的期待会影响解读——保持中立。' },
    { tag: '不执', body: '如果一张牌让你恐惧，先别急着跳进去——那是你自己的影子。解牌不是迷信，是与潜意识的对话。' },
    { tag: '节制', body: '同一问题不宜反复占卜，易产生依赖。《增删卜易》云：“一卦一断”，多次起卦会混淆信息。' },
  ],
};

// 【为神签UI扩充示例语料】
export const SIGN_LIBRARY = [
  {
    status: '静水流深',
    quote: '水善利万物而不争，处众人之所恶，故几于道。',
    author: '《道德经》· 老子',
    advice: '宜：反思、独处；忌：强求、急躁',
    analysis: '你所面临的并非剧烈冲撞，而是需要耐心沉淀的阶段。如同深水之下缓慢的暗流，平静中自有力量。'
  },
  {
    status: '星火燎原',
    quote: '星星之火，可以燎原。',
    author: '《尚书》',
    advice: '宜：勇敢尝试、播种；忌：犹豫拖延',
    analysis: '你内心那一点微弱的念头，此刻正在酝酿巨大的能量。不要低估它的力量，给它一点时间，火光终将照亮前路。'
  },
  {
    status: '逆水行舟',
    quote: '学如逆水行舟，不进则退。',
    author: '《增广贤文》',
    advice: '宜：学习、突破舒适区；忌：躺平、安于现状',
    analysis: '此刻的阻力，正是你成长的阶梯。虽有逆风，但只要持续划桨，你就不会倒退。这种对抗感，是蜕变的信号。'
  },
  {
    status: '渊渟岳峙',
    quote: '不动如山，难知如阴。',
    author: '《孙子兵法》',
    advice: '宜：静观其变、保持理智；忌：感情用事、冲动决定',
    analysis: '你正处于一个极度稳定且强大的状态。外界的不稳不会撼动你的根基。这正是静下来思考的最好时机。'
  }
];
// 您可以在此数组中继续扩充你的私人签文！

export const INTENT_QUESTIONS = {
  '感情': ['你在这段关系里是主动付出还是被动接受？', '你更看重被爱还是被理解？'],
  '财运': ['这笔财是正职收入还是意外之财？', '你会为了安全感积攒金钱，还是为了自由？'],
  '事业': ['你更想要稳定的收入还是上升空间？', '当前工作的价值感来自什么？'],
  '健康': ['你的不适是急性的还是慢性的？', '情绪上的压力是否直接影响了身体？'],
  '人际关系': ['你在这关系中是想靠近还是想疏远？', '这段关系让你感觉消耗还是滋养？'],
  '决策': ['你是担心选错，还是担心不选？', '这个决定会影响接下来多长时间？'],
  'default': ['你现在的状态更多是焦虑还是疲惫？', '你想从这次占卜中获得什么？确认/方向/安慰？']
};