// ===== src/texts/reading-frame.js · 解读骨架（六步）=====
// 依据：占卜实战档案 §3「六步推理骨架」——跨多个实占案例稳定的顺序：
//      先给结论 → 翻成画面 → 说成因 → 归因一句 → 一个今天能做的小动作 → 把决定权推回去。
// 标准：第 6 步是签名动作，缺了就不像人给的解读；坏消息必须四层说，不许跳，不许恐吓，不许说成注定。
// 用法：`buildFramePrompt(field)` 注入 AI 提示词；`pickClosing(field, seed)` 给本地引擎收尾。

/** 六步骨架 */
export const FRAME_STEPS = [
  { id: 'verdict', name: '先给结论', plain: '一句话，不铺垫。可以很短：够呛 / 可以 / 差一点。', do: '第一句就把话说完，别先讲牌意。' },
  { id: 'image', name: '翻成画面', plain: '把牌翻成现实里的一个物件或身体状态：水龙头、马达、屋顶、水里的腿。', do: '翻不出画面，就别说这三句。' },
  { id: 'cause', name: '说成因', plain: '为什么会这样。落到现实：时间、钱、身体、身边那个人。', do: '成因要能被验证，不要用术语结案。' },
  { id: 'blame', name: '归因一句', plain: '这不是你一个人的问题 / 这是你选的。二选一，必须说一句。', do: '别让人把整件事背到自己身上，也别把责任全推出去。' },
  { id: 'action', name: '一个小动作', plain: '今天就能做的，只给一个。', do: '给三个等于没给。' },
  { id: 'handback', name: '推回决定权', plain: '最后一句说清楚：走哪条路，由他自己定。', do: '这一句是签名，缺了就像在替人下判决。' },
];

/** 坏消息的四层（顺序固定） */
export const BAD_NEWS_LAYERS = [
  { id: 'verdict', name: '最短结论', plain: '先给，一句话，别拖。' },
  { id: 'blame', name: '归因在外', plain: '归到外部条件或身体状态，不要归到他的品性。' },
  { id: 'image', name: '一个画面', plain: '让人看得见这件事长什么样。' },
  { id: 'door', name: '留一线', plain: '说明它还能改，以及改的着力点在哪。不许说成注定。' },
];

/** 把决定权推回去的说法（按领域，收尾用；同一 seed 恒定） */
export const CLOSING_BY_FIELD = {
  decision: [
    '走哪条、留不留，牌给不了这个答案——它只说这条路上有什么。',
    '两条路我都摆在这儿了，选哪条是你的活。',
    '决定权一直在你手上，我只是把灯打亮了一点。',
    '今天不用定下来，但明天得由你来定。',
  ],
  love: [
    '要不要继续，看你们还愿不愿意，不看这张牌。',
    '我给的是现在的样子，后面那半张还没画。',
    '留也好走也好，别让一张牌替你说分手。',
  ],
  work: [
    '辞不辞，看你还想不想在这儿学东西。牌只说了这里有什么坑。',
    '去留是你的判断，我只负责把代价摆出来。',
    '下一步怎么走你比我清楚，你只是刚才不敢看。',
  ],
  money: [
    '这笔钱动不动，由你的承受力定，不由牌定。',
    '我只说了这条路的样子，要不要走你定。',
    '能不能赚回来要看你后面怎么做，牌只说了现在的水位。',
  ],
  study: [
    '考不考、报不报，你自己拍板。牌只说了这条路有多挤。',
    '我把难度摆出来了，剩下的由你决定要不要试。',
    '这条路上已经有人在走，跟不跟，你自己说。',
  ],
  relation: [
    '他怎么做你管不了，你怎么站位你说了算。',
    '我只说这股力在往哪边推，推不推你定。',
    '话说到这儿，剩下的交给你和他。',
  ],
  self: [
    '这张牌照的是现在，不是判决书。',
    '改不改、改多少，你随时可以决定。',
    '我只是把镜子举起来。看见什么、认不认，你定。',
  ],
};

/** 今天能做的小动作（只给一个；池子供本地引擎取） */
export const SMALL_ACTIONS = [
  '把这件事写三行，只留今天能动的那一行。',
  '今晚十一点前放下手机，明早再说。',
  '给那个人发一句实话，不超过两行。',
  '今天先不签、不答应、不回那条消息。',
  '把要花的钱算一遍，只算今天这一笔。',
  '出门走十分钟，不带耳机。',
  '把那件拖着的事做十分钟，然后停。',
  '把担心的事说给一个人听，说完就停。',
  '今天只吃一顿正经饭。',
  '睡前把明天要做的第一件事写下来。',
  '把那个对话框置顶，今天回他。',
  '少喝一杯，早点躺下。',
];

/** 中性收尾：九宫整篇最后一句用这个——不预设你要做的事，只把决定权放回去 */
export const HANDOFF_LINES = [
  '牌只说了这里有什么坑。走哪条路，还是你定。',
  '这些是眼下的局面，不是判决。怎么用它，你说了算。',
  '看完了，别忘了你随时可以改主意。',
  '要说的大概就这些。剩下的，你自己心里比牌清楚。',
  '我这边看到的是这些。要不要照着走，你定。',
];

/** 字段归一：把 UI 的类别/意图映射到收尾池 */
export function normalizeField(input) {
  const s = String(input || '');
  if (/love|感情|恋爱|复合|桃花|脱单/.test(s)) return 'love';
  if (/career|work|事业|工作|职场|升职|辞职/.test(s)) return 'work';
  if (/wealth|money|财|钱|收入|投资|生意/.test(s)) return 'money';
  if (/study|学业|考试|考研|升学/.test(s)) return 'study';
  if (/noble|relation|人际|朋友|家人|同事|合作|贵人/.test(s)) return 'relation';
  if (/decision|选择|去留|要不要|该不该/.test(s)) return 'decision';
  return 'self';
}

function hashText(str) {
  let h = 0x811c9dc5;
  for (const ch of String(str || '')) {
    h ^= ch.charCodeAt(0);
    h = (h * 0x01000193) >>> 0;
  }
  return h;
}

/** 确定性取一句收尾（同 seed 恒定） */
export function pickClosing(field, seedText = '') {
  const key = normalizeField(field);
  const pool = CLOSING_BY_FIELD[key] || CLOSING_BY_FIELD.self;
  return pool[hashText(seedText || key) % pool.length];
}

/** 确定性取一句中性收尾（不预设领域，同 seed 恒定） */
export function pickHandback(seedText = '') {
  return HANDOFF_LINES[hashText(seedText || 'handback') % HANDOFF_LINES.length];
}

/** 确定性取一个小动作（同 seed 恒定） */
export function pickSmallAction(seedText = '') {
  return SMALL_ACTIONS[hashText(seedText || 'action') % SMALL_ACTIONS.length];
}

/** 注入 AI 的骨架段 */
export function buildFramePrompt(field = '') {
  const key = normalizeField(field);
  const closures = (CLOSING_BY_FIELD[key] || CLOSING_BY_FIELD.self).slice(0, 3);
  const steps = FRAME_STEPS.map((s, i) => `${i + 1}. ${s.name}：${s.plain}`).join('\n');
  const bad = BAD_NEWS_LAYERS.map((l, i) => `${'①②③④'[i]} ${l.name}：${l.plain}`).join('\n');
  return `【解读骨架（按这个顺序说，不要打乱）】\n${steps}\n`
    + `\n【坏消息要说四层，不许跳】\n${bad}\n`
    + `\n【收尾可照抄的三种说法（把决定权还回去）】\n${closures.map(c => `- ${c}`).join('\n')}\n`
    + `\n【措辞】一句话只说一件事，尽量不超过 20 字；术语只在必要时出现一次，出现就当场翻成人话；`
    + `不用 Markdown、不堆小标题、不列长清单；不说「一定会」「注定」，只说「现在这条路的样子是……」。`;
}

/** 供测试/审查：把可读文案摊平 */
export function allFrameTexts() {
  const out = [];
  for (const s of FRAME_STEPS) out.push(s.plain, s.do);
  for (const b of BAD_NEWS_LAYERS) out.push(b.plain);
  for (const arr of Object.values(CLOSING_BY_FIELD)) out.push(...arr);
  out.push(...SMALL_ACTIONS);
  return out;
}
