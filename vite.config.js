// ===== vite.config.js =====
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  server: {
    host: true,
    port: 5173,
    // 排除打包产物目录，避免监听被锁定的文件（如 release/win-unpacked/electron.exe）导致 EBUSY
    watch: {
      ignored: ['**/release/**', '**/dist/**', '**/node_modules/**', '**/dev-dist/**', '**/.git/**']
    }
  },
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0
  },
  plugins: [
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
    include: ['**/*.test.js'],
    environment: 'node'
  }
});