/**
 * Tests for the scenario editor's draft rules.
 *
 * Why this module: a saved draft is resumed after a reload, so anything that
 * cannot survive one (a raw File, a blob: preview) must never be stored, and a
 * blank or default-only form must never prompt "Continue your scenario?". The
 * cover rules decide whether Publish re-uploads or reuses an earlier upload.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  SCENARIO_DRAFT_KEY,
  SCENARIO_DRAFT_VERSION,
  buildDraft,
  draftSummary,
  fromDraft,
  isMeaningfulDraft,
  parseDraft,
  reusableCoverKey,
  sameDraftContent,
  toDraftFormData,
  uniqueCoverFileName,
  withUniqueCoverName,
} from './scenarioDraft.js';

const DEFAULTS = { emailBody: '<p>Default template body</p>' };

const blankForm = {
  scenarioId: '',
  scenarioName: '',
  description: '',
  emailSubject: '',
  emailBody: DEFAULTS.emailBody,
  coverImageSource: '',
  coverImage: null,
  coverImagePreview: '',
  trainingSource: '',
  trainingPathVideos: 0,
  trainingPathCertificate: false,
  individualTraining: { videos: [], quiz: null, certificate: null },
};

test('key and version are the documented ones', () => {
  assert.equal(SCENARIO_DRAFT_KEY, 'voisshield_scenario_draft');
  assert.equal(SCENARIO_DRAFT_VERSION, 1);
});

test('strips the raw File, blob: URLs and open-modal flags', () => {
  const file = new File(['png-bytes'], 'cover.png', { type: 'image/png' });
  const out = toDraftFormData({
    ...blankForm,
    scenarioName: 'Benefits lure',
    coverImageSource: 'upload',
    coverImage: file,
    coverImagePreview: 'blob:http://localhost/1234',
    landingPagePreviewImage: 'blob:http://localhost/5678',
    isOutcomeEditorOpen: true,
    stray: new Blob(['x']),
    onSomething: () => {},
  });
  assert.equal('coverImage' in out, false);
  assert.equal('coverImagePreview' in out, false);
  assert.equal('landingPagePreviewImage' in out, false);
  assert.equal('isOutcomeEditorOpen' in out, false);
  assert.equal('stray' in out, false);
  assert.equal('onSomething' in out, false);
  assert.equal(out.scenarioName, 'Benefits lure');
  assert.equal(out.coverImageSource, 'upload');
  // Round-trips through JSON unchanged.
  assert.deepEqual(JSON.parse(JSON.stringify(out)), out);
});

test('keeps nested plain data (a chosen training path) and drops cycles', () => {
  const training = { id: 'TP-1', title: 'Phishing 101', resolvedVideos: [{ id: 'V1' }], quiz: null };
  training.self = training;
  const out = toDraftFormData({ selectedTrainingPath: training, trainingSource: 'training-path' });
  assert.deepEqual(out.selectedTrainingPath, {
    id: 'TP-1',
    title: 'Phishing 101',
    resolvedVideos: [{ id: 'V1' }],
    quiz: null,
  });
});

test('a draft carries version, savedAt and a clamped step', () => {
  const now = new Date('2026-10-12T09:30:00Z');
  const draft = buildDraft({ ...blankForm, scenarioName: 'X' }, 7, now);
  assert.equal(draft.version, SCENARIO_DRAFT_VERSION);
  assert.equal(draft.savedAt, '2026-10-12T09:30:00.000Z');
  assert.equal(draft.activeTab, 3);
  assert.equal(buildDraft(blankForm, -2, now).activeTab, 0);
});

test('parseDraft rejects missing, foreign and other-version values', () => {
  assert.equal(parseDraft(null), null);
  assert.equal(parseDraft('nope'), null);
  assert.equal(parseDraft({ version: 99, formData: {} }), null);
  assert.equal(parseDraft({ version: SCENARIO_DRAFT_VERSION, formData: [] }), null);
  const ok = parseDraft({ version: SCENARIO_DRAFT_VERSION, activeTab: '2', formData: { a: 1 } });
  assert.deepEqual(ok, { version: 1, savedAt: '', activeTab: 2, formData: { a: 1 } });
});

test('a blank or default-only form is not worth offering back', () => {
  assert.equal(isMeaningfulDraft(buildDraft(blankForm, 0), DEFAULTS), false);
  assert.equal(isMeaningfulDraft(buildDraft({ ...blankForm, scenarioName: '   ' }, 0), DEFAULTS), false);
  assert.equal(isMeaningfulDraft(null, DEFAULTS), false);
});

test('real work, an edited body, an attachment or a later step is worth offering', () => {
  const cases = [
    { scenarioName: 'Benefits lure' },
    { description: 'Something' },
    { emailSubject: 'Act now' },
    { emailBody: '<p>Edited</p>' },
    { coverImageSource: 'catalogue' },
    { coverImageReattach: 'cover.png' },
    { landingPageSource: 'catalogue' },
    { trainingSource: 'training-path' },
  ];
  for (const patch of cases) {
    assert.equal(isMeaningfulDraft(buildDraft({ ...blankForm, ...patch }, 0), DEFAULTS), true, JSON.stringify(patch));
  }
  assert.equal(isMeaningfulDraft(buildDraft(blankForm, 1), DEFAULTS), true);
});

test('restoring an uploaded cover keeps the key and shows the saved thumbnail', () => {
  const saved = buildDraft({
    ...blankForm,
    coverImageSource: 'upload',
    coverImageName: 'cover.png',
    coverImagePreview: 'blob:http://localhost/1',
    coverImageKey: 'uploads/scenario-covers/SC-9/abc-cover.png',
    coverImageKeyScenarioId: 'SC-9',
    coverImageThumbnail: 'data:image/jpeg;base64,AAAA',
  }, 2);
  const { formData, activeTab } = fromDraft(parseDraft(JSON.parse(JSON.stringify(saved))));
  assert.equal(activeTab, 2);
  assert.equal(formData.coverImage, null);
  assert.equal(formData.coverImageSource, 'upload');
  assert.equal(formData.coverImageKey, 'uploads/scenario-covers/SC-9/abc-cover.png');
  assert.equal(formData.coverImagePreview, 'data:image/jpeg;base64,AAAA');
  assert.equal(formData.coverImageReattach, undefined);
});

test('a cover that never uploaded comes back as "attach again", not a broken preview', () => {
  const file = new File(['png'], 'cover.png', { type: 'image/png' });
  const saved = buildDraft({
    ...blankForm,
    scenarioName: 'Lure',
    coverImageSource: 'upload',
    coverImage: file,
    coverImageName: 'cover.png',
    coverImagePreview: 'blob:http://localhost/1',
  }, 2);
  assert.equal(draftSummary(saved).needsCoverReattach, true);
  const { formData } = fromDraft(saved);
  assert.equal(formData.coverImage, null);
  assert.equal(formData.coverImageSource, '');
  assert.equal(formData.coverImagePreview, '');
  assert.equal(formData.coverImageName, '');
  assert.equal(formData.coverImageReattach, 'cover.png');
});

test('a catalogue cover restores untouched', () => {
  const saved = buildDraft({
    ...blankForm,
    coverImageSource: 'catalogue',
    coverImageName: 'Security Alert',
    coverImagePreview: 'src/Pages/Scenarios/CovImg-002.png',
    selectedCatalogueImageId: 2,
  }, 2);
  const { formData } = fromDraft(saved);
  assert.equal(formData.coverImagePreview, 'src/Pages/Scenarios/CovImg-002.png');
  assert.equal(formData.selectedCatalogueImageId, 2);
});

test('an opened draft left untouched is the same content; any edit or step change is not', () => {
  const saved = parseDraft(JSON.parse(JSON.stringify(
    buildDraft({ ...blankForm, scenarioName: 'Lure', coverImagePreview: 'blob:http://localhost/1' }, 1, new Date(0))
  )));
  // As the editor holds it after opening: the blank form, then the draft over it
  // (key order differs, the blob: preview is gone, the File slot is back).
  const reopened = { ...fromDraft(saved).formData, ...blankForm, ...fromDraft(saved).formData };
  assert.equal(sameDraftContent(buildDraft(reopened, 1, new Date(5000)), saved), true);
  assert.equal(sameDraftContent(buildDraft({ ...reopened, scenarioName: 'Lure 2' }, 1), saved), false);
  assert.equal(sameDraftContent(buildDraft({ ...reopened, description: 'new' }, 1), saved), false);
  assert.equal(sameDraftContent(buildDraft({ ...reopened, scenarioName: '' }, 1), saved), false);
  assert.equal(sameDraftContent(buildDraft(reopened, 2), saved), false);
  assert.equal(sameDraftContent(buildDraft(reopened, 1), null), false);
});

test('an opened draft whose cover is restored (thumbnail or "attach again") is unchanged too', () => {
  const uploaded = buildDraft({
    ...blankForm,
    scenarioName: 'Lure',
    coverImageSource: 'upload',
    coverImageName: 'cover.png',
    coverImagePreview: 'blob:http://localhost/1',
    coverImageKey: 'uploads/scenario-covers/SC-9/abc-cover.png',
    coverImageKeyScenarioId: 'SC-9',
    coverImageThumbnail: 'data:image/jpeg;base64,AAAA',
  }, 2);
  const restored = fromDraft(uploaded);
  assert.equal(sameDraftContent(buildDraft(restored.formData, restored.activeTab), uploaded), true);
  const lost = buildDraft({ ...blankForm, scenarioName: 'Lure', coverImageSource: 'upload', coverImageName: 'cover.png' }, 2);
  const back = fromDraft(lost);
  assert.equal(sameDraftContent(buildDraft(back.formData, back.activeTab), lost), true);
});

test('draftSummary names the scenario and the saved step', () => {
  assert.deepEqual(
    draftSummary(buildDraft({ ...blankForm, scenarioName: ' Benefits lure ' }, 1, new Date(0))),
    {
      name: 'Benefits lure',
      scenarioId: '',
      description: '',
      step: 2,
      stepCount: 4,
      stepName: 'Email Details',
      savedAt: '1970-01-01T00:00:00.000Z',
      cover: '',
      needsCoverReattach: false,
    },
  );
  assert.equal(draftSummary(buildDraft(blankForm, 3)).name, 'Untitled scenario');
  assert.equal(draftSummary(buildDraft(blankForm, 3)).stepName, 'Review & Publish');
});

test('Publish reuses an uploaded key only for the same scenario id', () => {
  const uploaded = {
    scenarioId: 'SC-9',
    coverImageSource: 'upload',
    coverImageKey: 'uploads/scenario-covers/SC-9/abc-cover.png',
    coverImageKeyScenarioId: 'SC-9',
  };
  assert.equal(reusableCoverKey(uploaded), uploaded.coverImageKey);
  assert.equal(reusableCoverKey({ ...uploaded, scenarioId: 'SC-10' }), '');
  assert.equal(reusableCoverKey({ ...uploaded, coverImageSource: 'catalogue' }), '');
  assert.equal(reusableCoverKey({ ...uploaded, coverImageKey: '' }), '');
  assert.equal(reusableCoverKey(), '');
});

test('every cover upload gets its own file name, so it can never overwrite one', () => {
  const a = uniqueCoverFileName('cover.png', 1000);
  const b = uniqueCoverFileName('cover.png', 2000);
  assert.match(a, /^[0-9a-z]+-cover\.png$/);
  assert.notEqual(a, b);
  assert.match(uniqueCoverFileName('C:\\fakepath\\shot.jpg'), /-shot\.jpg$/);
  assert.match(uniqueCoverFileName(''), /-cover$/);

  const file = new File(['png'], 'cover.png', { type: 'image/png' });
  const renamed = withUniqueCoverName(file, 1000);
  assert.notEqual(renamed.name, 'cover.png');
  assert.match(renamed.name, /-cover\.png$/);
  assert.equal(renamed.type, 'image/png');
  assert.equal(renamed.size, file.size);
});
