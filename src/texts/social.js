// ===== src/texts/social.js · 牌格课题库（玄学留白感 + 真实名人名言库） =====

// ======================
// 一、牌格解读（不直白·留白·玄学感）
// ======================

// ---- 4花色主题 ----
const SUIT_THEMES = {
  '♠': {
    title: '勇气与考验',
    keywords: ['直面', '决断', '向死而生'],
    question: '你总在退路中计算胜算，却忘了真正的路，从来不在计算之内。有些门槛，只有走过去才知道它为何存在。',
  },
  '♥': {
    title: '爱与希望',
    keywords: ['炽热', '自愈', '重燃'],
    question: '你心中的火，烧过、熄过，却从未真正灭过。它不灭，是因为你还没承认自己仍然需要光。',
  },
  '♣': {
    title: '生长与内省',
    keywords: ['扎根', '内求', '破土'],
    question: '向外求，尽是他人之影；向内求，方见己身之根。有些答案不在远处，而在你回避已久的那片土壤里。',
  },
  '♦': {
    title: '价值与判断',
    keywords: ['主见', '担当', '清明'],
    question: '你把决定权交出去太久了，久到忘了自己也有天平。有些选择，不需要问任何人——包括你内心的那个声音。',
  },
};

// ---- 点数深度 ----
const RANK_DEPTH = {
  A:  { depth: '开端',   tag: '敢' },
  '2': { depth: '抉择',   tag: '断' },
  '3': { depth: '困局',   tag: '破' },
  '4': { depth: '根基',   tag: '立' },
  '5': { depth: '无常',   tag: '纳' },
  '6': { depth: '平衡',   tag: '合' },
  '7': { depth: '内观',   tag: '静' },
  '8': { depth: '循环',   tag: '觉' },
  '9': { depth: '告别',   tag: '舍' },
  '10': { depth: '临界',   tag: '进' },
  J: { depth: '面具',   tag: '真' },
  Q: { depth: '容纳',   tag: '慈' },
  K: { depth: '担当',   tag: '成' },
};

// ---- Joker ----
const JOKER_QUESTIONS = {
  大: {
    title: '本命与自由',
    keywords: ['天选', '自由', '坦然'],
    question: '你一直扮演着别人能接受的角色，扮演久了，面具就成了你以为的脸。这一课，与扮演相反——不是成为什么，而是承认你本来就是什么。',
  },
  小: {
    title: '谦卑与圆满',
    keywords: ['谦卑', '臣服', '归元'],
    question: '你总想掌控每一件事的走向，但真正的圆满不来自控制，而来自接住那些意料之外。',
  },
};

// 根据牌返回牌格解读
export function getPaiGeQuestion(card) {
  if (!card) return null;
  if (card.isJoker) return JOKER_QUESTIONS[card.type === '大王' ? '大' : '小'];
  const suitTheme = SUIT_THEMES[card.suit];
  const rankInfo = RANK_DEPTH[card.rank];
  if (!suitTheme || !rankInfo) return null;
  return {
    title: suitTheme.title,
    keywords: [rankInfo.tag, suitTheme.keywords[0], suitTheme.keywords[1]],
    question: suitTheme.question,
    depth: rankInfo.depth,
    tag: rankInfo.tag,
  };
}

// ======================
// 二、名人名言库（只保留真实人名归属）
// ======================

export const SOCIAL_QUOTES = {
  courage: [
    { text: '如果你正在经历地狱，那就继续前进。', author: '丘吉尔' },
    { text: '命运眷顾勇敢的人。', author: '维吉尔' },
    { text: '勇气并非没有恐惧，而是判断某些事物比恐惧更重要。', author: '安布罗斯·雷德蒙' },
    { text: '生命是一场大胆的冒险，否则什么也不是。', author: '海伦·凯勒' },
    { text: '勇气不是没有恐惧，而是战胜恐惧。', author: '纳尔逊·曼德拉' },
    { text: '虽千万人，吾往矣。', author: '孟子' },
    { text: '长风破浪会有时，直挂云帆济沧海。', author: '李白' },
    { text: '不要等待机会，而要创造机会。', author: '萧伯纳' },
    { text: '困难越大，荣耀越大。', author: '西塞罗' },
    { text: '最大的危险，就是不敢面对危险。', author: '丘吉尔' },
    { text: '勇敢面对现实，是改变现实的第一步。', author: '列夫·托尔斯泰' },
    { text: '不要因为害怕失败而拒绝尝试。', author: '亚伯拉罕·林肯' },
  ],
  love: [
    { text: '希望是长着羽毛的东西，栖息在灵魂里。', author: '艾米莉·狄金森' },
    { text: '爱自己，是终身浪漫的开始。', author: '奥斯卡·王尔德' },
    { text: '黑暗不能驱散黑暗，只有光可以。', author: '马丁·路德·金' },
    { text: '黑夜无论怎样悠长，白昼总会到来。', author: '莎士比亚' },
    { text: '即使冬天来了，春天还会远吗？', author: '雪莱' },
    { text: '万物皆有裂痕，那是光照进来的地方。', author: '莱昂纳德·科恩' },
    { text: '温柔是一种力量，而不是软弱。', author: '赫尔曼·黑塞' },
  ],
  growth: [
    { text: '向外看的人是在做梦，向内看的人正在觉醒。', author: '荣格' },
    { text: '你寻找的东西，也在寻找你。', author: '鲁米' },
    { text: '每个人都曾是小孩，只是很少有人记得。', author: '圣埃克苏佩里' },
    { text: '成为你自己。', author: '尼采' },
    { text: '向内寻找，那里有善的源泉。', author: '马可·奥勒留' },
    { text: '认识你自己。', author: '苏格拉底' },
    { text: '未经审视的人生，不值得过。', author: '苏格拉底' },
    { text: '反求诸己。', author: '孟子' },
    { text: '吾日三省吾身。', author: '曾子' },
  ],
  value: [
    { text: '己所不欲，勿施于人。', author: '孔子' },
    { text: '未经审视的人生，不值得过。', author: '苏格拉底' },
    { text: '一个人的价值，在于他贡献了什么，而非他得到了什么。', author: '爱因斯坦' },
    { text: '不惩罚邪恶，就是命令他去做。', author: '达芬奇' },
    { text: '人应该永远把人当作目的，而不是手段。', author: '康德' },
    { text: '富贵不能淫，贫贱不能移，威武不能屈。', author: '孟子' },
    { text: '君子喻于义，小人喻于利。', author: '孔子' },
    { text: '正义是给予每个人应得的东西。', author: '柏拉图' },
    { text: '如果它是不正确的，就不要做；如果它不真实，就不要说。', author: '马可·奥勒留' },
  ],
  freedom: [
    { text: '成为你自己，才是你唯一真正要完成的事业。', author: '尼采' },
    { text: '一个人只有当独处时，才能成为他自己。', author: '叔本华' },
    { text: '不要让别人替你决定你的生活。', author: '爱默生' },
    { text: '成为自己，比成为别人期待的样子更重要。', author: '爱默生' },
    { text: '不要寻找主人，要成为自己的主人。', author: '尼采' },
    { text: '心即理。', author: '王阳明' },
    { text: '人人自有定盘针。', author: '王阳明' },
  ],
  humility: [
    { text: '万物皆有裂痕，那是光照进来的地方。', author: '莱昂纳德·科恩' },
    { text: '我越是学习，越是意识到自己的无知。', author: '牛顿' },
    { text: '真正的高贵，是优于过去的自己。', author: '海明威' },
    { text: '我唯一知道的，就是我一无所知。', author: '苏格拉底' },
    { text: '满招损，谦受益。', author: '《尚书》' },
    { text: '上善若水，水善利万物而不争。', author: '老子' },
    { text: '知之为知之，不知为不知，是知也。', author: '孔子' },
    { text: '三人行，必有我师焉。', author: '孔子' },
  ],
  acceptance: [
    { text: '不要要求事情按照你的愿望发生，而要愿意事情按照它发生的方式发生。', author: '爱比克泰德' },
    { text: '接受发生的一切，因为它与你的命运相连。', author: '马可·奥勒留' },
    { text: '祸兮福所倚，福兮祸所伏。', author: '老子' },
    { text: '安时而处顺，哀乐不能入也。', author: '庄子' },
    { text: '人必须学会接受失去。', author: '塞涅卡' },
    { text: '你不能两次踏进同一条河流。', author: '赫拉克利特' },
  ],
  selfControl: [
    { text: '不是事情困扰我们，而是我们对事情的看法。', author: '爱比克泰德' },
    { text: '你对自己的思想拥有力量。', author: '马可·奥勒留' },
    { text: '愤怒是一种短暂的疯狂。', author: '塞涅卡' },
    { text: '控制自己，是最大的力量。', author: '塞涅卡' },
    { text: '没有人自由，除非他控制自己。', author: '爱比克泰德' },
    { text: '理性应该领导激情。', author: '亚里士多德' },
    { text: '不要成为情绪的奴隶。', author: '爱比克泰德' },
    { text: '最大的胜利，是战胜自己。', author: '柏拉图' },
    { text: '破山中贼易，破心中贼难。', author: '王阳明' },
    { text: '知人者智，自知者明。', author: '老子' },
  ],
  purpose: [
    { text: '一个人知道自己为什么而活，就能承受任何一种生活。', author: '尼采' },
    { text: '生命在任何情况下都有意义。', author: '维克多·弗兰克尔' },
    { text: '人最后的自由，是选择自己的态度。', author: '维克多·弗兰克尔' },
    { text: '人必须找到自己的使命。', author: '维克多·弗兰克尔' },
    { text: '成为你想在这个世界看到的改变。', author: '甘地' },
    { text: '志不立，天下无可成之事。', author: '王阳明' },
    { text: '路漫漫其修远兮，吾将上下而求索。', author: '屈原' },
    { text: '千磨万击还坚劲，任尔东西南北风。', author: '郑燮' },
    { text: '不经一番寒彻骨，怎得梅花扑鼻香。', author: '黄蘖禅师' },
  ],
  universal: [
    { text: '历史不会重复，但总会押韵。', author: '马克·吐温' },
    { text: '你不能两次踏进同一条河流。', author: '赫拉克利特' },
    { text: '凡是你抗拒的，都会持续。', author: '荣格' },
    { text: '知者不惑，仁者不忧，勇者不惧。', author: '孔子' },
    { text: '天行健，君子以自强不息。', author: '《周易》' },
    { text: '路虽远，行则将至。', author: '荀子' },
    { text: '穷且益坚，不坠青云之志。', author: '王勃' },
    { text: '老骥伏枥，志在千里。', author: '曹操' },
    { text: '士不可以不弘毅，任重而道远。', author: '孔子' },
    { text: '胜人者有力，自胜者强。', author: '老子' },
    { text: '没有比脚更长的路，没有比人更高的山。', author: '汪国真' },
    { text: '宝剑锋从磨砺出，梅花香自苦寒来。', author: '朱熹' },
    { text: '逆境不会毁灭一个人，只会显露一个人。', author: '爱比克泰德' },
    { text: '我要扼住命运的咽喉。', author: '贝多芬' },
    { text: '黑夜无论怎样悠长，白昼总会到来。', author: '莎士比亚' },
    { text: '真正的高贵，是优于过去的自己。', author: '海明威' },
    { text: '凡是不能杀死我的，必使我更强大。', author: '尼采' },
  ],
};

// 根据牌面取一条合适的名言（分享图顶部使用）
export function getPaiGeQuote(card) {
  if (!card) {
    return SOCIAL_QUOTES.universal[Math.floor(Math.random() * SOCIAL_QUOTES.universal.length)];
  }

  let key = 'universal';

  if (card.isJoker) {
    key = card.type === '大王' ? 'freedom' : 'humility';
  } else {
    const suitKeyMap = {
      '♠': 'courage',
      '♥': 'love',
      '♣': 'growth',
      '♦': 'value',
    };
    key = suitKeyMap[card.suit] || 'universal';
  }

  const pool = SOCIAL_QUOTES[key] || SOCIAL_QUOTES.universal;
  return pool[Math.floor(Math.random() * pool.length)];
}

// ======================
// 三、俏皮话（玄学哲言版）
// ======================

export const SOCIAL_QUIPS_BY_WX = {
  '火': [
    '你心中之火，从未熄灭——只是你忘了它在烧。',
    '欲燃他人，先暖自身；欲照前路，先亮己灯。',
    '热情不是消耗，是你还没学会给它添柴。',
  ],
  '金': [
    '你替众人执笔，却忘了为自己落款。',
    '锋芒所向，应破困局，而非伤己。',
    '你守得太紧，连福气都被挡在门外。',
  ],
  '木': [
    '你向上生长，却忘了根须也需要呼吸。',
    '你的直觉，是你最古老的罗盘——别让念头盖过它。',
    '你本就是一棵树，何须借别人的枝来撑自己。',
  ],
  '水': [
    '你表面平静如镜，底下自有惊涛——那是你的生命力。',
    '你适应万物，却还没学会成为自己。',
    '敏感不是你的裂缝，是你的天线。',
  ],
  '土': [
    '你承载众生之重，却忘了自己也是大地之子。',
    '你的稳定是礼物，别让它变成枷锁。',
    '你说“没事”的时候，心里那片地正在喊疼。',
  ],
  '天': [
    '你俯瞰众生太久，忘了自己也是众生之一。',
    '你的格局装得下世界，却装不下自己的疲惫。',
    '天高地远，但你仍要落回人间吃饭。',
  ],
  '人': [
    '你解尽世间难题，唯独漏了自己的那道。',
    '你在人群里笑，却在无人处听自己的回响。',
    '别人的事你如数家珍，自己的愿望却羞于启齿。',
  ],
};

// ---- 兜底 ----
export const SOCIAL_QUIPS_FALLBACK = [
  '你的课题从来不是如何选，而是敢不敢选。',
  '嘴上说着随缘，心里其实在等一个答案。',
  '你把“算了”说得太顺，把“我要”憋得太久。',
  '所有的时机，都是现在；所有的答案，都是你自己。',
  '你反复跌进同一个坑，不是运气差——是那里有你还没拿回的东西。',
  '这一课不轻松，但你已经走到了这里。',
];

// ======================
// 四、话题标签
// ======================

export const SOCIAL_HASHTAGS = '#浮生牌 #观牌知势 #人生课题';
export const SOCIAL_INVITE_TEXT = '📱 扫码，抽你的牌格 →';
export const PAIGE_HASHTAGS = '#浮生牌 #一张牌说破我自己 #你的课题是什么';