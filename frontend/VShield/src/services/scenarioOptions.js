/**
 * The scenario's three lists, the app's one copy of each: the type of email
 * (what it asks the person who gets it to do), the motivator (what it leans
 * on to get them to do it) and the target audience. The scenario builder's
 * dropdowns, the saving step (scenarioMapper.js), the Scenarios page filters
 * and the campaign pages all read them, so they cannot drift apart.
 *
 * Each item is { slug, label }: the dropdowns use the slug, a saved
 * scenario or campaign carries the label. The backend (campaigns-api
 * EMAIL_TYPES) checks the email types; a test keeps the two the same.
 * Scenarios saved before these lists keep their own wording, which the
 * dropdowns show as it is (see `optionsWith`).
 */

export const EMAIL_TYPES = Object.freeze([
  { slug: 'click', label: 'Click', short: 'Click' },
  { slug: 'data-entry', label: 'Data Entry', short: 'Data entry' },
  { slug: 'attachment', label: 'Attachment', short: 'Attachment' },
  { slug: 'reply-based', label: 'Reply Based', short: 'Reply' },
  { slug: 'qr-code', label: 'QR Code', short: 'QR code' },
  { slug: 'download', label: 'Download', short: 'Download' },
  { slug: 'consent-authorization', label: 'Consent / Authorization', short: 'Consent' },
  { slug: 'call-callback', label: 'Call / Callback', short: 'Callback' },
  { slug: 'payment-transaction', label: 'Payment / Transaction', short: 'Payment' },
  { slug: 'multi-step', label: 'Multi-Step', short: 'Multi-step' },
].map(Object.freeze));

export const MOTIVATORS = Object.freeze([
  { slug: 'fear', label: 'Fear' },
  { slug: 'urgency', label: 'Urgency' },
  { slug: 'curiosity', label: 'Curiosity' },
  { slug: 'authority', label: 'Authority' },
  { slug: 'reward', label: 'Reward' },
  { slug: 'recognition', label: 'Recognition' },
  { slug: 'opportunity', label: 'Opportunity' },
  { slug: 'job-function', label: 'Job Function' },
  { slug: 'software-update', label: 'Software Update' },
  { slug: 'security-account-alert', label: 'Security / Account Alert' },
  { slug: 'financial', label: 'Financial' },
  { slug: 'social', label: 'Social' },
].map(Object.freeze));

export const TARGET_AUDIENCES = Object.freeze([
  { slug: 'all', label: 'All Employees' },
  { slug: 'managers-leaders', label: 'Managers / Leaders' },
  { slug: 'remote-employees', label: 'Remote Employees' },
  { slug: 'office-employees', label: 'Office Employees' },
  { slug: 'hybrid-employees', label: 'Hybrid Employees' },
  { slug: 'finance-team', label: 'Finance Team' },
  { slug: 'legal-team', label: 'Legal Team' },
  { slug: 'care-teams', label: 'CARE Teams' },
  { slug: 'business-teams', label: 'Business Teams' },
  { slug: 'hr', label: 'HR' },
  { slug: 'senior-leadership', label: 'Senior Leadership' },
  { slug: 'new-joiners', label: 'New Joiners' },
].map(Object.freeze));

/** slug -> label for a list. */
export const labelsOf = (list) => Object.freeze(Object.fromEntries(list.map((x) => [x.slug, x.label])));

/** The labels of a list, in order (filters, the Start fresh dropdowns). */
export const namesOf = (list) => Object.freeze(list.map((x) => x.label));

/**
 * A dropdown's options for a list: { value: slug, label }, plus the current
 * value when the list doesn't hold it (an older scenario's own wording, or a
 * custom value typed with "+"), so editing never loses it.
 */
export function optionsWith(list, current = '') {
  const options = list.map((x) => ({ value: x.slug, label: x.label }));
  return current && !list.some((x) => x.slug === current) ? [...options, { value: current, label: current }] : options;
}

/** What to show for a dropdown value: its label, or (an older or typed-in value) the value itself. */
export const labelFor = (list, value) => list.find((x) => x.slug === value)?.label ?? value ?? '';

/**
 * Options whose value is the label itself, for a form that saves what it
 * shows (the announcement template builder), plus the current value when
 * the list doesn't hold it, so editing never loses it.
 */
export function nameOptions(list, current = '') {
  const options = list.map((x) => ({ value: x.label, label: x.label }));
  return current && !list.some((x) => x.label === current) ? [...options, { value: current, label: current }] : options;
}
