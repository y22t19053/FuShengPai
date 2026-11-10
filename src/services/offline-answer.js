// ===== src/services/offline-answer.js · 没接 AI 时的兜底答复 =====
// 依据：占卜经验档案（问事校准 · 拒绝替人做决定 · 一句体系内解释）。
// 标准：四铁律——不讲古词、不装逼、不扒用户、不鸡汤；宁可少说，不说装懂。
// 取句：先点出问题里的打折点，再给一句按牌面的收尾，最后说清怎么接上 AI。

import { readQuestion } from '../texts/texts-asking.js';
import { pickClosing, normalizeField } from '../texts/reading-frame.js';
import { isTimingQuestion, answerTimingQuestion } from './repeat-ask.js';

// 离线模式的统一说明（放在解读末尾，别放在开头抢戏）
export const OFFLINE_NOTE = '（这段是按牌面规则推的，没连 AI。想看更细的，可以到「AI」里接一个模型：云端填 Key，本机装 Ollama 可以免 Key。）';

// 没有 AI 时回答追问：只用规则里能站得住的部分
export function offlineFollowUpText(question, opts = {}) {
  const q = String(question || '').trim();
  const field = normalizeField(opts.field || opts.category || '');
  const lines = [];

  // 「过段时间再问 / 还能再问吗」——这类问题规则里答得了，不必往牌上推
  if (isTimingQuestion(q)) {
    return `${answerTimingQuestion(opts.origin || q)}\n${OFFLINE_NOTE}`;
  }

  const rq = readQuestion(q);
  const hints = Array.isArray(rq.hints) ? rq.hints.slice(0, 2) : [];
  if (hints.length) {
    lines.push('你这一问，按规则只能读成一个平均值：');
    for (const h of hints) {
      const text = typeof h === 'string' ? h : (h?.text || '');
      const label = typeof h === 'string' ? '' : (h?.label || '');
      if (text) lines.push(label ? `· ${label}：${text}` : `· ${text}`);
    }
  }

  const closing = pickClosing(field, q || String(opts.seed || 'offline'));
  if (closing) lines.push(closing);

  lines.push(OFFLINE_NOTE);
  return lines.join('\n');
}

// 解读末尾补一句：告诉人这段是怎么来的，以及下一步能怎么走
export function withOfflineNote(text) {
  const body = String(text || '').trim();
  if (!body) return OFFLINE_NOTE;
  if (body.includes('没连 AI')) return body;
  return `${body}\n${OFFLINE_NOTE}`;
}
