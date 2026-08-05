// ===== src/state.js · 全局状态管理 =====
export const state = {
  // --- 基础 ---
  question: '',
  category: '',
  subCategory: '',
  deck: [],
  ti: null,
  yong: null,
  grid: {},
  line: null,
  lineOrder: {},
  step: 1,
  sel: null,
  possible: [],
  manualMode: false,
  manualSeq: true,
  consultMode: false,
  consultName: '',
  spreadType: 'jiugong',
  threeCards: [],
  gongOrder: [],
  chatHistory: [],
  selectedProvider: 'deepseek',
  uid: (function() { return Date.now() % 1000000; })(),
  editCount: 0,
  currentOnboardStep: 0,
  refinementTags: {},
  userCorpus: [],
  intent: null,
  fingerprint: null,
  entropyLevel: 0,
  chaosSeed: null,
  sealed: false,
  sealedAt: null,
  mode: 'simple',
  durianIndex: null,
  sealStatus: null,
  timeCapsule: null,
  loading: false,
  pendingFullReport: '',
  pendingModules: null,
  summary: null, // 三句摘要缓存（同局稳定）
  
  // --- 周期抽牌 ---
  periodType: null,
  periodKey: null,
  periodCard: null,
  periodFortune: '',
  periodAiHistory: [],
  pendingPeriodDeck: null,
  
  // --- 时间弧 ---
  currentTimeArc: null, // 手动指定锚点弧，null=自动判定
};

export const $ = (sel) => document.querySelector(sel);
export const $$ = (sel) => document.querySelectorAll(sel);