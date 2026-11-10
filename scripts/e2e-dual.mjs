// 对读模式端到端测试：建房 → 客户抽牌 → 凭证 → 复现 → 下载回执 PNG
// 用法：node e2e_dual.mjs http://127.0.0.1:4319
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const BASE = (process.argv[2] || 'http://127.0.0.1:4319').replace(/\/$/, '');
const PORT = 9341;
const PROFILE = path.join(process.env.TEMP, 'fsp-e2e-profile-' + Date.now());
const DOWNLOADS = path.join(process.env.TEMP, 'fsp-e2e-downloads-' + Date.now());
fs.rmSync(DOWNLOADS, { recursive: true, force: true });
fs.mkdirSync(DOWNLOADS, { recursive: true });

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
};

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = spawn(EDGE, [
  '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
  '--no-default-browser-check', '--disable-extensions',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${PROFILE}`, 'about:blank',
], { stdio: 'ignore', detached: true });
browser.unref();

async function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let id = 0;
  const pending = new Map();
  ws.addEventListener('message', (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result || m.error); pending.delete(m.id); }
  });
  await new Promise((res) => ws.addEventListener('open', res));
  const send = (method, params = {}) => new Promise((res) => {
    const mid = ++id;
    pending.set(mid, res);
    ws.send(JSON.stringify({ id: mid, method, params }));
  });
  return { ws, send };
}

let version = null;
for (let i = 0; i < 40; i++) {
  await wait(400);
  try { version = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json(); break; } catch {}
}
if (!version) { console.error('无法连接 Edge DevTools'); process.exit(1); }

// 浏览器级：允许下载到指定目录
const b = await connect(version.webSocketDebuggerUrl);
await b.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: DOWNLOADS, eventsEnabled: true });

const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const target = list.find((t) => t.type === 'page');
const { send } = await connect(target.webSocketDebuggerUrl);
await send('Page.enable');
await send('Runtime.enable');

async function nav(url, waitMs = 1800) {
  await send('Page.navigate', { url });
  await wait(waitMs);
}
async function evalJs(expr) {
  const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error('JS 异常：' + JSON.stringify(r.exceptionDetails.exception?.description || r.exceptionDetails.text));
  return r.result?.value;
}

try {
  // 1. 建房
  await nav(`${BASE}/dual.html?demo=1`, 2200);
  const roomLink = await evalJs(`document.getElementById('roomLink')?.textContent || ''`);
  check('建房：生成客户链接', /room=/.test(roomLink), roomLink.slice(0, 70) + '…');
  check('建房：生成二维码 SVG', await evalJs(`!!document.querySelector('#roomQR svg')`));
  const invite = await evalJs(`document.getElementById('inviteText')?.value || ''`);
  check('建房：生成可直接发给客户的话术', invite.includes('自己抽') && invite.includes('room='), invite.slice(0, 40));

  // 2. 客户视角抽牌
  await nav(roomLink, 1800);
  check('客户页：显示占卜师名字', (await evalJs(`document.querySelector('.sitter-hero .host')?.textContent || ''`)).length > 0);
  await evalJs(`document.getElementById('btnDraw').click()`);
  await wait(900);
  const cardCount = await evalJs(`document.querySelectorAll('#readingOut .card-face').length`);
  check('客户页：抽出两张牌', cardCount === 2, `card-face=${cardCount}`);
  const voucher = await evalJs(`document.getElementById('voucherCode')?.textContent || ''`);
  check('客户页：生成凭证', voucher.startsWith('ey'), voucher.slice(0, 30) + '…');
  const posterBtn = await evalJs(`!!document.getElementById('btnSavePoster')`);
  check('客户页：可保存牌面凭证', posterBtn);

  // 3. 占卜师复现
  await nav(`${BASE}/dual.html`, 1600);
  await evalJs(`(() => { const ta = document.getElementById('voucherIn'); ta.value = ${JSON.stringify(voucher)}; return ta.value.length; })()`);
  const inLen = await evalJs(`document.getElementById('voucherIn').value.length`);
  await evalJs(`document.getElementById('btnVerify').click()`);
  await wait(1200);
  const outText = await evalJs(`document.getElementById('verifyOut').textContent`);
  check('调试：凭证已填入', inLen > 20, 'len=' + inLen);
  if (process.env.DEBUG) console.log('verifyOut:', String(outText).slice(0, 200));
  const hostCards = await evalJs(`document.querySelectorAll('#verifyOut .card-face').length`);
  check('复现：看到同一场牌局（两张牌）', hostCards === 2, `card-face=${hostCards}`);
  check('复现：出现回执海报按钮', await evalJs(`!!document.getElementById('btnReceiptPoster')`));
  check('复现：时间锚定状态已显示', (await evalJs(`document.getElementById('anchorState')?.textContent || ''`)).includes('时间记录'));

  // 4. 下载回执海报
  await evalJs(`(() => { const ta = document.getElementById('hostNote'); ta.value = '先做一件具体的，别等准备好了。'; document.getElementById('btnReceiptPoster').click(); return true; })()`);
  let png = null;
  for (let i = 0; i < 40; i++) {
    await wait(400);
    const files = fs.readdirSync(DOWNLOADS).filter((f) => f.endsWith('.png'));
    if (files.length) { png = files[0]; break; }
  }
  check('下载：生成回执 PNG', !!png, png || '未出现 PNG');
  if (png) {
    const size = fs.statSync(path.join(DOWNLOADS, png)).size;
    check('下载：PNG 体积正常（>200KB）', size > 200 * 1024, `${Math.round(size / 1024)}KB`);
  }
} catch (e) {
  console.error('E2E 异常：', e.message);
  results.push({ name: 'E2E 异常', ok: false, detail: e.message });
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} 通过`);
fs.writeFileSync(path.join(process.env.TEMP, 'fsp-e2e-result.json'), JSON.stringify(results, null, 2));
process.exit(failed.length ? 1 : 0);
