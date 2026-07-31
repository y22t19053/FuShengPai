// ===== src/state.js · 全局状态管理 =====
export const state = {
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
  // 周期抽牌
  periodType: null, // 'daily' | 'weekly' | 'monthly' | 'seasonal' | 'yearly' | null
  periodKey: null,  // 当前周期的唯一key，用于判断是否需要重新抽
  periodCard: null, // 抽到的牌
  periodFortune: '', // 该牌的解读
};

export const $ = (sel) => document.querySelector(sel);
export const $$ = (sel) => document.querySelectorAll(sel);