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
    out.push({ email, selectable, label: selectable ? email : `${email} (${STATUS_NOTE[status] || 'not verified'})` });
  });
  out.sort((a, b) => Number(b.selectable) - Number(a.selectable) || a.email.localeCompare(b.email));
  const saved = String(current || '').trim();
  if (saved && !seen.has(saved.toLowerCase())) {
    out.unshift({ email: saved, selectable: true, label: `${saved} (not on Email IDs & Domains)` });
  }
  return out;
}

/** True when nobody on the list can be chosen yet. */
export const noVerifiedSender = (choices) => !choices.some((c) => c.selectable && !c.label.endsWith('(not on Email IDs & Domains)'));
