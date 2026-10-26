// ===== src/texts/texts-asking.js · 问事校准（把笼统问题改成能判真假的一句话）=====
// 依据：占卜实战里最硬的一条规矩——原话「选择一个具体的路径 不然就会出现答案是你所有路径概率的平均数」
//      「这是俩事儿 如果你要一起的话 就会得到它们的平均值」
//      「你问的问题越笼统,给的答案也说笼统……如果你能问出某个具体的问题 你就会得到一个具体的答案」
// 标准：四要素（对象/时间/数值/路径唯一）；不替人做去留决定；不猜别人心思。
// 用法：`buildAskGuide()` 喂给「感觉自己没问清楚？」面板；`readQuestion()` 给输入框做非阻断提示。

/** 一句话原则（面板第一行） */
export const ASK_PRINCIPLE = '两条路一起问，得到的是两条路的平均数。先挑一条，再问。';

/** 好问题的四要素 */
export const ASK_RULES = [
  { key: 'object', label: '对象', text: '问的是谁的事。问别人怎么想，牌读不到；问你自己怎么走，才有答案。' },
  { key: 'time', label: '时间', text: '多久以内。给一个点或一段：年底、三个月内、明年六月。' },
  { key: 'amount', label: '数值', text: '能加数就加数。三百万、三万、一周三次。加上数，答案才有形状。' },
  { key: 'path', label: '路径', text: '一条路。两条一起问，你拿到的会是它们的平均值。' },
];

/** 改问题的五步 */
export const ASK_STEPS = [
  '先把最原始的那句写下来，笼统也没关系。',
  '如果心里有两条路，挑出更想走或更可能走的那条。',
  '补时间和数：多久以内、多少钱、几次。',
  '改写成一句能判真假的话——设想一年后回头看，这句话能被判对或判错。',
  '读给自己听一遍：「我要问的是不是……」，确认没走样，再开局。',
];

/** 坏问题 → 好问题（按领域分组，供面板示例与测试遍历） */
export const ASK_REWRITES = [
  // 感情
  { field: '感情', bad: '他到底喜不喜欢我？', why: '在问别人的心思。牌读不到，而且答案会偏向你希望的那个。', better: '我打算下周约他单独吃饭，这件事我该提前知道什么？' },
  { field: '感情', bad: '我什么时候能脱单？', why: '没有路径，只有时间。', better: '未来三个月，我把周末用来认识新的人，这条路能不能走通？' },
  { field: '感情', bad: '我们还能走多久？', why: '知道日期，人会不自觉地朝它走。', better: '现在我们之间最卡住的是什么？我可以先动哪一头？' },
  { field: '感情', bad: '我要不要分手？', why: '去留决定只能你来做。硬问会得到你所有犹豫的平均值。', better: '如果继续在一起，我需要接受的代价是什么？' },
  // 工作
  { field: '工作', bad: '我要不要辞职？', why: '二选一，答案会是两条路的平均数。', better: '我打算撑到明年三月再走，这条路上最大的坑在哪？' },
  { field: '工作', bad: '我今年事业运怎么样？', why: '笼统进，笼统出。', better: '未来半年，我在这份工作里争取升职，值不值得投？' },
  { field: '工作', bad: '我适合做什么工作？', why: '范围太大，等于问了一整个人生。', better: '接下来半年我认真做内容这一类活，能不能养活自己？' },
  // 钱
  { field: '钱', bad: '我什么时候能发财？', why: '没有时间点、没有数、没有形态。', better: '十年后，我手上有没有三百万可以随时动的现金？' },
  { field: '钱', bad: '我这笔钱能不能赚回来？', why: '没说金额，也没说期限。', better: '我这两万块，半年内能不能回来？' },
  { field: '钱', bad: '我能不能暴富？', why: '这不是一个能判真假的问题，而且答案会让人上头。', better: '未来一年，我本职以外的收入能占到总收入多少？' },
  // 学业
  { field: '学业', bad: '我升学顺利吗？', why: '好几条路混在一起问，拿到的是平均数。', better: '2028 年 10 月，我报考那所学校的专升本，能不能上？' },
  { field: '学业', bad: '我考研能过吗？', why: '没说学校、没说专业、没说哪一年。', better: '明年十二月，我报 A 校 B 专业的研究生考试，能不能进复试？' },
  // 人际
  { field: '人际', bad: '谁在背后害我？', why: '在猜别人的动机，猜出来的多半是自己的怕。', better: '我和这个人之间，我该怎么站位才不吃亏？' },
  { field: '人际', bad: '我爸妈会不会同意？', why: '问的是他们的想法，你管不了。', better: '我打算这样去和他们谈，最容易卡在哪一步？' },
  // 健康（不替代就医）
  { field: '健康', bad: '我身体有没有大毛病？', why: '牌不能替代检查。身体的事，先去医院。', better: '我最近睡不好、心里一直提着，这个状态再撑一个月会怎样？' },
  // 选择
  { field: '选择', bad: '我走 A 还是走 B？', why: '两条路放进同一个问题，得到的是它们的平均值。', better: '先只问 A：走 A 这条路，未来一年我最该防什么？' },
  { field: '选择', bad: '我明年考研和找工作一起准备行吗？', why: '打包问，答案会是两件事的平均数。', better: '分开问。先问：这半年把主要精力放在考研上，行不行？' },
];

/** 六类会被打折的问法（面板尾段 + 输入框提示共用） */
export const ASK_PIVOTS = {
  decision: {
    label: '去留决定',
    text: '去留的决定，牌不替你做。把它拆成两条路各自的代价，各问一次。',
  },
  multiPath: {
    label: '两条路',
    text: '两条路放进同一个问题，你拿到的是它们的平均值。先挑一条单独问。',
  },
  packed: {
    label: '两件事',
    text: '两件事打包问，答案会是两件事的平均数。分开，一次只问一件。',
  },
  others: {
    label: '问别人',
    text: '牌读不到别人的心思。换成你能动的那一边：你打算怎么做。',
  },
  noAnchor: {
    label: '没有锚点',
    text: '加一个时间点和数：三个月内、三万块、一周两次。笼统进，笼统出。',
  },
  vague: {
    label: '太笼统',
    text: '把结局换成一条具体的路：你准备做什么，再问这条路通不通。',
  },
};

// ---- 检测用正则（只做提示，不做拦截）----
const RE_DECISION = /要不要|该不该|应不应该|是否应该|分不分手|辞不辞职|离不离婚|退不退学/;
const RE_MULTI_PATH = /还是|或者|哪一个|哪个更好|二选一|vs|VS/;
const RE_OTHERS = /(他|她|它|对方|别人|领导|老板|爸妈|父母|家里)(到底|会|会不会|是不是|想不想|愿不愿意|同不同意|怎么看|怎么想)/;
const RE_ASK_OTHERS = /(他|她|对方|别人)(会不会|是不是|喜不喜欢|爱不爱|想不想|同不同意)/;
const RE_TIME_ANCHOR = /(\d+\s*年|\d+\s*个?月|\d+\s*周|\d+\s*天|三天|一周|两周|一个月|三个月|半年|一年|年底|月底|下周|下个月|明年|今年|这个月|这周|国庆|过年|十年)/;
const RE_VAGUE = /(运势|运气|缘分|财运|事业运|感情运)(如何|怎么样|好不?好|怎样)|怎么样\?|怎样\?/;

function padSeed(str) {
  let h = 0x811c9dc5;
  for (const ch of String(str || '')) {
    h ^= ch.charCodeAt(0);
    h = (h * 0x01000193) >>> 0;
  }
  return h;
}

/**
 * 粗读一句问题，给出非阻断提示。
 * @param {string} text
 * @param {object} [opts] { refusal: 是否命中拒答类别 }
 * @returns {{ ok: boolean, flags: string[], hints: Array<{id: string, label: string, text: string}> }}
 */
export function readQuestion(text, opts = {}) {
  const q = String(text || '').trim();
  const flags = [];
  const hints = [];
  const push = (id) => {
    if (hints.length >= 2 || flags.includes(id)) return;
    flags.push(id);
    const p = ASK_PIVOTS[id];
    if (p) hints.push({ id, label: p.label, text: p.text });
  };

  if (!q) return { ok: true, flags, hints };

  const questionMarkCount = (q.match(/[?？]/g) || []).length;
  const hasAnchor = RE_TIME_ANCHOR.test(q);

  if (opts.refusal) push('refusal');
  if (RE_DECISION.test(q)) push('decision');
  if (RE_MULTI_PATH.test(q)) push('multiPath');
  if (questionMarkCount > 1 || /而且|顺便|一起/.test(q) && /还是|或者/.test(q)) push('packed');
  if (RE_OTHERS.test(q) || RE_ASK_OTHERS.test(q)) push('others');
  if (!hasAnchor && q.length >= 4) push('noAnchor');
  if (RE_VAGUE.test(q) || q.length <= 4) push('vague');

  return { ok: hints.length === 0, flags, hints };
}

/**
 * 「感觉自己没问清楚？」面板内容（UI 只负责排版，文案在这里）。
 * @returns {{ principle: string, rules: Array, steps: string[], samples: Array, pivots: Array }}
 */
export function buildAskGuide() {
  // 固定挑三组不同领域的改写示例：不随机，保证每次看到的是同一套
  const wanted = ['感情', '工作', '选择'];
  const samples = wanted
    .map(f => ASK_REWRITES.find(r => r.field === f))
    .filter(Boolean);
  return {
    principle: ASK_PRINCIPLE,
    rules: ASK_RULES,
    steps: ASK_STEPS,
    samples,
    pivots: Object.entries(ASK_PIVOTS).map(([id, v]) => ({ id, ...v })),
  };
}

/** 供测试/审查：把可读文案摊平（不含 UI 标签） */
export function allAskTexts() {
  const out = [ASK_PRINCIPLE, ...ASK_RULES.map(r => r.text), ...ASK_STEPS];
  for (const r of ASK_REWRITES) out.push(r.bad, r.why, r.better);
  for (const p of Object.values(ASK_PIVOTS)) out.push(p.text);
  return out;
}

/** 确定性取一条示例（同 seed 恒定） */
export function pickRewrite(seedText) {
  return ASK_REWRITES[padSeed(seedText) % ASK_REWRITES.length];
}
