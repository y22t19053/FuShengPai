// ===== src/state.js · 仅包含全局业务数据和 DOM 快捷查询 =====
export const state = {
  // --- 原有字段 ---
  question: '',
  category: '',
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

  // --- 新增字段 ---
  fingerprint: null,
  entropyLevel: 0,
  chaosSeed: null,
  sealed: false,
  sealedAt: null,
  mode: 'simple',
  durianIndex: null,
  sealStatus: null,
  timeCapsule: null,
  loading: false, // 新增：异步操作状态标记
};

export const $ = (sel) => document.querySelector(sel);
export const $$ = (sel) => document.querySelectorAll(sel);