// ===== src/dual/room.js · 对读模式：房间码 / 牌局凭证 / 结构化解读 =====
import { getShengKe } from '../data.js';
import { chaosShuffleDeck } from '../services/deck.js';
import {
  getFriendCircleHook,
  getPaiGeQuestion,
  getPaiGeQuote,
  getFortuneTags,
} from '../texts/social.js';
import { buildDailyOracle } from '../texts/daily-oracle.js';

export const TIERS = {
  A: { key: 'A', name: '只给牌面', desc: '客户只看到两张牌 + 今日宜忌，解读全部由你说。' },
  B: { key: 'B', name: '牌面 + 结构摘要（推荐）', desc: '客户看到牌面、五行、体用关系、关键词和一句提醒，不抢你的解读。' },
  C: { key: 'C', name: '完整结构解读', desc: '客户看到完整结构化解读，适合想彻底透明、以专业取胜的占卜师。' },
};

const SUIT_NAME = { '♠': '黑桃', '♥': '红桃', '♣': '梅花', '♦': '方块' };
const SUIT_WX = { '♥': '火', '♦': '金', '♣': '木', '♠': '水' };
const SUITS = ['♠', '♥', '♣', '♦'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function buildDeck() {
  const deck = [];
  for (const suit of SUITS) for (const rank of RANKS) deck.push({ suit, rank });
  deck.push({ isJoker: true, type: '大王' });
  deck.push({ isJoker: true, type: '小王' });
  return deck;
}

/** 客户在客户端自己抽两张（真随机，占卜师无法影响） */
export function drawTwoCards() {
  const deck = chaosShuffleDeck(buildDeck());
  return [deck[0], deck[1]];
}

export function cardName(card) {
  if (!card) return '—';
  return card.isJoker ? card.type : `${SUIT_NAME[card.suit] || ''}${card.rank}`;
}

export function cardWx(card) {
  if (!card) return '土';
  if (card.isJoker) return card.type === '大王' ? '天' : '人';
  return SUIT_WX[card.suit] || '土';
}

export function cardColor(card) {
  if (!card) return 'black';
  if (card.isJoker) return card.type === '大王' ? 'red' : 'black';
  return card.suit === '♥' || card.suit === '♦' ? 'red' : 'black';
}

function hashText(s) {
  let h = 0x811c9dc5;
  for (const ch of String(s)) {
    h ^= ch.charCodeAt(0);
    h = (h * 0x01000193) >>> 0;
  }
  return h;
}

function fingerprintOf(obj) {
  const s = JSON.stringify(obj);
  return `FS-${hashText(s).toString(16).padStart(8, '0').toUpperCase()}`;
}

function b64url(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function unb64url(code) {
  const pad = code.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(pad + '='.repeat((4 - (pad.length % 4)) % 4));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodeRoom(room) {
  return b64url(JSON.stringify(room));
}

export function decodeRoom(code) {
  try {
    const obj = JSON.parse(unb64url(code));
    if (obj && obj.k === 'room') return obj;
  } catch {}
  return null;
}

export function makeRoom({ hostName, brand, contact, tier = 'B', area = '综合', note = '' }) {
  const room = {
    v: 1,
    k: 'room',
    host: { name: hostName || '未命名占卜师', brand: brand || hostName || '浮生牌', contact: contact || '' },
    tier: TIERS[tier] ? tier : 'B',
    area: area || '综合',
    date: todayStr(),
    note: note || '',
  };
  room.code = encodeRoom(room);
  return room;
}

/** 客户凭证：包含房间、两张牌、客户的问题、抽取时间 */
export function makeVoucher(roomCode, cards, question = '') {
  const room = decodeRoom(roomCode);
  const payload = {
    v: 1,
    k: 'voucher',
    rc: roomCode,
    cards: cards.map((c) => (c.isJoker ? { j: c.type } : { s: c.suit, r: c.rank })),
    q: String(question || '').slice(0, 60),
    ts: Date.now(),
  };
  payload.fp = fingerprintOf({ room: roomCode, cards: payload.cards, q: payload.q });
  return payload;
}

export function encodeVoucher(voucher) {
  return b64url(JSON.stringify(voucher));
}

export function decodeVoucher(code) {
  try {
    const obj = JSON.parse(unb64url(code));
    if (obj && obj.k === 'voucher') return obj;
  } catch {}
  return null;
}

export function cardsFromVoucher(voucher) {
  return (voucher.cards || []).map((c) => (c.j ? { isJoker: true, type: c.j } : { suit: c.s, rank: c.r }));
}

/** 由房间 + 两张牌构建结构化解读（确定性：同一凭证永远得到同一份结果） */
export function buildReading(room, cards) {
  const [ti, yong] = cards;
  const dateStr = room?.date || todayStr();
  const tiWx = cardWx(ti);
  const yongWx = cardWx(yong);
  const relation = getShengKe(tiWx, yongWx) || '未知';
  const hook = getFriendCircleHook(ti, dateStr) || {};
  const paige = getPaiGeQuestion(ti) || {};
  const quote = getPaiGeQuote(ti, dateStr) || {};
  const tags = getFortuneTags(ti, 'overall', dateStr) || [];
  const oracle = buildDailyOracle({ wx: tiWx, dateStr }) || {};
  return {
    dateStr,
    cards: [
      { ...ti, name: cardName(ti), wx: tiWx, color: cardColor(ti), role: '体' },
      { ...yong, name: cardName(yong), wx: yongWx, color: cardColor(yong), role: '用' },
    ],
    tiWx,
    yongWx,
    relation,
    hook,
    paige,
    quote,
    tags,
    oracle,
    fingerprint: fingerprintOf({
      room: room?.code || '',
      cards: cards.map((c) => (c.isJoker ? c.type : `${c.suit}${c.rank}`)),
      dateStr,
    }),
  };
}

/** 按档位裁剪客户可见内容 */
export function visibleForTier(reading, tier) {
  const base = {
    cards: reading.cards,
    yi: reading.oracle.yi || [],
    ji: reading.oracle.ji || [],
    line: reading.hook.line || '',
  };
  if (tier === 'A') return base;
  const mid = {
    ...base,
    relation: reading.relation,
    keywords: reading.paige.keywords || reading.tags || [],
    quote: reading.quote.text || '',
    topic: reading.hook.title || '',
    mood: reading.oracle.mood?.title || '',
  };
  if (tier === 'B') return mid;
  return {
    ...mid,
    points: [
      reading.paige.question || '',
      reading.hook.title ? `今日课题：${reading.hook.title}` : '',
      reading.quote.text ? `牌灵说：${reading.quote.text}` : '',
      reading.oracle.jiangchu ? `建除：${reading.oracle.jiangchu}` : '',
      reading.oracle.chong ? `冲煞：${reading.oracle.chong}` : '',
    ].filter(Boolean),
  };
}

/** 给占卜师复制的对读回执文本 */
export function buildReceiptText(room, voucher, reading, hostNote = '') {
  const v = visibleForTier(reading, 'C');
  const lines = [
    `【浮生牌 · 对读回执】凭证 ${voucher.fp}`,
    `占卜师：${room.host?.name || ''}${room.host?.contact ? `（${room.host.contact}）` : ''}`,
    `时间：${new Date(voucher.ts).toLocaleString('zh-CN')} · 领域：${room.area || '综合'}`,
    '',
    '【牌面】（由客户本人在自己手机上抽出）',
    `${reading.cards[0].name}（${reading.cards[0].wx}）· 体`,
    `${reading.cards[1].name}（${reading.cards[1].wx}）· 用`,
    `体用关系：${reading.relation}`,
    '',
    `【今日宜忌】宜：${v.yi.join('、') || '—'} ｜ 忌：${v.ji.join('、') || '—'}`,
    `【今日课题】${reading.hook.title || '—'}`,
    `【关键提醒】${reading.hook.line || '—'}`,
    '',
    `【占卜师解读】`,
    hostNote || '（在这里写你的解读）',
    '',
    '本回执仅用于本次对读的过程见证，不构成任何预测或决策建议。',
  ];
  return lines.join('\n');
}

