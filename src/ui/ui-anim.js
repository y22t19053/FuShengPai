// ===== src/ui/ui-anim.js · 动画与过渡效果（轻量） =====

export function injectAnimations() {
  // 在 CSS 中已定义动画，这里仅做启动一次性效果
  // 例如：页面入场淡入
  const app = document.getElementById('appRoot');
  if (app) {
    app.style.animation = 'fadeIn 0.3s ease';
    // 兜底：浏览器会在后台标签页暂停 CSS 动画，页面若在后台加载，
    // 入场动画（fadeIn / fadeSlide）会冻结在 from{opacity:0}，切回时
    // 整页透明、看似「点不动」。检测到页面恢复可见时直接清掉动画归位。
    const forceVisible = () => {
      if (document.hidden) return;
      const root = document.getElementById('appRoot');
      if (!root) return;
      root.style.animation = 'none';
      root.style.opacity = '1';
      // 内容区（hero 等）的 fadeSlide 同理：恢复可见时直接显示
      document.querySelectorAll('#coreArea > *').forEach((el) => {
        el.style.animation = 'none';
        el.style.opacity = '1';
      });
      document.removeEventListener('visibilitychange', forceVisible);
      window.removeEventListener('pageshow', forceVisible);
    };
    document.addEventListener('visibilitychange', forceVisible);
    // bfcache 恢复时动画状态未知，同样兜底（首次加载 persisted=false 不触发）
    window.addEventListener('pageshow', (e) => {
      if (e.persisted) forceVisible();
    });
  }
  
  // 牌堆洗牌动画（在按钮触发时加类）
  const deck = document.getElementById('deckContainer');
  if (deck) {
    // 监听牌堆内容变化，可以添加闪烁效果（无操作）
  }
}

// 洗牌时加短暂动画（在 ui.js 中调用）
export function playShuffleAnimation(element) {
  if (!element) return;
  element.classList.add('shuffling');
  setTimeout(() => element.classList.remove('shuffling'), 700);
}

// 刷新动效（防闪烁）
export function pulseFade(element) {
  if (!element) return;
  element.style.transition = 'opacity 0.15s';
  element.style.opacity = '0.8';
  setTimeout(() => {
    element.style.opacity = '1';
    setTimeout(() => element.style.transition = '', 200);
  }, 50);
}