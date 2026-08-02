// ===== src/pwa.js · PWA 注册 + 添加至主屏引导（自包含，零依赖） =====
import { registerSW } from 'virtual:pwa-register';

let deferredPrompt = null;
let pwaInstalled = false;

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function initPWA() {
  // 注册 Service Worker（发布构建产物，自动更新）
  try {
    registerSW({ immediate: true });
  } catch (e) {
    console.warn('[pwa] registerSW 失败', e);
  }

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
    setTimeout(showInstallBanner, 6000);
  }
}

function showInstallBanner() {
  if (pwaInstalled || document.getElementById('pwaInstallBanner')) return;
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
        ? '在 Safari 中点击「分享」→「添加到主屏幕」，即可像 App 一样使用'
        : '把浮生牌添加到主屏幕 · 秒开、离线可用、更像一个真正的 App'
    }</div>
    <button id="pwaInstallNow" style="background:linear-gradient(135deg,#c9a96e,#8b6f47);color:#121216;border:none;border-radius:16px;padding:6px 14px;font-weight:700;cursor:pointer;flex-shrink:0;">${
      ios ? '我知道了' : '添加'
    }</button>
    <button id="pwaInstallClose" style="background:none;border:none;color:#8b8ba0;cursor:pointer;font-size:0.9rem;flex-shrink:0;" aria-label="关闭">✕</button>`;
  document.body.appendChild(banner);

  const installBtn = banner.querySelector('#pwaInstallNow');
  const closeBtn = banner.querySelector('#pwaInstallClose');

  closeBtn.addEventListener('click', () => {
    banner.remove();
    if (ios) localStorage.setItem('fsp_pwa_ios_dismiss', '1');
  });

  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      banner.remove();
      if (ios) {
        localStorage.setItem('fsp_pwa_ios_dismiss', '1');
        return;
      }
      if (deferredPrompt) {
        deferredPrompt.prompt();
        try { await deferredPrompt.userChoice; } catch (e) { /* 用户取消 */ }
        deferredPrompt = null;
      }
    });
  }
}

function hideInstallBanner() {
  const banner = document.getElementById('pwaInstallBanner');
  if (banner) banner.remove();
}
