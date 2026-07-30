// ===== src/domCache.js · 专门管理 DOM 节点引用 =====
import { $ } from './state.js';

export let domApp, domCore, domResult, domToast, domModal, domModalContent, domSharePreview, domShareCanvas;

export function cacheDom() {
  domApp = $('#appRoot');
  // 【关键修复】分别指向三栏布局中，动态渲染的实际容器
  domCore = document.getElementById('coreArea');
  domResult = document.getElementById('resultArea');
  domToast = $('#toast');
  domModal = $('#modal');
  domModalContent = $('#modalContent');
  domSharePreview = $('#sharePreview');
  domShareCanvas = $('#shareCanvas');
}