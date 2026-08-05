// ===== src/share/renderer.js · 统一渲染器（新一代：DOM 排版 + html-to-image 截图） =====
// 模板名 → DOM 渲染引擎；保存/复制/Electron 链路全部复用旧接口，零 UI 改动。

import { renderShareCardDOM } from '../share2/stage.js';

const TEMPLATE_NAMES = ['divination', 'tarot', 'arcana', 'daily'];

/**
 * 统一分享图渲染入口（异步：DOM 舞台 → html-to-image → 画回 canvas）
 * @param {HTMLCanvasElement} canvas
 * @param {Object} data - ShareData 数据层
 * @param {string} template - 模板名
 */
export async function renderShareCard(canvas, data, template = 'divination') {
  if (!canvas) throw new Error('Canvas 未就绪');
  if (!data) throw new Error('分享数据为空');

  // 归一模板名（tarot → arcana）
  const name = template === 'tarot' ? 'arcana' : template;
  await renderShareCardDOM(canvas, data, name);

  // 返回 canvas 以便后续处理
  return canvas;
}

// 动态注册新模板（DOM 版：name → renderHTML(data, qr) 返回 HTML 字符串）
export function registerShareTemplate(name, renderFn) {
  if (typeof renderFn === 'function') {
    const { registerDomTemplate } = awaitImportStage();
    if (registerDomTemplate) registerDomTemplate(name, renderFn);
    TEMPLATE_NAMES.push(name);
  }
  return TEMPLATE_NAMES;
}

function awaitImportStage() {
  // 延迟加载 stage，避免循环依赖（renderer ↔ stage）
  return import('../share2/stage.js').then(m => ({ registerDomTemplate: m.registerDomTemplate })).catch(() => ({}));
}

// 获取可用模板列表
export function getAvailableTemplates() {
  return [...TEMPLATE_NAMES];
}