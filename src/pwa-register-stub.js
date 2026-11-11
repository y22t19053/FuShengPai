// ===== src/pwa-register-stub.js =====
// 只在 Toy 平台构建里顶替 vite-plugin-pwa 提供的虚拟模块 `virtual:pwa-register`。
// 见 vite.config.js 的 IS_TOY 分支：那份构建不带 Service Worker，
// 所以注册函数是空的——页面功能不受影响，只是没有离线缓存。
export function registerSW() {
  return () => {};
}

export default { registerSW };
