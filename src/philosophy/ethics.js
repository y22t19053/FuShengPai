// ===== src/philosophy/ethics.js · 伦理引导（软性拦截） =====
import { COVENANT } from './covenant.js';

export function interceptQuestion(question) {
  const q = question.toLowerCase();
  
  // 生死相关 → 软性引导
  const deathKeywords = ['自杀', '死亡', '寿命', '还能活多久', '什么时候死', '杀人', '复仇'];
  for (const keyword of deathKeywords) {
    if (q.includes(keyword)) {
      return {
        blocked: false,
        type: 'death',
        message: '这个话题很沉重。如果你正在经历痛苦或困扰，请先和信任的人聊一聊，或拨打心理援助热线（如 12356）。浮生牌替代不了真实的支持，但它会静静陪着你。'
      };
    }
  }

  // 医疗相关 → 引导就医
  const medicalKeywords = ['癌症', '肿瘤', '手术', '诊断', '病情', '治疗', '药'];
  for (const keyword of medicalKeywords) {
    if (q.includes(keyword)) {
      return {
        blocked: false,
        type: 'medical',
        message: '身体不舒服请一定先去医院看看。牌面不会比医生的检查更懂你的身体。照顾好自己，然后再来看牌。'
      };
    }
  }

  // 窥探他人隐私 → 引导反思
  const privacyKeywords = ['他是不是', '她出轨', '别人在想什么', '内裤颜色', '手机密码'];
  for (const keyword of privacyKeywords) {
    if (q.includes(keyword)) {
      return {
        blocked: false,
        type: 'privacy',
        message: '这个牌阵更适合观察你自己的感受，而不是猜测别人。试试把问题换成“我为什么这么在意这件事”，看看会看到什么。'
      };
    }
  }

  // 投机/赌博 → 拒绝
  const gamblingKeywords = ['彩票', '中奖', '赌', '炒股', '内幕', '考试题'];
  for (const keyword of gamblingKeywords) {
    if (q.includes(keyword)) {
      return {
        blocked: true,
        type: 'gambling',
        message: '浮生牌不参与投机和预测。如果你的选择需要承担巨大风险，请先冷静分析，而不是依赖牌面。'
      };
    }
  }

  // 诅咒/仇怨 → 拒绝
  const curseKeywords = ['诅咒', '下降头', '报复', '害死'];
  for (const keyword of curseKeywords) {
    if (q.includes(keyword)) {
      return {
        blocked: true,
        type: 'curse',
        message: '浮生牌不为仇恨提供燃料。如果心中有怨，或许真正需要的是先放下一些东西。'
      };
    }
  }

  return { blocked: false };
}

// ===== 健康使用频率检测（软性提醒） =====
export function checkDependency(history) {
  const today = new Date().toDateString();
  const todayCount = history.filter(ts => new Date(ts).toDateString() === today).length;

  if (todayCount >= COVENANT.dailyLimit) {
    return {
      level: 'warning',
      message: '今天已经抽了很多次了。镜子也会起雾，不如先放下，过段时间再来。'
    };
  }

  if (todayCount >= COVENANT.warnThreshold) {
    return {
      level: 'gentle',
      message: `今天已抽牌 ${todayCount} 次。或许你需要的不是更多答案，只是先休息一下。`
    };
  }

  return { level: 'ok' };
}

// ===== 封卦（用户主动发起） =====
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