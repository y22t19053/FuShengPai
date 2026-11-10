// ===== src/services/repeat-ask.js · 同一件事反复问的拦截 =====
// 依据：占卜经验档案 §5「重复提问拦截」——他没把门关死，但从不顺着同一件事一直答下去：
//      第一次提醒、第二次直说、第三次就停；并且告诉人"什么时候再来"。
// 标准：不评判、不说教；拦的是重复，不是人。判断只用问句本身，不看用户身份。
// 取句：REPEAT_ASK 三档来自 src/texts/texts-reject.js，这里只负责算账与说清下一次的时间。

import { REPEAT_ASK, getRepeatNotice } from '../texts/texts-reject.js';
import { rawGet, rawSet } from '../storage.js';

export const ASK_LOG_KEY = 'fs_ask_log';
/** 同一件事的观察窗口：一周之内再问，算"刚问过" */
export const REPEAT_WINDOW_DAYS = 7;
/** 建议的再问间隔（天） */
export const SUGGEST_GAP_DAYS = 10;
const MAX_LOG = 120;

const DAY_MS = 24 * 60 * 60 * 1000;

/** 把问句压成比对用的键：去掉标点空白与语气词，只留实词顺序 */
export function normalizeAskKey(question) {
  const s = String(question || '')
    .toLowerCase()
    .replace(/[\s，。！？、；：""''（）()【】\[\]…—~·!?.,;:'"`-]/g, '')
    .replace(/^(请问|我想问|想问一下|帮我看看|看一下)/, '')
    .replace(/(啊|呀|呢|吧|吗|了)$/g, '');
  return s.slice(0, 60);
}

export function getAskLog() {
  // rawSet 是原样透传（浏览器里进 localStorage），所以进出都自己过一遍 JSON
  try {
    const raw = rawGet(ASK_LOG_KEY);
    if (!raw) return [];
    const list = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(list)
      ? list.filter(x => x && typeof x.key === 'string' && Number.isFinite(x.ts))
      : [];
  } catch (e) {
    return [];
  }
}

function saveAskLog(list) {
  try {
    rawSet(ASK_LOG_KEY, JSON.stringify(list.slice(-MAX_LOG)));
  } catch (e) { /* 存不下就算了，不挡解读 */ }
}

/** 记一次提问（同键只更新最近时间与次数） */
export function recordAsk(question, now = Date.now()) {
  const key = normalizeAskKey(question);
  if (!key) return null;
  const list = getAskLog().filter(x => x.key !== key);
  const prev = getAskLog().find(x => x.key === key);
  list.push({ key, ts: now, count: (prev?.count || 0) + 1 });
  saveAskLog(list);
  return key;
}

export function clearAskLog() {
  try { rawSet(ASK_LOG_KEY, '[]'); } catch (e) { /* ignore */ }
}

/**
 * 这次问的和最近问过的是不是同一件事。
 * @returns {{repeat:boolean, count:number, daysAgo:number, tier:'first'|'second'|'third', notice:string, nextAskText:string, nextAskAt:number|null}}
 */
export function checkRepeatAsk(question, now = Date.now()) {
  const key = normalizeAskKey(question);
  const empty = { repeat: false, count: 0, daysAgo: 0, tier: '', notice: '', nextAskText: '', nextAskAt: null };
  if (!key) return empty;

  const prev = getAskLog().find(x => x.key === key);
  if (!prev) return empty;

  const daysAgo = Math.floor((now - prev.ts) / DAY_MS);
  if (daysAgo >= REPEAT_WINDOW_DAYS) return { ...empty, count: prev.count };

  const count = Math.max(1, prev.count || 1);
  const tier = count >= 3 ? 'third' : count === 2 ? 'second' : 'first';
  const notice = REPEAT_ASK[tier] || getRepeatNotice(count) || '';
  const nextAskAt = prev.ts + SUGGEST_GAP_DAYS * DAY_MS;
  const waitDays = Math.max(1, Math.ceil((nextAskAt - now) / DAY_MS));
  const when = daysAgo === 0 ? '今天早些时候' : `${daysAgo} 天前`;
  return {
    repeat: true,
    count,
    daysAgo,
    tier,
    notice,
    nextAskText: `这件事你${when}问过一次。同一件事不必天天看——牌看的是此刻的局面，局面动了，答案才会变。想再问，等 ${waitDays} 天左右，或者先等一件具体的事发生。`,
    nextAskAt,
  };
}

/** 这句是不是在问"还能不能问 / 隔多久再问" */
export function isTimingQuestion(text) {
  const s = String(text || '');
  if (!s) return false;
  return /再问|还能问|能不能问|隔多久|多久.{0,3}问|什么时候.{0,4}问|过几天|隔几天|重复问|问第二次|问第三次/.test(s);
}

/** 回答"什么时候可以再问"（有记录就给具体天数，没有就给规则） */
export function answerTimingQuestion(question = '', now = Date.now()) {
  const rp = checkRepeatAsk(question, now);
  if (rp.repeat) return rp.nextAskText;
  const recent = getAskLog().filter(x => now - x.ts < REPEAT_WINDOW_DAYS * DAY_MS);
  if (recent.length) {
    return '同一件事七天内别再问第二遍。牌看的是此刻的局面：你今天再抽，抽到的还是这个局面，只是你更想看它变。等十天左右，或者等一件具体的事真的发生了，再来看。';
  }
  return '同一件事不用天天问。局面没动，答案就不会动；真想再问，隔十天以上，或者等一件具体的事发生。';
}

/** 解读开场可能要垫的一句（没有重复就给空串） */
export function repeatPreamble(question, now = Date.now()) {
  const rp = checkRepeatAsk(question, now);
  if (!rp.repeat) return '';
  return `${rp.notice}\n${rp.nextAskText}`;
}
