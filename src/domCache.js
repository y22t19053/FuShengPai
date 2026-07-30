// ===== src/domCache.js · 专门管理 DOM 节点引用 =====
import { $ } from './state.js';

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