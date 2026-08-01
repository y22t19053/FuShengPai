// ===== vite.config.js =====
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: { host: true, port: 5173 },
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0
  },
  test: {
    include: ['**/*.test.js'],
    environment: 'node'
  }
});