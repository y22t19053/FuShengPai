// ===== src/dual/anchor.js · 牌局时间锚定（可选 Cloudflare Worker）=====
import { CONFIG } from './config.js';

const ANCHOR_URL_KEY = 'fsp_dual_anchor_url';

export function getAnchorUrl() {
  return localStorage.getItem(ANCHOR_URL_KEY) || CONFIG.anchorUrl || '';
}

export function setAnchorUrl(url) {
  if (url) localStorage.setItem(ANCHOR_URL_KEY, String(url).trim());
  else localStorage.removeItem(ANCHOR_URL_KEY);
}

/** 把凭证指纹锚定到服务端时间（未配置时退化为本地时间） */
export async function anchorVoucher(voucher) {
  const base = getAnchorUrl();
  const local = { mode: 'local', fp: voucher.fp, anchored_at: Date.now(), id: null };
  if (!base) return local;
  try {
    const resp = await fetch(base.replace(/\/$/, '') + '/anchor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fp: voucher.fp, ts: voucher.ts }),
    });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const data = await resp.json();
    return { mode: 'server', fp: voucher.fp, id: data.id, anchored_at: data.anchored_at, url: base };
  } catch (e) {
    return { ...local, error: String(e) };
  }
}

export async function verifyAnchor(id) {
  const base = getAnchorUrl();
  if (!base || !id) return null;
  try {
    const resp = await fetch(base.replace(/\/$/, '') + '/anchor?id=' + encodeURIComponent(id));
    if (!resp.ok) return null;
    return await resp.json();
  } catch {
    return null;
  }
}
