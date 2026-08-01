// ===== src/utils/safe.js · HTML 安全工具函数 =====

export function escapeForHTML(text) {
  if (text === null || text === undefined) return '';
  const div = document.createElement('div');
  div.textContent = String(text);
  return div.innerHTML;
}

// 核心安全防护：用 <template> 解析，再转移节点
// 这样内联 <img onerror=...>、<script> 不会被执行
export function setHTML(element, html) {
  if (!element) return;
  const template = document.createElement('template');
  template.innerHTML = html;
  element.replaceChildren(template.content);
}

export function sanitizeInput(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[<>"'`]/g, function(c) {
    return { '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;' }[c];
  });
}

export function escapeForAttribute(str) {
  return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}