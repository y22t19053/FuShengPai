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
  // 【修复】将 uid 改为时间戳取模，防止每次重置带来的 ID 冲突
  uid: Date.now() % 1000000,
  editCount: 0,
  currentOnboardStep: 0,
  refinementTags: {},
  userCorpus: [],       
  intent: null,
};

export const $ = (sel) => document.querySelector(sel);
export const $$ = (sel) => document.querySelectorAll(sel);