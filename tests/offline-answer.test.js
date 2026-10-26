import { describe, it, expect } from 'vitest';
import { offlineFollowUpText, withOfflineNote, OFFLINE_NOTE } from '../src/services/offline-answer.js';

describe('没接 AI 时的兜底答复', () => {
  it('问题笼统时，先把「会被读成平均值」这件事说清楚', () => {
    const out = offlineFollowUpText('我最近运气怎么样', { field: 'work' });
    expect(out).toContain('平均值');
    expect(out).toContain('· ');
    expect(out).toContain(OFFLINE_NOTE);
  });

  it('两条路放进一个问题，会被点出来', () => {
    const out = offlineFollowUpText('我走A还是走B');
    expect(out).toContain('两条路');
    expect(out).not.toContain('[object Object]');
  });

  it('问题够具体时，不硬挑毛病，直接给一句收尾', () => {
    const out = offlineFollowUpText('未来三个月我能不能拿到那份 offer', { field: 'work' });
    expect(out).not.toContain('平均值');
    expect(out).toContain(OFFLINE_NOTE);
    expect(out.split('\n').filter(Boolean).length).toBeGreaterThan(1);
  });

  it('空问题、空字段都不会炸', () => {
    expect(() => offlineFollowUpText('')).not.toThrow();
    expect(offlineFollowUpText('').length).toBeGreaterThan(10);
    expect(offlineFollowUpText('随便问问', { field: '' }).length).toBeGreaterThan(10);
  });

  it('同一次解读的说明只补一次', () => {
    const once = withOfflineNote('牌面是这样。');
    expect(once).toBe(`牌面是这样。\n${OFFLINE_NOTE}`);
    expect(withOfflineNote(once)).toBe(once);
    expect(withOfflineNote('')).toBe(OFFLINE_NOTE);
  });
});
