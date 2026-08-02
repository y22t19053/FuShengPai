// ===== tests/durian.test.js · 张力指数可视化 =====
import { describe, it, expect } from 'vitest';
import { getDurianColor } from '../src/durian.js';

describe('durian color', () => {
  it('getDurianColor is stable per band', () => {
    expect(getDurianColor(2)).toBe('#4CAF50');
    expect(getDurianColor(4.9)).toBe('#8BC34A');
    expect(getDurianColor(8)).toBe('#FF9800');
    expect(getDurianColor(9.5)).toBe('#F44336');
  });
});
