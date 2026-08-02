import { describe, it, expect } from 'vitest';
import { syncQuestionFromInput, createPeriodShareAction } from '../src/utils/flow-helpers.js';

describe('question flow helpers', () => {
  it('把输入框内容同步到共享状态', () => {
    const state = { question: '旧问题' };
    const input = { value: '新问题' };

    const next = syncQuestionFromInput(input, state);

    expect(next).toBe('新问题');
    expect(state.question).toBe('新问题');
  });

  it('为空时保留已有问题，避免丢失上下文', () => {
    const state = { question: '旧问题' };
    const input = { value: '   ' };

    expect(syncQuestionFromInput(input, state)).toBe('旧问题');
  });
});

describe('period share helpers', () => {
  it('为周期牌分享构造正确的动作参数', () => {
    const state = {
      periodType: 'daily',
      periodKey: '2024-01-01',
      periodCard: { suit: '♥', rank: 'A' },
      fortuneType: 'career'
    };

    const action = createPeriodShareAction(state, { fortuneType: 'career' });

    expect(action.type).toBe('daily');
    expect(action.fortuneType).toBe('career');
    expect(action.card).toEqual({ suit: '♥', rank: 'A' });
  });
});
