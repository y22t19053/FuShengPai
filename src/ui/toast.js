// ===== src/ui/toast.js · 全局 Toast =====
// 从 ui-modal 拆出：ui-render / ui-drag / ui-paige 只依赖这里，
// 不再依赖 ui-modal，从而消除 ui-render <-> ui-modal 的静态循环。
export let toastTimer = null;

export function toast(msg, duration = 2000, type = 'info') {
  const el = document.getElementById('toast');
  if (!el) return;
  // 清空并重建（保证纯文本安全 + 进度条子元素）
  el.innerHTML = '';
  const text = document.createElement('span');
  text.className = 'toast-msg';
  text.textContent = msg;
  const bar = document.createElement('div');
  bar.className = 'toast-bar';
  el.appendChild(text);
  el.appendChild(bar);
  el.classList.remove('toast-success', 'toast-warning', 'toast-info');
  el.classList.add(type === 'success' ? 'toast-success' : type === 'warning' ? 'toast-warning' : 'toast-info');
  el.style.setProperty('--toast-dur', duration + 'ms');
  el.removeAttribute('hidden');
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.setAttribute('hidden', ''), 400);
  }, duration);
}
