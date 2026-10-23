/**
 * The app's one list of campaign types: what a phishing scenario asks of the
 * person who gets it. The scenario builder offers these, the Scenarios page
 * filters by them, a campaign takes its scenario's (campaignWizard.js), and
 * Insights groups its results by them. The seeded scenarios already use
 * them. Plain module, so services, pages and `node --test` share it.
 *
 * Older scenarios may carry "Phishing Simulation" or "Social Engineering",
 * which the builder offered before; they are kept as they are, never
 * renamed to a type they might not be.
 */
export const CAMPAIGN_TYPES = Object.freeze([
  { slug: 'data-entry', label: 'Data Entry', short: 'Data entry' },
  { slug: 'click', label: 'Click', short: 'Click' },
  { slug: 'credential-theft', label: 'Credential theft', short: 'Credentials' },
  { slug: 'helpdesk-impersonation', label: 'Helpdesk impersonation', short: 'Helpdesk' },
  { slug: 'reward-scam', label: 'Reward scam', short: 'Reward' },
  { slug: 'travel-scam', label: 'Travel scam', short: 'Travel' },
]);

/** slug -> label, for the builder's form and the stored record. */
export const TYPE_LABELS = Object.freeze(Object.fromEntries(CAMPAIGN_TYPES.map((t) => [t.slug, t.label])));

/** The labels, in order: the Scenarios page's filter. */
export const TYPE_NAMES = Object.freeze(CAMPAIGN_TYPES.map((t) => t.label));

/** A type's short name for tight labels ("Credential theft" -> "Credentials"); any other name as it is. */
export const typeShort = (label) => CAMPAIGN_TYPES.find((t) => t.label === label)?.short ?? String(label ?? '').replace(/ lure$/i, '');

/** The builder's options: the six, plus a stored value from before the list, so editing never loses it. */
export function typeOptions(current = '') {
  const options = CAMPAIGN_TYPES.map((t) => ({ value: t.slug, label: t.label }));
  return current && !TYPE_LABELS[current] ? [...options, { value: current, label: current }] : options;
}
