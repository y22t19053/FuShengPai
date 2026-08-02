// ===== src/utils/clipboard.js · 复制交互优化（内联反馈 + 降级方案） =====

/**
 * 复制文本并给按钮内联反馈（不依赖 toast，避免循环依赖）
 * @param {string} text 要复制的文本
 * @param {HTMLElement} [btn] 触发按钮（会临时变成 "✓ 已复制"）
 * @param {object} [opts]
 * @param {string} [opts.successText] 成功时的按钮文案，默认 "✓ 已复制"
 * @param {number} [opts.restoreMs] 反馈持续时间，默认 1600ms
 * @returns {Promise<boolean>} 是否复制成功
 */
export async function copyTextWithFeedback(text, btn, opts = {}) {
  const { successText = '✓ 已复制', restoreMs = 1600 } = opts;
  let ok = false;

  // 1. 首选 Clipboard API（需安全上下文）
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      ok = true;
    }
  } catch (e) { /* 降级到 execCommand */ }

  // 2. 降级：隐藏 textarea + execCommand（兼容 http / 旧浏览器）
  if (!ok) {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.top = '-9999px';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      ok = document.execCommand('copy');
      document.body.removeChild(ta);
    } catch (e) {
      ok = false;
    }
  }

  // 3. 按钮内联反馈（禁用防连点 + 文案占位 + 复原）
  if (btn && btn.nodeType === 1) {
    const original = btn.textContent;
    const wasDisabled = btn.disabled;
    btn.disabled = true;
    btn.textContent = ok ? successText : '⚠ 复制失败';
    setTimeout(() => {
      btn.textContent = original;
      btn.disabled = wasDisabled;
    }, restoreMs);
  }

  return ok;
}
