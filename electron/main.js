// ===== electron/main.js · 浮生牌桌面壳（可选，纯本地运行，不收集数据） =====
// 用法：npm run app:install（首次）→ npm run app:build 产出绿色单文件 exe
import { app, BrowserWindow, Menu, shell, ipcMain, dialog } from 'electron';
import path from 'node:path';
import fs from 'node:fs/promises';
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
    backgroundColor: '#f6f1e6',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, 'preload.cjs')
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

// ===== IPC（白名单，渲染进程不可越权） =====
// 应用版本（来自 package.json，供 UI 显示）
ipcMain.handle('app:get-version', () => app.getVersion());

// 分享图保存：弹原生「另存为」对话框，写 PNG 文件
ipcMain.handle('dialog:save-share', async (event, base64, filename) => {
  try {
    const win = BrowserWindow.fromWebContents(event.sender);
    const res = await dialog.showSaveDialog(win, {
      title: '保存分享图',
      defaultPath: filename || '浮生牌分享.png',
      filters: [{ name: '图片', extensions: ['png'] }]
    });
    if (res.canceled || !res.filePath) return false;
    const buf = Buffer.from(base64 || '', 'base64');
    if (!buf.length) return false;
    await fs.writeFile(res.filePath, buf);
    return true;
  } catch (e) {
    console.error('保存分享图失败:', e);
    return false;
  }
});

// 在系统文件管理器中显示文件
ipcMain.handle('shell:show-item', async (_e, filePath) => {
  if (filePath && typeof filePath === 'string') {
    shell.showItemInFolder(filePath);
    return true;
  }
  return false;
});

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
