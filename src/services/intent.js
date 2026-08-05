// ===== src/services/intent.js · 意图检测与关键词提取（纯函数） =====

/**
 * 从问题/分类中检测问事意图（13 类）。
 * @param {string} question
 * @param {string} category
 * @param {string} subCategory
 * @returns {string|null}
 */
export function detectIntent(question, category, subCategory) {
  if (category) return subCategory || category;
  const q = (question || '').toLowerCase();
  const intentMap = {
    '感情': ['复合', '分手', '前任', '脱单', '正缘', '桃花', '暧昧', '他爱', '出轨', '婚姻', '结婚', '离婚', '心动', '爱'],
    '财运': ['财运', '赚钱', '项目', '投资', '破财', '工资', '偏财', '奖金', '股票', '基金', '钱'],
    '事业': ['工作', '跳槽', '升职', '面试', '创业', '辞职', '老板', '同事', '裁员'],
    '健康': ['身体', '生病', '手术', '失眠', '焦虑', '抑郁', '头疼'],
    '学业': ['考试', '考研', '考公', '成绩', '论文', '上岸', '毕业', '升学'],
    '人际关系': ['小人', '贵人', '朋友', '婆媳', '婆婆', '媳妇', '社交', '同事'],
    '决策': ['该不该', '选哪个', '要不要', '能不能', '怎么办', '纠结'],
    '寻物': ['找', '丢', '东西在哪', '不见了', '遗失'],
    '家宅': ['风水', '房子', '搬家', '装修', '家里'],
    '灵异': ['梦', '直觉', '感应', '前世'],
    '运势': ['运势', '今年', '日运', '周运', '月运', '年运'],
    '风水': ['风水', '阳宅', '阴宅', '布局', '气场', '方位'],
    '射覆': ['射覆', '藏物', '找东西', '在哪', '遗失']
  };
  for (const [intent, keywords] of Object.entries(intentMap)) {
    if (keywords.some(k => q.includes(k))) return intent;
  }
  return null;
}

/**
 * 从文本中提取意图关键词（2-6 字短语，最多 6 个）。
 * @param {string} text
 * @returns {string[]}
 */
export function extractKeywords(text) {
  const normalized = text.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, ' ');
  const tokens = normalized.split(/\s+/).filter(t => t.length >= 2);
  const bigrams = [];
  for (let i = 0; i < tokens.length; i++) {
    for (let j = i + 1; j < Math.min(i + 3, tokens.length); j++) {
      const phrase = tokens.slice(i, j + 1).join('');
      if (phrase.length >= 2 && phrase.length <= 6) bigrams.push(phrase);
    }
  }
  return bigrams.slice(0, 6);
}
