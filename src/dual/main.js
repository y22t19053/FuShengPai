// ===== src/dual/main.js · 对读模式：占卜师版落地页 / 建房 / 验证凭证 / 客户端抽牌 =====
import { qrSVGHTML } from '../utils/qr.js';
import {
  TIERS, makeRoom, decodeRoom, drawTwoCards, makeVoucher, encodeVoucher,
  decodeVoucher, cardsFromVoucher, buildReading, visibleForTier,
  buildReceiptText, cardName, todayStr,
} from './room.js';

const app = document.getElementById('dualApp');
const params = new URLSearchParams(location.search);
const ROOM_KEY = 'fsp_dual_rooms';

/* ---------------- 小工具 ---------------- */
function toast(msg) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => el.classList.remove('show'), 1800);
  setTimeout(() => el.remove(), 2300);
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast('已复制');
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); toast('已复制'); } catch { toast('复制失败，请手动选择'); }
    ta.remove();
  }
}

function loadRooms() {
  try { return JSON.parse(localStorage.getItem(ROOM_KEY) || '[]'); } catch { return []; }
}
function saveRoom(room) {
  const list = loadRooms().filter((r) => r.code !== room.code);
  list.unshift({ code: room.code, name: room.host.name, brand: room.host.brand, tier: room.tier, date: room.date });
  localStorage.setItem(ROOM_KEY, JSON.stringify(list.slice(0, 30)));
}

function cardHTML(card, role) {
  const color = card.color === 'red' ? 'red' : 'black';
  return `<div style="text-align:center">
    <div class="card-face ${color}">
      <div class="corner"><div class="r">${card.isJoker ? '' : card.rank}</div><div class="s">${card.isJoker ? '' : card.suit}</div></div>
      <div class="pip">${card.isJoker ? (card.type === '大王' ? '🃏' : '🃏') : card.suit}</div>
      <div class="corner" style="top:auto;bottom:8px;left:auto;right:10px;transform:rotate(180deg)"><div class="r">${card.isJoker ? '' : card.rank}</div><div class="s">${card.isJoker ? '' : card.suit}</div></div>
    </div>
    <div style="margin-top:8px;font-size:0.78rem;color:var(--dim)">
      <span class="pill">${role}</span>
      <div style="margin-top:4px;font-weight:700">${card.isJoker ? card.type : cardName(card)} · ${card.wx}行</div>
    </div>
  </div>`;
}

function tierContentHTML(reading, tier) {
  const v = visibleForTier(reading, tier);
  const topic = String(v.topic || '').replace(/^今日课题[：:]\s*/, '');
  const facts = [];
  if (tier !== 'A') {
    facts.push(`<div class="fact"><b>体用关系</b><span>${reading.relation}</span></div>`);
    if (v.mood) facts.push(`<div class="fact"><b>今日基调</b><span>${v.mood}</span></div>`);
  }
  const html = [facts.length ? `<div class="facts">${facts.join('')}</div>` : ''];
  html.push(`<div style="margin-top:6px;font-size:0.85rem;line-height:1.9;color:var(--dim)">
    <b style="color:var(--ink)">今日宜：</b>${v.yi.join('、') || '—'}<br />
    <b style="color:var(--ink)">今日忌：</b>${v.ji.join('、') || '—'}
  </div>`);
  if (tier !== 'A') {
    html.push(`<div style="margin-top:12px;font-size:0.88rem;line-height:1.9">
      <b>今日课题：</b>${topic || '—'}<br />
      <b>一句提醒：</b>「${v.line || '—'}」
      ${v.quote ? `<br /><b>牌灵说：</b>「${v.quote}」` : ''}
      ${(v.keywords || []).length ? `<div style="margin-top:10px">${v.keywords.map((k) => `<span class="pill" style="margin-right:6px">${k}</span>`).join('')}</div>` : ''}
    </div>`);
  }
  if (tier === 'C' && v.points?.length) {
    html.push(`<div style="margin-top:12px;font-size:0.84rem;line-height:1.9;color:var(--dim)">
      <b style="color:var(--ink)">结构化解读（由站点引擎给出，占卜师不可修改）：</b>
      <ul style="margin:8px 0 0;padding-left:18px">${v.points.map((p) => `<li>${p}</li>`).join('')}</ul>
    </div>`);
  }
  return html.join('');
}

/* ---------------- 占卜师端（默认页） ---------------- */
function renderHost() {
  const saved = loadRooms();
  app.innerHTML = `
  <header class="site-header">
    <div class="logo">浮生牌 <em>· 对读模式</em></div>
    <nav>
      <a href="./index.html">用牌首页</a>
      <a href="#builder">建房</a>
      <a href="#pricing">开通</a>
      <a href="https://github.com/y22t19053/FuShengPai" target="_blank" rel="noopener">开源</a>
    </nav>
  </header>

  <main class="wrap">
    <section class="hero">
      <span class="badge">FOR READERS · 占卜师版 BETA</span>
      <h1>把「你是在编吧」<br />变成 <em>对方能自己验证的牌局</em>。</h1>
      <p class="lead">客户在自己手机上抽牌，站点给出结构化牌面；你输入同一份凭证，看到一模一样的牌局，再给她人的解读。
      我们验证牌面，不验证命运——但「牌不是我抽的、结果你能自己复现」，这一句就够了。</p>
      <div class="cta-row">
        <a class="btn primary" href="#builder">建一个牌局房间</a>
        <a class="btn ghost" href="#pricing">查看开通方式</a>
      </div>
      <div class="grid-3">
        <div class="card"><div class="step-no">01 / 客户主权</div><h3>牌是客户自己抽的</h3><p>随机来自她的设备，占卜师无法预设、无法替换。这是信任的起点。</p></div>
        <div class="card"><div class="step-no">02 / 过程可复现</div><h3>同一凭证，同一牌局</h3><p>凭证里包含牌面、时间与指纹；双方各自保存，事后可复现、可核对。</p></div>
        <div class="card"><div class="step-no">03 / 你仍是解读的人</div><h3>站点不抢你的活</h3><p>引擎只给结构事实（体用/五行/宜忌），人的温度、经验与决策建议，仍然由你给。</p></div>
      </div>
    </section>

    <section class="section" id="builder">
      <h2>建一个牌局房间</h2>
      <p class="sub">填完生成一条链接/二维码，发给客户——她点开就能自己抽。展示档位由你决定她能看到多少。</p>
      <div class="two-col">
        <div class="panel">
          <label class="field"><span>你的名字 / 账号名</span><input id="hostName" placeholder="例：阿岚 | 塔罗 & 决策" value="阿岚" /></label>
          <label class="field"><span>对客户显示的落款</span><input id="hostBrand" placeholder="例：阿岚的牌室" value="阿岚的牌室" /></label>
          <label class="field"><span>联系方式（微信号/小红书，客户开通时用）</span><input id="hostContact" placeholder="例：wx: alan_tarot" /></label>
          <label class="field"><span>客户能看到多少</span>
            <select id="tier">
              <option value="A">A · 只给牌面 + 宜忌</option>
              <option value="B" selected>B · 牌面 + 结构摘要（推荐）</option>
              <option value="C">C · 完整结构解读</option>
            </select>
          </label>
          <label class="field"><span>本次领域</span>
            <select id="area">
              <option>综合</option><option>情感</option><option>事业</option><option>选择</option><option>学业</option>
            </select>
          </label>
          <label class="field"><span>给客户的一句话（可选）</span><textarea id="note" placeholder="例：先深呼吸，再点抽牌。"></textarea></label>
          <button class="btn primary" id="btnBuild">生成房间链接</button>
          <p class="hint" style="margin-top:10px">客户抽牌后会把「凭证」发给你；你输入凭证即可复现同一场牌局。</p>
        </div>
        <div class="panel room-result" id="roomResult">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:10px">
            <h3 style="margin:0">房间已生成</h3>
            <span class="tier-tag" id="roomTier"></span>
          </div>
          <div class="qr-box" style="margin:14px 0" id="roomQR"></div>
          <div style="font-size:0.76rem;color:var(--dim);margin-bottom:6px">客户链接</div>
          <div class="code-box" id="roomLink" style="max-height:60px"></div>
          <div style="display:flex;gap:8px;margin:10px 0 4px;flex-wrap:wrap">
            <button class="btn small" id="btnCopyLink">复制链接</button>
            <a class="btn small ghost" id="btnOpenSitter" target="_blank" rel="noopener">打开客户视角</a>
          </div>
          <div style="font-size:0.76rem;color:var(--dim);margin:10px 0 6px">房间码（客户也可手动输入）</div>
          <div class="code-box" id="roomCode" style="max-height:70px"></div>
          <button class="btn small" id="btnCopyCode" style="margin-top:8px">复制房间码</button>
        </div>
      </div>
      ${saved.length ? `<div class="panel" style="margin-top:16px"><h3 style="margin-top:0">最近房间</h3>${saved.map((r) => `<div class="list-row"><span>${r.brand || r.name} · ${r.date} · ${r.tier} 档</span><button class="btn small ghost" data-room="${r.code}">打开</button></div>`).join('')}</div>` : ''}
    </section>

    <section class="section">
      <h2>验证客户凭证</h2>
      <p class="sub">客户把凭证发给你后，粘贴到这里——你会看到同一场牌局，然后开始你的解读。</p>
      <div class="panel">
        <label class="field"><span>客户发来的凭证</span><textarea id="voucherIn" placeholder="粘贴以 V 开头的凭证码"></textarea></label>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <button class="btn primary" id="btnVerify">复现牌局</button>
          <span class="muted" style="align-self:center">凭证不含任何隐私，只包含牌面与时间。</span>
        </div>
        <div id="verifyOut" style="margin-top:18px"></div>
      </div>
    </section>

    <section class="section" id="pricing">
      <h2>开通方式</h2>
      <p class="sub">内测阶段：先发给 5 位占卜师用，用完觉得值再谈。不自动扣费，不绑支付。</p>
      <div class="pricing">
        <div class="card price-card">
          <div class="pill">体验</div>
          <div class="price">¥0 <small>现在就能用</small></div>
          <ul><li>建房间 / 客户自助抽牌</li><li>凭证复现 / 对读回执</li><li>不限场次（内测期）</li></ul>
          <a class="btn ghost" href="#builder">直接建房</a>
        </div>
        <div class="card price-card featured">
          <div class="pill" style="background:var(--accent);color:#fffdf6;border-color:transparent">内测价</div>
          <div class="price">¥99 <small>/年 · 原价 ¥199</small></div>
          <ul><li>房间不限期保存 + 历史回看</li><li>落款/配色/联系方式的品牌位</li><li>对读回执 + 客户转发海报（下一版）</li><li>前 5 位锁价，随时可退</li></ul>
          <button class="btn primary" id="btnOpenContact">复制我的联系方式</button>
        </div>
        <div class="card price-card">
          <div class="pill">白标</div>
          <div class="price">¥499 <small>一次性</small></div>
          <ul><li>换成你的品牌名 / 配色 / 域名</li><li>去掉浮生牌落款</li><li>适合塔罗工作室/博主</li></ul>
          <button class="btn ghost" id="btnWhite">咨询白标</button>
        </div>
      </div>
    </section>

    <section class="section">
      <h2>常见问题</h2>
      <details class="faq"><summary>客户会不会觉得这是 AI 生成的？</summary><p>牌面来自真实扑克牌规则 + 客户设备随机抽取，解读文案是固定的结构化规则（体用/五行/宫位），不是每次让 AI 现编。你可以让客户看「同一天同一牌局永远同一段结果」，这是可复现的。</p></details>
      <details class="faq"><summary>这算不算预测？合规吗？</summary><p>产品定位是「决策辅助 / 过程见证」，不做预测承诺。凭证上明确写「不构成任何预测或决策建议」。卖的是透明，不是准确率。</p></details>
      <details class="faq"><summary>客户看到结构摘要，会不会自己就跑去找别人？</summary><p>展示档位由你控制（A/B/C）。我们建议 B：给事实，不给结论；你的经验、共情和决策建议才是不可替代的部分。</p></details>
      <details class="faq"><summary>凭证能防篡改吗？</summary><p>内测版是「双方各持一份 + 指纹校验」，任何一方单独改动都会对不上。下一版会加服务端时间戳（免费额度足够），做到第三方时间锚定。</p></details>
    </section>

    <footer class="footer">
      浮生牌 · 对读模式 · 验证牌面，不验证命运<br />
      <a href="./index.html">回到牌桌</a> · <a href="https://github.com/y22t19053/FuShengPai" target="_blank" rel="noopener">GitHub 开源</a>
    </footer>
  </main>`;

  // 建房
  document.getElementById('btnBuild').addEventListener('click', () => {
    const room = makeRoom({
      hostName: document.getElementById('hostName').value.trim(),
      brand: document.getElementById('hostBrand').value.trim(),
      contact: document.getElementById('hostContact').value.trim(),
      tier: document.getElementById('tier').value,
      area: document.getElementById('area').value,
      note: document.getElementById('note').value.trim(),
    });
    saveRoom(room);
    const link = `${location.origin}${location.pathname}?room=${encodeURIComponent(room.code)}`;
    document.getElementById('roomResult').classList.add('show');
    document.getElementById('roomTier').textContent = `${room.tier} 档 · ${TIERS[room.tier].name}`;
    document.getElementById('roomLink').textContent = link;
    document.getElementById('roomCode').textContent = room.code;
    document.getElementById('roomQR').innerHTML = qrSVGHTML(link, { size: 168, dark: '#3a3425', light: '#fffdf6' });
    document.getElementById('btnCopyLink').onclick = () => copyText(link);
    document.getElementById('btnCopyCode').onclick = () => copyText(room.code);
    document.getElementById('btnOpenSitter').href = link;
    toast('房间已生成');
  });

  // 最近房间
  document.querySelectorAll('[data-room]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const link = `${location.origin}${location.pathname}?room=${encodeURIComponent(btn.dataset.room)}`;
      window.open(link, '_blank', 'noopener');
    });
  });

  // 验证凭证
  document.getElementById('btnVerify').addEventListener('click', () => {
    const raw = document.getElementById('voucherIn').value.trim();
    const voucher = decodeVoucher(raw);
    const out = document.getElementById('verifyOut');
    if (!voucher) { out.innerHTML = '<p class="muted" style="color:var(--red)">凭证无效，请确认客户复制完整。</p>'; return; }
    const room = decodeRoom(voucher.rc);
    if (!room) { out.innerHTML = '<p class="muted" style="color:var(--red)">房间信息缺失，让客户重新发一次。</p>'; return; }
    const reading = buildReading(room, cardsFromVoucher(voucher));
    out.innerHTML = `
      <div class="voucher-box">
        <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap">
          <b>凭证 ${voucher.fp}</b><span class="muted">${new Date(voucher.ts).toLocaleString('zh-CN')} · ${room.area} · ${room.tier} 档</span>
        </div>
        ${voucher.q ? `<div style="margin-top:8px;font-size:0.86rem"><b>客户的问题：</b>${voucher.q}</div>` : ''}
      </div>
      <div class="draw-row">${cardHTML(reading.cards[0], '体')}${cardHTML(reading.cards[1], '用')}</div>
      ${tierContentHTML(reading, 'C')}
      <label class="field" style="margin-top:14px"><span>你的解读（会写进对读回执）</span><textarea id="hostNote" placeholder="例：体用相克，这件事不是不能做，而是顺序错了。先把 X 放一放……"></textarea></label>
      <button class="btn primary" id="btnReceipt">复制对读回执</button>
    `;
    document.getElementById('btnReceipt').onclick = () => {
      const note = document.getElementById('hostNote').value.trim();
      copyText(buildReceiptText(room, voucher, reading, note));
    };
    toast('牌局已复现');
  });

  document.getElementById('btnOpenContact').onclick = () => {
    const contact = document.getElementById('hostContact').value.trim();
    if (!contact) { toast('先在左侧填一下你的联系方式'); document.getElementById('hostContact').focus(); return; }
    copyText(contact);
  };
  document.getElementById('btnWhite').onclick = () => {
    const contact = document.getElementById('hostContact').value.trim();
    if (!contact) { toast('先填联系方式，客户会通过它找你'); document.getElementById('hostContact').focus(); return; }
    copyText(contact);
    toast('白标咨询：把需求发给你的微信即可');
  };

  // 演示模式：?demo=1 自动生成一个房间（截图/给客户演示用）
  if (params.get('demo') === '1') {
    setTimeout(() => document.getElementById('btnBuild')?.click(), 50);
  }
}

/* ---------------- 客户视角（?room=） ---------------- */
function renderSitter(room) {
  const tierName = TIERS[room.tier]?.name || 'B 档';
  app.innerHTML = `
  <header class="site-header">
    <div class="logo">${room.host.brand || '浮生牌'} <em>· 对读</em></div>
    <nav><span class="pill">牌局由你亲手抽出</span></nav>
  </header>
  <main class="wrap">
    <section class="sitter-hero">
      <span class="badge">ONLINE READING · 过程可验证</span>
      <h1>这一次，牌由你自己抽</h1>
      <div class="host">占卜师：<b>${room.host.name}</b> · 领域：${room.area} · 展示：${tierName}</div>
      ${room.note ? `<p class="muted" style="margin-top:10px">${room.note}</p>` : ''}
    </section>
    <div class="panel sitter-note">
      <label class="field"><span>你这次想问什么？（会一起发给占卜师）</span><textarea id="question" placeholder="例：我要不要接这个新工作？"></textarea></label>
      <div id="drawArea">
        <button class="btn primary" id="btnDraw">我自己抽牌</button>
        <p class="hint" style="margin-top:10px">牌在你这台设备的浏览器里洗出。占卜师看不到过程，也改不了结果。</p>
      </div>
      <div id="readingOut"></div>
    </div>
    <footer class="footer">
      浮生牌 · 对读模式 · 牌面由客户端自主抽取，可复现、可核对<br />
      本结果仅用于自我探索与决策参考，不构成任何预测或建议。
    </footer>
  </main>`;

  document.getElementById('btnDraw').addEventListener('click', () => {
    const question = document.getElementById('question').value.trim();
    const cards = drawTwoCards();
    const voucher = makeVoucher(room.code, cards, question);
    const reading = buildReading(room, cards);
    const v = visibleForTier(reading, room.tier);
    const out = document.getElementById('readingOut');
    document.getElementById('drawArea').style.display = 'none';
    out.innerHTML = `
      <div class="draw-row">${cardHTML(reading.cards[0], '体')}${cardHTML(reading.cards[1], '用')}</div>
      ${tierContentHTML(reading, room.tier)}
      <div class="voucher-box">
        <div style="font-size:0.76rem;color:var(--dim);margin-bottom:6px">把下面这段凭证发给占卜师（她输入后能看到同一牌局）</div>
        <div class="code-box" id="voucherCode">${encodeVoucher(voucher)}</div>
        <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
          <button class="btn small primary" id="btnCopyVoucher">复制凭证</button>
          <button class="btn small ghost" id="btnRedraw">重新抽牌</button>
        </div>
        <div class="muted" style="margin-top:10px">牌局指纹：${voucher.fp} · 时间：${new Date(voucher.ts).toLocaleString('zh-CN')}</div>
      </div>`;
    document.getElementById('btnCopyVoucher').onclick = () => copyText(encodeVoucher(voucher));
    document.getElementById('btnRedraw').onclick = () => {
      document.getElementById('drawArea').style.display = '';
      out.innerHTML = '';
    };
  });
}

/* ---------------- 入口 ---------------- */
const code = params.get('room');
if (code) {
  const room = decodeRoom(code);
  if (room) renderSitter(room);
  else {
    app.innerHTML = `<div class="wrap section"><div class="panel"><h2>房间码无效</h2><p class="muted">请让占卜师重新发一条链接给你。</p><a class="btn" href="./dual.html">回到占卜师版</a></div></div>`;
  }
} else {
  renderHost();
}
