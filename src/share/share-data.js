// ===== src/share/share-data.js · 分享数据层（解耦页面状态与分享模板） =====
import { state } from '../state.js';
import { getWuxing, getShengKe, getCardColor, getCardValue, GONG_ORDER, GONG_NAMES } from '../data.js';
import { buildShareFingerprint } from './fingerprint.js';
import {
  getFriendCircleHook,
  getFortuneTags,
  getSocialTopic,
  getPaiGeQuestion,
  getPaiGeQuote,
} from '../texts/social.js';
import { buildDailyOracle } from '../texts/daily-oracle.js';

// 本地日期（YYYY-MM-DD，补零）：日运/牌灵的「今日」按用户本地时区算
function localDateStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// 牌面→安全 cardMain 对象（不存在时返回 null，模板负责兜底）
function buildCardMain(card) {
  if (!card) return null;
  const wx = getWuxing(card);
  return {
    rank: card.isJoker ? card.type : card.rank,
    suit: card.isJoker ? '' : card.suit,
    wx,
    color: getCardColor(card),
  };
}

// 从当前牌局状态构建分享数据
export function buildShareData(resultText = '') {
  const tiCard = state.ti || null;
  const tiWx = getWuxing(tiCard);
  const yongCard = state.yong || null;
  const yongWx = yongCard ? getWuxing(yongCard) : null;
  const dateStr = localDateStr();
  const hook = getFriendCircleHook(tiCard, dateStr);

  // 天机线（三宫直线，转为宫名以匹配 gridSummary）
  const lineInfo = (state.line && state.line.length === 3)
    ? state.line.map(g => GONG_NAMES[g] + '宫')
    : null;
  // 各宫落牌摘要（最多 6 宫，含五行与生克）
  const gridSummary = GONG_ORDER
    .filter(g => (state.grid[g] || []).length)
    .slice(0, 6)
    .map(g => {
      const card = (state.grid[g] || [])[0];
      return {
        gong: GONG_NAMES[g] + '宫',
        cardMain: buildCardMain(card),
        rel: getShengKe(tiWx, getWuxing(card)) || null,
      };
    });

  const data = {
    type: 'divination',
    title: hook.title || '观牌知势',
    line: hook.line || '这不是预测，这是一次观察。',
    cardMain: buildCardMain(tiCard),
    yongMain: buildCardMain(yongCard),
    element: tiWx,
    relation: state.ti && state.yong ? getShengKe(tiWx, yongWx) || '未知' : null,
    durian: Number(state.durianIndex?.score) || 0,
    keywords: [],
    quote: '',
    tags: hook.tags || [],
    topic: getSocialTopic(tiCard, 'overall', dateStr),
    fingerprint: buildShareFingerprint(state.deck || [], state.uid ? String(state.uid) : ''),
    timestamp: Date.now(),
    dateText: new Date().toISOString().slice(0, 10),
    lineInfo,
    gridSummary,
    body: resultText || state.pendingFullReport || '',
  };

  // 关键词（从解读文本中提取）
  const keywords = extractKeywords(resultText || state.pendingFullReport || '');
  data.keywords = keywords.length ? keywords.slice(0, 3) : (hook.tags || []).slice(0, 3);

  // 引语（解读第一句，情绪金句留给 line 字段）
  data.quote = extractFirstSentence(resultText || state.pendingFullReport || '') || hook.line;

  return data;
}

// 构建单牌分享数据（日运/牌灵）
export function buildSingleCardShareData(card, fortuneType = 'overall') {
  const cardMain = buildCardMain(card);
  const wx = cardMain ? cardMain.wx : '土';
  const dateStr = localDateStr();
  const hook = getFriendCircleHook(card, dateStr);
  const paige = card ? getPaiGeQuestion(card) : null;

  return {
    type: 'single',
    card: cardMain,
    cardMain,
    element: wx,
    relation: null,
    durian: 0,
    keywords: (paige?.keywords?.length ? paige.keywords : hook.tags || []).slice(0, 3),
    // getPaiGeQuote 返回 {text, author}，这里只取文字部分，保证模板拿到字符串
    quote: card ? (getPaiGeQuote(card, dateStr)?.text || '') : hook.line,
    title: hook.title,
    line: hook.line,
    // 牌灵课题原文（arcana 模板优先使用：课题标题 + 课题正文）
    paige: paige ? {
      title: paige.title || hook.title,
      question: paige.question || hook.line,
    } : null,
    tags: getFortuneTags(card, fortuneType, dateStr),
    topic: getSocialTopic(card, fortuneType, dateStr),
    fortuneType,
    // 赛博黄历：宜/忌/建除/冲煞/五行基调，按当日确定性取（日运分享图模板消费）
    oracle: buildDailyOracle({ wx, dateStr }),
    fingerprint: buildShareFingerprint(card ? [card] : [], String(Date.now())),
    timestamp: Date.now(),
    dateText: dateStr,
  };
}

// 从解读文本中提取第一句
function extractFirstSentence(text) {
  if (!text) return '';
  const match = text.match(/[^。！？\n]+[。！？]?/);
  return match ? match[0].trim() : '';
}

// 简单关键词提取（2-4字词）
function extractKeywords(text) {
  if (!text) return [];
  const normalized = text.replace(/[^\u4e00-\u9fa5]/g, ' ');
  const tokens = normalized.split(/\s+/).filter(t => t.length >= 2 && t.length <= 4);
  return [...new Set(tokens)].slice(0, 6);
}