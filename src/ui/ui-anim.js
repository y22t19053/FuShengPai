// ===== src/ui/ui-anim.js · 动画与过渡效果（轻量） =====

export function injectAnimations() {
  // 在 CSS 中已定义动画，这里仅做启动一次性效果
  // 例如：页面入场淡入
  const app = document.getElementById('appRoot');
  if (app) {
    app.style.animation = 'fadeIn 0.3s ease';
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