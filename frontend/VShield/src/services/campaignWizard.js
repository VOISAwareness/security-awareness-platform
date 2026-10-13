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

/**
 * navigate() options for going back from step 2 to step 1 (also the history
 * entry browser Back returns to): the user is still working on the same
 * campaign, so a template picked there changes that campaign. Anywhere else a
 * template on step 1 starts a new campaign (see templatePick).
 */
export const BACK_TO_STEP_1 = { state: { fromWizard: true, editingCampaign: true } };

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

const norm = (v) => String(v ?? '').trim();

/**
 * Has the user put anything of their own into this draft, so that it is worth
 * offering back ("Continue your campaign?") and listing under Drafts?
 *
 * A campaign only opened from a template (or Start fresh) holds nothing but
 * what the template filled in, so it is neither, and the next template simply
 * reuses it (templatePick). The user's own work starts with a title or
 * description they typed, a schedule, the test-campaign or auto-end ticks
 * changed, anything from step 3 on (getting past step 2 takes a title,
 * description and start time), or "Save as draft".
 */
export function hasProgress(draft) {
  if (!draft) return false;
  if ((toStep(draft.wizardStep) || 1) > 2) return true;
  if (draft.savedAsDraft === true) return true;
  if (draft.campaignTitleSetByUser === true || draft.campaignDescriptionSetByUser === true) return true;
  // Older drafts did not flag typed text: a title other than the template's name is the user's.
  const title = norm(draft.campaignTitle);
  if (title && title !== norm(draft.scenarioName)) return true;
  if (norm(draft.startTime) || norm(draft.endTime) || norm(draft.selectedListId)) return true;
  if (Array.isArray(draft.testRecipientEmails) && draft.testRecipientEmails.length) return true;
  if (draft.isTestCampaign === true || draft.autoEndPostSending === false) return true;
  return Boolean(norm(draft.landingPageContent) || draft.landingPageAttachedByUser || draft.trainingPathAttachedByUser);
}

/** Offer "Continue your campaign?" only for an editable draft with the user's own work in it. */
export function shouldOfferResume(draft) {
  return Boolean(draft) && isEditable(draft.status || 'DRAFT') && hasProgress(draft);
}

/** When a campaign was last saved: updated, else created ('' if neither is known). */
export function lastSaved(campaign) {
  return String(campaign?.updatedAt || campaign?.LastModified || campaign?.createdAt || campaign?.CreationDate || '');
}

/** Drafts, the one saved most recently first (a copy; the list is not changed). */
export function latestSavedFirst(drafts = []) {
  return [...drafts].sort((a, b) => lastSaved(b).localeCompare(lastSaved(a)));
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
 * What picking a template (or Start fresh) on step 1 does, given the campaign
 * in progress (`draft`) and the template it was built from (`previous`):
 *  'new'     start a new campaign from the template, leaving the one in
 *            progress as it is under Drafts. Always, unless the user came
 *            back from step 2 (`editing`): still working on this campaign,
 *            the template changes it, as one of:
 *  'same'    already this campaign's template: carry on, every edit kept
 *  'confirm' another template over the user's own edits: ask first
 *  'apply'   another template with nothing of the user's to lose (also when
 *            nothing is in progress: it fills the new, blank campaign, or the
 *            one only opened from a template, which it reuses)
 */
export function templatePick({ editing = false, draft, scenarioId, previous = null }) {
  if (!draft?.campaignId) return 'apply';
  // Reused only when nothing in it is the user's, their email, landing page and
  // training included.
  if (!shouldOfferResume(draft) && !hasEditsBeyondScenario(draft, previous)) return 'apply';
  if (!editing) return 'new';
  if (isSameScenario(draft, scenarioId)) return 'same';
  if (hasEditsBeyondScenario(draft, previous)) return 'confirm';
  return 'apply';
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
