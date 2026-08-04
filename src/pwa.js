// ===== src/pwa.js · PWA 注册 + 添加至主屏引导（自包含，零依赖） =====
import { registerSW } from 'virtual:pwa-register';

let deferredPrompt = null;
let pwaInstalled = false;
let dismissed = false; // 本会话内用户已关闭，不再打扰

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

// 已以独立窗口（standalone）运行 = 已安装，跳过所有引导
function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;
}

export function initPWA() {
  // 注册 Service Worker（发布构建产物，自动更新）
  try {
    registerSW({ immediate: true });
  } catch (e) {
    console.warn('[pwa] registerSW 失败', e);
  }

  if (isStandalone()) { pwaInstalled = true; return; }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    showInstallBanner();
  });

  window.addEventListener('appinstalled', () => {
    pwaInstalled = true;
    hideInstallBanner();
  });

  // iOS / Safari 没有 beforeinstallprompt：首次访问主动引导一次
  if (isIOS() && !localStorage.getItem('fsp_pwa_ios_dismiss')) {
    setTimeout(showInstallBanner, 4000);
  }
}

// ===== 底部安装横幅 =====
function showInstallBanner() {
  if (pwaInstalled || dismissed || document.getElementById('pwaInstallBanner')) return;
  const ios = isIOS();
  const banner = document.createElement('div');
  banner.id = 'pwaInstallBanner';
  banner.style.cssText = [
    'position:fixed', 'left:16px', 'right:16px', 'bottom:16px',
    'z-index:1200', 'background:linear-gradient(135deg,#1d1d2b,#26263a)',
    'border:1px solid #c9a96e66', 'border-radius:12px', 'padding:12px 14px',
    'display:flex', 'align-items:center', 'gap:10px',
    'box-shadow:0 8px 30px rgba(0,0,0,.45)', 'font-size:0.8rem'
  ].join(';');
  banner.innerHTML = `<span style="font-size:1.2rem;">📲</span>
    <div style="flex:1;color:#e8e4da;line-height:1.5;">${
      ios
        ? '在 Safari 中把浮生牌「添加到主屏幕」，就能像 App 一样使用'
        : '把浮生牌添加到主屏幕 · 秒开、离线可用、更像一个真正的 App'
    }</div>
    <button id="pwaInstallNow" style="background:linear-gradient(135deg,#c9a96e,#8b6f47);color:#121216;border:none;border-radius:16px;padding:6px 14px;font-weight:700;cursor:pointer;flex-shrink:0;">${
      ios ? '查看步骤' : '添加'
    }</button>
    <button id="pwaInstallClose" style="background:none;border:none;color:#8b8ba0;cursor:pointer;font-size:0.9rem;flex-shrink:0;" aria-label="关闭">✕</button>`;
  document.body.appendChild(banner);

  const installBtn = banner.querySelector('#pwaInstallNow');
  const closeBtn = banner.querySelector('#pwaInstallClose');

  closeBtn.addEventListener('click', () => {
    dismissed = true;
    banner.remove();
    if (ios) localStorage.setItem('fsp_pwa_ios_dismiss', '1');
  });

  if (installBtn) {
    installBtn.addEventListener('click', () => {
      banner.remove();
      if (ios) {
        localStorage.setItem('fsp_pwa_ios_dismiss', '1');
        showIOSGuide();
        return;
      }
      if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(() => { deferredPrompt = null; }).catch(() => { deferredPrompt = null; });
      }
    });
  }
}

function hideInstallBanner() {
  const banner = document.getElementById('pwaInstallBanner');
  if (banner) banner.remove();
}

// ===== iOS 三步引导弹层（Safari 无安装提示 API，需手动指引） =====
function showIOSGuide() {
  if (document.getElementById('pwaIOSGuide')) return;
  const overlay = document.createElement('div');
  overlay.id = 'pwaIOSGuide';
  overlay.style.cssText = [
    'position:fixed', 'inset:0', 'z-index:1300',
    'background:rgba(10,8,18,.74)', 'display:flex', 'align-items:center',
    'justify-content:center', 'padding:22px', 'backdrop-filter:blur(2px)'
  ].join(';');

  const sheet = document.createElement('div');
  sheet.style.cssText = [
    'background:linear-gradient(160deg,#232336,#191928)', 'border:1px solid #c9a96e55',
    'border-radius:16px', 'max-width:340px', 'width:100%', 'padding:20px 18px',
    'color:#e8e4da', 'font-size:0.85rem', 'line-height:1.55',
    'box-shadow:0 14px 46px rgba(0,0,0,.55)'
  ].join(';');

  sheet.innerHTML = `
    <div style="font-size:1.05rem;font-weight:700;text-align:center;margin-bottom:14px;color:#ecCF8a;">📲 添加到主屏幕</div>
    <div style="display:flex;gap:12px;align-items:flex-start;margin:12px 0;">
      <div style="font-size:1.25rem;flex-shrink:0;line-height:1.2;">1️⃣</div>
      <div>打开 Safari，点击底部工具栏的「<b>分享</b>」按钮（方框向上箭头 ⤴️）。</div>
    </div>
    <div style="display:flex;gap:12px;align-items:flex-start;margin:12px 0;">
      <div style="font-size:1.25rem;flex-shrink:0;line-height:1.2;">2️⃣</div>
      <div>在菜单中向下滑动，找到「<b>添加到主屏幕</b>」并点击。</div>
    </div>
    <div style="display:flex;gap:12px;align-items:flex-start;margin:12px 0 16px;">
      <div style="font-size:1.25rem;flex-shrink:0;line-height:1.2;">3️⃣</div>
      <div>点右上角「<b>添加</b>」。浮生牌图标将出现在桌面，点开即像 App 一样全屏运行。</div>
    </div>
    <button id="pwaGuideDone" style="width:100%;background:linear-gradient(135deg,#c9a96e,#8b6f47);color:#121216;border:none;border-radius:20px;padding:10px 0;font-weight:700;cursor:pointer;font-size:0.9rem;">我知道了</button>
  `;

  overlay.appendChild(sheet);
  document.body.appendChild(overlay);
  sheet.querySelector('#pwaGuideDone').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
}
