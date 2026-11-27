// The Sender Email ID choices in the campaign wizard (Campaign Email step):
// the addresses on Email IDs & Domains, where SES verifies each one. Only a
// verified address can be chosen, since SES will only send from those; the
// others are listed, greyed, with their state, so it is clear why.

const STATUS_NOTE = {
  Pending: 'verification pending',
  Failed: 'verification failed',
  'Not verified': 'not verified',
  Unknown: 'status unavailable',
};

/**
 * `rows` from GET /sender-identities, `current` the campaign's saved sender.
 * Returns [{ email, selectable, label }], choosable ones first. An API from
 * before SES verification sends no `verificationStatus`; then every row is
 * choosable, as before. A saved sender no longer on the list stays, so a
 * draft never loses it silently.
 */
/**
 * When an Email ID was added, as a time to sort by (NaN if unknown). Rows
 * carry a day, written "27 Nov 2026" or "17th July 2026".
 */
export function addedTime(value) {
  const text = String(value || '').replace(/(\d+)(st|nd|rd|th)\b/i, '$1').trim();
  return text ? Date.parse(text) : NaN;
}

/**
 * Choices by when they were added: 'newest' or 'oldest' first. Ones that can
 * be picked stay above ones that can't; undated ones go last; same day, A-Z.
 */
export function sortByAdded(choices, order) {
  if (order !== 'newest' && order !== 'oldest') return choices;
  const dir = order === 'newest' ? -1 : 1;
  return [...choices].sort((a, b) => {
    if (a.selectable !== b.selectable) return Number(b.selectable) - Number(a.selectable);
    const known = Number(Number.isNaN(a.addedAt ?? NaN)) - Number(Number.isNaN(b.addedAt ?? NaN));
    if (known) return known;
    return ((a.addedAt || 0) - (b.addedAt || 0)) * dir || a.email.localeCompare(b.email);
  });
}

export function senderChoices(rows, current = '') {
  const list = (Array.isArray(rows) ? rows : []).filter((r) => r && typeof r.email === 'string' && r.email.trim());
  const knowsStatus = list.some((r) => 'verificationStatus' in r);
  const seen = new Set();
  const out = [];
  list.forEach((r) => {
    const email = r.email.trim();
    if (seen.has(email.toLowerCase())) return;
    seen.add(email.toLowerCase());
    const status = r.verificationStatus || 'Not verified';
    const selectable = !knowsStatus || status === 'Verified';
    out.push({
      email,
      selectable,
      label: selectable ? email : `${email} (${STATUS_NOTE[status] || 'not verified'})`,
      addedAt: addedTime(r.createdDate || r.createdAt),
    });
  });
  out.sort((a, b) => Number(b.selectable) - Number(a.selectable) || a.email.localeCompare(b.email));
  const saved = String(current || '').trim();
  if (saved && !seen.has(saved.toLowerCase())) {
    out.unshift({ email: saved, selectable: true, label: `${saved} (not on Email IDs & Domains)`, addedAt: NaN });
  }
  return out;
}

/** True when nobody on the list can be chosen yet. */
export const noVerifiedSender = (choices) => !choices.some((c) => c.selectable && !c.label.endsWith('(not on Email IDs & Domains)'));
