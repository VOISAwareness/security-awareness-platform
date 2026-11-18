/**
 * The app's campaign types: the type of email a scenario sends, from the
 * one list in scenarioOptions.js. The scenario builder offers these, the
 * Scenarios page filters by them, a campaign takes its scenario's
 * (campaignWizard.js), Start fresh asks for one, and Insights groups its
 * results by them. Plain module, so services, pages and `node --test`
 * share it.
 *
 * Scenarios and campaigns saved earlier may carry an older name ("Credential
 * theft", "Travel scam", "Phishing Simulation"…); they are shown as they
 * are, never renamed here (a one-off script moves them to the new names).
 */
import { EMAIL_TYPES, labelsOf, namesOf, optionsWith } from './scenarioOptions.js';

export const CAMPAIGN_TYPES = EMAIL_TYPES;

/** slug -> label, for the builder's form and the stored record. */
export const TYPE_LABELS = labelsOf(EMAIL_TYPES);

/** The labels, in order: the Scenarios page's filter and Start fresh. */
export const TYPE_NAMES = namesOf(EMAIL_TYPES);

/** A type's short name for tight labels ("Consent / Authorization" -> "Consent"); any other name as it is. */
export const typeShort = (label) => EMAIL_TYPES.find((t) => t.label === label)?.short ?? String(label ?? '').replace(/ lure$/i, '');

/** The builder's options: the ten, plus a stored value from before the list, so editing never loses it. */
export const typeOptions = (current = '') => optionsWith(EMAIL_TYPES, current);
