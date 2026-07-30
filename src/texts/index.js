// ===== src/texts/index.js =====
// 将大语料库 texts-readings.js 移出首屏静态导出，改为按需动态导入
export * from './texts-main.js';
export * from './texts-reject.js';
export * from './texts-spirit.js';
export * from './texts-tutorial.js';

// 注意：texts-readings.js 不再通过此处导出，将在 ui.js 中动态导入