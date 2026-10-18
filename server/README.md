# 浮生牌 · 时间锚定服务（Cloudflare Worker）

对读模式的「第三方时间锚定」：把牌局凭证指纹（`FS-XXXXXXXX`）钉到服务端时间。
免费额度足够个人使用（每天 10 万次请求、KV 免费读取额度）。

## 部署（5 分钟）

```bash
cd server
npm i -g wrangler        # 或 npx wrangler
wrangler login
wrangler kv namespace create ANCHOR
# 把输出的 id 填进 wrangler.toml 的 [[kv_namespaces]].id
wrangler deploy
```

部署成功后会得到类似 `https://fsp-anchor.<你的子域>.workers.dev` 的地址，填到：

1. `src/dual/config.js` 的 `anchorUrl`（写死给所有用户），或
2. 页面 localStorage：`localStorage.setItem('fsp_dual_anchor_url', 'https://...')`（仅本机调试）

没配置也能用：页面会自动退化为「本地记录」，不报错。

## 接口

- `POST /anchor`，body `{ "fp": "FS-1A2B3C4D", "ts": 1730000000000 }` → `{ id, fp, ts, anchored_at }`
- `GET /anchor?id=<uuid>` → 同一条记录（客户/占卜师可凭 id 复查）
- `GET /anchor?fp=FS-XXXXXXXX` → 按指纹查
- `GET /health` → `{ ok: true }`

## 为什么需要它

内测版凭证是「双方各持一份 + 指纹校验」，任何一方单独改都会对不上；但理论上双方可以合谋改。
加上服务端时间锚定后：**牌局在你们聊之前就已经存在**，第三方时间戳可查，这才是收 99/199 的底气。
