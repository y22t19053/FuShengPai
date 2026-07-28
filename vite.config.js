import { defineConfig } from 'vite';

export default defineConfig({
  // 项目根目录（index.html 所在位置）
  root: '.',

  // 构建输出目录
  build: {
    outDir: 'dist',
    // 静态资源放在 assets 子目录下
    assetsDir: 'assets',
    // 确保资源路径使用相对路径，方便部署到任意子目录
    assetsInlineLimit: 0,
  },

  // 路径别名：@ 指向 src 目录
  resolve: {
    alias: {
      '@': '/src',
    },
  },

  // 本地开发服务器配置
  server: {
    port: 3000,
    open: true,
  },
});