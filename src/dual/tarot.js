// ===== src/dual/tarot.js · 塔罗 78 张（只做抽牌与牌面记录，不解读）=====
import { chaosShuffleDeck } from '../services/deck.js';

const MAJOR = [
  '愚者', '魔术师', '女祭司', '皇后', '皇帝', '教皇', '恋人', '战车',
  '力量', '隐士', '命运之轮', '正义', '倒吊人', '死神', '节制', '恶魔',
  '高塔', '星星', '月亮', '太阳', '审判', '世界',
];

const SUITS = [
  { key: 'wands', name: '权杖', element: '火' },
  { key: 'cups', name: '圣杯', element: '水' },
  { key: 'swords', name: '宝剑', element: '风' },
  { key: 'pentacles', name: '星币', element: '土' },
];

const RANKS = [
  { key: 'a', name: 'A' }, { key: '2', name: '2' }, { key: '3', name: '3' },
  { key: '4', name: '4' }, { key: '5', name: '5' }, { key: '6', name: '6' },
  { key: '7', name: '7' }, { key: '8', name: '8' }, { key: '9', name: '9' },
  { key: '10', name: '10' }, { key: 'page', name: '侍从' }, { key: 'knight', name: '骑士' },
  { key: 'queen', name: '王后' }, { key: 'king', name: '国王' },
];

function buildDeck() {
  const deck = [];
  MAJOR.forEach((name, i) => {
    deck.push({ deck: 'tarot', id: 'major-' + i, name, arcana: 'major', num: i + 1, label: name });
  });
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({
        deck: 'tarot',
        id: suit.key + '-' + rank.key,
        name: suit.name + rank.name,
        arcana: 'minor',
        suit: suit.key,
        suitName: suit.name,
        element: suit.element,
        rank: rank.name,
        label: suit.name + rank.name,
      });
    }
  }
  return deck;
}

export const TAROT_DECK = buildDeck();
export const TAROT_BY_ID = new Map(TAROT_DECK.map((c) => [c.id, c]));

export const TAROT_SPREADS = {
  three: { key: 'three', name: '三张牌', count: 3, positions: ['当下', '阻碍', '建议'] },
  one: { key: 'one', name: '一张牌', count: 1, positions: ['此刻'] },
};

export function tarotFromVoucher(raw) {
  const base = TAROT_BY_ID.get(raw.i);
  if (!base) return null;
  const orientation = raw.o === -1 ? -1 : 1;
  return { ...base, orientation, orientationLabel: orientation === 1 ? '正位' : '逆位' };
}

/** 客户端抽塔罗：3 张（默认）或 1 张，含正逆位 */
export function drawTarot(count = 3) {
  const shuffled = chaosShuffleDeck(TAROT_DECK);
  return shuffled.slice(0, count).map((card) => {
    let orientation = 1;
    try {
      const buf = new Uint8Array(1);
      crypto.getRandomValues(buf);
      orientation = buf[0] % 2 === 0 ? 1 : -1;
    } catch {}
    return { ...card, orientation, orientationLabel: orientation === 1 ? '正位' : '逆位' };
  });
}

export function withPositions(cards, spreadKey = 'three') {
  const spread = TAROT_SPREADS[spreadKey] || TAROT_SPREADS.three;
  return cards.map((card, i) => ({
    ...card,
    orientationLabel: card.orientationLabel || (card.orientation === -1 ? '逆位' : '正位'),
    position: spread.positions[i] || '',
    positionLabel: spread.positions[i] || '',
  }));
}
