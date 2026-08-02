// ===== src/utils/qr.js · 二维码生成器（纯JS实现） =====

// ---------- QR 矩阵生成（简易版，只支持数字和URL，但足够用） ----------
function createQRMatrix(text) {
  // 输入 URL 或文本，输出二维矩阵 0/1
  // 实现采用 qrcode-generator 的核心算法（MIT License）
  // 这里简化版，实际项目可用 qrcode 库，但为了零依赖，手写
  
  // 为了演示，这里返回一个模拟矩阵（真实项目请用 qrcode 库）
  // 但分享图需要真实二维码，所以我们需要一个真实的实现。
  // 最简单方式：使用外部库 qrcode，已在 package.json 中安装。
  // 但由于本文件纯手写，我们可以动态加载 qrcode 库：
  
  // 使用动态 import 避免初始加载
  // 此函数会被 loadQRImage 调用，内部使用 qrcode 库
  return null; // 占位，实际逻辑在 loadQRImage 中
}

// ---------- 颜色归一化：qrcode 库只接受 hex，rgba() 会抛 Invalid hex color ----------
// rgba 的 alpha 丢弃（半透明由调用方 drawImage 的 globalAlpha 控制）
export function normalizeHexColor(color) {
  if (!color) return color;
  if (typeof color !== 'string') return color;
  const trimmed = color.trim();
  if (trimmed.startsWith('#')) return trimmed;
  const m = trimmed.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (m) {
    const toHex = (n) => Math.max(0, Math.min(255, Number(n))).toString(16).padStart(2, '0');
    return '#' + toHex(m[1]) + toHex(m[2]) + toHex(m[3]);
  }
  return trimmed;
}

// ---------- 加载二维码图片 ----------
export async function loadQRImage(content, size = 100, colors = {}) {
  try {
    // 动态加载 qrcode 库（已在 package.json 中）
    const QRCode = (await import('qrcode')).default;
    // 生成 data URL（colors 可传 {dark, light} 做淡色印章效果）
    const dataUrl = await QRCode.toDataURL(content, {
      width: size,
      height: size,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: {
        dark: normalizeHexColor(colors.dark) || '#000000',
        light: normalizeHexColor(colors.light) || '#ffffff'
      }
    });
    // 创建 Image 对象
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = dataUrl;
    });
    return img;
  } catch (e) {
    console.warn('二维码生成失败:', e);
    // 降级：手动绘制一个简单图案（示例）
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, size, size);
    // 画一个简单的方块图，表示二维码不可用
    ctx.fillStyle = '#000';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('QR', size/2, size/2);
    const img = new Image();
    await new Promise(resolve => {
      img.onload = resolve;
      img.src = canvas.toDataURL();
    });
    return img;
  }
}