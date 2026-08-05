// ===== src/share/renderer.js · 统一渲染器（根据模板类型调度） =====
import { drawDivinationShare } from './templates/divination.js';
import { renderArcana } from '../share2/templates/arcana.js';
import { renderDaily, renderDailyMint } from '../share2/templates/daily.js';

// 模板注册表（未来可动态扩展）
const TEMPLATE_REGISTRY = {
  divination: drawDivinationShare, // 解读 · 深色玄金移动端阅读风
  tarot: renderArcana,   // 牌灵 · share2 新引擎（原生 Canvas，零 DOM 截图，无指纹/编号）
  arcana: renderArcana,  // 牌灵 · 新模板名别名
  daily: renderDaily,    // 日运 · share2 新引擎（原生 Canvas，零 DOM 截图，无指纹/编号）
  mint: renderDailyMint, // 日运 · 薄荷清新款（墨绿字 + 青绿金）
};

/**
 * 统一分享图渲染入口
 * @param {HTMLCanvasElement} canvas
 * @param {Object} data - ShareData 数据层
 * @param {string} template - 模板名
 */
export async function renderShareCard(canvas, data, template = 'divination') {
  if (!canvas) throw new Error('Canvas 未就绪');
  if (!data) throw new Error('分享数据为空');

  // 统一尺寸：1080×1440（3:4 朋友圈黄金比例）
  canvas.width = 1080;
  canvas.height = 1440;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D 上下文不可用');

  // 选择模板（默认 divination；找不到时同样落到 divination，绝不让 renderer 为 undefined）
  const renderer = TEMPLATE_REGISTRY[template] || TEMPLATE_REGISTRY.divination;

  // 执行渲染
  await renderer(ctx, 1080, 1440, data);

  // 返回 canvas 以便后续处理
  return canvas;
}

// 动态注册新模板
export function registerShareTemplate(name, renderFn) {
  if (typeof renderFn === 'function') {
    TEMPLATE_REGISTRY[name] = renderFn;
  }
  return TEMPLATE_REGISTRY;
}

// 获取可用模板列表
export function getAvailableTemplates() {
  return Object.keys(TEMPLATE_REGISTRY);
}