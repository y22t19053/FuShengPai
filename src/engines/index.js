// ===== src/engines/index.js · 四引擎统一注册表（阶段 3 契约层） =====
// 契约：每个引擎暴露 { id, name, description, inputConfig, calc }
//  - inputConfig：输入参数声明（类型/默认值/标签/说明）
//  - calc(input)：纯函数，输入 → 结果（超集结构，UI 层薄调用）
// 统一入口：getEngine(id) / runEngine(id, input) / listEngines()

import { pokerEngine } from './poker.js';
import { mahjongEngine } from './mahjong.js';
import { paigeEngine } from './paige.js';
import { dailyEngine } from './daily.js';

export const ENGINES = [pokerEngine, mahjongEngine, paigeEngine, dailyEngine];

const BY_ID = new Map(ENGINES.map(e => [e.id, e]));

/** 按 id 取引擎；不存在返回 null */
export function getEngine(id) {
  return BY_ID.get(id) || null;
}

/** 统一执行入口：runEngine(id, input) → 引擎 calc 结果；未知引擎抛错 */
export function runEngine(id, input) {
  const engine = getEngine(id);
  if (!engine) throw new Error(`[engines] 未知引擎: ${id}`);
  return engine.calc(input);
}

/** 列出全部引擎契约元信息（用于调试/UI 动态渲染） */
export function listEngines() {
  return ENGINES.map(e => ({
    id: e.id,
    name: e.name,
    description: e.description,
    inputConfig: e.inputConfig,
  }));
}

export { pokerEngine, mahjongEngine, paigeEngine, dailyEngine };
