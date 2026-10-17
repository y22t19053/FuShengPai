// ===== src/utils/safe.js · HTML 安全工具函数 =====

export function escapeForHTML(text) {
  if (text === null || text === undefined) return '';
  const div = document.createElement('div');
  div.textContent = String(text);
  return div.innerHTML;
}

// 注意：这不是消毒函数。<script> 不会执行，但 <img onerror> 等事件属性
// 在节点插入 DOM 后仍会触发。只允许传入已转义/可信的 HTML；
// 用户内容或 AI 输出必须先经 escapeForHTML 处理。
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