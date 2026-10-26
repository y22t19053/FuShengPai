// ===== src/texts/texts-reject.js · 伦理拒答 =====
// 依据：占卜实战档案 §5「拒绝的三种档位」——轻（换个问法还能聊）/ 中（退一步，停在这里）/ 重（不再解释）；
//      拒绝之后必须跟一句体系内的解释或一条可答的替换问法，不能只丢一个「不答」。
// 标准：不恐吓、不评判、不扒用户；拒的是问题，不是人。
// 用法：`matchRefusal(question)` 由抽牌前的提示与 AI 提示词共用；`REPEAT_ASK` 用于同一问题的重复拦截。

/** 三档口径 */
export const REFUSAL_TIERS = {
  light: [
    '这个我不看。不是不给面子，是这一类问了对你没好处。',
    '换个问法我们还能聊，这个我确实不看。',
  ],
  mid: [
    '再往下问，我就不接了。停在这里对你更好。',
    '这个问题我不答第二遍。我们说回你自己那部分。',
  ],
  heavy: [
    '这件事我不看，也不再解释。',
    '到这儿为止吧。',
  ],
};

/** 同一件事反复问（重复提问拦截） */
export const REPEAT_ASK = {
  first: '这个问题你刚问过。同一件事反复问，答案只会越来越像你希望的那个。',
  second: '第二次了。牌没变，是你还没准备好接受它。',
  third: '第三次就问到这里。再问下去，你是在跟自己的答案较劲。',
};

/** 五类拒答：触发词 + 备选回应 + 可答的替换问法 */
export const REFUSAL_TEXTS = {
  keywords: {
    death: {
      trigger: ['死', '自杀', '杀人', '不想活'],
      response: '这种问题不在牌面讨论范围内。你值得被认真对待，请和信任的人或专业人士聊聊。',
      responses: [
        '这种问题不在牌面讨论范围内。你值得被认真对待，请和信任的人或专业人士聊聊。',
        '这个我不接。如果这个念头是真的，现在就去找一个真人说说话，别等牌。',
      ],
      pivot: '把它换成：今天我能为自己做的一件事是什么。',
    },
    medical: {
      trigger: ['药', '癌症', '手术', '病', '怀孕'],
      response: '牌不能替代医疗诊断。该看的医生，今天就去约。',
      responses: [
        '牌不能替代医疗诊断。该看的医生，今天就去约。',
        '身体的事交给检查，不交给牌。这个我不看，也别拿它当安慰。',
      ],
      pivot: '把「有没有病」换成：这个状态再撑一个月，我该先停下什么。',
    },
    curse: {
      trigger: ['诅咒', '下降头', '报复', '害我'],
      response: '浮生牌不为仇恨提供燃料。请回。',
      responses: [
        '浮生牌不为仇恨提供燃料。请回。',
        '这个方向我不往下走。把力气花在离开上，比花在复仇上有用。',
      ],
      pivot: '把那个人的名字放下，问你自己：我该在哪一步退出。',
    },
    privacy: {
      trigger: ['他是不是', '她是不是', '她喜不喜欢我', '他喜不喜欢我', '别人在想什么', '谁害我', '他在想什么'],
      response: '浮生牌只谈你的课题，不替你猜别人的心思。',
      responses: [
        '浮生牌只谈你的课题，不替你猜别人的心思。',
        '猜别人的心思，猜出来的多半是你自己的怕。换成你那一半来问。',
      ],
      pivot: '换成你自己的那半边：我打算怎么做，会卡在哪一步。',
    },
    gamble: {
      trigger: ['彩票', '中奖', '稳赚', '暴富', '赌'],
      response: '牌不看赌运。天上掉下来的，往往要从别处还回去。',
      responses: [
        '牌不看赌运。天上掉下来的，往往要从别处还回去。',
        '这个我不看。赌运问得越准，人下得越重。',
      ],
      pivot: '换成收入结构：未来一年，我本职以外的部分能占多少。',
    },
  },
};

/** 第一次触及拒答类别的默认回应（保持向后兼容的扁平访问） */
export function getRefusal(type) {
  const item = REFUSAL_TEXTS.keywords[type];
  return item ? item.response : '';
}

/**
 * 判断一句问题是否落在拒答范围。
 * @param {string} text
 * @returns {{ hit: boolean, type: string, response: string, pivot: string }}
 */
export function matchRefusal(text) {
  const q = String(text || '').trim();
  const empty = { hit: false, type: '', response: '', pivot: '' };
  if (!q) return empty;
  let best = null;
  for (const [type, item] of Object.entries(REFUSAL_TEXTS.keywords)) {
    for (const t of item.trigger) {
      if (q.includes(t) && (!best || t.length > best.len)) best = { type, len: t.length, item };
    }
  }
  if (!best) return empty;
  return { hit: true, type: best.type, response: best.item.response, pivot: best.item.pivot };
}

/** 按「第几次」取重复提问拦截语；其它值返回空串 */
export function getRepeatNotice(count) {
  const n = Number(count) || 0;
  if (n <= 0) return '';
  if (n === 1) return REPEAT_ASK.first;
  if (n === 2) return REPEAT_ASK.second;
  return REPEAT_ASK.third;
}

/** 供测试/审查：把可读文案摊平 */
export function allRefusalTexts() {
  const out = [];
  for (const tier of Object.values(REFUSAL_TIERS)) out.push(...tier);
  out.push(REPEAT_ASK.first, REPEAT_ASK.second, REPEAT_ASK.third);
  for (const item of Object.values(REFUSAL_TEXTS.keywords)) {
    out.push(...item.responses, item.pivot);
  }
  return out;
}
