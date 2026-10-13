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
  coverKeyFromUrl,
  landingPageChoice,
  toEditFormData,
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

test('landingPageChoice links a catalogue pick by its id (the template is never edited)', () => {
  assert.deepEqual(
    landingPageChoice({ landingPageSource: 'catalogue', selectedLandingCatalogueImageId: 'LP-007', landingPageContent: '<p>x</p>' }),
    { kind: 'catalogue', id: 'LP-007' }
  );
});

test('landingPageChoice turns a designed or built page into a new page to create', () => {
  assert.deepEqual(
    landingPageChoice({ outcomeSource: 'custom', outcomeRichText: '<h1>Mine</h1>' }),
    { kind: 'custom', html: '<h1>Mine</h1>' }
  );
  assert.deepEqual(
    landingPageChoice({ landingPageSource: 'builder', landingPageContent: '<div>Built</div>' }),
    { kind: 'custom', html: '<div>Built</div>' }
  );
});

test('landingPageChoice falls back to the carried id, ignoring blank designs', () => {
  assert.deepEqual(landingPageChoice({ outcomeSource: 'custom', outcomeRichText: '   ' }), { kind: 'none', id: '' });
  assert.deepEqual(landingPageChoice({ landingPageId: 'LP-002' }), { kind: 'none', id: 'LP-002' });
  assert.deepEqual(landingPageChoice(), { kind: 'none', id: '' });
});

// --- editing a stored scenario ---------------------------------------------------

const CATALOGUES = {
  coverImages: [
    { id: 1, title: 'Password Verification', image: 'src/Pages/Scenarios/CovImg-001.png' },
    { id: 4, title: 'Microsoft Login', image: 'src/Pages/Scenarios/CovImg-004.png' },
  ],
  landingPages: [{ LandingPageID: 'LP-002', LandingPageName: 'Red Flag', LandingPageContent: '<h2>Red</h2>' }],
  trainingPaths: [
    {
      TrainingPathID: 'TP-00002',
      TrainingPathName: 'BEC Defense',
      Description: 'Wire fraud',
      Duration: '20 min',
      TrainingVideoAttached: ['TV-1', 'TV-2', 'TV-3'],
      TrainingQuizAttached: ['TQ-1'],
      TrainingCertificateAttached: ['TC-1'],
    },
  ],
  trainingQuizzes: [{ TrainingQuizID: 'TQ-1', TrainingCompletionThreshold: 75, QuizData: { q1: {}, q2: {} } }],
};
const stored = (fields = {}) => ({ ...toStoredScenario(fullForm), CoverImageID: 'CovImg-004.png', ...fields });

test('coverKeyFromUrl turns a presigned uploads URL back into its key', () => {
  const key = 'uploads/scenario-covers/SC-1/a b.png';
  assert.equal(
    coverKeyFromUrl('https://bucket.s3.ap-south-1.amazonaws.com/uploads/scenario-covers/SC-1/a%20b.png?X-Amz-Signature=x'),
    key
  );
  assert.equal(coverKeyFromUrl('https://s3.ap-south-1.amazonaws.com/bucket/uploads/x/y.png?X-Amz-Date=1'), 'uploads/x/y.png');
  for (const same of ['CovImg-001.png', 'uploads/x/y.png', 'https://example.com/a.png', 'https://b.s3.amazonaws.com/other/a.png?X-Amz-S=1', '', undefined]) {
    assert.equal(coverKeyFromUrl(same), same);
  }
});

test('editing prefills the wizard, with the selections it can show again', () => {
  const form = toEditFormData(stored(), CATALOGUES);
  assert.equal(form.scenarioId, 'SC-500');
  assert.equal(form.type, 'phishing');
  assert.equal(form.emailSubject, 'Confirm your selection');
  assert.deepEqual(
    [form.coverImageSource, form.selectedCatalogueImageId, form.coverImagePreview, form.CoverImageID],
    ['catalogue', 4, 'src/Pages/Scenarios/CovImg-004.png', 'CovImg-004.png']
  );
  assert.deepEqual(
    [form.landingPageSource, form.selectedLandingCatalogueImageId, form.landingPageContent, form.landingPageId],
    ['catalogue', 'LP-002', '<h2>Red</h2>', 'LP-002']
  );
  assert.deepEqual(
    [form.trainingSource, form.trainingPathCode, form.trainingPathVideos, form.trainingPathCertificate],
    ['training-path', 'TP-00002', 3, true]
  );
  assert.equal(form.selectedTrainingPath.title, 'BEC Defense');
  assert.deepEqual(
    [form.selectedTrainingPath.resolvedVideos.length, form.selectedTrainingPath.questionCount, form.selectedTrainingPath.passingScore],
    [3, 2, 75]
  );
  // Saving it untouched writes back what was stored.
  const again = toStoredScenario(form, { landingPageId: landingPageChoice(form).id || undefined, coverImageId: catalogueCoverName(CATALOGUES.coverImages[1].image) });
  assert.deepEqual(again, toStoredScenario(fullForm, { coverImageId: 'CovImg-004.png' }));
});

test('an uploaded cover is held by its key, never the presigned URL', () => {
  const key = 'uploads/scenario-covers/SC-500/k-cover.png';
  const signed = `https://bucket.s3.amazonaws.com/${key}?X-Amz-Signature=abc`;
  for (const row of [stored({ CoverImageID: signed, coverImageKey: key }), stored({ CoverImageID: signed }), stored({ CoverImageID: key })]) {
    const form = toEditFormData(row, CATALOGUES);
    assert.deepEqual(
      [form.CoverImageID, form.coverImageSource, form.coverImageKey, form.coverImageKeyScenarioId, form.coverImageName],
      [key, 'upload', key, 'SC-500', 'k-cover.png']
    );
    assert.equal(toStoredScenario(form).CoverImageID, key);
  }
  assert.equal(toEditFormData(stored({ CoverImageID: signed, coverImageKey: key })).coverImagePreview, signed);
});

test('selections it cannot find are kept by id, not dropped', () => {
  const form = toEditFormData(stored({ CoverImageID: 'https://cdn.example.com/c.png', landingPageId: 'LP-900', trainingId: 'TP-404' }), CATALOGUES);
  assert.deepEqual([form.coverImageSource, form.landingPageSource, form.trainingSource], [undefined, undefined, undefined]);
  const record = toStoredScenario(form);
  assert.deepEqual([record.CoverImageID, record.landingPageId, record.trainingId], ['https://cdn.example.com/c.png', 'LP-900', 'TP-404']);
  assert.equal(toEditFormData({}).CoverImageID, '');
});
