// ===== src/share/renderer.js · 统一渲染器（新一代：DOM 排版 + dom-to-image-more 截图） =====
// 模板名 → DOM 渲染引擎；保存/复制/Electron 链路全部复用旧接口，零 UI 改动。

import { renderShareCardDOM } from '../share2/stage.js';

/**
 * 统一分享图渲染入口（异步：DOM 舞台 → dom-to-image-more → 画回 canvas）
 * @param {HTMLCanvasElement} canvas
 * @param {Object} data - ShareData 数据层
 * @param {string} template - 模板名（tarot 归一为 arcana）
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