// ===== electron/main.js · 浮生牌桌面壳（可选，纯本地运行，不收集数据） =====
// 用法：npm run app:install（首次）→ npm run app:build 产出绿色单文件 exe
import { app, BrowserWindow, Menu, shell } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function createWindow() {
  const win = new BrowserWindow({
    width: 440,
    height: 800,
    minWidth: 360,
    minHeight: 640,
    title: '浮生牌 · 观牌知势',
    icon: path.join(__dirname, '..', 'public', 'icons', 'fsp-icon.svg'),
    autoHideMenuBar: true,
    backgroundColor: '#1a1626',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  // 加载构建产物（先 npm run build）
  win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));

  // 所有外部链接交给系统浏览器，不在壳内打开
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  // 无菜单栏，更像一个原生 App
  Menu.setApplicationMenu(null);
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
