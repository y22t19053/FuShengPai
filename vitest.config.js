// ===== vitest.config.js · 测试配置（只跑 tests/，排除归档与构建产物） =====
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.js'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/release/**', '**/_history/**', '**/_backup/**'],
    environment: 'node'
  }
});