// ===== src/philosophy/ethics.js · 伦理拦截器 =====
import { COVENANT } from './covenant.js';

export function interceptQuestion(question) {
  const q = question.toLowerCase();
  
  for (const keyword of COVENANT.deathKeywords) {
    if (q.includes(keyword)) {
      return {
        blocked: true,
        type: 'death',
        message: '浮生牌不讨论涉及生死的问题。请珍惜生命，如有困扰请寻求专业帮助。'
      };
    }
  }
  
  const medicalKeywords = ['癌症', '肿瘤', '手术', '诊断', '病情', '治疗'];
  for (const keyword of medicalKeywords) {
    if (q.includes(keyword)) {
      return {
        blocked: true,
        type: 'medical',
        message: '浮生牌不能替代医疗诊断。如有身体不适，请及时就医。'
      };
    }
  }
  
  const legalKeywords = ['官司', '诉讼', '律师', '仲裁', '合同纠纷'];
  for (const keyword of legalKeywords) {
    if (q.includes(keyword)) {
      return {
        blocked: true,
        type: 'legal',
        message: '浮生牌不提供法律建议。涉及法律事务请咨询专业律师。'
      };
    }
  }
  
  const investKeywords = ['买哪只', '股票', '基金', '投资', '发财', '中奖', '彩票'];
  for (const keyword of investKeywords) {
    if (q.includes(keyword)) {
      return {
        blocked: true,
        type: 'investment',
        message: '浮生牌不提供投资建议。请自行研究并承担风险。'
      };
    }
  }
  
  for (const keyword of COVENANT.privacyKeywords) {
    if (q.includes(keyword) && (q.includes('怎么样') || q.includes('出轨'))) {
      return {
        blocked: true,
        type: 'privacy',
        message: '浮生牌不窥探他人隐私。你只能观测自己与事物的关系。'
      };
    }
  }
  
  const curseKeywords = ['诅咒', '下降头', '报复', '害', '弄死', '整死'];
  for (const keyword of curseKeywords) {
    if (q.includes(keyword)) {
      return {
        blocked: true,
        type: 'curse',
        message: '浮生牌不为仇恨提供燃料。请回。'
      };
    }
  }
  
  return { blocked: false };
}

export function checkDependency(history) {
  const today = new Date().toDateString();
  const todayCount = history.filter(ts => new Date(ts).toDateString() === today).length;
  
  if (todayCount >= COVENANT.dailyLimit) {
    return {
      level: 'blocked',
      message: '镜面起雾，建议明日再观。你已超出今日观测上限。'
    };
  }
  
  if (todayCount >= COVENANT.warnThreshold) {
    return {
      level: 'warning',
      message: `今日已观测${todayCount}次。你不是需要更多答案，而是需要休息。`
    };
  }
  
  return { level: 'ok' };
}

export function getSealStatus() {
  const sealData = localStorage.getItem('fs_seal_status');
  if (!sealData) return null;
  try {
    const data = JSON.parse(sealData);
    if (data.until && Date.now() < data.until) {
      return {
        sealed: true,
        reason: data.reason,
        until: data.until,
        daysRemaining: Math.ceil((data.until - Date.now()) / (1000 * 60 * 60 * 24))
      };
    }
    return null;
  } catch { return null; }
}

export function applySeal(reason, days = 3) {
  const until = Date.now() + days * 24 * 60 * 60 * 1000;
  localStorage.setItem('fs_seal_status', JSON.stringify({
    reason,
    until,
    appliedAt: Date.now()
  }));
}

export function removeSeal() {
  localStorage.removeItem('fs_seal_status');
}