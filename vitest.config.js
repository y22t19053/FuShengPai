// ===== vitest.config.js · 测试配置（修复：扫描所有 .test.js，不再只扫描 tests/） =====
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['**/*.test.js'],
    environment: 'node'
  }
});