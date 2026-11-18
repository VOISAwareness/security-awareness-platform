/**
 * My Training from the backend (training-assignments): the signed-in
 * person's trainings, the videos they watched and their quiz results.
 *
 * The My Training screens were written against a sample file
 * (TrainingAllocationData.json), so rows are handed to them in that file's
 * shape (legacyAllocation). Some of those screens look rows up outside React,
 * so the latest rows and the training catalogue are also kept in two live
 * objects (myTrainingLive, catalogLive) that are updated in place.
 */
import { useEffect, useState } from 'react';

import { api } from './api.js';
import { currentActor } from './identity.js';
import { loadTraining } from './trainingCatalog.js';

const DAY = 86400000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// Points for finishing (Trained) and passing (Evaluated), as the default
// gamification rules give them.
const TRAINED_POINTS = 30;
const EVALUATED_POINTS = 30;

export const myTrainingLive = { trainings: [] };
export const catalogLive = { paths: [], videos: [], quizzes: [], certificates: [] };

/** '02-Mar-2026', as the screens show dates; '' when there is none. */
export function dayText(iso) {
  const d = new Date(iso || '');
  if (Number.isNaN(d.getTime())) return '';
  return `${String(d.getUTCDate()).padStart(2, '0')}-${MONTHS[d.getUTCMonth()]}-${d.getUTCFullYear()}`;
}

/** The screens' status words for an assignment (they spell "evaluted" that way). */
export function legacyStatus(a) {
  if (a?.status === 'COMPLETED') {
    return a.quizPassed ? { trainingStatus: 'evaluted', evalutionStatus: 'passed' } : { trainingStatus: 'failed', evalutionStatus: 'failed' };
  }
  // A failed quiz leaves the training open (still in Pending, to try again).
  if (a?.status === 'IN_PROGRESS' && a.quizPassed === false) return { trainingStatus: 'ongoing', evalutionStatus: 'failed' };
  if (a?.status === 'IN_PROGRESS') return { trainingStatus: 'ongoing', evalutionStatus: 'in_progress' };
  return { trainingStatus: 'pending', evalutionStatus: 'not_started' };
}

/** One assignment from the API in the shape the My Training screens read. */
export function legacyAllocation(a, now = Date.now()) {
  const videos = Array.isArray(a?.TrainingVideoAttached) ? a.TrainingVideoAttached : [];
  const watched = new Set(a?.videosWatched || []);
  const due = new Date(a?.dueAt || '').getTime();
  const passed = a?.status === 'COMPLETED' && Boolean(a.quizPassed);
  return {
    assignmentId: a.assignmentId,
    TrainingPathID: a.TrainingPathID,
    TrainingPathName: a.TrainingPathName || '',
    userId: a.owner,
    userEmailId: a.owner,
    assignedDate: dayText(a.assignedAt),
    dueDate: dayText(a.dueAt),
    dueInDays: Number.isNaN(due) ? '' : `${Math.max(0, Math.ceil((due - now) / DAY))} days`,
    ...legacyStatus(a),
    currentScore: `${Number(a.quizScore) || 0}%`,
    attemptCount: Number(a.attemptCount) || 0,
    trainingPoints: String(a.status === 'COMPLETED' ? TRAINED_POINTS : 0),
    evaluationPoints: String(passed ? EVALUATED_POINTS : 0),
    trainingTotalPoints: String(TRAINED_POINTS + EVALUATED_POINTS),
    // The next video to watch, or the first once all are watched.
    TrainingVideoID: videos.find((v) => !watched.has(v)) || videos[0] || '',
    TrainingQuizID: a.TrainingQuizID || '',
    TrainingCertificateID: a.certificateId || '',
    campaignId: a.campaignId || '',
    campaignTitle: a.campaignTitle || '',
    source: a.source || '',
    // A package path: the package to play and where the learner left it.
    isZipPath: Boolean(a.isZipPath),
    package: a.package || null,
    packageProgress: a.isZipPath
      ? { status: a.packageStatus || '', location: a.packageLocation || '', suspendData: a.packageSuspendData || '' }
      : null,
  };
}

/** What a package's player reports, as POST /my-training/package takes it. */
export function packageReport(summary) {
  const s = summary || {};
  return {
    status: s.status || 'incomplete',
    completed: Boolean(s.completed),
    passed: s.passed === true || s.passed === false ? s.passed : null,
    score: Number.isFinite(s.score) ? s.score : null,
    location: String(s.location || ''),
    suspendData: String(s.suspendData || ''),
    sessionSeconds: Math.max(0, Math.round(Number(s.sessionSeconds) || 0)),
    finished: Boolean(s.finished),
  };
}

function put(target, rows) {
  target.splice(0, target.length, ...rows);
}

function apply(rows) {
  put(myTrainingLive.trainings, (Array.isArray(rows) ? rows : []).map((a) => legacyAllocation(a)));
  return myTrainingLive.trainings;
}

/** Read the viewer's trainings and the catalogue; both live objects are refreshed. */
export async function loadMyTraining({ viewer = currentActor(), client = api } = {}) {
  const [rows, catalog] = await Promise.all([client.myTraining.list(viewer), loadTraining()]);
  Object.keys(catalogLive).forEach((k) => put(catalogLive[k], catalog[k] || []));
  return apply(rows);
}

function replaceRow(row) {
  const next = legacyAllocation(row);
  const rest = myTrainingLive.trainings.filter((r) => r.TrainingPathID !== next.TrainingPathID);
  put(myTrainingLive.trainings, [next, ...rest]);
  return next;
}

/** A video of the path was watched to the end. */
export async function recordVideoWatched(pathId, videoId, { viewer = currentActor(), client = api } = {}) {
  return replaceRow(await client.myTraining.progress(viewer, pathId, videoId));
}

/**
 * Check one answer. The server keeps the first answer given to a question in
 * an attempt and says whether it was right: { option, correct, correctOption }.
 */
export async function checkAnswer(pathId, questionId, option, { viewer = currentActor(), client = api } = {}) {
  return client.myTraining.check(viewer, pathId, questionId, option);
}

/** Score the attempt from the answers checked; the server's score is the one that counts. */
export async function submitQuiz(pathId, { viewer = currentActor(), client = api } = {}) {
  const { data, result: scored } = await client.myTraining.quiz(viewer, pathId);
  replaceRow(data);
  return scored;
}

/**
 * Save what a package path's course reported. Returns {row, result}: the
 * assignment in the screens' shape and {passed, score} (passed null until
 * the course gives a result).
 */
export async function savePackageProgress(pathId, summary, { viewer = currentActor(), client = api } = {}) {
  const { data, result } = await client.myTraining.package(viewer, pathId, packageReport(summary));
  return { row: replaceRow(data), result: result || { passed: null, score: null } };
}

/** The viewer's trainings for a component: `trainings` in the screens' shape. */
export function useMyTraining() {
  const [state, setState] = useState({ trainings: myTrainingLive.trainings, loading: true, error: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    loadMyTraining()
      .then((trainings) => {
        if (active) setState({ trainings: [...trainings], loading: false, error: null });
      })
      .catch((error) => {
        console.error('Could not load my training', error);
        if (active) setState((s) => ({ ...s, loading: false, error }));
      });
    return () => {
      active = false;
    };
  }, [attempt]);

  return { ...state, reload: () => setAttempt((n) => n + 1) };
}
