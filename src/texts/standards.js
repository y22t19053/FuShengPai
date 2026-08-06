// ===== src/texts/standards.js · 浮生牌文案标准（代码化） =====
// 把「疏离哲学」的文案标准从口头约定变成可执行的规则：
//   - BANNED_WORDS：禁用词表（命中即不合格，供人工审查与 AI 输出守卫共用）
//   - RULES：四条铁律（不讲古词 / 不装逼 / 不扒用户 / 不鸡汤）
//   - auditText()：扫描一段文案是否踩线（提示性工具，不自动删改）
//   - buildStandardsPrompt()：生成注入 AI 提示词的规则段（prompts.js 引用）
// 【注意】禁用词避开项目术语（天机线/体用/九宫/建除等），只拦「装神弄鬼」的表达。

/** 禁用词表：按违规类型分组。命中任意一条即视为不符合标准。 */
export const BANNED_WORDS = {
  // —— 古词装逼：故作高深、堆砌术语气息 ——
  ancient: [
    '逆天改命', '紫气东来', '天机不可泄露', '天机莫问', '命里有时终须有',
    '命中注定', '天意如此', '劫数难逃', '渡劫', '气运加身', '王者之气',
    '贵不可言', '龙气', '风水轮流转', '一命二运', '玄之又玄',
  ],
  // —— 恐吓：用恐惧绑架用户 ——
  fear: [
    '大凶', '血光之灾', '家破人亡', '灾祸临头', '大难临头', '死劫', '绝命',
    '万劫不复', '克夫', '克妻', '旺夫', '煞星', '凶兆', '破财消灾', '必有灾',
  ],
  // —— 鸡汤：廉价鼓励、正确废话 ——
  chickenSoup: [
    '加油', '努力就会成功', '坚持就是胜利', '相信你自己', '一切都是最好的安排',
    '风雨过后必有彩虹', '明天会更好', '正能量', '发光发热', '做最好的自己',
    '越努力越幸运', '只要功夫深', '铁杵磨成针', '加油鸭',
  ],
  // —— 扒用户：心理测试式断言、万能巴纳姆 ——
  probing: [
    '你是不是', '你最近是不是', '我知道你', '你肯定', '你一定',
    '你其实是个', '你内心其实', '你外表看似', '你是一个',
  ],
};

/** 四条铁律（人类可读 + AI 可执行） */
export const RULES = [
  {
    id: 'no-archaic',
    title: '不讲古词',
    text: '不用生僻命理术语堆砌，不拽「天机」「劫数」「气运」这类词。真实历法字段（建除/冲煞/干支）可以说，但要立刻翻成现代人话。',
  },
  {
    id: 'no-pretension',
    title: '不装逼',
    text: '不故作高深、不故弄玄虚、不摆「大师」姿态。牌是镜子不是灯，它照见的是用户自己，不是神谕。',
  },
  {
    id: 'no-probing',
    title: '不扒用户',
    text: '不做心理测试式的断言（「你是不是最近…」「你内心其实…」）。不猜测用户处境，只陈述牌面之象与可操作的观察。',
  },
  {
    id: 'no-chicken-soup',
    title: '不鸡汤',
    text: '不给廉价鼓励和正确废话（「加油」「相信你自己」）。给的是具体的、可执行的下一步，或者一句安静的陪伴。',
  },
];

/**
 * 审查一段文案：返回命中情况。
 * @param {string} text
 * @returns {{ ok: boolean, hits: Array<{word: string, type: string}> }}
 */
export function auditText(text) {
  const hits = [];
  const str = String(text || '');
  for (const [type, words] of Object.entries(BANNED_WORDS)) {
    for (const w of words) {
      if (str.includes(w)) hits.push({ word: w, type });
    }
  }
  return { ok: hits.length === 0, hits };
}

/** 生成注入 AI 提示词的规则段（要求 AI 输出符合浮生牌文案标准） */
export function buildStandardsPrompt() {
  const banned = Object.values(BANNED_WORDS).flat().join('、');
  return `【浮生牌文案标准（必须遵守）】\n` +
    RULES.map(r => `${r.title}：${r.text}`).join('\n') +
    `\n以上任何一条都是硬性要求。此外，输出中严禁出现以下词语（出现任何一个即视为违规）：${banned}。\n` +
    `语气基调：疏离但温热——像一面镜子，安静地照见，不说教、不恐吓、不讨好。`;
}
