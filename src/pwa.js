// ===== src/pwa.js · PWA 注册 + 添加至主屏引导（自包含，零依赖） =====
import { registerSW } from 'virtual:pwa-register';

let deferredPrompt = null;
let pwaInstalled = false;
let dismissed = false; // 本会话内用户已关闭横幅，不再自动打扰

const IOS_GUIDE_SEEN_KEY = 'fsp_pwa_ios_guide_seen';  // iOS 三步引导已看过（看过即不再自动弹）
const BANNER_COUNT_KEY = 'fsp_pwa_banner_count';      // 自动弹横幅累计次数（限制打扰）

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

// 已以独立窗口（standalone）运行 = 已安装，跳过所有引导
function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;
}

/** 是否已安装/以独立窗口运行（供 UI 常驻入口判断状态） */
export function isPWAInstalled() {
  return pwaInstalled || isStandalone();
}

/** 安装成功后统一收尾：清横幅 + 广播事件（UI 层 toast） */
function markInstalled() {
  pwaInstalled = true;
  hideInstallBanner();
  document.dispatchEvent(new CustomEvent('fsp-pwa-installed'));
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
    maybeShowBanner('auto');
  });

  window.addEventListener('appinstalled', () => markInstalled());

  // iOS / Safari 没有 beforeinstallprompt：首次访问自动引导一次，
  // 之后按「看过引导与否 + 自动弹次数」限流，避免骚扰但保证找得到入口。
  if (isIOS()) {
    setTimeout(() => maybeShowBanner('auto'), 3500);
  }
}

// ===== 自动弹横幅策略 =====
// - 桌面 Chrome：浏览器判定可安装时弹（本会话关闭后不再自动打扰）
// - iOS：已看过三步引导则不再自动弹；未看过最多自动弹 3 次
function maybeShowBanner(source) {
  if (isPWAInstalled()) return;
  if (source === 'auto') {
    if (dismissed) return;
    if (isIOS()) {
      if (localStorage.getItem(IOS_GUIDE_SEEN_KEY)) return; // 已看过步骤 → 不再打扰
      const count = parseInt(localStorage.getItem(BANNER_COUNT_KEY) || '0', 10);
      if (count >= 3) return;                               // 最多自动 3 次
      localStorage.setItem(BANNER_COUNT_KEY, String(count + 1));
    }
  }
  showInstallBanner();
}

// ===== 常驻入口（顶部菜单「安装到桌面」） =====
// 返回 'installed' | 'prompt' | 'guide' | 'banner'，供 UI 决定提示文案
export function requestPWAInstall() {
  if (isPWAInstalled()) return 'installed';
  if (isIOS()) { showIOSGuide(); return 'guide'; }
  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(() => { deferredPrompt = null; }).catch(() => { deferredPrompt = null; });
    return 'prompt';
  }
  showInstallBanner();
  return 'banner';
}

// ===== 底部安装横幅（更显眼：图标动效 + 双行文案 + 主次按钮） =====
function showInstallBanner() {
  if (pwaInstalled || dismissed || document.getElementById('pwaInstallBanner')) return;
  const ios = isIOS();
  const banner = document.createElement('div');
  banner.id = 'pwaInstallBanner';
  banner.style.cssText = [
    'position:fixed', 'left:12px', 'right:12px', 'bottom:14px',
    'z-index:1200', 'background:linear-gradient(135deg,#f6f0e2,#eae2cf)',
    'border:1px solid #6fae9c80', 'border-radius:18px 24px 16px 22px', 'padding:14px 14px 12px',
    'box-shadow:0 10px 34px rgba(92,138,122,.22), 4px 5px 0 rgba(77,143,126,0.16)',
    'animation:pwaBannerIn .45s cubic-bezier(.2,.9,.3,1.2)', 'font-size:0.82rem'
  ].join(';');
  banner.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;">
      <span style="font-size:1.5rem;flex-shrink:0;animation:pwaWiggle 2.6s ease-in-out infinite;">📲</span>
      <div style="flex:1;color:#3a3425;line-height:1.45;">
        <div style="font-weight:700;font-size:0.9rem;color:#4d8f7e;">把浮生牌「添加到主屏幕」</div>
        <div style="font-size:0.74rem;opacity:.9;">${
          ios
            ? '装好后像 App 一样全屏秒开 · 离线也能用 · 数据仍在本地'
            : '秒开、离线可用、更像一个真正的 App'
        }</div>
      </div>
    </div>
    <div style="display:flex;gap:8px;margin-top:10px;">
      <button id="pwaInstallNow" style="flex:1;background:linear-gradient(135deg,#8fc0ad,#6fae9c);color:#efe9d8;border:none;border-radius:18px 24px 16px 22px;padding:9px 0;font-weight:700;cursor:pointer;box-shadow:0 3px 0 rgba(77,143,126,0.35);font-size:0.86rem;">${
        ios ? '查看安装步骤' : '立即添加'
      }</button>
      <button id="pwaInstallClose" style="flex-shrink:0;background:rgba(107,94,66,.08);border:1px solid rgba(107,94,66,.18);color:#8b8068;border-radius:14px 18px 12px 16px;padding:0 12px;cursor:pointer;font-size:0.78rem;">暂不</button>
    </div>`;
  document.body.appendChild(banner);

  const installBtn = banner.querySelector('#pwaInstallNow');
  const closeBtn = banner.querySelector('#pwaInstallClose');

  closeBtn.addEventListener('click', () => {
    dismissed = true;
    banner.remove();
  });

  if (installBtn) {
    installBtn.addEventListener('click', () => {
      banner.remove();
      if (ios) {
        localStorage.setItem(IOS_GUIDE_SEEN_KEY, '1'); // 看过即不再自动弹
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

// ===== iOS 三步引导弹层（图示化：Safari 工具栏示意 + 具体操作） =====
function showIOSGuide() {
  if (document.getElementById('pwaIOSGuide')) return;
  const overlay = document.createElement('div');
  overlay.id = 'pwaIOSGuide';
  overlay.style.cssText = [
    'position:fixed', 'inset:0', 'z-index:1300',
    'background:rgba(58,52,37,.55)', 'display:flex', 'align-items:center',
    'justify-content:center', 'padding:20px', 'backdrop-filter:blur(3px)'
  ].join(';');

  const sheet = document.createElement('div');
  sheet.style.cssText = [
    'background:linear-gradient(160deg,#f6f0e2,#eae2cf)', 'border:1px solid #6fae9c73',
    'border-radius:24px 30px 22px 28px', 'max-width:350px', 'width:100%', 'padding:22px 18px',
    'color:#3a3425', 'font-size:0.86rem', 'line-height:1.55',
    'box-shadow:0 16px 52px rgba(92,138,122,.26), 5px 6px 0 rgba(77,143,126,0.16)',
    'max-height:86vh', 'overflow-y:auto'
  ].join(';');

  // 模拟 Safari 底部工具栏（分享按钮 ↑ 的位置）
  const safariBar = `
    <div style="display:flex;justify-content:space-around;align-items:center;background:rgba(255,255,255,.65);border:1px solid rgba(107,94,66,.15);border-radius:12px;padding:8px 6px;margin:8px 0 2px;box-shadow:inset 0 1px 0 rgba(255,255,255,.6);">
      <span style="font-size:1rem;opacity:.55;">◀</span><span style="font-size:1rem;opacity:.55;">▶</span>
      <span style="flex:1;background:rgba(107,94,66,.08);border-radius:10px;height:22px;margin:0 6px;"></span>
      <span style="font-size:1.15rem;">${'⤴️'}</span>
      <span style="font-size:1rem;opacity:.55;">☰</span>
    </div>`;

  sheet.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
      <div style="font-size:1.08rem;font-weight:700;color:#4d8f7e;">📲 添加到主屏幕</div>
      <button id="pwaGuideClose" style="background:none;border:none;color:#8b8068;cursor:pointer;font-size:1rem;padding:2px 6px;" aria-label="关闭">✕</button>
    </div>
    <p style="font-size:0.78rem;opacity:.85;margin:0 0 12px;">把浮生牌装到桌面后，<b>像 App 一样全屏打开</b>，秒开、离线可用、数据只存本机。以下操作都在 <b>Safari 浏览器</b>中完成：</p>
    <div style="display:flex;gap:10px;align-items:flex-start;margin:12px 0;">
      <div style="font-size:1.2rem;flex-shrink:0;line-height:1.3;font-weight:700;color:#6fae9c;">1</div>
      <div style="flex:1;">
        <div style="font-weight:600;">打开分享菜单</div>
        <div style="font-size:0.78rem;opacity:.9;">点 Safari 底部工具栏中间的「分享」按钮 <b>⤴️</b>（方框里向上的箭头）。</div>
        ${safariBar}
      </div>
    </div>
    <div style="display:flex;gap:10px;align-items:flex-start;margin:12px 0;">
      <div style="font-size:1.2rem;flex-shrink:0;line-height:1.3;font-weight:700;color:#6fae9c;">2</div>
      <div style="flex:1;">
        <div style="font-weight:600;">找到「添加到主屏幕」</div>
        <div style="font-size:0.78rem;opacity:.9;">在分享菜单中<b>向下滑动</b>，找到「<b>添加到主屏幕</b>」（图标是带 + 号的圆环 ➕）并点它。</div>
        <div style="display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,.65);border:1px solid rgba(107,94,66,.15);border-radius:10px;padding:4px 10px;margin-top:6px;font-size:0.8rem;">
          <span style="width:18px;height:18px;border-radius:6px;background:linear-gradient(135deg,#8fc0ad,#6fae9c);display:inline-flex;align-items:center;justify-content:center;color:#fff;font-size:0.72rem;">浮</span>
          ＋ 添加到主屏幕
        </div>
      </div>
    </div>
    <div style="display:flex;gap:10px;align-items:flex-start;margin:12px 0 14px;">
      <div style="font-size:1.2rem;flex-shrink:0;line-height:1.3;font-weight:700;color:#6fae9c;">3</div>
      <div style="flex:1;">
        <div style="font-weight:600;">确认添加</div>
        <div style="font-size:0.78rem;opacity:.9;">点右上角「<b>添加</b>」。桌面上会出现浮生牌图标，点开即全屏运行。</div>
      </div>
    </div>
    <button id="pwaGuideDone" style="width:100%;background:linear-gradient(135deg,#8fc0ad,#6fae9c);color:#efe9d8;border:none;border-radius:20px 26px 18px 24px;padding:11px 0;font-weight:700;cursor:pointer;font-size:0.92rem;box-shadow:0 4px 0 rgba(77,143,126,0.35);">我知道了</button>
  `;

  overlay.appendChild(sheet);
  document.body.appendChild(overlay);
  sheet.querySelector('#pwaGuideClose').addEventListener('click', () => overlay.remove());
  sheet.querySelector('#pwaGuideDone').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
}

// 横幅/引导动画关键帧（防抖避免重复注入）
(function injectPWAKF() {
  if (document.getElementById('pwaKeyframes')) return;
  const st = document.createElement('style');
  st.id = 'pwaKeyframes';
  st.textContent = `
@keyframes pwaBannerIn { from { transform: translateY(120%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
@keyframes pwaWiggle { 0%,100% { transform: rotate(-6deg); } 50% { transform: rotate(10deg); } }`;
  (document.head || document.documentElement).appendChild(st);
})();
