// ===== src/ui/actions.js · 跨模块动作注册表 =====
// 目的：ui-render 不再动态 import ui.js（避免循环依赖与 Vite 分包警告）。
// ui.js 初始化时把自己的入口函数注册进来，ui-render 只按需调用。
export const uiActions = {};

export function registerUIActions(actions) {
  Object.assign(uiActions, actions || {});
}
