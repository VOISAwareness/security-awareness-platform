import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  checkAnswer, dayText, legacyAllocation, legacyStatus, myTrainingLive, packageReport, savePackageProgress, submitQuiz,
} from './myTraining.js';

const NOW = Date.parse('2026-11-10T12:00:00Z');

test('legacyAllocation: an assignment in the screens\' shape', () => {
  const row = legacyAllocation({
    owner: 'ana@x.example', assignmentId: 'A#1', TrainingPathID: 'TP-1', TrainingPathName: 'Basics',
    assignedAt: '2026-11-02T09:00:00Z', dueAt: '2026-11-16T09:00:00Z', status: 'IN_PROGRESS',
    TrainingVideoAttached: ['TV-1', 'TV-2'], videosWatched: ['TV-1'], TrainingQuizID: 'TQ-1',
    attemptCount: 1, quizScore: 60, campaignId: 'CMP-1', campaignTitle: 'Payroll', source: 'ASSIGNED',
  }, NOW);
  assert.deepEqual(row, {
    assignmentId: 'A#1', TrainingPathID: 'TP-1', TrainingPathName: 'Basics', userId: 'ana@x.example',
    userEmailId: 'ana@x.example', assignedDate: '02-Nov-2026', dueDate: '16-Nov-2026', dueInDays: '6 days',
    trainingStatus: 'ongoing', evalutionStatus: 'in_progress', currentScore: '60%', attemptCount: 1,
    trainingPoints: '0', evaluationPoints: '0', trainingTotalPoints: '60', TrainingVideoID: 'TV-2',
    TrainingQuizID: 'TQ-1', TrainingCertificateID: '', campaignId: 'CMP-1', campaignTitle: 'Payroll', source: 'ASSIGNED',
    isZipPath: false, package: null, packageProgress: null,
  });
  assert.equal(legacyAllocation({ dueAt: '2026-11-01T00:00:00Z' }, NOW).dueInDays, '0 days');
});

test('legacyStatus: the four states', () => {
  assert.deepEqual(legacyStatus({ status: 'ASSIGNED' }), { trainingStatus: 'pending', evalutionStatus: 'not_started' });
  assert.deepEqual(legacyStatus({ status: 'IN_PROGRESS' }), { trainingStatus: 'ongoing', evalutionStatus: 'in_progress' });
  // a failed quiz: still open, in Pending, marked failed
  assert.deepEqual(legacyStatus({ status: 'IN_PROGRESS', quizPassed: false }), { trainingStatus: 'ongoing', evalutionStatus: 'failed' });
  assert.deepEqual(legacyStatus({ status: 'COMPLETED', quizPassed: true }), { trainingStatus: 'evaluted', evalutionStatus: 'passed' });
  assert.deepEqual(legacyStatus({ status: 'COMPLETED', quizPassed: false }), { trainingStatus: 'failed', evalutionStatus: 'failed' });
});

test('dayText', () => {
  assert.equal(dayText('2026-03-02T23:59:00Z'), '02-Mar-2026');
  assert.equal(dayText(''), '');
});

test('checkAnswer asks the server about one answer', async () => {
  const sent = [];
  const client = { myTraining: { check: async (...args) => (sent.push(args), { option: 'optionA', correct: false, correctOption: 'optionB' }) } };
  const checked = await checkAnswer('TP-1', 'Question01', 'optionA', { viewer: 'a@x', client });
  assert.deepEqual(sent, [['a@x', 'TP-1', 'Question01', 'optionA']]);
  assert.equal(checked.correct, false);
});

test('submitQuiz scores the checked answers and keeps the server\'s row', async () => {
  const sent = [];
  const client = { myTraining: { quiz: async (...args) => {
    sent.push(args);
    return { data: { owner: 'a@x', TrainingPathID: 'TP-1', status: 'COMPLETED', quizPassed: true, quizScore: 80 },
             result: { score: 80, passed: true } };
  } } };
  const scored = await submitQuiz('TP-1', { viewer: 'a@x', client });
  assert.deepEqual(sent, [['a@x', 'TP-1']]);
  assert.deepEqual(scored, { score: 80, passed: true });
  assert.equal(myTrainingLive.trainings[0].trainingStatus, 'evaluted');
});

test('a package path carries its package and where the learner left it', () => {
  const row = legacyAllocation({
    TrainingPathID: 'TP-Z', isZipPath: true, package: { PackageID: 'SP-1', LaunchURL: '/scorm/x/index.html' },
    packageStatus: 'incomplete', packageLocation: '4', packageSuspendData: 'abc',
  });
  assert.equal(row.isZipPath, true);
  assert.equal(row.package.PackageID, 'SP-1');
  assert.deepEqual(row.packageProgress, { status: 'incomplete', location: '4', suspendData: 'abc' });
  const quizPath = legacyAllocation({ TrainingPathID: 'TP-1' });
  assert.equal(quizPath.isZipPath, false);
  assert.equal(quizPath.packageProgress, null);
});

test('packageReport sends only what the server takes', () => {
  assert.deepEqual(packageReport({ version: '1.2', status: 'passed', completed: true, passed: true, score: 80,
    location: 'end', suspendData: 's', sessionSeconds: 12.6, finished: true }), {
    status: 'passed', completed: true, passed: true, score: 80, location: 'end', suspendData: 's', sessionSeconds: 13, finished: true,
  });
  assert.deepEqual(packageReport({ status: '', score: null, passed: undefined }), {
    status: 'incomplete', completed: false, passed: null, score: null, location: '', suspendData: '', sessionSeconds: 0, finished: false,
  });
});

test('savePackageProgress keeps the server\'s row and result', async () => {
  const sent = [];
  const client = { myTraining: { package: async (...args) => {
    sent.push(args);
    return { data: { owner: 'a@x', TrainingPathID: 'TP-Z', isZipPath: true, status: 'COMPLETED', quizPassed: true, quizScore: 100 },
             result: { passed: true, score: 100 } };
  } } };
  const { row, result } = await savePackageProgress('TP-Z', { status: 'passed', passed: true, score: 100, finished: true },
    { viewer: 'a@x', client });
  assert.equal(sent[0][0], 'a@x');
  assert.equal(sent[0][1], 'TP-Z');
  assert.equal(sent[0][2].passed, true);
  assert.deepEqual(result, { passed: true, score: 100 });
  assert.equal(row.trainingStatus, 'evaluted');
  assert.equal(myTrainingLive.trainings[0].TrainingPathID, 'TP-Z');
});
