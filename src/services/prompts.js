// ===== src/services/prompts.js · AI 提示词生成（纯逻辑） =====
import { getWuxing, getDailyFortuneType } from '../data.js';
import { getAlmanac } from '../calendar.js';
import { getProfile } from '../storage.js';
import { buildLocalReading } from './readings.js';
import { getPokerPersona } from '../persona.js';
import { getPaiGeQuestion, getFriendCircleHook } from '../texts/social.js';
import { buildDailyOracle } from '../texts/daily-oracle.js';

// ===== AI Prompt =====
export async function buildAIPrompt(state) {
  const text = state.pendingFullReport || (await buildLocalReading(state)).text;
  const profile = getProfile();
  let personalPrefix = '';
  let personaLine = '';
  if (state.consultMode) {
    const who = state.consultName || '求测人';
    personalPrefix = `【求测人信息】本次为他人代占，求测人称呼为「${who}」\n\n`;
    personaLine = `7. 本次是代他人问占，请以「${who}」称呼求测人，解读围绕求测人本人（而非提问者）展开，措辞保持含蓄尊重。\n`;
  } else if (profile) {
    let parts = [];
    if (profile.name) parts.push(`姓名：${profile.name}`);
    if (profile.gender) parts.push(`性别：${profile.gender}`);
    if (profile.birthPlace) parts.push(`出生地：${profile.birthPlace}`);
    if (profile.currentPlace) parts.push(`现居地：${profile.currentPlace}`);
    if (parts.length) personalPrefix = `【求测人信息】${parts.join('，')}\n\n`;
  }
  // 自动带上问题/领域/意向，让 AI 更有上下文
  const contextParts = [];
  if (state.question) contextParts.push(`所求问题：${state.question}`);
  const domain = [state.category, state.subCategory].filter(Boolean);
  if (domain.length) contextParts.push(`领域：${domain.join(' / ')}`);
  if (state.intent) contextParts.push(`问事意向：${state.intent}`);
  const contextPrefix = contextParts.length ? `【本次问占】${contextParts.join('；')}\n\n` : '';
  const prompt = `${personalPrefix}${contextPrefix}请根据以下浮生牌局象进行详细解读。\n\n要求：\n1. 纯文本格式，严禁使用任何Markdown符号（包括#、*、-、数字编号）。\n2. 用自然语言分段，段落间用空行分隔。\n3. 围绕【本次问占】中的问题与领域展开，不要泛泛而谈。\n4. 从体用生克、旺相休囚、宫位差值、天机线、阴阳属性等方面展开。\n5. 结合求测人的八字五行背景，给出针对性建议。\n6. 使用含蓄、留有余地的语气，话不说死，尊重求测人的自主判断。\n${personaLine}以下是牌面信息：\n\n${text}\n\n规则：红桃火(阳) 方块金(阳) 梅花木(阴) 黑桃水(阴) JQK土 大王天(阳) 小王人(阴)。`;
  return prompt;
}

// ===== 通用单牌 AI 提示词生成器（支持细选类别） =====
export function buildSingleCardPrompt(card, opts = {}) {
  if (!card) return '';
  const wx = getWuxing(card);
  const rank = card.isJoker ? card.type : card.rank;
  const suit = card.isJoker ? '' : card.suit;
  const yinyang = card.isJoker ? (card.type === '大王' ? '阳' : '阴') : (card.suit === '♥' || card.suit === '♦' ? '阳' : '阴');
  const metaphor = opts.metaphor || '';
  const periodLabel = opts.periodLabel ? `【${opts.periodLabel}】\n` : '';
  const fortuneType = opts.fortuneType || 'overall';
  const fortuneTypeLabel = getDailyFortuneType(fortuneType)?.label || '综合';
  const now = new Date().toLocaleString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  let almanacLine = '';
  try {
    const a = getAlmanac();
    almanacLine = `农历${a.lunarDate} · ${a.ganZhiDay}日 · ${a.jianchu}${a.term ? ' · 今日' + a.term : ''} · 财神在${a.shenSha.cai}`;
    // —— 扩充：宜/忌 + 纳音（真实历法字段，逐项判空）——
    const yi2 = (a.dayYi || []).slice(0, 3).join('、');
    const ji2 = (a.dayJi || []).slice(0, 3).join('、');
    const navin = [a.dayNaYin, a.yearNaYin].filter(Boolean).join('/');
    if (yi2 || ji2) almanacLine += ` · 宜${yi2} · 忌${ji2}`;
    if (navin) almanacLine += ` · 纳音·${navin}`;
  } catch (e) { almanacLine = ''; }

  // 牌灵上下文（确定性取句：同一天同牌面 → 同一组文案，与页面/分享图一致）
  const persona = getPokerPersona(card);
  const paige = getPaiGeQuestion(card);
  const dateStr = opts.dateStr || '';
  const hook = getFriendCircleHook(card, dateStr);
  let oracleLine = '';
  try {
    const o = buildDailyOracle({ wx, dateStr });
    if (o && o.mood) {
      oracleLine = `今日能量基调：${o.mood.title}（${o.mood.text.slice(0, 60)}${o.mood.text.length > 60 ? '…' : ''}）`;
    }
  } catch (e) { oracleLine = ''; }

  const personaLine = persona
    ? `牌灵人格：${persona.title}\n${persona.core}`
    : '';
  const paigeLine = paige
    ? `牌灵课题：${paige.title}\n课题思考：${paige.question}`
    : '';
  const hookLine = hook
    ? `今日主题：${hook.title}\n今日一句：${hook.line}`
    : '';

  return `${periodLabel}当前时间：${now}

【牌面】
${rank}${suit}
五行：${wx}
阴阳：${yinyang}

${personaLine ? `【牌灵人格】\n${personaLine}\n` : ''}
${paigeLine ? `【牌灵课题】\n${paigeLine}\n` : ''}
${hookLine ? `【今日观牌】\n${hookLine}\n` : ''}
${oracleLine ? `【今日气场】\n${oracleLine}\n` : ''}

【今日历法（真实黄历，供参考气场）】
${almanacLine || '（今日历法不可用）'}

【单牌意象】
${metaphor || '（无预设意象，请基于牌面五行与符号与用户对话）'}

【解读要求】
请基于这张牌的五行能量、阴阳属性、牌灵人格与课题，结合今日历法气场，围绕「${fortuneTypeLabel}」这个主题，给出深度解读：
1. 这张牌对当前「${fortuneTypeLabel}」状态的影响；
2. 这张牌在“自身/人际/事业/健康”四个维度上的启示；
3. 一条具体可执行的建议。

【表达铁律】
- 全程白话，禁止出现任何命理术语（五行生克、旺衰、宫位、大凶大吉等），一律翻成人话。
- 不预测必然的未来，不给出确定性断言；只描述当下倾向与可能走向，把选择权留给用户。
- 用自然语言分段，不使用任何 Markdown 符号（#、*、列表等）。
- 话不说死，保留开放性和对用户自主权的尊重。`;
}
