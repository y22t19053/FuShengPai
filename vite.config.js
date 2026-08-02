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
        name: '浮生牌 · 观测者的镜子',
        short_name: '浮生牌',
        description: '献给高敏感人群的AI时代玄学工具：不替你做决定，但帮你把心里的话说出来。',
        lang: 'zh-CN',
        theme_color: '#1a1626',
        background_color: '#1a1626',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '.',
        scope: '.',
        icons: [
          {
            src: 'icons/fsp-icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any'
          },
          {
            src: 'icons/fsp-icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webp,woff2}'],
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