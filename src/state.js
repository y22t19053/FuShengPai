// ===== src/state.js · 全局状态与 DOM 引用 =====
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

// 【核心修复】明确声明并导出 DOM 节点，确保 ui-modal.js 能正确引用
export let domApp, domDynamic, domToast, domModal, domModalContent, domSharePreview, domShareCanvas;

export function cacheDom() {
  domApp = $('#appRoot');
  domDynamic = $('#dynamicPanels');
  domToast = $('#toast');
  domModal = $('#modal');
  domModalContent = $('#modalContent');
  domSharePreview = $('#sharePreview');
  domShareCanvas = $('#shareCanvas');
}