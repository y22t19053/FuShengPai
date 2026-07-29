// ===== UI 文案（界面、规则、分享、反馈等） =====
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
  btnLazy: '一键起局',
  btnConfirmTiYong: '布阵',
  btnInterpret: '生成解读',
  btnCopy: '复制',
  btnShareImage: '生成分享图',
  btnShareCode: '生成分享码',
  btnImport: '导入',
  btnDailyFortune: '今日状态',
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

export const SHARE_TEXTS = {
  appName: '浮生牌',
  summaryMap: { '生我': '承托', '克我': '砥砺', '我生': '付出', '我克': '掌控', '同我': '共振' },
  linePrefix: '天机线：',
  footer: '—— 来自浮生牌的投影'
};

export const SHARE_QUOTES = [
  '牌不预言未来，它只照见你心中的种子。',
  '真正的答案不在牌里，在你决定相信什么的那一刻。',
  '每一张牌都是你内心的一面镜子。'
];

export const HISTORY_EMPTY = '还没有历史记录。开始一次占卜吧。';
export const PRIVACY_NOTICE = '所有数据仅存储在本地，不会上传。';
export const AI_GUIDE_TEXT = 'AI解读需要配置API Key（在设置中填写）。每次解读会消耗token。';
export const CROSS_INTERPRETATION = {
  conflict: ['两条线交叉时，你面对的是一个选择点。'],
  support: ['宫位之间的相生关系暗示着潜在的支持。']
};
export const TIME_SPACE_TEXTS = {
  past: ['种子在此落下，你甚至没听到声音。', '一切都从这里开始，一个念头、一次回头。'],
  present: ['能量正在流动中变化，你正处于转化过程。', '事情正在展开，你现在的位置比你以为的更关键。'],
  future: ['结果不是终点，而是能量的暂时汇聚。', '形态还会再变，你现在看到的只是一个截面。']
};
export const ETHICAL_CORE = {
  disclaimer: '浮生牌不代替专业心理咨询或医疗诊断。所有解读仅供参考，最终决定权在你。',
  principle: '观测而非预言，觉察而非断言。'
};
export const MIRROR_QUESTIONS = [
  '你现在看到的牌面，与你最初的问题有什么关系？',
  '这张牌对应的事情，是你主动选择的还是被动发生的？'
];
export const RITUAL_COSTS = { base: 0, extra: '无' };
export const PERSONALITY_TONES = Object.freeze({
  analytical: { name: '分析型', prefix: '从数据上看' },
  poetic: { name: '诗意型', prefix: '像一缕烟' },
  direct: { name: '直述型', prefix: '直接说' }
});