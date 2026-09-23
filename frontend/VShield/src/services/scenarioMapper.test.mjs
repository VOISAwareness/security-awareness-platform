/**
 * Tests for the scenario wizard <-> stored record translation.
 *
 * Why this module: the wizard and the API speak different vocabularies, and the
 * wizard's formData also carries unserialisable scratch state (a raw File, blob
 * preview URLs, a large resolved training object). If any of that leaks into a
 * POST body the save fails opaquely, and if an enum stops mapping the list
 * screen silently renders slugs like "social-engineering" to end users.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  STORED_FIELDS,
  catalogueCoverName,
  toStoredScenario,
  toWizardFormData,
} from './scenarioMapper.js';

const fullForm = {
  scenarioId: 'SC-500',
  scenarioName: 'Quarterly benefits check',
  description: 'A lure about benefits enrolment.',
  type: 'phishing',
  targetAudience: 'remote-hybrid',
  motivator: 'urgency',
  difficulty: 'high',
  emailId: 'noreply@example.com',
  senderName: 'Benefits Desk',
  emailSubject: 'Confirm your selection',
  emailBody: '<p>Hello {{userName}}</p>',
  trainingPathCode: 'TP-00002',
  landingPageId: 'LP-002',
};

test('emits exactly the stored fields and nothing else', () => {
  const record = toStoredScenario(fullForm, { coverImageId: 'CovImg-001.png' });
  assert.deepEqual(new Set(Object.keys(record)), new Set(STORED_FIELDS.filter((f) => f !== 'CreatedOn')));
});

test('maps the wizard slugs to display labels', () => {
  const record = toStoredScenario(fullForm);
  assert.equal(record.campaignType, 'Phishing Simulation');
  assert.equal(record.targetAudience, 'Remote / Hybrid users');
  assert.equal(record.motivator, 'Urgency');
  assert.equal(record.difficulty, 'High');
});

test('renames the fields the API expects under other names', () => {
  const record = toStoredScenario(fullForm);
  assert.equal(record.senderEmailId, 'noreply@example.com');
  assert.equal(record.trainingId, 'TP-00002');
});

test('never leaks wizard-only scratch state into the record', () => {
  const record = toStoredScenario({
    ...fullForm,
    coverImage: { name: 'x.png' }, // stands in for a File
    coverImagePreview: 'blob:http://localhost/abc',
    selectedTrainingPath: { resolvedVideos: [1, 2, 3] },
    outcomeRichText: '<p>big</p>',
    landingPageContent: '<html>big</html>',
    individualTraining: { videos: [] },
  });
  for (const leaked of [
    'coverImage',
    'coverImagePreview',
    'selectedTrainingPath',
    'outcomeRichText',
    'landingPageContent',
    'individualTraining',
  ]) {
    assert.ok(!(leaked in record), `${leaked} must not be persisted`);
  }
});

test('omits CreatedOn when absent so the server stamps it', () => {
  // The Lambda uses setdefault, which keeps a present-but-empty value.
  assert.ok(!('CreatedOn' in toStoredScenario(fullForm)));
  assert.equal(toStoredScenario({ ...fullForm, CreatedOn: '2-Jan-26' }).CreatedOn, '2-Jan-26');
});

test('an uploaded cover key wins over anything already on the form', () => {
  const record = toStoredScenario(
    { ...fullForm, CoverImageID: 'stale.png' },
    { coverImageId: 'uploads/scenario-covers/SC-500/new.png' }
  );
  assert.equal(record.CoverImageID, 'uploads/scenario-covers/SC-500/new.png');
});

test('a freshly created landing page id wins over the form value', () => {
  const record = toStoredScenario(fullForm, { landingPageId: 'LP-099' });
  assert.equal(record.landingPageId, 'LP-099');
});

test('missing fields become empty strings, never undefined', () => {
  const record = toStoredScenario({});
  for (const value of Object.values(record)) assert.equal(typeof value, 'string');
});

test('round-trips the wizard vocabulary', () => {
  const back = toWizardFormData(toStoredScenario(fullForm));
  for (const field of ['type', 'targetAudience', 'motivator', 'difficulty']) {
    assert.equal(back[field], fullForm[field]);
  }
  assert.equal(back.emailId, fullForm.emailId);
  assert.equal(back.trainingPathCode, fullForm.trainingPathCode);
});

test('passes through seeded values the wizard never offers', () => {
  // The seed data carries "Credential theft" and "Finance Workers"; forcing
  // those onto a wizard slug would misdescribe the scenario.
  const back = toWizardFormData({
    campaignType: 'Credential theft',
    targetAudience: 'Finance Workers',
  });
  assert.equal(back.type, 'Credential theft');
  assert.equal(back.targetAudience, 'Finance Workers');
});

test('catalogueCoverName reduces a bundler path to a filename', () => {
  assert.equal(catalogueCoverName('src/Pages/Scenarios/CovImg-001.png'), 'CovImg-001.png');
  assert.equal(catalogueCoverName('CovImg-002.png'), 'CovImg-002.png');
  assert.equal(catalogueCoverName(undefined), '');
});
