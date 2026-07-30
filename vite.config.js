import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa'; // 需要执行 npm install vite-plugin-pwa -D

export default defineConfig({
  base: '/FuShengPai/',
  root: '.',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    assetsInlineLimit: 0,
  },
  resolve: {
    alias: { '@': '/src' },
  },
  server: {
    port: 3000,
    open: true,
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true // 开发环境也启用PWA
      },
      manifest: false, // 因为我们手动管理 sw.js
      workbox: {
        globDirectory: 'dist',
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        swDest: 'dist/sw.js',
        clientsClaim: true,
        skipWaiting: true,
      },
    })
  ]
});