import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { buildDraft } from './scenarioDraft.js';
import {
  MAX_ENTRIES,
  RESUME_ASKED_KEY,
  campaignContentVersions,
  contentFingerprint,
  markAsked,
  scenarioContentVersion,
  wasAsked,
} from './resumePrompt.js';

const A = 'a@example.test';
const B = 'b@example.test';

let store;
beforeEach(() => {
  store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
});

test('nothing is asked until it is marked', () => {
  assert.equal(wasAsked('campaign', 'CMP-1', '2026-10-01T10:00:00Z', A), false);
  assert.equal(markAsked('campaign', 'CMP-1', '2026-10-01T10:00:00Z', A), true);
  assert.equal(wasAsked('campaign', 'CMP-1', '2026-10-01T10:00:00Z', A), true);
});

test('a newer version is asked about again, once', () => {
  markAsked('scenario', 'SD-1', 'v1', A);
  assert.equal(wasAsked('scenario', 'SD-1', 'v2', A), false);
  markAsked('scenario', 'SD-1', 'v2', A);
  assert.equal(wasAsked('scenario', 'SD-1', 'v2', A), true);
  // Only the latest answer per item is kept.
  assert.equal(wasAsked('scenario', 'SD-1', 'v1', A), false);
  assert.equal(JSON.parse(store.get(`${RESUME_ASKED_KEY}:${A}`)).length, 1);
});

test('kinds, ids and people are kept apart', () => {
  markAsked('campaign', 'X-1', 'v1', A);
  assert.equal(wasAsked('scenario', 'X-1', 'v1', A), false);
  assert.equal(wasAsked('campaign', 'X-2', 'v1', A), false);
  assert.equal(wasAsked('campaign', 'X-1', 'v1', B), false);
  assert.ok(store.has(`${RESUME_ASKED_KEY}:${A}`));
  assert.ok(!store.has(`${RESUME_ASKED_KEY}:${B}`));
});

test('unknown kinds and missing ids are never remembered', () => {
  assert.equal(markAsked('template', 'SC-1', 'v1', A), false);
  assert.equal(markAsked('campaign', '', 'v1', A), false);
  assert.equal(wasAsked('template', 'SC-1', 'v1', A), false);
  assert.equal(store.size, 0);
});

test('a missing version is a version too', () => {
  markAsked('campaign', 'CMP-1', undefined, A);
  assert.equal(wasAsked('campaign', 'CMP-1', '', A), true);
  assert.equal(wasAsked('campaign', 'CMP-1', 'v1', A), false);
});

test('the list keeps only the newest answers', () => {
  for (let i = 0; i < MAX_ENTRIES + 10; i += 1) markAsked('campaign', `CMP-${i}`, 'v', A);
  const saved = JSON.parse(store.get(`${RESUME_ASKED_KEY}:${A}`));
  assert.equal(saved.length, MAX_ENTRIES);
  assert.equal(wasAsked('campaign', `CMP-${MAX_ENTRIES + 9}`, 'v', A), true);
  assert.equal(wasAsked('campaign', 'CMP-0', 'v', A), false);
  // Answering an old item again moves it to the front instead of adding one.
  markAsked('campaign', 'CMP-20', 'v2', A);
  const again = JSON.parse(store.get(`${RESUME_ASKED_KEY}:${A}`));
  assert.equal(again.length, MAX_ENTRIES);
  assert.deepEqual(again[0], { kind: 'campaign', id: 'CMP-20', version: 'v2' });
});

test('corrupt or foreign data is ignored', () => {
  store.set(`${RESUME_ASKED_KEY}:${A}`, '{not json');
  assert.equal(wasAsked('campaign', 'CMP-1', 'v', A), false);
  assert.equal(markAsked('campaign', 'CMP-1', 'v', A), true);
  store.set(`${RESUME_ASKED_KEY}:${A}`, JSON.stringify([null, 7, { kind: 'campaign', id: 'CMP-2' }, { kind: 'campaign', id: 'CMP-3', version: 'v' }]));
  assert.equal(wasAsked('campaign', 'CMP-2', '', A), false);
  assert.equal(wasAsked('campaign', 'CMP-3', 'v', A), true);
});

test('unavailable storage never throws', () => {
  globalThis.localStorage = {
    getItem: () => { throw new Error('blocked'); },
    setItem: () => { throw new Error('blocked'); },
    removeItem: () => { throw new Error('blocked'); },
  };
  assert.equal(wasAsked('campaign', 'CMP-1', 'v', A), false);
  assert.equal(markAsked('campaign', 'CMP-1', 'v', A), false);
});

test('a list of versions matches any of them; the first is the one remembered', () => {
  markAsked('campaign', 'CMP-1', ['v-now', 'v-loose'], A);
  assert.deepEqual(JSON.parse(store.get(`${RESUME_ASKED_KEY}:${A}`))[0].version, 'v-now');
  assert.equal(wasAsked('campaign', 'CMP-1', ['v-other', 'v-now'], A), true);
  assert.equal(wasAsked('campaign', 'CMP-1', ['v-other', 'v-loose'], A), false);
});

test('fingerprints ignore key order, surrounding spaces and empty values', () => {
  const a = contentFingerprint({ title: 'T', body: '<p>x</p>', list: '', on: false, gone: null, nested: { b: 1, a: '' } });
  const b = contentFingerprint({ nested: { b: 1 }, body: '<p>x</p>', title: ' T ' });
  assert.equal(a, b);
  assert.match(a, /^c1-[0-9a-z]+-[0-9a-z]+$/);
  assert.notEqual(a, contentFingerprint({ nested: { b: 2 }, body: '<p>x</p>', title: 'T' }));
  assert.notEqual(a, contentFingerprint({ nested: { b: 1 }, body: '<p>x</p>', title: 'T2' }));
});

// A campaign draft as the wizard leaves it on step 3 (template copied in).
const campaign = {
  campaignId: 'CMP-1', status: 'DRAFT', createdBy: 'a@example.test',
  createdAt: '2026-10-01T09:00:00Z', updatedAt: '2026-10-01T09:05:00Z', wizardStep: 3,
  isStartFresh: false, scenarioId: 'SC-101', scenarioName: 'Password expiry',
  campaignTitle: 'My title', campaignTitleSetByUser: true, campaignDescription: 'My description',
  campaignType: 'Credential theft', targetAudience: 'All Employees', difficulty: 'Low', motivator: 'Urgency',
  senderEmailId: 'it@domain', senderName: 'IT Desk', emailSubject: 'Subject', emailBody: '<p>Body</p>',
  emailBodySourceId: '', landingPageId: 'LP-001', landingPageName: '', landingPageContent: '',
  landingPageAttachedByUser: false, trainingId: 'TP-001', trainingPathName: '', trainingPathAttachedByUser: false,
  CoverImageID: 'CovImg-001.png', startTime: '2026-11-02T10:00',
};
const campaignVersion = (d) => campaignContentVersions(d)[0];

test('campaign: moving between steps is not a change', () => {
  const v = campaignVersion(campaign);
  // What the server and the steps write while the user only moves around.
  const moved = {
    ...campaign,
    wizardStep: 2,
    updatedAt: '2026-10-01T10:00:00Z',
    // Step 2 Back / Next: its defaults, and the flags on text kept as the user's.
    endTime: '', isTestCampaign: false, autoEndPostSending: true, campaignDescriptionSetByUser: true,
    // Step 3 Back / Next: no list picked yet, the same (trimmed) email.
    selectedListId: '', selectedListName: '', isListLoaded: false, senderName: 'IT Desk ',
    // Step 5 Next: the template's training path, now flagged and named.
    trainingPathAttachedByUser: true, trainingPathName: 'Phishing basics',
  };
  assert.deepEqual(campaignContentVersions(moved).includes(v), true);
  assert.equal(campaignVersion(moved), v);
});

test('campaign: the landing page copied in by moving on still matches what was asked', () => {
  const asked = campaignVersion(campaign);
  const copied = { ...campaign, wizardStep: 5, landingPageName: 'Login page', landingPageContent: '<html>catalogue page</html>' };
  assert.notEqual(campaignVersion(copied), asked);
  assert.equal(campaignContentVersions(copied).includes(asked), true);
  // Once the draft has its own landing page, editing it is a change.
  const edited = { ...copied, landingPageContent: '<html>edited page</html>' };
  assert.equal(campaignContentVersions(edited).includes(campaignVersion(copied)), false);
});

test('campaign: real changes are changes', () => {
  const v = campaign;
  const changes = [
    { campaignTitle: 'Another title' },
    { campaignDescription: '' },
    { emailSubject: 'New subject' },
    { emailBody: '<p>Body, edited</p>' },
    { scenarioId: 'SC-102' },
    { startTime: '2026-11-03T10:00' },
    { isTestCampaign: true },
    { autoEndPostSending: false },
    { selectedListId: 'UL-1', isListLoaded: true },
    { trainingId: 'TP-002' },
    { landingPageId: 'LP-002' },
  ];
  for (const patch of changes) {
    assert.equal(campaignContentVersions({ ...v, ...patch }).includes(campaignVersion(v)), false, JSON.stringify(patch));
  }
});

test('scenario: the tab and savedAt are not content; the form is', () => {
  const form = { scenarioId: 'SC-9', scenarioName: 'Lure', emailBody: '<p>x</p>', coverImagePreview: '' };
  const v = scenarioContentVersion(buildDraft(form, 0, new Date(0)));
  assert.equal(scenarioContentVersion(buildDraft(form, 3, new Date(99999))), v);
  assert.equal(scenarioContentVersion(buildDraft({ ...form, coverImagePreview: undefined, extra: '' }, 1)), v);
  assert.notEqual(scenarioContentVersion(buildDraft({ ...form, scenarioName: 'Lure 2' }, 0)), v);
  assert.notEqual(scenarioContentVersion(buildDraft({ ...form, description: 'new' }, 0)), v);
});

test('scenario: a draft and the same draft as the editor restores it share a version', () => {
  const saved = buildDraft({
    scenarioName: 'Lure', coverImageSource: 'upload', coverImageName: 'cover.png',
    coverImageKey: 'uploads/SC-9/a-cover.png', coverImageThumbnail: 'data:image/jpeg;base64,AAAA',
  }, 2);
  const restored = buildDraft({ ...saved.formData, coverImagePreview: 'data:image/jpeg;base64,AAAA' }, 2);
  assert.equal(scenarioContentVersion(restored), scenarioContentVersion(saved));
  const lost = buildDraft({ scenarioName: 'Lure', coverImageSource: 'upload', coverImageName: 'cover.png' }, 2);
  const reattach = buildDraft({ scenarioName: 'Lure', coverImageSource: '', coverImageReattach: 'cover.png' }, 2);
  assert.equal(scenarioContentVersion(reattach), scenarioContentVersion(lost));
});
