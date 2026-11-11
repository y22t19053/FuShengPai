// ===== scripts/build-toy.mjs =====
// 出一份可以直接上传到 B 站 Toy 平台（https://www.bilibili.com/toy/）的构建产物。
//
// 用法：npm run build:toy
// 产物：dist-toy/（打包发布时传这个目录，里面是 index.html + assets，不含源码）
//
// 与网页版构建的区别（见 vite.config.js 的 FSP_TARGET 分支）：
//   - 关掉 PWA（Service Worker / manifest）——在第三方域名下缓存页面只会添乱；
//   - 关掉 CSP meta——它的 script-src 可能挡掉宿主页面自己的脚本；
//   - base 仍是 './'，因为 Toy 页面跑在 /toy/<slug>/ 子路径下。
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const child = spawn(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['vite', 'build'], {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, FSP_TARGET: 'toy' },
  shell: process.platform === 'win32'
});

child.on('exit', (code) => {
  if (code === 0) {
    console.log('\n✅ Toy 包已生成：dist-toy/');
    console.log('   上传：toy create dist-toy --title 浮生牌 --slug <slug> --json');
  }
  process.exit(code ?? 1);
});
