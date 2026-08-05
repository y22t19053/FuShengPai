// ===== src/philosophy/covenant.js · 浮生牌宪章（软性约定） =====
// 铁律（用户原话）：这段体验，是让人更记得这张牌、更接近自己的感受，
// 还是让人更想点下一次？前者是仪式，后者是赌博。
// —— 一切判词、限次、拦截都以此为尺。

export const COVENANT = {
  disclaimer: true,
  disclaimerText: '浮生牌不提供医疗、法律、财务决策建议。任何重大决定请咨询专业人士。',
  
  deathIntercept: true,
  deathKeywords: ['死', '自杀', '杀人', '寿命', '还能活多久', '什么时候死'],
  
  privacyIntercept: true,
  privacyKeywords: ['他', '她', '别人', '出轨', '背叛', '劈腿', '第三者'],
  
  antiDependency: true,
  dailyLimit: 8,
  warnThreshold: 5,
  
  forbidAbsolutes: true,
  forbiddenWords: ['一定', '绝对', '必然', '注定', '永远', '肯定'],
  replacements: {
    '一定': '可能',
    '绝对': '比较',
    '必然': '倾向于',
    '注定': '目前呈现',
    '永远': '在当下结构中',
    '肯定': '较大概率'
  },
  
  closingLines: true,
  closingPool: [
    '牌局到此暂时停下，剩下的时间是你自己的。',
    '牌只是镜子，你才是光的来源。',
    '你已经看到了，接下来怎么做，是你自己的事。',
    '一次占卜只管一个问题，当下的结果只对应你刚才问的事。',
    '牌走完了，路还在你脚下。',
    '今日一签，只此一签。明日来，是另一签。',
    '天晚了，牌面先歇下，你也早点睡。',
    '今晚不急着要答案，让它在梦里自己长一会儿。',
  ]
};

// 送客句的变化池：同一句不说三遍（上次用过的下次避开）
let lastClosingIndex = -1;
export function getClosingLine() {
  const pool = COVENANT.closingPool || [];
  if (!pool.length) return '';
  let idx = Math.floor(Math.random() * pool.length);
  if (pool.length > 1 && idx === lastClosingIndex) idx = (idx + 1) % pool.length;
  lastClosingIndex = idx;
  return pool[idx];
}

export function applyCovenant(text) {
  let result = text;
  
  if (COVENANT.forbidAbsolutes) {
    for (const [from, to] of Object.entries(COVENANT.replacements)) {
      result = result.replace(new RegExp(from, 'g'), to);
    }
  }
  
  if (COVENANT.disclaimer) {
    result += '\n\n---\n' + COVENANT.disclaimerText;
  }
  
  // 送客句不再拼进正文：由 getClosingLine() 单独取用，
  // 在解读结束的位置单独展示（第三幕 · 送客）。
  
  return result;
}

export function checkCovenantViolation(text) {
  const violations = [];
  if (COVENANT.forbidAbsolutes) {
    for (const word of COVENANT.forbiddenWords) {
      if (text.includes(word)) {
        violations.push({ type: 'absolute', word });
      }
    }
  }
  return violations;
}