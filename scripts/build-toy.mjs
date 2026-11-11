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
//
// 构建完再裁一刀：Toy 上只放给普通玩家玩的那一个页面。
// 对读模式（dual.html，给接单的占卜师用）连同它的分包与演示图一起去掉，
// 免得包里带一个进不去、也不该给玩家看的第二入口。
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { readFileSync, writeFileSync, rmSync, readdirSync, existsSync } from 'node:fs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'dist-toy');

const child = spawn(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['vite', 'build'], {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, FSP_TARGET: 'toy' },
  shell: process.platform === 'win32'
});

/** 裁掉对读模式相关的文件与入口链接。 */
function pruneDualMode() {
  const removed = [];

  // 1. 第二个页面与它的演示图
  for (const rel of ['dual.html', 'dual']) {
    const p = join(OUT, rel);
    if (existsSync(p)) {
      rmSync(p, { recursive: true, force: true });
      removed.push(rel);
    }
  }

  // 2. 只被 dual.html 引用的分包
  const assets = join(OUT, 'assets');
  if (existsSync(assets)) {
    for (const f of readdirSync(assets)) {
      if (/^dual-[\w-]+\.(js|css)$/.test(f)) {
        rmSync(join(assets, f), { force: true });
        removed.push(`assets/${f}`);
      }
    }
  }

  // 3. index.html 里那个指向 dual.html 的链接
  const indexPath = join(OUT, 'index.html');
  if (existsSync(indexPath)) {
    const html = readFileSync(indexPath, 'utf8');
    const next = html.replace(/\s*<a[^>]+href="\.\/dual\.html"[^>]*>[\s\S]*?<\/a>/, '');
    if (next !== html) {
      writeFileSync(indexPath, next);
      removed.push('index.html 里的「占卜师版」链接');
    }
  }

  console.log(removed.length ? `\n✂️  已裁掉：${removed.join('、')}` : '\n✂️  没有需要裁掉的东西');
}

child.on('exit', (code) => {
  if (code !== 0) process.exit(code ?? 1);
  pruneDualMode();
  console.log('\n✅ Toy 包已生成：dist-toy/');
  console.log('   上传：toy create dist-toy --title 浮生牌 --slug <slug> --json');
  process.exit(0);
});
