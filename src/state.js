// ===== src/state.js · 仅包含全局业务数据和 DOM 快捷查询 =====
import { getCardId } from './data.js';

export const state = {
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
  uid: 0,
  editCount: 0,
  currentOnboardStep: 0,
  refinementTags: {},
  userCorpus: [],       
  intent: null,
};

export const $ = (sel) => document.querySelector(sel);
export const $$ = (sel) => document.querySelectorAll(sel);

// 注意：所有 DOM 节点引用已移入 domCache.js
// 不再包含 domApp, domDynamic 等变量