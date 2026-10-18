// ===== src/dual/receipt-html.js · 对读回执海报（纯 HTML 生成，无 DOM 副作用）=====
import { getPaper, FONT_SANS } from '../share2/style.js';
import { pokerCardHTML } from '../share2/templates/cards.js';
import { qrSVGHTML } from '../utils/qr.js';

const W = 1080;
const H = 1440;
const M = 76;

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function fmtTime(ts) {
  try { return new Date(ts).toLocaleString('zh-CN', { hour12: false }); } catch { return ''; }
}

/**
 * 生成对读回执海报 HTML（1080×1440）
 * @param {{room:object, voucher:object, reading:object, hostNote?:string, anchor?:object, pro?:boolean, variant?:'host'|'sitter'}} data
 */
export function renderReceiptHTML({ room, voucher, reading, hostNote = '', anchor = null, pro = false, variant = 'host' }) {
  const p = getPaper().light;
  if (reading.deck === 'tarot') {
    return renderTarotReceipt({ room, voucher, reading, hostNote, anchor, pro, variant, p });
  }
  const cards = reading.cards;
  const yongCard = cards[1] || cards[0];
  const cardSize = 300;
  const cardHTML = (card) => pokerCardHTML(card, {
    size: cardSize,
    paper: p.paper,
    red: p.red,
    ink: p.ink,
    border: p.border,
    shadow: p.cardShadow,
    font: FONT_SANS,
  });
  const qrTarget = room.link || 'https://y22t19053.github.io/FuShengPai/';
  const qr = qrSVGHTML(qrTarget, { size: 160, dark: p.goldDeep, light: '#FFFFFF' });
  const anchorLine = anchor?.mode === 'server'
    ? `时间锚定：${anchor.id || '已公证'} · ${fmtTime(anchor.anchored_at)}`
    : `时间锚定：本地记录 · ${fmtTime(voucher.ts)}`;
  const brandFoot = pro
    ? `${esc(room.host?.brand || room.host?.name || '浮生牌')} · 由浮生牌提供技术支持`
    : `浮生牌 · 对读模式 · ${esc(room.host?.brand || room.host?.name || '')}`;
  const noteText = hostNote || '（占卜师解读留白：此处应由占卜师补充人的部分）';
  const yi = (reading.oracle?.yi || []).join('、') || '—';
  const ji = (reading.oracle?.ji || []).join('、') || '—';

  return `
  <div style="width:${W}px;height:${H}px;position:relative;overflow:hidden;font-family:${FONT_SANS};background:
      radial-gradient(circle at 18% 8%, rgba(255,255,255,0.5), transparent 34%),
      radial-gradient(circle at 88% 92%, ${p.gold}12, transparent 40%),
      linear-gradient(158deg, ${p.bg0} 0%, ${p.bg1} 58%, ${p.bg2} 100%);">
    <div style="position:absolute;left:26px;top:26px;right:26px;bottom:26px;border:2.4px solid ${p.border};border-radius:30px;"></div>

    <!-- 品牌栏 -->
    <div style="position:absolute;left:${M}px;top:54px;color:${p.inkDim};font-size:23px;font-weight:700;">${esc(room.host?.brand || '浮生牌')} · <span style="color:${p.goldDeep}">对读回执</span></div>
    <div style="position:absolute;right:${M}px;top:56px;color:${p.inkFaint};font-size:18px;font-family:ui-monospace,Menlo,monospace;">${esc(voucher.fp)}</div>

    <!-- 标题 -->
    <div style="position:absolute;left:0;right:0;top:118px;text-align:center;color:${p.goldDeep};font-size:22px;letter-spacing:12px;">本 次 牌 局</div>
    <div style="position:absolute;left:0;right:0;top:158px;text-align:center;color:${p.ink};font-size:54px;font-weight:800;letter-spacing:2px;">牌是${variant === 'sitter' ? '你自己抽的' : '她亲手抽的'}</div>
    <div style="position:absolute;left:0;right:0;top:228px;text-align:center;color:${p.inkDim};font-size:19px;">${esc(reading.dateStr)} · ${esc(room.area || '综合')} · ${voucher.q ? '问题已记录' : '未填写问题'}</div>

    <!-- 两张牌 -->
    <div style="position:absolute;left:0;right:0;top:272px;display:flex;justify-content:center;align-items:flex-start;gap:44px;">
      <div style="text-align:center;">
        ${cardHTML(cards[0])}
        <div style="margin-top:14px;color:${p.inkDim};font-size:20px;"><span style="color:${p.goldDeep};font-weight:700;">体</span> · ${esc(cards[0].name)} · ${esc(cards[0].wx)}行</div>
      </div>
      <div style="text-align:center;">
        ${cardHTML(yongCard)}
        <div style="margin-top:14px;color:${p.inkDim};font-size:20px;"><span style="color:${p.goldDeep};font-weight:700;">用</span> · ${esc(yongCard.name)} · ${esc(yongCard.wx)}行</div>
      </div>
    </div>

    <!-- 结构事实 -->
    <div style="position:absolute;left:${M}px;right:${M}px;top:840px;display:flex;gap:18px;">
      <div style="flex:1;border:1px solid ${p.border};border-radius:16px;padding:14px 18px;background:${p.pillBg};">
        <div style="color:${p.inkFaint};font-size:15px;letter-spacing:1px;">体用关系</div>
        <div style="color:${p.ink};font-size:30px;font-weight:800;margin-top:4px;">${esc(reading.relation)}</div>
      </div>
      <div style="flex:1.5;border:1px solid ${p.border};border-radius:16px;padding:14px 18px;">
        <div style="color:${p.inkFaint};font-size:15px;letter-spacing:1px;">今日宜 / 忌</div>
        <div style="color:${p.ink};font-size:19px;margin-top:6px;line-height:1.5;">宜：${esc(yi)}<br />忌：${esc(ji)}</div>
      </div>
    </div>

    <!-- 占卜师解读 -->
    <div style="position:absolute;left:${M}px;right:${M}px;top:1010px;bottom:210px;border-left:5px solid ${p.red};padding:6px 0 6px 20px;">
      <div style="color:${p.red};font-size:17px;font-weight:700;letter-spacing:2px;">占卜师解读</div>
      <div style="margin-top:10px;color:${p.ink};font-size:23px;line-height:1.65;max-height:150px;overflow:hidden;">${esc(noteText)}</div>
    </div>

    <!-- 底部 -->
    <div style="position:absolute;left:${M}px;bottom:52px;right:${M}px;display:flex;justify-content:space-between;align-items:flex-end;">
      <div>
        <div style="color:${p.goldDeep};font-size:19px;font-weight:700;">${anchorLine}</div>
        <div style="color:${p.inkFaint};font-size:15px;margin-top:8px;">牌由客户在自己设备上抽出 · 双方各持一份 · 可复现可核对</div>
        <div style="color:${p.inkFaint};font-size:13px;margin-top:6px;max-width:600px;line-height:1.5;">${esc(brandFoot)} · 本回执仅用于本次对读的过程见证，不构成任何预测或决策建议。</div>
      </div>
      <div style="text-align:center;">
        <div style="background:#fff;border-radius:12px;padding:8px;border:1px solid ${p.line};">${qr}</div>
        <div style="color:${p.inkFaint};font-size:13px;margin-top:6px;">扫码 · 观牌知势</div>
      </div>
    </div>
  </div>`;
}

export { W, H };

/* ---------- 塔罗回执（不解读，只记录牌面） ---------- */
function tarotTile(card, p, width = 232) {
  return `
    <div style="width:${width}px;text-align:center;">
      <div style="color:${p.goldDeep};font-size:16px;letter-spacing:4px;margin-bottom:10px;">${esc(card.positionLabel || '')}</div>
      <div style="height:300px;border-radius:16px;border:1.6px solid ${p.border};background:${p.paper};
          display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:14px;
          box-shadow:0 10px 24px rgba(58,52,37,0.12);">
        <div style="font-size:15px;color:${p.inkFaint};letter-spacing:2px;">${esc(card.arcana === 'major' ? '大阿卡纳' : (card.suitName || '小阿卡纳'))}</div>
        <div style="font-size:34px;font-weight:800;color:${p.ink};line-height:1.25;">${esc(card.name)}</div>
        <div style="font-size:16px;color:${p.goldDeep};border:1px solid ${p.border};border-radius:999px;padding:3px 12px;">${esc(card.orientationLabel)}</div>
      </div>
    </div>`;
}

function renderTarotReceipt({ room, voucher, reading, hostNote, anchor, pro, variant, p }) {
  const qrTarget = room.link || 'https://y22t19053.github.io/FuShengPai/';
  const qr = qrSVGHTML(qrTarget, { size: 160, dark: p.goldDeep, light: '#FFFFFF' });
  const anchorLine = anchor?.mode === 'server'
    ? `时间锚定：${anchor.id || '已公证'} · ${fmtTime(anchor.anchored_at)}`
    : `时间锚定：本地记录 · ${fmtTime(voucher.ts)}`;
  const brandFoot = pro
    ? `${esc(room.host?.brand || room.host?.name || '浮生牌')} · 由浮生牌提供技术支持`
    : `浮生牌 · 对读模式 · ${esc(room.host?.brand || room.host?.name || '')}`;
  const noteText = hostNote || '（解读留白：这一段由占卜师来写）';

  return `
  <div style="width:${W}px;height:${H}px;position:relative;overflow:hidden;font-family:${FONT_SANS};background:
      radial-gradient(circle at 18% 8%, rgba(255,255,255,0.5), transparent 34%),
      radial-gradient(circle at 88% 92%, ${p.gold}12, transparent 40%),
      linear-gradient(158deg, ${p.bg0} 0%, ${p.bg1} 58%, ${p.bg2} 100%);">
    <div style="position:absolute;left:26px;top:26px;right:26px;bottom:26px;border:2.4px solid ${p.border};border-radius:30px;"></div>

    <div style="position:absolute;left:${M}px;top:54px;color:${p.inkDim};font-size:23px;font-weight:700;">${esc(room.host?.brand || '浮生牌')} · <span style="color:${p.goldDeep}">对读回执</span></div>
    <div style="position:absolute;right:${M}px;top:56px;color:${p.inkFaint};font-size:18px;font-family:ui-monospace,Menlo,monospace;">${esc(voucher.fp)}</div>

    <div style="position:absolute;left:0;right:0;top:116px;text-align:center;color:${p.goldDeep};font-size:22px;letter-spacing:12px;">本 次 牌 局</div>
    <div style="position:absolute;left:0;right:0;top:156px;text-align:center;color:${p.ink};font-size:52px;font-weight:800;">牌是${variant === 'sitter' ? '你自己抽的' : '她亲手抽的'}</div>
    <div style="position:absolute;left:0;right:0;top:226px;text-align:center;color:${p.inkDim};font-size:19px;">塔罗 · ${esc(reading.dateStr)} · ${esc(room.area || '综合')}</div>

    <div style="position:absolute;left:${M}px;right:${M}px;top:280px;display:flex;justify-content:center;gap:22px;">
      ${reading.cards.map((c) => tarotTile(c, p)).join('')}
    </div>

    ${voucher.q ? `<div style="position:absolute;left:${M}px;right:${M}px;top:660px;text-align:center;color:${p.inkDim};font-size:19px;">她问的是：${esc(voucher.q)}</div>` : ''}

    <div style="position:absolute;left:${M}px;right:${M}px;top:720px;bottom:216px;border-left:5px solid ${p.red};padding:6px 0 6px 20px;">
      <div style="color:${p.red};font-size:17px;font-weight:700;letter-spacing:2px;">占卜师解读</div>
      <div style="margin-top:10px;color:${p.ink};font-size:23px;line-height:1.65;max-height:220px;overflow:hidden;">${esc(noteText)}</div>
    </div>

    <div style="position:absolute;left:${M}px;bottom:52px;right:${M}px;display:flex;justify-content:space-between;align-items:flex-end;">
      <div>
        <div style="color:${p.goldDeep};font-size:19px;font-weight:700;">${anchorLine}</div>
        <div style="color:${p.inkFaint};font-size:15px;margin-top:8px;">牌由客户在自己设备上抽出 · 双方各持一份 · 可复现可核对</div>
        <div style="color:${p.inkFaint};font-size:13px;margin-top:6px;max-width:600px;line-height:1.5;">${esc(brandFoot)} · 本回执仅用于本次对读的过程见证，不构成任何预测或决策建议。</div>
      </div>
      <div style="text-align:center;">
        <div style="background:#fff;border-radius:12px;padding:8px;border:1px solid ${p.line};">${qr}</div>
        <div style="color:${p.inkFaint};font-size:13px;margin-top:6px;">扫码 · 观牌知势</div>
      </div>
    </div>
  </div>`;
}
