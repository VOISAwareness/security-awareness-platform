import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  START_FRESH_ID,
  WIZARD_STEPS,
  routeForStep,
  stepName,
  savedStep,
  hasProgress,
  shouldOfferResume,
  draftLabel,
  isOwnDraft,
  isCreatedBy,
  isSameScenario,
  scenarioContent,
  hasEditsBeyondScenario,
  templatePatch,
} from './campaignWizard.js';

const PHISH = {
  scenarioId: 'SC-001',
  scenarioName: 'Password Expiry',
  description: 'Password reset lure',
  campaignType: 'Credential Harvest',
  targetAudience: 'All Employees',
  difficulty: 'Low',
  motivator: 'Urgency',
  senderEmailId: 'it@example.com',
  senderName: 'IT Desk',
  emailSubject: 'Your password expires today',
  emailBody: '<p>Reset now</p>',
  landingPageId: 'LP-002',
  trainingId: 'TP-003',
  CoverImageID: 'CovImg-001.png',
};

const PARCEL = {
  ...PHISH,
  scenarioId: 'SC-002',
  scenarioName: 'Parcel Delivery',
  description: 'Courier lure',
  emailSubject: 'Your parcel is waiting',
  emailBody: '<p>Track it</p>',
  landingPageId: 'LP-004',
  trainingId: 'TP-001',
};

// A draft exactly as step 1 leaves it after "Use This" on PHISH.
const fromTemplate = (scenario, extra = {}) => ({
  campaignId: 'CMP-1',
  status: 'DRAFT',
  ...templatePatch(scenario, {}, null),
  ...extra,
});

test('every step has a route, and unknown steps fall back', () => {
  assert.equal(WIZARD_STEPS.length, 6);
  assert.equal(routeForStep(1), '/start-campaign');
  assert.equal(routeForStep(3), '/start-campaign/email');
  assert.equal(routeForStep('6'), '/start-campaign/review');
  assert.equal(routeForStep(undefined, 2), '/start-campaign/details');
  assert.equal(routeForStep(0, 2), '/start-campaign/details');
  assert.equal(routeForStep(7), '/start-campaign');
  assert.equal(routeForStep(2.5, 4), '/start-campaign/landing-page');
});

test('step names match the resume prompt wording', () => {
  assert.deepEqual(
    WIZARD_STEPS.map((s) => stepName(s.step)),
    ['Choose a scenario', 'Details & settings', 'Email', 'Landing page', 'Training', 'Review & publish']
  );
  assert.equal(stepName(9), '');
});

test('savedStep reads wizardStep, else the fallback', () => {
  assert.equal(savedStep({ wizardStep: 4 }), 4);
  assert.equal(savedStep({ wizardStep: '5' }), 5);
  assert.equal(savedStep({}), 2);
  assert.equal(savedStep({ wizardStep: 99 }, 1), 1);
  assert.equal(savedStep(null), 2);
});

test('hasProgress: a step past 1, a scenario, or a title', () => {
  assert.equal(hasProgress(null), false);
  assert.equal(hasProgress({ campaignId: 'CMP-1', status: 'DRAFT' }), false);
  assert.equal(hasProgress({ wizardStep: 1 }), false);
  assert.equal(hasProgress({ campaignTitle: '   ' }), false);
  assert.equal(hasProgress({ wizardStep: 2 }), true);
  assert.equal(hasProgress({ scenarioId: 'SC-001' }), true);
  assert.equal(hasProgress({ campaignTitle: 'Q3 drill' }), true);
});

test('resume is offered only for an editable draft with progress', () => {
  assert.equal(shouldOfferResume({ status: 'DRAFT', wizardStep: 3 }), true);
  assert.equal(shouldOfferResume({ status: 'REJECTED', scenarioId: 'SC-001' }), true);
  assert.equal(shouldOfferResume({ wizardStep: 3 }), true);
  assert.equal(shouldOfferResume({ status: 'PENDING_APPROVAL', wizardStep: 6 }), false);
  assert.equal(shouldOfferResume({ status: 'DRAFT' }), false);
  assert.equal(shouldOfferResume(null), false);
});

test('draftLabel prefers the title, then the scenario name', () => {
  assert.equal(draftLabel({ campaignTitle: 'Q3 drill', scenarioName: 'X' }), 'Q3 drill');
  assert.equal(draftLabel({ campaignTitle: ' ', scenarioName: 'Parcel Delivery' }), 'Parcel Delivery');
  assert.equal(draftLabel({}), 'Untitled campaign');
});

test('ownership is compared case-insensitively', () => {
  assert.equal(isOwnDraft({ createdBy: 'Alice@Example.com' }, 'alice@example.com'), true);
  assert.equal(isOwnDraft({ createdBy: 'bob@example.com' }, 'alice@example.com'), false);
  // Older rows have no owner: openable, but never adopted from the shared pointer.
  assert.equal(isOwnDraft({}, 'alice@example.com'), true);
  assert.equal(isCreatedBy({}, 'alice@example.com'), false);
  assert.equal(isCreatedBy({ createdBy: 'ALICE@example.com ' }, 'alice@example.com'), true);
  assert.equal(isCreatedBy({ createdBy: 'bob@example.com' }, 'alice@example.com'), false);
});

test('isSameScenario', () => {
  assert.equal(isSameScenario({ scenarioId: 'SC-001' }, 'SC-001'), true);
  assert.equal(isSameScenario({ scenarioId: 'SC-001' }, 'SC-002'), false);
  assert.equal(isSameScenario({}, 'SC-001'), false);
  assert.equal(isSameScenario({ scenarioId: START_FRESH_ID, isStartFresh: true }, START_FRESH_ID), true);
  assert.equal(isSameScenario(null, 'SC-001'), false);
});

test('picking a scenario copies its content into the campaign', () => {
  const patch = templatePatch(PHISH, {}, null);
  assert.equal(patch.scenarioId, 'SC-001');
  assert.equal(patch.isStartFresh, false);
  assert.equal(patch.campaignTitle, 'Password Expiry');
  assert.equal(patch.emailSubject, PHISH.emailSubject);
  assert.equal(patch.landingPageId, 'LP-002');
  assert.equal(patch.trainingId, 'TP-003');
  // A previous template's landing page / training copy never leaks across.
  assert.equal(patch.landingPageContent, '');
  assert.equal(patch.trainingPathAttachedByUser, false);
});

test('the template is copied, never mutated', () => {
  const before = JSON.stringify(PHISH);
  const patch = templatePatch(PHISH, { campaignTitle: 'Mine' }, PARCEL);
  patch.emailSubject = 'edited';
  assert.equal(JSON.stringify(PHISH), before);
});

test('the user’s own title survives a template switch; a template title does not', () => {
  const typed = templatePatch(PARCEL, { campaignTitle: 'Q3 drill', campaignDescription: 'Mine' }, PHISH);
  assert.equal(typed.campaignTitle, 'Q3 drill');
  assert.equal(typed.campaignDescription, 'Mine');

  const auto = templatePatch(PARCEL, fromTemplate(PHISH), PHISH);
  assert.equal(auto.campaignTitle, 'Parcel Delivery');
  assert.equal(auto.campaignDescription, 'Courier lure');
});

test('Start fresh blanks the content but keeps the user’s own title', () => {
  const patch = templatePatch({ scenarioId: START_FRESH_ID }, { campaignTitle: 'Q3 drill' }, PHISH);
  assert.equal(patch.isStartFresh, true);
  assert.equal(patch.scenarioId, START_FRESH_ID);
  assert.equal(patch.campaignTitle, 'Q3 drill');
  assert.deepEqual(scenarioContent(null), {
    senderEmailId: '', senderName: '', emailSubject: '', emailBody: '', landingPageId: '', trainingId: '',
  });
  assert.equal(patch.emailBody, '');
  assert.equal(templatePatch(null, fromTemplate(PHISH), PHISH).campaignTitle, '');
});

test('no edits: a fresh draft, or one still exactly as its template left it', () => {
  assert.equal(hasEditsBeyondScenario({ campaignId: 'CMP-1', status: 'DRAFT' }, null), false);
  assert.equal(hasEditsBeyondScenario(fromTemplate(PHISH), PHISH), false);
  assert.equal(hasEditsBeyondScenario(fromTemplate(PHISH, { wizardStep: 2 }), PHISH), false);
  // Step 3 trims on save; whitespace alone is not an edit.
  assert.equal(
    hasEditsBeyondScenario(fromTemplate(PHISH, { senderName: ' IT Desk ' }), PHISH),
    false
  );
  assert.equal(hasEditsBeyondScenario(fromTemplate({ scenarioId: START_FRESH_ID }), null), false);
});

test('edits: a later step reached, or template content changed', () => {
  assert.equal(hasEditsBeyondScenario(fromTemplate(PHISH, { wizardStep: 3 }), PHISH), true);
  assert.equal(hasEditsBeyondScenario(fromTemplate(PHISH, { emailSubject: 'Mine' }), PHISH), true);
  assert.equal(hasEditsBeyondScenario(fromTemplate(PHISH, { emailBody: '<p>x</p>' }), PHISH), true);
  assert.equal(hasEditsBeyondScenario(fromTemplate(PHISH, { landingPageId: 'LP-009' }), PHISH), true);
  assert.equal(hasEditsBeyondScenario(fromTemplate(PHISH, { trainingId: 'TP-009' }), PHISH), true);
  assert.equal(hasEditsBeyondScenario(fromTemplate(PHISH, { landingPageContent: '<div/>' }), PHISH), true);
  assert.equal(hasEditsBeyondScenario(fromTemplate(PHISH, { trainingPathAttachedByUser: true }), PHISH), true);
  assert.equal(
    hasEditsBeyondScenario(fromTemplate({ scenarioId: START_FRESH_ID }, { emailSubject: 'Hi' }), null),
    true
  );
});

test('edits: a template that can no longer be found counts any content', () => {
  assert.equal(hasEditsBeyondScenario(fromTemplate(PHISH), null), true);
  assert.equal(hasEditsBeyondScenario({ scenarioId: 'SC-404' }, null), false);
});
