// ===== src/texts/index.js · 文案统一出口 =====
export * from './texts-main.js';
export * from './texts-reject.js';
export * from './texts-tutorial.js';
export * from './social.js'; // ← 牌灵课题、名人名言、俏皮话、话题标签
export * from './fortune-pools.js'; // ← 东方日运判词池（五行×类别）+ 今日状态短句
export * from './mirror-pools.js'; // ← 情绪镜像 / 生活场景短句 / 温和清醒话
export * from './daily-oracle.js'; // ← 日运能量池（五行基调/建除/冲煞/组合短句）
export { generateFullReading } from './texts-readings.js';