// ===== src/ui/ui-anim.js · 注入纯粹的 CSS 动画 =====
export function injectAnimations() {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes cardAppear {
      0% { opacity: 0; transform: scale(0.8); }
      100% { opacity: 1; transform: scale(1); }
    }
    button:active { transform: scale(0.95); transition: transform 0.1s ease; }
  `;
  document.head.appendChild(style);
}