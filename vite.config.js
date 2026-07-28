import { defineConfig } from 'vite';

export default defineConfig({
  // 关键：告诉 Vite 你的项目在 GitHub Pages 子路径下！
  base: '/FuShengPai/', 
  root: '.',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    assetsInlineLimit: 0,
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  server: {
    port: 3000,
    open: true,
  },
});