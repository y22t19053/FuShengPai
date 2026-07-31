// ===== src/ui/ui-anim.js · 注入 CSS 动画 =====
export function injectAnimations() {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes cardAppear {
      0% { opacity: 0; transform: scale(0.8); }
      100% { opacity: 1; transform: scale(1); }
    }
    @keyframes shuffling {
      0%, 100% { transform: rotate(0deg); }
      25% { transform: rotate(2deg); }
      75% { transform: rotate(-2deg); }
    }
    .shuffling { animation: shuffling 0.3s ease-in-out 2; }
    .gong.drag-highlight, .empty-dash.drag-highlight {
      border-color: var(--accent) !important;
      box-shadow: 0 0 12px rgba(201, 160, 96, 0.3) !important;
    }
    button:active { transform: scale(0.95); transition: transform 0.1s ease; }
  `;
  document.head.appendChild(style);
}