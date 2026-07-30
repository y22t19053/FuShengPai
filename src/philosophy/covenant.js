// ===== src/philosophy/covenant.js · 浮生牌宪章 =====
// 六条原则作为硬性代码约束，不可绕过

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
    '这不是结束，是重新开始的起点。',
    '记住，牌只是一面镜子。',
    '你已经看到了，接下来怎么做，是你自己的事。',
    '一次占卜只管一个问题，当下的结果只对应你刚才问的事。',
    '牌走完了，路还在你脚下。'
  ]
};

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
  
  if (COVENANT.closingLines) {
    const closing = COVENANT.closingPool[Math.floor(Math.random() * COVENANT.closingPool.length)];
    result += '\n\n' + closing;
  }
  
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