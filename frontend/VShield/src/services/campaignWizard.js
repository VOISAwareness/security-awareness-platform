/**
 * campaignWizard — pure helpers for the 6-step campaign wizard.
 *
 * Kept free of React and browser APIs so the rules that decide whether a user's
 * work is resumed, kept or replaced can be unit-tested (campaignWizard.test.mjs).
 *
 *  - Where each step lives, and the step the draft was last saved on
 *    (`wizardStep`, stored on the server draft like any other field).
 *  - Whether a draft has enough in it to be worth offering "Continue".
 *  - What picking a scenario copies into the campaign, and whether doing so
 *    would overwrite edits the user made in the later steps.
 *
 * Templates are never written from here: a template is copied into the
 * campaign draft, and edits only ever change that copy.
 */
import { isEditable } from './campaignStatus.js';

export const START_FRESH_ID = 'start-fresh';

/**
 * navigate() options for every move between wizard steps. Step 1 only asks
 * "Continue your campaign?" on a fresh entry (the sidebar, Home), never when the
 * user arrives from inside the wizard or from a Drafts "Resume".
 */
export const IN_WIZARD = { state: { fromWizard: true } };

export const WIZARD_STEPS = [
  { step: 1, name: 'Choose a scenario', path: '/start-campaign' },
  { step: 2, name: 'Details & settings', path: '/start-campaign/details' },
  { step: 3, name: 'Email', path: '/start-campaign/email' },
  { step: 4, name: 'Landing page', path: '/start-campaign/landing-page' },
  { step: 5, name: 'Training', path: '/start-campaign/training' },
  { step: 6, name: 'Review & publish', path: '/start-campaign/review' },
];

/** A valid step number (1-6), or null for anything else. */
export function toStep(value) {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= WIZARD_STEPS.length ? n : null;
}

/** The route for a step; an unknown step falls back to `fallback`. */
export function routeForStep(step, fallback = 1) {
  const n = toStep(step) || toStep(fallback) || 1;
  return WIZARD_STEPS[n - 1].path;
}

export function stepName(step) {
  const n = toStep(step);
  return n ? WIZARD_STEPS[n - 1].name : '';
}

/**
 * The step a draft was last saved on. Drafts saved before `wizardStep` existed
 * reopen on Details & settings, as the Drafts tab always did.
 */
export function savedStep(draft, fallback = 2) {
  return toStep(draft?.wizardStep) || toStep(fallback) || 1;
}

/** Has the user done anything in this draft that would be lost by starting over? */
export function hasProgress(draft) {
  if (!draft) return false;
  return (
    (toStep(draft.wizardStep) || 1) > 1 ||
    Boolean(draft.scenarioId) ||
    String(draft.campaignTitle || '').trim() !== ''
  );
}

/** Offer "Continue your campaign?" only for an editable draft with progress. */
export function shouldOfferResume(draft) {
  return Boolean(draft) && isEditable(draft.status || 'DRAFT') && hasProgress(draft);
}

/** Title for the resume prompt: the campaign title, else the scenario name. */
export function draftLabel(draft) {
  return (
    String(draft?.campaignTitle || '').trim() ||
    String(draft?.scenarioName || '').trim() ||
    'Untitled campaign'
  );
}

const lower = (v) => String(v || '').trim().toLowerCase();

/** A draft with no recorded owner (older rows) belongs to whoever opens it. */
export function isOwnDraft(draft, actor) {
  return !draft?.createdBy || lower(draft.createdBy) === lower(actor);
}

/** Stricter: only a draft recorded as created by `actor`. Used to adopt the old shared pointer. */
export function isCreatedBy(draft, actor) {
  return Boolean(draft?.createdBy) && lower(draft.createdBy) === lower(actor);
}

export function isSameScenario(draft, scenarioId) {
  if (!draft || !scenarioId) return false;
  if (scenarioId === START_FRESH_ID && draft.isStartFresh === true) return true;
  return Boolean(draft.scenarioId) && draft.scenarioId === scenarioId;
}

// What a template contributes to the email, landing page and training steps.
export const TEMPLATE_CONTENT_FIELDS = [
  'senderEmailId',
  'senderName',
  'emailSubject',
  'emailBody',
  'landingPageId',
  'trainingId',
];

/** The email / landing page / training a scenario copies into a campaign. */
export function scenarioContent(scenario) {
  if (!scenario || scenario.scenarioId === START_FRESH_ID) {
    return {
      senderEmailId: '',
      senderName: '',
      emailSubject: '',
      emailBody: '',
      landingPageId: '',
      trainingId: '',
    };
  }
  return {
    senderEmailId: scenario.senderEmailId || '',
    senderName: scenario.senderName || '',
    emailSubject: scenario.emailSubject || '',
    emailBody: scenario.emailBody || '',
    landingPageId: scenario.landingPageId || 'LP-001',
    trainingId: scenario.trainingId || 'TP-001',
  };
}

const norm = (v) => String(v ?? '').trim();

/**
 * Would replacing this draft's template lose the user's own work in steps 3-5?
 *
 * `previous` is the scenario the draft was built from (null when it can no
 * longer be found). Anything that differs from what that template copied in is
 * treated as the user's edit. When the template is unknown, any content counts.
 */
export function hasEditsBeyondScenario(draft, previous = null) {
  if (!draft) return false;
  if ((toStep(draft.wizardStep) || 1) > 2) return true;
  // Steps 4 and 5 store their own copy / explicit choice once visited.
  if (norm(draft.landingPageContent) || draft.landingPageAttachedByUser || draft.trainingPathAttachedByUser) {
    return true;
  }
  const noTemplate = !draft.scenarioId || draft.scenarioId === START_FRESH_ID;
  const base = previous ? scenarioContent(previous) : noTemplate ? scenarioContent(null) : null;
  return TEMPLATE_CONTENT_FIELDS.some((k) =>
    base ? norm(draft[k]) !== norm(base[k]) : norm(draft[k]) !== ''
  );
}

/**
 * Is this title / description the user's own? Step 2 flags what the user typed
 * (`campaignTitleSetByUser` / `campaignDescriptionSetByUser`). Drafts saved
 * before the flag existed fall back to: anything other than the wording the
 * previous template filled in.
 */
export function isOwnText(value, setByUser, fromTemplate) {
  return norm(value) !== '' && (setByUser === true || norm(value) !== norm(fromTemplate));
}

/**
 * What step 2 shows in its Title / Description box. Text the user typed always
 * shows. Unflagged text that is only a scenario's own name / description (the
 * template's wording) is hidden, so the box starts empty as designed.
 */
export function detailsFieldValue(value, setByUser, templateTexts = []) {
  const text = String(value ?? '');
  if (!norm(text)) return '';
  if (setByUser === true) return text;
  return templateTexts.some((t) => norm(t) && norm(t) === norm(text)) ? '' : text;
}

/**
 * The patch that copies `scenario` (or Start fresh) into the draft. The email,
 * landing page and training become the template's; copies of the previous
 * template's landing page and training are dropped so steps 4 and 5 load the
 * new template's. The user's own title and description are never touched;
 * only wording the previous template filled in follows the new choice.
 */
export function templatePatch(scenario, draft = {}, previous = null) {
  const ownTitle = isOwnText(draft?.campaignTitle, draft?.campaignTitleSetByUser, previous?.scenarioName);
  const ownDescription = isOwnText(
    draft?.campaignDescription,
    draft?.campaignDescriptionSetByUser,
    previous?.description
  );
  const reset = {
    landingPageName: '',
    landingPageContent: '',
    landingPageAttachedByUser: false,
    trainingPathName: '',
    trainingPathAttachedByUser: false,
    // The new template's body replaces any body picked from the library.
    emailBodySourceId: '',
  };

  if (!scenario || scenario.scenarioId === START_FRESH_ID) {
    return {
      isStartFresh: true,
      scenarioId: START_FRESH_ID,
      scenarioName: 'Start Fresh',
      // Only the previous template's wording is cleared, never the user's.
      ...(ownTitle ? {} : { campaignTitle: '' }),
      ...(ownDescription ? {} : { campaignDescription: '' }),
      campaignType: 'Custom',
      targetAudience: 'All Employees',
      difficulty: 'Medium',
      motivator: '',
      ...scenarioContent(null),
      ...reset,
      CoverImageID: '',
    };
  }

  return {
    isStartFresh: false,
    scenarioId: scenario.scenarioId,
    scenarioName: scenario.scenarioName,
    ...(ownTitle ? {} : { campaignTitle: scenario.scenarioName || draft?.campaignTitle || '' }),
    ...(ownDescription ? {} : { campaignDescription: scenario.description || draft?.campaignDescription || '' }),
    campaignType: scenario.campaignType,
    targetAudience: scenario.targetAudience,
    difficulty: scenario.difficulty,
    motivator: scenario.motivator,
    ...scenarioContent(scenario),
    ...reset,
    CoverImageID: scenario.CoverImageID,
  };
}
