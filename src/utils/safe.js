// ===== src/utils/safe.js · 安全转义工具 =====
export function safe(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

export function safeHTML(str) {
  return safe(str);
}

// 用于HTML字符串拼接时转义，然后通过innerHTML插入
export function escapeForHTML(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[c]);
}

// 替代innerHTML插入：安全方式
export function setHTML(el, html) {
  if (!el) return;
  // 使用模板元素解析HTML，然后转移节点，避免执行脚本
  const template = document.createElement('template');
  template.innerHTML = html;
  el.replaceChildren(template.content.cloneNode(true));
}