// 塔罗对读端到端：建房(塔罗) → 客户抽三张 → 凭证 → 复现 → 下载塔罗回执
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const BASE = (process.argv[2] || 'http://127.0.0.1:4319').replace(/\/$/, '');
const PORT = 9343;
const PROFILE = path.join(process.env.TEMP, 'fsp-tarot-e2e-' + Date.now());
const DOWNLOADS = path.join(process.env.TEMP, 'fsp-tarot-dl-' + Date.now());
fs.mkdirSync(DOWNLOADS, { recursive: true });

const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = spawn(EDGE, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check', '--disable-extensions', `--remote-debugging-port=${PORT}`, `--user-data-dir=${PROFILE}`, 'about:blank'], { stdio: 'ignore', detached: true });
browser.unref();

async function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let id = 0; const pending = new Map();
  ws.addEventListener('message', (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result || m.error); pending.delete(m.id); } });
  await new Promise((res) => ws.addEventListener('open', res));
  const send = (method, params = {}) => new Promise((res) => { const mid = ++id; pending.set(mid, res); ws.send(JSON.stringify({ id: mid, method, params })); });
  return { ws, send };
}

let version = null;
for (let i = 0; i < 40; i++) { await wait(400); try { version = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json(); break; } catch {} }
if (!version) { console.error('无法连接 Edge'); process.exit(1); }
const b = await connect(version.webSocketDebuggerUrl);
await b.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: DOWNLOADS, eventsEnabled: true });
const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const target = list.find((t) => t.type === 'page');
const { send } = await connect(target.webSocketDebuggerUrl);
await send('Page.enable');
await send('Runtime.enable');
const nav = async (url, ms = 1900) => { await send('Page.navigate', { url }); await wait(ms); };
const evalJs = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error('JS 异常：' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
  return r.result?.value;
};

try {
  await nav(`${BASE}/dual.html?demo=1`, 2300);
  await evalJs(`(() => { const s = document.getElementById('deck'); s.value = 'tarot'; s.dispatchEvent(new Event('change')); document.getElementById('btnBuild').click(); return true; })()`);
  await wait(700);
  const roomLink = await evalJs(`document.getElementById('roomLink')?.textContent || ''`);
  check('塔罗建房：生成链接', /room=/.test(roomLink));
  const invite = await evalJs(`document.getElementById('inviteText')?.value || ''`);
  check('塔罗建房：话术提到塔罗/三张', invite.includes('塔罗'));

  await nav(roomLink, 1800);
  await evalJs(`document.getElementById('btnDraw').click()`);
  await wait(900);
  const tiles = await evalJs(`document.querySelectorAll('#readingOut .tarot-card').length`);
  check('客户页：抽出三张塔罗', tiles === 3, 'tiles=' + tiles);
  const labelText = await evalJs(`document.querySelector('#readingOut')?.textContent || ''`);
  check('客户页：显示正逆位/位置', /正位|逆位/.test(labelText));
  const voucher = await evalJs(`document.getElementById('voucherCode')?.textContent || ''`);
  check('客户页：生成塔罗凭证', voucher.length > 60, 'len=' + voucher.length);

  await nav(`${BASE}/dual.html`, 1700);
  await evalJs(`(() => { document.getElementById('voucherIn').value = ${JSON.stringify(voucher)}; document.getElementById('btnVerify').click(); return true; })()`);
  await wait(1300);
  const hostTiles = await evalJs(`document.querySelectorAll('#verifyOut .tarot-card').length`);
  check('占卜师端：复现三张塔罗', hostTiles === 3, 'tiles=' + hostTiles);
  const hostText = await evalJs(`document.getElementById('verifyOut')?.textContent || ''`);
  check('占卜师端：没有扑克五行内容', !hostText.includes('体用关系') && !hostText.includes('今日宜'));

  await evalJs(`(() => { document.getElementById('hostNote').value = '三张牌里最扎的是逆位那张，先别急着做决定。'; document.getElementById('btnReceiptPoster').click(); return true; })()`);
  let png = null;
  for (let i = 0; i < 50; i++) { await wait(400); const f = fs.readdirSync(DOWNLOADS).filter((x) => x.endsWith('.png')); if (f.length) { png = f[0]; break; } }
  check('下载：生成塔罗回执 PNG', !!png, png || '未生成');
  if (png) {
    const size = fs.statSync(path.join(DOWNLOADS, png)).size;
    check('下载：塔罗回执体积正常', size > 200 * 1024, Math.round(size / 1024) + 'KB');
    const copyTarget = process.argv[3];
    if (copyTarget) fs.copyFileSync(path.join(DOWNLOADS, png), copyTarget);
  }
} catch (e) {
  console.error('E2E 异常：', e.message);
  results.push({ name: 'E2E 异常', ok: false, detail: e.message });
}
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} 通过`);
process.exit(failed.length ? 1 : 0);
