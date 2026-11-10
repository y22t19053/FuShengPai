import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  normalizeAskKey, getAskLog, recordAsk, clearAskLog, checkRepeatAsk,
  isTimingQuestion, answerTimingQuestion, repeatPreamble, REPEAT_WINDOW_DAYS
} from '../src/services/repeat-ask.js';
import { offlineFollowUpText } from '../src/services/offline-answer.js';

const DAY = 24 * 60 * 60 * 1000;

beforeEach(() => {
  clearAskLog();
});

describe('问句归一', () => {
  it('标点、空白、语气词不影响比对', () => {
    expect(normalizeAskKey('这周这份方案能不能过？')).toBe('这周这份方案能不能过');
    expect(normalizeAskKey('  这周 这份方案能不能过  ')).toBe('这周这份方案能不能过');
    expect(normalizeAskKey('请问他还会回来吗')).toBe('他还会回来');
  });

  it('不同的事不会撞成一个键', () => {
    expect(normalizeAskKey('这周方案能不能过')).not.toBe(normalizeAskKey('这周能不能加薪'));
  });

  it('空问句返回空键', () => {
    expect(normalizeAskKey('')).toBe('');
    expect(normalizeAskKey('   ')).toBe('');
  });
});

describe('重复提问：算账', () => {
  it('第一次问不算重复；问过之后同一件事七天内算重复', () => {
    const now = Date.now();
    expect(checkRepeatAsk('这周方案能不能过', now).repeat).toBe(false);
    recordAsk('这周方案能不能过', now);
    const rp = checkRepeatAsk('这周方案能不能过', now + DAY);
    expect(rp.repeat).toBe(true);
    expect(rp.tier).toBe('first');
    expect(rp.daysAgo).toBe(1);
    expect(rp.nextAskText).toContain('天');
  });

  it('越问越硬：第二次、第三次换口径', () => {
    const now = Date.now();
    recordAsk('要不要换工作', now);
    recordAsk('要不要换工作', now);
    expect(checkRepeatAsk('要不要换工作', now).tier).toBe('second');
    recordAsk('要不要换工作', now);
    expect(checkRepeatAsk('要不要换工作', now).tier).toBe('third');
  });

  it('过了观察窗口就不再拦', () => {
    const now = Date.now();
    recordAsk('今年的财运', now);
    const later = now + (REPEAT_WINDOW_DAYS + 1) * DAY;
    expect(checkRepeatAsk('今年的财运', later).repeat).toBe(false);
  });

  it('日志不会无限长', () => {
    const now = Date.now();
    for (let i = 0; i < 200; i += 1) recordAsk(`第${i}个问题`, now);
    expect(getAskLog().length).toBeLessThanOrEqual(120);
  });
});

describe('重复提问：话术', () => {
  it('开场提示只在重复时出现', () => {
    const now = Date.now();
    expect(repeatPreamble('明天会不会下雨影响到我', now)).toBe('');
    recordAsk('明天会不会下雨影响到我', now);
    const note = repeatPreamble('明天会不会下雨影响到我', now);
    expect(note).toContain('问过');
    expect(note).toContain('局面');
  });
});

describe('「换个时间点再问」答得了', () => {
  it('认得出是在问时间', () => {
    expect(isTimingQuestion('过几天再问一次可以吗')).toBe(true);
    expect(isTimingQuestion('隔多久能再问')).toBe(true);
    expect(isTimingQuestion('他还会回来吗')).toBe(false);
  });

  it('没有记录时给规则，不编具体日子', () => {
    const text = answerTimingQuestion('要不要换工作');
    expect(text).toContain('十天');
  });

  it('追问这条问题不落到"平均值"那句上', () => {
    const now = Date.now();
    const text = offlineFollowUpText('过几天再问一次行不行', { origin: '要不要换工作' });
    expect(text).not.toContain('平均值');
    expect(text).toContain('再问');
  });
});

describe('接入九宫解读', () => {
  it('重复提问会在正文开头提醒，但仍给解读', async () => {
    const { buildLocalReading } = await import('../src/services/readings.js');
    const card = (suit, rank) => ({ suit, rank, isJoker: false });
    const makeState = () => ({
      ti: card('♥', 10), yong: card('♠', 7),
      question: '这周这份方案能不能过？', category: '事业', subCategory: '',
      grid: { 1: [card('♣', 3)], 5: [card('♦', 9)], 9: [card('♥', 8)] },
      gongOrder: [1, 5, 9], line: [1, 5, 9], lineOrder: {},
    });
    const first = await buildLocalReading(makeState());
    expect(first.text).not.toContain('问过一次');
    expect(first.text).toContain('今天能做的一步');
    const second = await buildLocalReading(makeState());
    expect(second.text).toContain('问过');
  });
});
