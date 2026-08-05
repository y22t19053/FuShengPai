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
        // 不再加载网络字体：奶油主题统一系统圆润无衬线（PingFang/微软雅黑），
        // PWA 离线零字体依赖，首屏更快、包体更小
        globPatterns: ['**/*.{js,css,html,svg,png,webp}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true
      }
    })
  ],
  test: {
    include: ['**/*.test.js'],
    environment: 'node'
  }
});