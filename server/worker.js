// ===== server/worker.js · 浮生牌对读模式 · 时间锚定服务（Cloudflare Worker）=====
// 作用：把牌局凭证指纹钉到服务端时间，升级「双方各持一份」为「第三方时间锚定」。
// 部署后把地址填到 src/dual/config.js 的 anchorUrl，或页面 localStorage 的 fsp_dual_anchor_url。
//
// 绑定：KV namespace 绑定名 ANCHOR（见 wrangler.toml）
// 路由：
//   POST /anchor { fp, ts }  -> { id, fp, ts, anchored_at }
//   GET  /anchor?id=xxx      -> { id, fp, ts, anchored_at }
//   GET  /health             -> { ok: true }

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...CORS } });
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    const url = new URL(request.url);

    if (url.pathname === '/health') return json({ ok: true, service: 'fsp-anchor' });

    if (url.pathname === '/anchor' && request.method === 'POST') {
      let body;
      try { body = await request.json(); } catch { return json({ error: 'bad json' }, 400); }
      const fp = String(body.fp || '').trim();
      if (!/^FS-[0-9A-F]{8}$/i.test(fp)) return json({ error: 'invalid fp' }, 400);
      const ts = Number(body.ts) || Date.now();
      const id = crypto.randomUUID();
      const record = { id, fp, ts, anchored_at: Date.now() };
      await env.ANCHOR.put('anchor:' + id, JSON.stringify(record), { expirationTtl: 60 * 60 * 24 * 365 * 3 });
      await env.ANCHOR.put('fp:' + fp, id, { expirationTtl: 60 * 60 * 24 * 365 * 3 });
      return json(record);
    }

    if (url.pathname === '/anchor' && request.method === 'GET') {
      const id = url.searchParams.get('id');
      const fp = url.searchParams.get('fp');
      const key = id ? 'anchor:' + id : fp ? 'fp:' + fp : null;
      if (!key) return json({ error: 'missing id or fp' }, 400);
      const raw = await env.ANCHOR.get(key);
      if (!raw) return json({ error: 'not found' }, 404);
      if (key.startsWith('fp:')) {
        const anchorId = raw;
        const rec = await env.ANCHOR.get('anchor:' + anchorId);
        return json(rec ? JSON.parse(rec) : { error: 'not found' }, rec ? 200 : 404);
      }
      return json(JSON.parse(raw));
    }

    return json({ error: 'not found' }, 404);
  },
};
