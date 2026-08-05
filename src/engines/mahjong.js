// ===== src/engines/mahjong.js · 麻将引擎（契约实现） =====
// 统一契约：{ id, name, description, inputConfig, calc }
// calc(input) → 纯函数；mode='three' 走 composeReading，mode='daily' 走 composeDailyReading。

import {
  composeReading, composeDailyReading,
  buildWall, drawFromWall,
} from '../mahjong.js';

export const mahjongEngine = {
  id: 'mahjong',
  name: '麻将读牌',
  description: '麻将引擎：摸三张天地人合成读法 / 单张今日手气',
  inputConfig: {
    mode: { type: 'string', default: 'three', label: '读法模式', desc: 'three=摸三张 / daily=今日手气' },
    tiles: { type: 'array', required: true, label: '麻将牌数组', desc: 'mode=three 时必填，取前 3 张' },
    tile: { type: 'object', label: '单张麻将牌', desc: 'mode=daily 时必填' },
  },
  calc(input) {
    const { mode = 'three', tiles, tile } = input || {};
    if (mode === 'daily') {
      return tile ? { mode, reading: composeDailyReading(tile) } : null;
    }
    const ts = Array.isArray(tiles) ? tiles.slice(0, 3) : [];
    return ts.length ? { mode, reading: composeReading(ts) } : null;
  },
};

// 便捷：生成一副新墙并摸 n 张（供抽牌流程复用，纯逻辑）
export function calcMahjongDraw(n = 3) {
  const wall = buildWall();
  const { drawn, wall: rest } = drawFromWall(wall, n);
  return { wall: rest, tiles: drawn };
}
