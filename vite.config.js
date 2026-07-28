import { defineConfig } from 'vite';

export default defineConfig({
  // ==========================================
  // 🚨 关键修复：告诉 Vite 你的项目在 GitHub Pages 子路径下！
  // 如果你的仓库名是 FuShengPai，这里必须是 '/FuShengPai/'
  // ==========================================
  base: '/FuShengPai/', 

  // 项目根目录（index.html 所在位置）
  root: '.',

  // 构建输出配置
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    assetsInlineLimit: 0, // 确保资源单独输出，不打包进 JS 里
  },

  // 路径别名：@ 指向 src 目录（如果你在 JS 中用了 import 别名）
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