// ===== tools/toy/poster.mjs =====
// 把 tools/toy/poster.html 渲染成 1200x900 的 Toy 封面（B 站 Toy 用，4:3）。
// 用法：node tools/toy/poster.mjs [输出目录，默认 publish]
// 依赖：本机 Edge（headless + CDP），不需要 npm 包。
import http from 'node:http';
import { createReadStream, existsSync, statSync, mkdirSync, writeFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';

const DIR = resolve('tools/toy');
const OUT = resolve(process.argv[2] || 'publish');
mkdirSync(OUT, { recursive: true });

const PORT = 5203;
const MIME = { '.html': 'text/html; charset=utf-8', '.png': 'image/png', '.css': 'text/css; charset=utf-8' };
const server = http.createServer((req, res) => {
  const p = decodeURIComponent((req.url || '/').split('?')[0]).replace(/^\//, '') || 'poster.html';
  const file = join(DIR, p);
  if (!existsSync(file) || !statSync(file).isFile()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
  createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
// 浏览器 profile 放系统临时目录，别写进 publish/
const PROFILE = join(tmpdir(), 'fs-toy-poster-profile');
const edge = spawn(EDGE, ['--headless=new', '--disable-gpu', '--no-first-run', '--remote-debugging-port=9448', `--user-data-dir=${PROFILE}`, 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let target = null;
for (let i = 0; i < 40 && !target; i++) {
  await sleep(250);
  try { target = (await (await fetch('http://127.0.0.1:9448/json/list')).json()).find((t) => t.type === 'page'); } catch {}
}
const ws = new WebSocket(target.webSocketDebuggerUrl);
let id = 0; const pending = new Map();
ws.addEventListener('message', (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
await new Promise((r) => ws.addEventListener('open', r));
const send = (method, params = {}) => new Promise((r) => { const my = ++id; pending.set(my, r); ws.send(JSON.stringify({ id: my, method, params })); });

await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1200, height: 900, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/poster.html` });
await sleep(1800);
const r = await send('Page.captureScreenshot', { format: 'png' });
const f = join(OUT, 'poster.png');
writeFileSync(f, Buffer.from(r.result.data, 'base64'));
console.log('poster:', f);
ws.close(); edge.kill(); server.close(); process.exit(0);
