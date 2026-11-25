/**
 * Undo / redo history for one editor page: { stack, index, lastAt }.
 * `stack[index]` is what the page shows; steps after `index` can be redone.
 * Pure: each function returns a new history and never changes its input.
 */

export const MAX_HISTORY_STEPS = 50;
// Keystrokes this close together are one undo step, not one per character.
export const HISTORY_TYPING_MERGE_MS = 1000;

export const newHistory = (html = '') => ({ stack: [html || ''], index: 0, lastAt: 0 });

/** One more step. Typing soon after typing updates the last step instead. */
export function recordStep(history, html, { typing = false, now = Date.now(), max = MAX_HISTORY_STEPS } = {}) {
  const h = history || newHistory('');
  const value = html || '';
  if (h.stack[h.index] === value) return h;
  const atEnd = h.index === h.stack.length - 1;
  if (typing && atEnd && h.index > 0 && h.lastAt && now - h.lastAt < HISTORY_TYPING_MERGE_MS) {
    const stack = [...h.stack];
    stack[h.index] = value;
    return { stack, index: h.index, lastAt: now };
  }
  let stack = [...h.stack.slice(0, h.index + 1), value];
  if (stack.length > max) stack = stack.slice(stack.length - max);
  return { stack, index: stack.length - 1, lastAt: typing ? now : 0 };
}

export const canUndo = (h) => Boolean(h && h.index > 0);
export const canRedo = (h) => Boolean(h && h.index < h.stack.length - 1);

/** The history moved to `step`, or null when there is no such step. */
export function moveTo(h, step) {
  if (!h || step < 0 || step >= h.stack.length) return null;
  return { stack: h.stack, index: step, lastAt: 0 };
}
