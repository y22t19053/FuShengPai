// ===== src/texts/index.js =====
// 导出所有文案模块
export * from './texts-main.js';
export * from './texts-reject.js';
export * from './texts-spirit.js';
export * from './texts-tutorial.js';

// 【修复】重新导出 generateFullReading（被 ui-render.js 和 ui.js 使用）
export { generateFullReading } from './texts-readings.js';