# 浮生牌（FuShengPai）
> 观牌知势 · 明心见性
一个基于 **扑克牌 + 五行九宫 + 天机线** 的纯前端占卜推理工具。
无需注册、无需后端、数据全部存储在浏览器本地。可选接入多种大模型 AI，生成深度解读。
---
## ✨ 功能总览
| 功能 | 说明 |
|------|------|
| 🎯 **起念抽牌** | 写下问题、选择领域（感情/事业/财运/健康等），一键抽牌或“一键起局” |
| 🃏 **立极布阵** | 从牌堆选一张代表「你」，一张代表「所问之事」，再布九宫，自动连成天机线 |
| 🔥 **五行生克** | 体用关系、旺相休囚、宫位差值、阴阳属性完整推导 |
| 🍈 **榴莲指数** | 衡量牌局张力的 0~10 指标，快速感知本次占卜的“浓度” |
| ☯ **单牌日运** | 日/周/月/季/年周期各自抽一张牌，抽完即锁定，可分维度看财运/桃花/贵人/事业/健康/综合 |
| 🎭 **扑克牌人格** | 每张牌对应一个性格原型，可生成专属“人格卡”分享 |
| 🤖 **AI 深度解读** | 接入 DeepSeek / 千问 / OpenAI / Claude / Gemini / Kimi / 智谱等大模型，追问对话 |
| 🖼️ **分享卡片** | 生成华美分享图（九宫占卜卡 / 日运卡 / 人格卡），内置二维码，扫码即可打开项目 |
| 💾 **数据迁移** | 一键导出/导入全部数据（JSON），换设备不丢失 |
| 📜 **历史记录** | 每次占卜自动保存，支持查看、复制、删除 |
| 📖 **新手教程** | 内置三分钟上手引导 + 牌面/生克速查 |
---
## 🚀 快速开始
### 在线体验
👉 [https://y22t19053.github.io/FuShengPai/](https://y22t19053.github.io/FuShengPai/)
### 本地开发
```bash
# 克隆仓库
git clone https://github.com/y22t19053/FuShengPai.git
cd FuShengPai
# 安装依赖
npm install
# 本地预览（开发模式）
npm run dev
# 构建生产版本
npm run build
npm run preview
需要现代浏览器（Chrome / Edge / Safari / Firefox 最新版），移动端体验已优化。

🤖 配置 AI 深度解读
点击顶部 「AI」 按钮，在设置面板中：

选择服务商（DeepSeek / 千问 / OpenAI / Claude / Gemini / Kimi / 智谱 / 自定义）
填入 API Key（服务商官网申请）
点击 「测试连接」 验证 Key 是否有效
保存后即可使用「AI 深度解读」和「追问」
服务商	默认模型	默认接口地址
DeepSeek	deepseek-chat	https://api.deepseek.com/v1
千问	qwen-plus	https://dashscope.aliyuncs.com/compatible-mode/v1
OpenAI	gpt-3.5-turbo	https://api.openai.com/v1
Claude	claude-3-haiku-20240307	https://api.anthropic.com/v1
Gemini	gemini-pro	https://generativelanguage.googleapis.com/v1beta
Kimi	moonshot-v1-8k	https://api.moonshot.cn/v1
智谱	glm-4	https://open.bigmodel.cn/api/paas/v4
自定义	自行填写	任何 OpenAI 兼容接口
⚠️ 隐私说明：API Key 只保存在你的浏览器 localStorage 中，浮生牌不会上传到任何第三方服务器。请求直接从浏览器发往你选择的 AI 服务商。

🔒 数据与隐私
零后端：所有代码运行在你的浏览器中，没有任何服务器持有你的问题或解读。
纯本地存储：数据保存在浏览器 localStorage（最大约 5MB，历史记录最多 200 条）。
安全降级：若浏览器禁用存储，自动降级为内存存储，但刷新后数据丢失（页面会提示）。
可备份：使用「📦 迁移」导出 JSON 文件，可随时导入恢复，或在新设备上同步。
清理缓存会删除数据：建议定期导出备份。
📦 项目结构
Text
FuShengPai/
├── src/
│   ├── ui.js               # 业务主控 + 动作分发
│   ├── storage.js          # 本地存储封装（降级/迁移/周期锁定）
│   ├── engine.js           # 牌堆/牌型/差值/四柱计算
│   ├── data.js             # 牌面定义/宫位/周期/分类/推荐宫位
│   ├── ai.js               # AI 请求封装（多家厂商 + 超时/重试）
│   ├── persona.js          # 扑克牌人格 + 日运运势生成
│   ├── durian.js           # 榴莲指数计算
│   ├── metaphor.js         # 单牌隐喻
│   ├── chaos.js            # 时间混沌熵（仅导出指纹，用于随机种子）
│   ├── state.js            # 全局状态对象
│   ├── texts/              # 文案（提示/UI/教程/解读词库）
│   ├── ui/                 # 渲染/弹窗/拖拽/动画
│   └── utils/              # 安全工具
├── index.html
├── style.css
├── scripts/check-imports.js  # 导入门禁
└── package.json
🤝 贡献
欢迎提 issue 和 PR。
开发规范：

修改功能前先搜索引用（grep -rn），避免删除被调用的函数。
修改语义必须同步修改所有调用点。
新功能请补充测试（npm test）。
代码必须通过 npm run build 的导入检查。
📄 许可证
本项目采用 AGPL-3.0 许可证。
请保留版权声明，使用或修改代码时遵守许可证要求。

⚠️ 免责声明
浮生牌是一个自我反思与娱乐工具，不构成任何医疗、法律、投资或人生决策建议。
所有解读仅为提示，最终决定权永远在你。
不测生死，不窥他人。