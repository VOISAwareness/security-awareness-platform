/**
 * testRecipients — a test campaign (the "test campaign" tick on Details &
 * settings) is sent only to email IDs its author adds one by one, picked from
 * the user directory or typed, never to a recipient list. They are stored on
 * the campaign as `testRecipientEmails`.
 *
 * The approval Lambda (submit checks) and the email sender apply the same
 * rules, MAX_TEST_RECIPIENTS included.
 */
export const MAX_TEST_RECIPIENTS = 10;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const key = (email) => String(email ?? '').trim().toLowerCase();

/** The "test campaign" tick: a real boolean, or "true" as text. */
export function isTestCampaign(campaign) {
  const value = campaign?.isTestCampaign;
  return value === true || (typeof value === 'string' && value.trim().toLowerCase() === 'true');
}

/**
 * A test campaign with its own email IDs (`testRecipientEmails`, written by the
 * email step). Test campaigns saved before that field existed have none and
 * keep their recipient list.
 */
export function usesTestRecipients(campaign) {
  return isTestCampaign(campaign) && Array.isArray(campaign?.testRecipientEmails);
}

/** The campaign's test email IDs, trimmed, with blanks and repeats dropped. */
export function testRecipientEmails(campaign) {
  const raw = campaign?.testRecipientEmails;
  if (!Array.isArray(raw)) return [];
  const seen = new Set();
  const out = [];
  for (const value of raw) {
    const email = String(value ?? '').trim();
    if (!email || seen.has(key(email))) continue;
    seen.add(key(email));
    out.push(email);
  }
  return out;
}

/**
 * Add one email ID. -> { list, error }: the new list, or the unchanged one and
 * what to tell the user.
 */
export function addTestRecipient(list, value) {
  const current = Array.isArray(list) ? list : [];
  const email = String(value ?? '').trim();
  if (!email) return { list: current, error: 'Type an email ID to add' };
  if (!EMAIL.test(email)) return { list: current, error: `"${email}" is not a valid email ID` };
  if (current.some((e) => key(e) === key(email))) return { list: current, error: `${email} is already added` };
  if (current.length >= MAX_TEST_RECIPIENTS) {
    return { list: current, error: `A test campaign can have at most ${MAX_TEST_RECIPIENTS} email IDs` };
  }
  return { list: [...current, email], error: '' };
}

/** Remove one email ID (any case). */
export function removeTestRecipient(list, email) {
  return (Array.isArray(list) ? list : []).filter((e) => key(e) !== key(email));
}
