// ===== src/dual/main.js · 对读模式：占卜师发牌局 → 客户自己抽 → 凭证复现 → 对读回执 =====
import { qrSVGHTML } from '../utils/qr.js';
import {
  TIERS, makeRoom, decodeRoom, drawTwoCards, makeVoucher, encodeVoucher,
  decodeVoucher, cardsFromVoucher, buildReading, visibleForTier,
  buildReceiptText, cardName, todayStr,
} from './room.js';
import { CONFIG } from './config.js';
import { downloadReceipt } from './receipt-download.js';
import { renderReceiptHTML } from './receipt-html.js';
import { verifyLicenseCode, saveLicense, getLicense, isPro, planLabel } from './license.js';
import { anchorVoucher } from './anchor.js';

const app = document.getElementById('dualApp');
const params = new URLSearchParams(location.search);
const ROOM_KEY = 'fsp_dual_rooms';

if (typeof window !== 'undefined') {
  window.__fspVerifyLicense = verifyLicenseCode;
  window.__fspConfig = CONFIG;
}

/* ---------------- 基础工具 ---------------- */
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
    try { document.execCommand('copy'); toast('已复制'); } catch { toast('复制失败，请手动选中'); }
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
function roomLink(code) {
  return `${location.origin}${location.pathname}?room=${encodeURIComponent(code)}`;
}

function cardHTML(card, role) {
  const color = card.color === 'red' ? 'red' : 'black';
  const rank = card.isJoker ? (card.type === '大王' ? '大' : '小') : card.rank;
  const suit = card.isJoker ? (card.type === '大王' ? '王' : '王') : card.suit;
  return `<div style="text-align:center">
    <div class="card-face ${color}">
      <div class="corner"><div class="r">${rank}</div><div class="s">${suit}</div></div>
      <div class="pip">${card.isJoker ? '🃏' : card.suit}</div>
      <div class="corner" style="top:auto;bottom:8px;left:auto;right:10px;transform:rotate(180deg)"><div class="r">${rank}</div><div class="s">${suit}</div></div>
    </div>
    <div style="margin-top:8px;font-size:0.76rem;color:var(--dim)">
      <span class="pill">${role}</span>
      <div style="margin-top:4px;font-weight:700">${card.isJoker ? card.type : cardName(card)} · ${card.wx}</div>
    </div>
  </div>`;
}

function tierContentHTML(reading, tier) {
  const v = visibleForTier(reading, tier);
  const topic = String(v.topic || '').replace(/^今日课题[：:]\s*/, '');
  const facts = [];
  if (tier !== 'A') {
    facts.push(`<div class="fact"><b>两个牌的关系</b><span>${reading.relation}</span></div>`);
    if (v.mood) facts.push(`<div class="fact"><b>今天的感觉</b><span>${v.mood}</span></div>`);
  }
  const html = [facts.length ? `<div class="facts">${facts.join('')}</div>` : ''];
  html.push(`<div style="margin-top:6px;font-size:0.86rem;line-height:1.9;color:var(--dim)">
    <b style="color:var(--ink)">宜：</b>${v.yi.join('、') || '—'}　<b style="color:var(--ink)">忌：</b>${v.ji.join('、') || '—'}
  </div>`);
  if (tier !== 'A') {
    html.push(`<div style="margin-top:12px;font-size:0.88rem;line-height:1.9">
      ${topic ? `<b>${topic}</b><br />` : ''}
      「${v.line || '—'}」
      ${v.quote ? `<br /><span style="color:var(--dim)">牌灵说：${v.quote}</span>` : ''}
      ${(v.keywords || []).length ? `<div style="margin-top:10px">${v.keywords.map((k) => `<span class="pill" style="margin-right:6px">${k}</span>`).join('')}</div>` : ''}
    </div>`);
  }
  if (tier === 'C' && v.points?.length) {
    html.push(`<div style="margin-top:12px;font-size:0.84rem;line-height:1.9;color:var(--dim)">
      <b style="color:var(--ink)">页面上写出来的部分（占卜师改不了）：</b>
      <ul style="margin:8px 0 0;padding-left:18px">${v.points.map((p) => `<li>${p}</li>`).join('')}</ul>
    </div>`);
  }
  return html.join('');
}

function stepsBar(active) {
  const items = ['发给客户', '她自己抽', '你复现', '出回执'];
  return `<div class="steps-bar">${items.map((t, i) => `<span class="${i === active ? 'on' : ''}">${i + 1}. ${t}</span>`).join('<i>→</i>')}</div>`;
}

/* ---------------- 占卜师端 ---------------- */
function renderHost() {
  const saved = loadRooms();
  const plan = planLabel();
  app.innerHTML = `
  <header class="site-header">
    <div class="logo">浮生牌 <em>· 对读</em></div>
    <nav>
      <a href="./index.html">牌桌</a>
      <a href="#builder">建房</a>
      <a href="#verify">复现</a>
      <a href="#pricing">开通</a>
      <a href="https://github.com/y22t19053/FuShengPai" target="_blank" rel="noopener">开源</a>
    </nav>
  </header>

  <main class="wrap">
    <section class="hero">
      <div class="hero-left">
        <span class="badge">给在线接单的占卜师</span>
        <h1>牌是她抽的，<br />不是你说的。</h1>
        <p class="lead">占卜师发一条链接，客户在自己手机上抽两张牌，抽完把凭证发给你。你输入凭证，看到同一场牌局，再给解读。回执可以存下来，牌面、时间、你的话都在上面。</p>
        <div class="cta-row">
          <a class="btn primary" href="#builder">建一个牌局</a>
          <a class="btn ghost" href="?receipt=demo" target="_blank" rel="noopener">先看一张回执</a>
        </div>
      </div>
      <div class="hero-right">
        <img src="./dual/receipt-demo.png" alt="对读回执示例" />
        <div class="hint">↑ 这是一张对读回执，客户存这张，你也能发。</div>
      </div>
    </section>

    <section class="section">
      ${stepsBar(-1)}
      <div class="grid-3">
        <div class="card"><div class="step-no">第 1 步</div><h3>发链接</h3><p>填个名字，生成房间链接和二维码，发给客户。她不用下载、不用注册。</p></div>
        <div class="card"><div class="step-no">第 2 步</div><h3>她抽牌</h3><p>她点开链接，在自己手机上抽两张。牌从她手机里出来，你碰不到。</p></div>
        <div class="card"><div class="step-no">第 3 步</div><h3>你把牌局复现出来</h3><p>她把凭证发给你，你粘进来，同一场牌局就出现了。你只管解读。</p></div>
      </div>
    </section>

    <section class="section" id="builder">
      <h2>建一个牌局</h2>
      <p class="sub">生成链接发给客户。她抽完会得到一串凭证，发回给你。</p>
      <div class="two-col">
        <div class="panel">
          <label class="field"><span>你的名字</span><input id="hostName" placeholder="客户看到的名字" value="阿岚" /></label>
          <label class="field"><span>落款（可不填）</span><input id="hostBrand" placeholder="你的账号名/牌室名" value="" /></label>
          <label class="field"><span>联系方式（客户咨询用，可不填）</span><input id="hostContact" placeholder="微信号 / 小红书号" /></label>
          <label class="field"><span>给客户看多少</span>
            <select id="tier">
              <option value="A">只给牌面 + 宜忌（解读全靠你说）</option>
              <option value="B" selected>牌面 + 两个牌的关系 + 一句提醒（默认）</option>
              <option value="C">全部结构都给她看（靠专业赢）</option>
            </select>
          </label>
          <label class="field"><span>这次是什么事</span>
            <select id="area"><option>综合</option><option>感情</option><option>工作</option><option>选择</option><option>考试/学习</option></select>
          </label>
          <button class="btn primary" id="btnBuild">生成链接</button>
          <p class="hint" style="margin-top:10px">客户抽牌后会把凭证发给你，你复制到下面「复现牌局」里就能看到同一场。</p>
        </div>
        <div class="panel room-result" id="roomResult">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:10px">
            <h3 style="margin:0">把这条发给客户</h3>
            <span class="tier-tag" id="roomTier"></span>
          </div>
          <div class="qr-box" style="margin:14px 0" id="roomQR"></div>
          <div class="code-box" id="roomLink" style="max-height:56px"></div>
          <div style="display:flex;gap:8px;margin:10px 0 4px;flex-wrap:wrap">
            <button class="btn small" id="btnCopyLink">复制链接</button>
            <a class="btn small ghost" id="btnOpenSitter" target="_blank" rel="noopener">自己先试一遍</a>
          </div>
          <div style="font-size:0.76rem;color:var(--dim);margin:14px 0 6px">发给客户的话（可复制）</div>
          <textarea id="inviteText" style="min-height:96px"></textarea>
          <button class="btn small" id="btnCopyInvite" style="margin-top:8px">复制这段话</button>
        </div>
      </div>
      ${saved.length ? `<div class="panel" style="margin-top:16px"><h3 style="margin-top:0">最近建的</h3>${saved.map((r) => `<div class="list-row"><span>${r.brand || r.name} · ${r.date} · ${r.tier} 档</span><button class="btn small ghost" data-room="${r.code}">打开</button></div>`).join('')}</div>` : ''}
    </section>

    <section class="section" id="verify">
      <h2>复现牌局</h2>
      <p class="sub">把客户发来的凭证粘进来。看到的是同一场牌局，然后你写解读、出回执。</p>
      <div class="panel">
        <label class="field"><span>客户发来的凭证</span><textarea id="voucherIn" placeholder="V 开头的一长串，客户会直接复制给你"></textarea></label>
        <button class="btn primary" id="btnVerify">打开这场牌局</button>
        <div id="verifyOut" style="margin-top:18px"></div>
      </div>
    </section>

    <section class="section" id="pricing">
      <h2>怎么收费</h2>
      <p class="sub">现在是内测。不用注册，不用绑手机，卡密开通。</p>
      <div class="pricing">
        <div class="card price-card">
          <div class="pill">免费用</div>
          <div class="price">¥0</div>
          <ul><li>建房间、客户自助抽牌</li><li>复现牌局、复制回执</li><li>回执海报带浮生牌落款</li></ul>
          <a class="btn ghost" href="#builder">直接建</a>
        </div>
        <div class="card price-card featured">
          <div class="pill" style="background:var(--accent);color:#fffdf6;border-color:transparent">内测价</div>
          <div class="price">¥99 <small>/年</small></div>
          <ul><li>回执海报去掉浮生牌落款（换你的名字）</li><li>房间记录长期保存</li><li>前 5 位锁价，不想用随时退</li></ul>
          <button class="btn primary" id="btnBuy">${CONFIG.buyUrl && !CONFIG.buyUrl.includes('your-name') ? '去爱发电买卡密' : '加我微信开通'}</button>
        </div>
        <div class="card price-card">
          <div class="pill">白标</div>
          <div class="price">¥499 <small>一次性</small></div>
          <ul><li>换成你的名字、配色、二维码</li><li>页面底部不再出现浮生牌</li><li>适合有自己的工作室/账号</li></ul>
          <button class="btn ghost" id="btnWhite">问白标</button>
        </div>
      </div>
      <div class="panel" style="margin-top:16px">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
          <h3 style="margin:0">买过卡密？</h3>
          <span class="pill" id="planBadge">现在：${plan}</span>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px">
          <input id="licenseIn" placeholder="把卡密粘在这里" style="flex:1;min-width:220px" />
          <button class="btn primary" id="btnLicense">验证</button>
        </div>
        <p class="hint" style="margin-top:10px">卡密是离线验证的，不联网，也不会把卡密发到任何地方。</p>
      </div>
    </section>

    <section class="section">
      <h2>几个可能会被问的问题</h2>
      <details class="faq"><summary>客户会不会觉得这是 AI 编的？</summary><p>牌是她自己抽的，规则页面公开，同一份凭证在两端复现出来的牌局和文案完全一样。AI 只在你想用的时候出现，抽牌和牌面不经过 AI。</p></details>
      <details class="faq"><summary>这算预测吗？</summary><p>我们不做预测承诺。回执上写的是「过程见证，不构成预测或决策建议」。它证明的是牌局真实发生过，不是证明算得准。</p></details>
      <details class="faq"><summary>客户看完结构会不会自己跑掉？</summary><p>看多少由你选。只给牌面、给结构摘要、给完整结构都行。事实给出去，怎么解还是你的事。</p></details>
      <details class="faq"><summary>凭证能不能改？</summary><p>现在双方各存一份 + 指纹校验，单方面改会对不上。想更硬可以部署时间锚定服务（代码在 server/），把凭证钉到服务端时间。</p></details>
    </section>

    <footer class="footer">
      浮生牌 · 对读模式 · 牌面可复现，解读在你<br />
      <a href="./index.html">回牌桌</a> · <a href="https://github.com/y22t19053/FuShengPai" target="_blank" rel="noopener">GitHub</a>
    </footer>
  </main>`;

  document.getElementById('btnBuild').addEventListener('click', () => {
    const name = document.getElementById('hostName').value.trim();
    if (!name) { toast('先填个名字，客户会看到'); document.getElementById('hostName').focus(); return; }
    const room = makeRoom({
      hostName: name,
      brand: document.getElementById('hostBrand').value.trim(),
      contact: document.getElementById('hostContact').value.trim(),
      tier: document.getElementById('tier').value,
      area: document.getElementById('area').value,
    });
    saveRoom(room);
    const link = roomLink(room.code);
    const tierText = room.tier === 'A' ? '牌面和宜忌' : room.tier === 'B' ? '牌面、两个牌的关系和一句提醒' : '完整结构';
    const invite = `你点这个链接，自己抽两张牌：${link}\n\n抽完页面会给一串凭证，复制发我。牌是你抽的，规则在页面上，我改不了。你看到的是${tierText}，具体怎么解我来跟你说。`;
    document.getElementById('roomResult').classList.add('show');
    document.getElementById('roomTier').textContent = `${room.tier} 档`;
    document.getElementById('roomLink').textContent = link;
    document.getElementById('inviteText').value = invite;
    document.getElementById('roomQR').innerHTML = qrSVGHTML(link, { size: 168, dark: '#3a3425', light: '#fffdf6' });
    document.getElementById('btnCopyLink').onclick = () => copyText(link);
    document.getElementById('btnCopyInvite').onclick = () => copyText(invite);
    document.getElementById('btnOpenSitter').href = link;
    toast('链接好了，发给客户吧');
  });

  document.querySelectorAll('[data-room]').forEach((btn) => {
    btn.addEventListener('click', () => window.open(roomLink(btn.dataset.room), '_blank', 'noopener'));
  });

  document.getElementById('btnVerify').addEventListener('click', () => {
    const raw = document.getElementById('voucherIn').value.trim();
    const voucher = decodeVoucher(raw);
    const out = document.getElementById('verifyOut');
    if (!voucher) { out.innerHTML = '<p class="muted" style="color:var(--red)">这串不对，让客户重新复制一次。</p>'; return; }
    const room = decodeRoom(voucher.rc);
    if (!room) { out.innerHTML = '<p class="muted" style="color:var(--red)">房间信息不在里面，让客户再发一次。</p>'; return; }
    const reading = buildReading(room, cardsFromVoucher(voucher));
    room.link = roomLink(voucher.rc);
    let anchorInfo = { mode: 'local', anchored_at: voucher.ts };
    out.innerHTML = `
      <div class="voucher-box">
        <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap">
          <b>${voucher.fp}</b><span class="muted">${new Date(voucher.ts).toLocaleString('zh-CN')} · ${room.area} · ${room.tier} 档</span>
        </div>
        ${voucher.q ? `<div style="margin-top:8px;font-size:0.88rem"><b>她问的是：</b>${voucher.q}</div>` : ''}
        <div class="muted" id="anchorState" style="margin-top:6px">时间记录：本地</div>
      </div>
      <div class="draw-row">${cardHTML(reading.cards[0], '体')}${cardHTML(reading.cards[1], '用')}</div>
      ${tierContentHTML(reading, 'C')}
      <label class="field" style="margin-top:16px"><span>你给她的解读（会写进回执）</span><textarea id="hostNote" placeholder="说人话，说具体的。"></textarea></label>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <button class="btn primary" id="btnReceipt">复制回执文字</button>
        <button class="btn ghost" id="btnReceiptPoster">下载回执海报</button>
      </div>
    `;
    const anchorState = document.getElementById('anchorState');
    anchorVoucher(voucher).then((a) => {
      anchorInfo = a;
      anchorState.textContent = a.mode === 'server'
        ? `时间记录：已锚定 ${a.id || ''} · ${new Date(a.anchored_at).toLocaleString('zh-CN')}`
        : `时间记录：本地 ${new Date(a.anchored_at).toLocaleString('zh-CN')}`;
    });
    document.getElementById('btnReceipt').onclick = () => {
      copyText(buildReceiptText(room, voucher, reading, document.getElementById('hostNote').value.trim()));
    };
    document.getElementById('btnReceiptPoster').onclick = async () => {
      try {
        await downloadReceipt({ room, voucher, reading, hostNote: document.getElementById('hostNote').value.trim(), anchor: anchorInfo, pro: isPro(), variant: 'host' });
        toast('海报下载好了');
      } catch (e) { toast('出图失败：' + e.message); }
    };
    toast('牌局对上了');
  });

  document.getElementById('btnBuy').onclick = () => {
    if (CONFIG.buyUrl && !CONFIG.buyUrl.includes('your-name')) window.open(CONFIG.buyUrl, '_blank', 'noopener');
    else copyText(CONFIG.contact || 'wx: your-wechat');
    toast('买完把卡密粘到下面输入框');
  };
  document.getElementById('btnWhite').onclick = () => copyText(CONFIG.contact || 'wx: your-wechat');
  document.getElementById('btnLicense').onclick = async () => {
    const code = document.getElementById('licenseIn').value.trim();
    if (!code) { toast('先粘卡密'); return; }
    const result = await verifyLicenseCode(code);
    if (!result.ok) { toast(result.error || '卡密不对'); return; }
    saveLicense(result.license);
    document.getElementById('planBadge').textContent = `现在：${planLabel()}`;
    toast(`开通了：${result.license.plan === 'white' ? '白标版' : '占卜师版'}，到 ${result.license.exp}`);
  };

  if (params.get('demo') === '1') setTimeout(() => document.getElementById('btnBuild')?.click(), 50);
}

/* ---------------- 客户视角 ---------------- */
function renderSitter(room) {
  const tierText = room.tier === 'A' ? '牌面和宜忌' : room.tier === 'B' ? '牌面、两个牌的关系和一句提醒' : '完整结构';
  app.innerHTML = `
  <header class="site-header">
    <div class="logo">${room.host.brand || room.host.name} <em>· 对读</em></div>
    <nav><span class="pill">牌是你自己抽的</span></nav>
  </header>
  <main class="wrap">
    <section class="sitter-hero">
      <h1>这次牌由你抽</h1>
      <div class="host">${room.host.name} · ${room.area} · 你会看到${tierText}</div>
    </section>
    <div class="panel sitter-note">
      <label class="field"><span>你想问的事（会一起发过去）</span><textarea id="question" placeholder="最近在纠结什么？"></textarea></label>
      <div id="drawArea">
        <button class="btn primary" id="btnDraw">开始抽牌</button>
        <p class="hint" style="margin-top:10px">抽牌在你这台手机上完成。${room.host.name}看不到过程，也改不了结果。</p>
      </div>
      <div id="readingOut"></div>
    </div>
    <footer class="footer">
      浮生牌 · 对读模式<br />牌面由你亲手抽出，可复现、可核对。结果只用于自我探索，不构成预测或建议。
    </footer>
  </main>`;

  document.getElementById('btnDraw').addEventListener('click', () => {
    const question = document.getElementById('question').value.trim();
    const cards = drawTwoCards();
    const voucher = makeVoucher(room.code, cards, question);
    const reading = buildReading(room, cards);
    const out = document.getElementById('readingOut');
    document.getElementById('drawArea').style.display = 'none';
    out.innerHTML = `
      <div class="draw-row">${cardHTML(reading.cards[0], '体')}${cardHTML(reading.cards[1], '用')}</div>
      ${tierContentHTML(reading, room.tier)}
      <div class="voucher-box">
        <div style="font-size:0.82rem;color:var(--dim);margin-bottom:6px">把下面这串发给${room.host.name}，对方就能看到这场牌局：</div>
        <div class="code-box" id="voucherCode">${encodeVoucher(voucher)}</div>
        <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
          <button class="btn small primary" id="btnCopyVoucher">复制凭证</button>
          <button class="btn small ghost" id="btnSavePoster">保存牌面凭证</button>
          <button class="btn small ghost" id="btnRedraw">重新抽</button>
        </div>
        <div class="muted" style="margin-top:10px">凭证号 ${voucher.fp} · ${new Date(voucher.ts).toLocaleString('zh-CN')} · <span id="sitterAnchor">时间记录：本地</span></div>
      </div>`;
    let anchorInfo = { mode: 'local', anchored_at: voucher.ts };
    anchorVoucher(voucher).then((a) => {
      anchorInfo = a;
      const el = document.getElementById('sitterAnchor');
      if (el) el.textContent = a.mode === 'server' ? `时间记录：已锚定 ${a.id || ''}` : `时间记录：本地 ${new Date(a.anchored_at).toLocaleString('zh-CN')}`;
    });
    document.getElementById('btnCopyVoucher').onclick = () => copyText(encodeVoucher(voucher));
    document.getElementById('btnSavePoster').onclick = async () => {
      try {
        await downloadReceipt({ room: { ...room, link: location.href }, voucher, reading, hostNote: '', anchor: anchorInfo, pro: false, variant: 'sitter' });
        toast('凭证下载好了');
      } catch (e) { toast('出图失败：' + e.message); }
    };
    document.getElementById('btnRedraw').onclick = () => {
      document.getElementById('drawArea').style.display = '';
      out.innerHTML = '';
    };
  });
}

/* ---------------- 回执样张（?receipt=demo，也是落地页里的示例图来源） ---------------- */
function renderReceiptDemo() {
  const room = makeRoom({ hostName: '阿岚', brand: '阿岚的牌室', tier: 'B', area: '感情' });
  room.link = roomLink(room.code);
  const cards = [{ suit: '♥', rank: '9' }, { suit: '♣', rank: '8' }];
  const voucher = makeVoucher(room.code, cards, '我要不要接这个新工作？');
  const reading = buildReading(room, cards);
  document.body.style.margin = '0';
  document.body.style.background = '#efe9d8';
  app.innerHTML = renderReceiptHTML({
    room, voucher, reading,
    hostNote: '这局牌不是让你等，是让你先动。先把「等我准备好」放一放，这周做一件具体的。',
    anchor: { mode: 'server', id: 'ANCHOR-8F2A', anchored_at: Date.now() },
    pro: false,
    variant: 'host',
  });
}

/* ---------------- 入口 ---------------- */
if (params.get('receipt') === 'demo') {
  renderReceiptDemo();
} else {
  const code = params.get('room');
  if (code) {
    const room = decodeRoom(code);
    if (room) { room.code = code; renderSitter(room); }
    else app.innerHTML = `<div class="wrap section"><div class="panel"><h2>链接不对</h2><p class="muted">让占卜师重新发一条给你。</p><a class="btn" href="./dual.html">回到占卜师版</a></div></div>`;
  } else {
    renderHost();
  }
}
