#!/usr/bin/env node
/**
 * 生成浮生牌对读模式的开通卡密（Ed25519 离线签名）
 *
 * 用法：
 *   node scripts/gen-license.mjs --key <private.pem> --name "阿岚" --plan pro --exp 2027-10-18
 *   node scripts/gen-license.mjs --key <private.pem> --name "某工作室" --plan white
 *
 * 注意：私钥不要提交到仓库、不要发给客户；只把生成的卡密发给客户。
 */
import crypto from 'node:crypto';
import fs from 'node:fs';

const args = process.argv.slice(2);
const get = (name, fallback = '') => {
  const i = args.indexOf('--' + name);
  return i >= 0 ? args[i + 1] : fallback;
};

const keyPath = get('key');
const name = get('name', '占卜师');
const plan = get('plan', 'pro');
const exp = get('exp');
if (!keyPath) {
  console.error('缺少 --key <private.pem>');
  process.exit(1);
}
if (!['pro', 'white'].includes(plan)) {
  console.error('--plan 只能是 pro 或 white');
  process.exit(1);
}
const privPem = fs.readFileSync(keyPath, 'utf8');
const privateKey = crypto.createPrivateKey(privPem);

const today = new Date();
const iat = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
const payload = { v: 1, plan, name, iat };
if (exp) payload.exp = exp;
else {
  const d = new Date(today);
  d.setFullYear(d.getFullYear() + 1);
  payload.exp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const b64url = (buf) => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const payloadB64 = b64url(JSON.stringify(payload));
const signature = crypto.sign(null, Buffer.from(payloadB64, 'utf8'), privateKey);
const code = `FSP1.${payloadB64}.${b64url(signature)}`;
console.log('卡密：');
console.log(code);
console.log('');
console.log('内容：', JSON.stringify(payload));
