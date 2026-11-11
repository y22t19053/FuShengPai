// ===== vite.config.js =====
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

// FSP_TARGET=toy：为 B 站 Toy 平台（/toy/<slug>/ 子路径、审核沙箱）出的构建。
// 与网页版唯一的区别是关掉 PWA(Service Worker/manifest) 和 CSP meta：
// 前者在第三方域名下缓存页面反而添乱，后者的 script-src 可能挡掉宿主页面自己的脚本。
const IS_TOY = process.env.FSP_TARGET === 'toy';

// 内容安全策略：只允许同源脚本；样式允许内联（现有大量 style=）；
// 连接允许 https/http（用户可填任意 AI 端点）；图片/媒体允许 data:、blob: 供分享图使用。
const CSP = [
  "default-src 'self'",
  "script-src 'self' file:",
  "style-src 'self' 'unsafe-inline' file:",
  "img-src 'self' data: blob: file:",
  "font-src 'self' data: file:",
  "connect-src 'self' https: http: file:",
  "media-src 'self' data: blob: file:",
  "worker-src 'self' blob: file:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'"
].join('; ');

export default defineConfig({
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version)
  },
  // Toy 构建关掉了 vite-plugin-pwa，src/pwa.js 里 import 的虚拟模块就没人提供了，
  // 用一个空壳顶替：能正常打包，注册逻辑变成空函数（平台上本来也没法"添加到主屏幕"）。
  resolve: IS_TOY
    ? { alias: { 'virtual:pwa-register': fileURLToPath(new URL('./src/pwa-register-stub.js', import.meta.url)) } }
    : {},
  server: {
    host: true,
    port: 5173,
    // 排除打包产物目录，避免监听被锁定的文件（如 release/win-unpacked/electron.exe）导致 EBUSY
    watch: {
      ignored: ['**/release/**', '**/dist/**', '**/node_modules/**', '**/dev-dist/**', '**/.git/**']
    }
  },
  build: {
    outDir: IS_TOY ? 'dist-toy' : 'dist',
    assetsInlineLimit: 0,
    rollupOptions: {
      input: { main: 'index.html', dual: 'dual.html' },
      output: {
        // 拆大依赖为独立 chunk：主包更小、首屏更快，第三方库独立缓存（更新频率低，缓存友好）
        manualChunks: {
          lunar: ['lunar-javascript'],          // 真实黄历（约 300KB，仅首页黄历条/日运使用）
          'share-dom': ['dom-to-image-more']     // 分享图 DOM→图片渲染（仅生成分享图时使用）
        }
      }
    }
  },
  plugins: IS_TOY ? [] : [
    {
      // 只在构建产物里注入 CSP，避免影响 vite dev 的 HMR 内联脚本
      name: 'fsp-inject-csp',
      apply: 'build',
      transformIndexHtml() {
        return [{
          tag: 'meta',
          attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP },
          injectTo: 'head-prepend'
        }];
      }
    },
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/fsp-icon.svg'],
      manifest: {
        id: '/',
        name: '浮生牌 · 观测者的镜子',
        short_name: '浮生牌',
        description: '不预测命运，只聊聊今天怎么过。抽一张牌，看看自己真正想选什么。',
        lang: 'zh-CN',
        theme_color: '#efe9d8',
        background_color: '#efe9d8',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '.',
        scope: '.',
        icons: [
          {
            src: 'icons/fsp-icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'icons/fsp-icon.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'icons/fsp-icon-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        // —— 缓存策略：禁用预缓存，全面「网络优先 + 强制校验」——
        // 原因：GitHub Pages 对静态资源带 600s HTTP 强缓存，且旧版 SW 的
        // precache（CacheFirst）会持续命中旧产物，两层叠加导致「打开网站还是旧版」。
        // 解决：globPatterns 置空 = 不预缓存任何构建产物（消灭 CacheFirst 命中旧版），
        // 所有页面与资源走 NetworkFirst（网络优先，断网才回退缓存），
        // fetch 时带 cache:'no-cache' 强制每次 revalidate，绕过 HTTP 强缓存。
        // 代价：离线能力从「全量离线」降为「访问过的页面/资源可离线」，换来每次都最新。
        globPatterns: [],
        navigateFallback: null,
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // 页面导航：网络优先，4 秒超时回退缓存
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'fsp-pages',
              networkTimeoutSeconds: 4,
              fetchOptions: { cache: 'no-cache' }
            }
          },
          {
            // 静态资源（js/css/图片/字体）：网络优先，断网回退缓存
            urlPattern: /\.(?:js|css|svg|png|webp|jpg|jpeg|gif|ico|woff2?)(?:\?.*)?$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'fsp-assets',
              networkTimeoutSeconds: 4,
              fetchOptions: { cache: 'no-cache' }
            }
          }
        ]
      }
    })
  ],
  test: {
    include: ['tests/**/*.test.js'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/_history/**', '**/release/**'],
    environment: 'node'
  }
});