// ===== src/texts/social.js · 牌灵课题库（玄学留白感 + 真实名人名言库） =====

// ---- 确定性取句工具 ----
// 目的：同一张牌同一天永远取同一句 → 页内横幅与分享图文案一致、同一天稳定、
//       次日自动换新（天意感而非随机感）。替代 Math.random 的"每次都不一样"。

/** 简易字符串哈希（FNV-1a 变体） */
export function hashText(s) {
  let h = 0x811c9dc5;
  for (const ch of String(s || '')) {
    h ^= ch.charCodeAt(0);
    h = (h * 0x01000193) >>> 0;
  }
  return h;
}

/** 种子归一化：'2026-8-6' / '2026-8-6|t' → '2026-08-06' / '2026-08-06|t'（统一为同一种子） */
function normalizeSeed(s) {
  const str = String(s ?? '');
  const m = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(.*)$/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}${m[4] || ''}`;
  return str;
}

/** 按种子确定性挑一条（同种子永远同一条）；seedText 缺失时用"今天"兜底 */
export function pickStable(seedText, arr) {
  if (!arr || !arr.length) return '';
  const seed = normalizeSeed(String(seedText ?? todaySeed()));
  return arr[hashText(seed) % arr.length];
}

/** 今天日期（本地时区 YYYY-MM-DD）作默认种子 */
export function todaySeed() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** 由牌面生成确定性种子：rank+suit（Joker 用 type），可再接 dateStr */
export function cardSeed(card, extra = '') {
  if (!card) return `cardless|${extra}`;
  const base = card.isJoker ? `joker-${card.type || '小'}` : `${card.rank || ''}${card.suit || ''}`;
  return `${base}|${normalizeSeed(extra || todaySeed())}`;
}

// ======================
// 一、牌灵解读（不直白·留白·玄学感）
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

// 根据牌返回牌灵解读
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
    { text: '即使冬天来了，春天还会远吗？', author: '雪莱' },
    { text: '万物皆有裂痕，那是光照进来的地方。', author: '莱昂纳德·科恩' },
    { text: '温柔是一种力量，而不是软弱。', author: '赫尔曼·黑塞' },
    { text: '爱是恒久忍耐，又有恩慈。', author: '《圣经》' },
  ],
  growth: [
    { text: '向外看的人是在做梦，向内看的人正在觉醒。', author: '荣格' },
    { text: '你寻找的东西，也在寻找你。', author: '鲁米' },
    { text: '每个人都曾是小孩，只是很少有人记得。', author: '圣埃克苏佩里' },
    { text: '向内寻找，那里有善的源泉。', author: '马可·奥勒留' },
    { text: '认识你自己。', author: '苏格拉底' },
    { text: '未经审视的人生，不值得过。', author: '苏格拉底' },
    { text: '反求诸己。', author: '孟子' },
    { text: '吾日三省吾身。', author: '曾子' },
    { text: '学而不思则罔，思而不学则殆。', author: '孔子' },
  ],
  value: [
    { text: '己所不欲，勿施于人。', author: '孔子' },
    { text: '一个人的价值，在于他贡献了什么，而非他得到了什么。', author: '爱因斯坦' },
    { text: '不惩罚邪恶，就是命令他去做。', author: '达芬奇' },
    { text: '人应该永远把人当作目的，而不是手段。', author: '康德' },
    { text: '富贵不能淫，贫贱不能移，威武不能屈。', author: '孟子' },
    { text: '君子喻于义，小人喻于利。', author: '孔子' },
    { text: '正义是给予每个人应得的东西。', author: '柏拉图' },
    { text: '如果它是不正确的，就不要做；如果它不真实，就不要说。', author: '马可·奥勒留' },
    { text: '勿以恶小而为之，勿以善小而不为。', author: '刘备' },
  ],
  freedom: [
    { text: '一个人只有当独处时，才能成为他自己。', author: '叔本华' },
    { text: '不要让别人替你决定你的生活。', author: '爱默生' },
    { text: '成为自己，比成为别人期待的样子更重要。', author: '爱默生' },
    { text: '不要寻找主人，要成为自己的主人。', author: '尼采' },
    { text: '心即理。', author: '王阳明' },
    { text: '人人自有定盘针。', author: '王阳明' },
    { text: '独立之精神，自由之思想。', author: '陈寅恪' },
  ],
  humility: [
    { text: '我越是学习，越是意识到自己的无知。', author: '牛顿' },
    { text: '我唯一知道的，就是我一无所知。', author: '苏格拉底' },
    { text: '满招损，谦受益。', author: '《尚书》' },
    { text: '上善若水，水善利万物而不争。', author: '老子' },
    { text: '知之为知之，不知为不知，是知也。', author: '孔子' },
    { text: '三人行，必有我师焉。', author: '孔子' },
    { text: '人外有人，天外有天。', author: '谚语' },
    { text: '满瓶不响，半瓶咣当。', author: '谚语' },
  ],
  acceptance: [
    { text: '不要要求事情按照你的愿望发生，而要愿意事情按照它发生的方式发生。', author: '爱比克泰德' },
    { text: '接受发生的一切，因为它与你的命运相连。', author: '马可·奥勒留' },
    { text: '祸兮福所倚，福兮祸所伏。', author: '老子' },
    { text: '安时而处顺，哀乐不能入也。', author: '庄子' },
    { text: '人必须学会接受失去。', author: '塞涅卡' },
    { text: '塞翁失马，焉知非福。', author: '《淮南子》' },
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
    { text: '凡是过往，皆为序章。', author: '莎士比亚' },
    { text: '人生如逆旅，我亦是行人。', author: '苏轼' },
    { text: '行到水穷处，坐看云起时。', author: '王维' },
    { text: '不乱于心，不困于情，不畏将来，不念过往。', author: '丰子恺' },
    { text: '生活明朗，万物可爱。', author: '丰子恺' },
    { text: '你的时间有限，不要浪费在重复别人的生活上。', author: '乔布斯' },
    { text: '我们一路奋战，不是为了改变世界，而是为了不让世界改变我们。', author: '《熔炉》' },
  ],
};

// 根据牌面取一条合适的名言（分享图顶部使用）
// 确定性：同一天同牌面 → 同一句（seed 可传 dateStr，缺省用今天）
export function getPaiGeQuote(card, seedText = '') {
  const seed = seedText || cardSeed(card, '');

  if (!card) {
    return pickStable(seed, SOCIAL_QUOTES.universal);
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
  return pickStable(seed, pool);
}

// ======================
// 三、俏皮话（玄学哲言版）
// ======================

export const SOCIAL_QUIPS_BY_WX = {
  '火': [
    '你心中之火，从未熄灭——只是你忘了它在烧。',
    '欲燃他人，先暖自身；欲照前路，先亮己灯。',
    '热情不是消耗，是你还没学会给它添柴。',
    '你把光都给了别人，屋里却忘了留一盏。',
    '你冲得太快，忘了看看身边的人有没有跟上。',
    '热情是燃料，不是终点——别为了跑完全程，烧光了所有油。',
    '你想证明自己，但有些证明，靠安静比靠喧闹更有效。',
    '你总在赶路，偶尔也该停下来，看看自己为什么出发。',
    '你把"立刻"当成了效率，其实"想清楚"也是效率。',
    '今天不必燃烧，火光本身就是温度。',
  ],
  '金': [
    '你替众人执笔，却忘了为自己落款。',
    '锋芒所向，应破困局，而非伤己。',
    '你守得太紧，连福气都被挡在门外。',
    '你锋利得像刀，却从没人见过你的刀鞘。',
    '边界不是墙，是你终于学会说的那声“不”。',
    '你说"不"的时候，全世界都安静了，那一刻你才知道自己的重量。',
    '你习惯先把事情想坏，这是本能，但也别让它替你过日子。',
    '你的原则是铠甲，别让它变成你与人之间的墙。',
    '干净利落的结束，比拖泥带水的开始更体面。',
    '你太擅长讲道理，偶尔也试试不讲道理地喜欢一个人。',
  ],
  '木': [
    '你向上生长，却忘了根须也需要呼吸。',
    '你的直觉，是你最古老的罗盘——别让念头盖过它。',
    '你本就是一棵树，何须借别人的枝来撑自己。',
    '你总在等春天，却忘了自己也能造一个。',
    '长歪一点没关系，树是弯着腰才扛住风的。',
    '你羡慕别人的快，却忘了自己的长是慢工出细活。',
    '你心里有一片森林，只是你总盯着眼前那一棵。',
    '成长不是赶在别人前面，是比自己上次更进一步。',
    '你太习惯迁就，偶尔也要让自己的枝桠朝着太阳伸。',
    '树最懂沉默：它不催自己，也不催季节。',
  ],
  '水': [
    '你表面平静如镜，底下自有惊涛——那是你的生命力。',
    '你适应万物，却还没学会成为自己。',
    '敏感不是你的裂缝，是你的天线。',
    '你太会体谅别人，却很少被自己体谅。',
    '水没有形状，是因为它还在等一个容器——你也是。',
    '你的情绪像潮汐，有涨有落，这是规律，不是故障。',
    '你太容易接住别人的情绪，却没学会把满出来的倒掉。',
    '深夜想太多，是白天没来得及表达的心事在加班。',
    '你总是在等风平浪静，可有些决定，恰恰要在浪里做。',
    '你藏得够深，偶尔浮出水面透口气，没什么不好。',
  ],
  '土': [
    '你承载众生之重，却忘了自己也是大地之子。',
    '你的稳定是礼物，别让它变成枷锁。',
    '你说“没事”的时候，心里那片地正在喊疼。',
    '你把一切都扛住了，却没人问一句你累不累。',
    '你习惯了当那个兜底的人，这次试试把底交给别人。',
    '你的慢，不是懒，是你在等土壤自己准备好。',
    '安稳是福气，但也别把日子过成原地转圈。',
    '你把自己种得很稳，别忘了偶尔也松松土、晒晒太阳。',
    '大地从不出声，但每一颗种子都知道它的好。',
    '你值得被接住一次，就像你接住别人那样。',
  ],
  '天': [
    '你俯瞰众生太久，忘了自己也是众生之一。',
    '你的格局装得下世界，却装不下自己的疲惫。',
    '天高地远，但你仍要落回人间吃饭。',
    '你习惯了当风，偶尔也允许自己当一片云。',
    '高处的风很冷，记得给自己带件衣裳。',
    '你总在等一个更合适的时机，但时机常常就是你脚下这一步。',
    '你看得比别人远，所以更要学会低头看路。',
    '你的骄傲是翅膀，别让它变成看不见别人的帘子。',
    '你在高处待久了，记得下来看看人间烟火。',
    '天空也有累的时候，所以它让云替它躺一会儿。',
  ],
  '人': [
    '你解尽世间难题，唯独漏了自己的那道。',
    '你在人群里笑，却在无人处听自己的回响。',
    '别人的事你如数家珍，自己的愿望却羞于启齿。',
    '你把温柔都给了别人，独独对自己下手最狠。',
    '先把自己接住，再谈别的。',
    '你太会听别人说话，却很少让别人听你说。',
    '你帮了所有人，唯独没有求助过任何人。',
    '你在关系里总是先退一步，这次试试往前站一站。',
    '你不需要被所有人喜欢，有几个懂你的人就够。',
    '把话说给自己听一遍，你就知道它有多重。',
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
  '你不是想太多，是太久没人接住你的话。',
  '别急，你比自己以为的更接近答案。',
];

// ======================
// 四、话题标签
// ======================

export const SOCIAL_HASHTAGS = '#浮生牌 #观牌知势 #人生课题';
export const SOCIAL_INVITE_TEXT = '📱 扫码，抽你的牌灵 →';
export const PAIGE_HASHTAGS = '#浮生牌 #一张牌说破我自己 #你的课题是什么';
// ======================
// 五、朋友圈社交钩子（大字报分享图专用）
// ======================

// 根据牌面返回五行（供社交钩子使用，与 data.js getWuxing 同口径：宫廷牌 J/Q/K 属土，A-10 按花色）
export function getCardWuxing(card) {
  if (!card) return '土';
  if (card.isJoker) return card.type === '大王' ? '天' : '人';
  if (card.rank === 'J' || card.rank === 'Q' || card.rank === 'K') return '土';
  const suitMap = {
    '♥': '火',
    '♦': '金',
    '♣': '木',
    '♠': '水',
  };
  return suitMap[card.suit] || '土';
}

// 朋友圈大字号文案钩子（标题 + 情绪金句 + 标签胶囊）
// 【文案标准】短、狠、准——一句话是一个可被转发的心情签名，不做运势报告
// titles / lines 为多版本池，每次随机取一；tags 为固定标签
// 每个五行钩子的"依据"：火=热情与表现  金=边界与决断  木=生长与内省
//   水=流动与情绪  土=承载与照顾  天=格局与定位  人=关系与表达
export const FRIEND_CIRCLE_HOOKS = {
  '火': {
    title: '今日课题：别把热情当消耗',
    titles: ['今日课题：别把热情当消耗', '今日课题：留一盏灯给自己', '今日课题：热度要省着用'],
    line: '你心中之火，从未熄灭——只是你忘了它在烧。',
    lines: ['你把光都给了别人，屋里却忘了留一盏。', '你冲得太快，忘了看看身边的人有没有跟上。', '热情是燃料，不是终点——别为了跑完全程，烧光了所有油。'],
    tags: ['热情', '行动', '勿上头']
  },
  '金': {
    title: '今日课题：学会示弱',
    titles: ['今日课题：学会示弱', '今日课题：边界不是墙', '今日课题：做减法'],
    line: '你替众人执笔，却忘了为自己落款。',
    lines: ['边界不是墙，是你终于学会说的那声“不”。', '干净利落的结束，比拖泥带水的开始更体面。', '你说“不”的时候，全世界都安静了。'],
    tags: ['边界', '决断', '勿硬撑']
  },
  '木': {
    title: '今日课题：扎根',
    titles: ['今日课题：扎根', '今日课题：按自己的节奏长', '今日课题：向内求'],
    line: '你向上生长，却忘了根须也需要呼吸。',
    lines: ['你总在等春天，却忘了自己也能造一个。', '你羡慕别人的快，却忘了自己的长是慢工出细活。', '长歪一点没关系，树是弯着腰才扛住风的。'],
    tags: ['生长', '内省', '勿急进']
  },
  '水': {
    title: '今日课题：接纳流动',
    titles: ['今日课题：接纳流动', '今日课题：把满出来的倒掉', '今日课题：浮出水面透口气'],
    line: '你表面平静如镜，底下自有惊涛——那是你的生命力。',
    lines: ['你太会体谅别人，却很少被自己体谅。', '你的情绪像潮汐，有涨有落，这是规律，不是故障。', '你藏得够深，偶尔浮出水面透口气，没什么不好。'],
    tags: ['流动', '放松', '勿内耗']
  },
  '土': {
    title: '今日课题：稳稳托住自己',
    titles: ['今日课题：稳稳托住自己', '今日课题：松一松土', '今日课题：把底交给别人一次'],
    line: '你承载众生之重，却忘了自己也是大地之子。',
    lines: ['你说“没事”的时候，心里那片地正在喊疼。', '你习惯了当那个兜底的人，这次试试把底交给别人。', '你把自己种得很稳，别忘了偶尔松松土、晒晒太阳。'],
    tags: ['稳定', '照顾', '勿硬扛']
  },
  '天': {
    title: '今日课题：回到人间',
    titles: ['今日课题：回到人间', '今日课题：低头看路', '今日课题：落在实处'],
    line: '天高地远，但你仍要落回人间吃饭。',
    lines: ['你看得比别人远，所以更要学会低头看路。', '你总在等一个更合适的时机，但时机常常就是你脚下这一步。', '你在高处待久了，记得下来看看人间烟火。'],
    tags: ['定位', '落点', '勿飘']
  },
  '人': {
    title: '今日课题：先照顾自己',
    titles: ['今日课题：先照顾自己', '今日课题：往前站一站', '今日课题：让别人听你说'],
    line: '别人事如数家珍，自己愿望羞于启齿。',
    lines: ['你帮了所有人，唯独没有求助过任何人。', '你在关系里总是先退一步，这次试试往前站一站。', '你太会听别人说话，却很少让别人听你说。'],
    tags: ['自己', '表达', '勿委屈']
  },
};

// 根据牌面返回朋友圈社交钩子（分享图大字报用）
// 确定性：同一张牌同一天 → 同一组标题/金句（seed 可传 dateStr，缺省用今天）
export function getFriendCircleHook(card, seedText = '') {
  const wx = getCardWuxing(card);
  const h = FRIEND_CIRCLE_HOOKS[wx] || FRIEND_CIRCLE_HOOKS['土'];
  const seed = seedText || cardSeed(card, '');
  const title = (h.titles && h.titles.length)
    ? pickStable(`${seed}|t`, h.titles)
    : h.title;
  const line = (h.lines && h.lines.length)
    ? pickStable(`${seed}|l`, h.lines)
    : h.line;
  const tag = (h.tags && h.tags.length)
    ? pickStable(`${seed}|g`, h.tags)
    : (h.tags || [])[0] || '';
  return { title, line, tags: h.tags || [], tag };
}

// ======================
// 六、分领域标签胶囊（[脑力充沛][勿急躁][准备考试] 之类）
// ======================

// 每个日运细选领域一组标签（取 1 条）+ 五行钩子标签（取 1 条）→ 组成 3 枚胶囊
// 原 career 与 study 几乎完全一样、每类仅 3 条；现每类 6 条且去重
// 注：原来的 getFortuneTags 取 3 枚 = 领域 1 + 五行 2，此处保持取用逻辑不变
export const FORTUNE_TAG_POOLS = {
  overall: ['宜静观', '勿内耗', '养心神', '留白半日', '早睡养气', '勿求全'],
  wealth: ['财气在途', '勿冲动消费', '守现金流', '宜记账', '慢用钱', '勿借贷'],
  love: ['桃花将醒', '勿试探', '先自爱', '宜直说', '留分寸', '勿猜心'],
  noble: ['贵人将现', '多开口', '勿独扛', '宜求助', '记人情', '勿硬撑'],
  career: ['脑力充沛', '勿急躁', '准备出手', '宜收尾', '少开会', '留证据'],
  health: ['宜早睡', '勿硬撑', '动一动', '宜喝水', '少熬夜', '散散步'],
  study: ['宜专注', '勿分心', '学一点', '宜复盘', '先小步', '勿贪多'],
};

// 根据牌面 + 领域返回标签胶囊（用于日运/牌灵大字报底部）
// 确定性：同一天同牌面 → 同一组胶囊（seed 可传 dateStr，缺省用今天）
export function getFortuneTags(card, fortuneType = 'overall', seedText = '') {
  const hook = getFriendCircleHook(card, seedText);
  const pool = FORTUNE_TAG_POOLS[fortuneType] || FORTUNE_TAG_POOLS.overall;
  const seed = seedText || cardSeed(card, fortuneType);
  const wxTag = pickStable(`${seed}|w`, hook.tags || []);
  const domainTag = pickStable(`${seed}|d`, pool);
  // 去重后拼 3 枚：领域标签 ×1 + 五行标签 ×2
  const seen = new Set([domainTag]);
  const others = (hook.tags || []).filter(t => !seen.has(t)).slice(0, 2);
  others.forEach(t => seen.add(t));
  return [domainTag, wxTag, ...others.filter(t => t !== wxTag)].slice(0, 3);
}

// ======================
// 七、社交话题（每张牌一句可接话的钩子）
// ======================

export const SOCIAL_TOPIC_POOLS = {
  overall: ['「见牌如见本心，不告亦知，不语已明。」', '「今天这张牌，恰好说的是现在的你。」', '「牌不预言，只照见。」'],
  wealth: ['「谈钱，也是一种修行。」', '「钱在流动，心别乱动。」', '「赚得到是本事，守得住是功课。」'],
  love: ['「你心里那团火，灭过吗。」', '「爱里最难的，是先爱自己。」', '「感情的事，牌只看得到一半。」'],
  noble: ['「今天有人恰好帮了你吗。」', '「贵人不是等来的，是开口换来的。」', '「记下今天帮你的人。」'],
  career: ['「你今天在扮演谁。」', '「工作最好的状态，是心里有账。」', '「职场的牌，一半在手，一半在同行的人手里。」'],
  health: ['「你的身体，在替谁扛。」', '「健康不是没病，是还有余力。」', '「先照顾好自己，再谈其他。」'],
  study: ['「今天，学到点什么了吗。」', '「学习是长期主义者的游戏。」', '「不懂就问，不丢人。」'],
  paige: ['「这一课，只有你自己能解。」', '「牌灵不说话，答案在你。」', '「今天的你，比昨天多明白了一点什么。」'],
};

// 根据牌面 + 领域返回社交话题（每类多版本，确定性取一条）
export function getSocialTopic(card, fortuneType = 'overall', seedText = '') {
  const poolKey = !card ? 'overall'
    : (card.isJoker || (card.suit === '♣' && (card.rank === 'J' || card.rank === 'Q' || card.rank === 'K'))) ? 'paige'
    : (fortuneType || 'overall');
  const pool = SOCIAL_TOPIC_POOLS[poolKey] || SOCIAL_TOPIC_POOLS.overall;
  const seed = seedText || cardSeed(card, poolKey);
  return pickStable(seed, pool);
}

// 通用社交分享文案（用于分享图下方的行动号召）
export const SOCIAL_CTA = '📱 扫码 · 观今日牌势';
export const SOCIAL_DAILY_LIMIT = '今日一观 · 明日复看';