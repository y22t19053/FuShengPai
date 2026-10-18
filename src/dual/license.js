// ===== src/dual/license.js · 离线卡密验证（Ed25519 签名，无后端）=====
// 卡密格式：FSP1.<payloadBase64Url>.<signatureBase64Url>
// payload = {"v":1,"plan":"pro"|"white","name":"...","exp":"YYYY-MM-DD","iat":"YYYY-MM-DD"}
import { CONFIG } from './config.js';

// 与 scripts/gen-license.mjs 成对的公钥（SPKI, base64）
const PUBLIC_KEY_B64 = 'MCowBQYDK2VwAyEAuqJMk2tIBXiM+2f2iKjXtOZC3tf8voeCGJFioO07/zo=';
const STORE_KEY = 'fsp_dual_license';

function b64urlDecode(str) {
  const s = str.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(s + '='.repeat((4 - (s.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

function b64ToBytes(b64) {
  const bin = atob(b64);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export async function verifyLicenseCode(code) {
  const raw = String(code || '').trim();
  const parts = raw.split('.');
  if (parts.length !== 3 || parts[0] !== 'FSP1') return { ok: false, error: '卡密格式不正确' };
  const [, payloadB64, sigB64] = parts;
  let payload;
  try {
    payload = JSON.parse(new TextDecoder().decode(b64urlDecode(payloadB64)));
  } catch {
    return { ok: false, error: '卡密内容损坏' };
  }
  if (!payload || payload.v !== 1) return { ok: false, error: '卡密版本不支持' };
  if (payload.exp && payload.exp < todayStr()) return { ok: false, error: `卡密已过期（${payload.exp}）` };
  try {
    const key = await crypto.subtle.importKey(
      'spki',
      b64ToBytes(PUBLIC_KEY_B64),
      { name: 'Ed25519' },
      false,
      ['verify'],
    );
    const ok = await crypto.subtle.verify(
      { name: 'Ed25519' },
      key,
      b64urlDecode(sigB64),
      new TextEncoder().encode(payloadB64),
    );
    if (!ok) return { ok: false, error: '卡密签名无效' };
  } catch (e) {
    return { ok: false, error: '当前浏览器不支持离线验证，请换 Chrome/Edge' };
  }
  return { ok: true, license: payload };
}

export function getLicense() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) || 'null'); } catch { return null; }
}

export function saveLicense(license) {
  localStorage.setItem(STORE_KEY, JSON.stringify(license));
}

export function isPro() {
  const lic = getLicense();
  if (!lic) return false;
  if (lic.exp && lic.exp < todayStr()) return false;
  return lic.plan === 'pro' || lic.plan === 'white';
}

export function planLabel() {
  const lic = getLicense();
  if (!lic) return '免费体验';
  return lic.plan === 'white' ? '白标版' : lic.plan === 'pro' ? '占卜师版' : '免费体验';
}

export { CONFIG };
