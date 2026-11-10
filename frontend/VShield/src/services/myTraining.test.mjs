import assert from 'node:assert/strict';
import { test } from 'node:test';

import { answersFor, dayText, legacyAllocation, legacyStatus, myTrainingLive, submitQuiz } from './myTraining.js';

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
  });
  assert.equal(legacyAllocation({ dueAt: '2026-11-01T00:00:00Z' }, NOW).dueInDays, '0 days');
});

test('legacyStatus: the four states', () => {
  assert.deepEqual(legacyStatus({ status: 'ASSIGNED' }), { trainingStatus: 'pending', evalutionStatus: 'not_started' });
  assert.deepEqual(legacyStatus({ status: 'IN_PROGRESS' }), { trainingStatus: 'ongoing', evalutionStatus: 'in_progress' });
  assert.deepEqual(legacyStatus({ status: 'COMPLETED', quizPassed: true }), { trainingStatus: 'evaluted', evalutionStatus: 'passed' });
  assert.deepEqual(legacyStatus({ status: 'COMPLETED', quizPassed: false }), { trainingStatus: 'failed', evalutionStatus: 'failed' });
});

test('dayText and answersFor', () => {
  assert.equal(dayText('2026-03-02T23:59:00Z'), '02-Mar-2026');
  assert.equal(dayText(''), '');
  assert.deepEqual(answersFor({ answers: [
    { questionId: 'Question01', selectedOption: 'optionB', isSubmitted: true },
    { questionId: 'Question02', selectedOption: null, isSubmitted: false },
    { questionId: 'Question03', selectedOption: 'optionA', isSubmitted: false },
  ] }), { Question01: 'optionB' });
  assert.deepEqual(answersFor(null), {});
});

test('submitQuiz sends the answers and keeps the server\'s row', async () => {
  const sent = [];
  const client = { myTraining: { quiz: async (...args) => {
    sent.push(args);
    return { data: { owner: 'a@x', TrainingPathID: 'TP-1', status: 'COMPLETED', quizPassed: true, quizScore: 80 },
             result: { score: 80, passed: true } };
  } } };
  const scored = await submitQuiz('TP-1', { answers: [{ questionId: 'Question01', selectedOption: 'optionB' }] }, { viewer: 'a@x', client });
  assert.deepEqual(sent, [['a@x', 'TP-1', { Question01: 'optionB' }]]);
  assert.deepEqual(scored, { score: 80, passed: true });
  assert.equal(myTrainingLive.trainings[0].trainingStatus, 'evaluted');
});
