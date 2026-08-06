import { describe, it, expect } from 'vitest';
import { buildSingleCardShareData } from '../src/share2/share-data.js';

describe('share data contract', () => {
  it('为新模板提供 cardMain 与元素信息', () => {
    const card = { rank: 'A', suit: '♥', isJoker: false };
    const data = buildSingleCardShareData(card, 'career');

    expect(data.cardMain).toMatchObject({
      rank: 'A',
      suit: '♥',
      wx: '火',
    });
    expect(data.cardMain.color).toBeDefined();
    expect(data.element).toBe('火');
    expect(data.keywords.length).toBeGreaterThan(0);
  });
});
