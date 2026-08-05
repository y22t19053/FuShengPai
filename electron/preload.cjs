// ===== electron/preload.cjs · 安全桥（contextBridge + IPC，参考 gs-helper 的 preload 模式） =====
// 原则：渲染进程拿不到 Node 能力，只拿到白名单 API（最小权限）
// 注意：项目是 "type": "module"，sandbox preload 必须用 .cjs（CJS）加载
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('fspDesktop', {
  isDesktop: true,
  platform: process.platform,
  // 获取应用版本号（来自 package.json）
  getVersion: () => ipcRenderer.invoke('app:get-version'),
  // 分享图走原生「另存为」对话框（参数：base64 PNG、建议文件名）
  saveShareFile: (base64, filename) => ipcRenderer.invoke('dialog:save-share', base64, filename),
  // 打开系统文件管理器（可选，未来备份目录用）
  showItemInFolder: (filePath) => ipcRenderer.invoke('shell:show-item', filePath)
});
