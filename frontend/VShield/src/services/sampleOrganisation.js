/**
 * A sample organisation, thirty days at a time, for Insights until the
 * people, risk and training APIs report it: who is in which risk tier in
 * each department, what drives the risk, who moved, and how far the
 * training got. Seeded, so the same step shows the same numbers every time;
 * pure, so `node --test` can cover it.
 *
 * Each person's risk tier comes from their phishing record:
 *   low       - reported, and never clicked
 *   moderate  - clicked once, or never reported
 *   high      - clicked more than once
 *   critical  - gave details away
 * The risk score is everyone's tier on 0 to 100 (low 0, moderate 33, high
 * 67, critical 100), averaged: 0 if everyone is low, 100 if everyone is
 * critical.
 */
import { DEPTS } from './sampleCampaigns.js';
import { lean } from './sampleReports.js';

export const TIERS = Object.freeze(['low', 'moderate', 'high', 'critical']);
export const TIER_WEIGHT = Object.freeze({ low: 0, moderate: 1 / 3, high: 2 / 3, critical: 1 });
export const STEP_DAYS = 30;
const DAY = 86400000;

// Small seeded generator (mulberry32), as in sampleReports.js.
function random(seed) {
  let a = (seed * 2654435761) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Everyone's tier averaged on 0-100, from counts by tier. */
export function riskScore(tiers) {
  const n = TIERS.reduce((a, t) => a + (tiers[t] || 0), 0);
  return n ? (TIERS.reduce((a, t) => a + (tiers[t] || 0) * TIER_WEIGHT[t], 0) / n) * 100 : null;
}

/**
 * The organisation over `steps` thirty-day steps up to `end`, oldest first.
 * Each step: { to, people, tiers, improved, slipped, drivers, training,
 * departments }, where tiers and drivers are as they stood at its end, and
 * improved, slipped and training are what happened during it.
 */
export function organisation({ end, steps = 12, depts = DEPTS } = {}) {
  return Array.from({ length: steps }, (_, i) => {
    const r = random(7919 * (i + 3));
    const t = steps > 1 ? i / (steps - 1) : 1; // 0 at the oldest step, 1 at the newest
    const wobble = (size) => (r() - 0.5) * 2 * size;
    const departments = depts.map((name, d) => {
      const people = Math.round(820 * lean(`${name}#size`, 1.3) + 6 * i);
      const risky = lean(`${name}#risk`, 0.9); // some teams sit higher than others
      const critical = Math.max(0, (0.042 - 0.016 * t + wobble(0.004)) * risky);
      const high = Math.max(0, (0.118 - 0.034 * t + wobble(0.008)) * risky);
      const moderate = Math.max(0, (0.30 - 0.035 * t + wobble(0.01)) * (0.85 + 0.3 * risky / 1.45));
      const tiers = { critical: Math.round(people * critical), high: Math.round(people * high), moderate: Math.round(people * moderate) };
      tiers.low = people - tiers.critical - tiers.high - tiers.moderate;
      const learner = lean(`${name}#learn`, 0.5);
      const assigned = Math.round(people * (0.016 + r() * 0.006));
      const started = Math.round(assigned * Math.min(0.97, 0.84 + 0.04 * t + wobble(0.02)));
      const completed = Math.round(started * Math.min(0.98, (0.84 + 0.05 * t + wobble(0.03)) * (0.92 + 0.08 * learner)));
      const passed = Math.round(completed * (0.9 + r() * 0.07));
      const quizScore = Math.min(96, 68 + 9 * learner + 5 * t + wobble(2));
      return {
        name,
        index: d,
        people,
        tiers,
        training: { assigned, started, completed, passed, quizScore, badges: Math.round(completed * (0.38 + r() * 0.14)), points: Math.round(completed * (58 + r() * 18)) },
      };
    });
    const sum = (f) => departments.reduce((a, x) => a + f(x), 0);
    const tiers = Object.fromEntries(TIERS.map((k) => [k, sum((x) => x.tiers[k])]));
    const people = sum((x) => x.people);
    const tr = (k) => sum((x) => x.training[k]);
    const completed = tr('completed');
    return {
      to: end - (steps - 1 - i) * STEP_DAYS * DAY,
      people,
      tiers,
      improved: Math.round(people * (0.064 + 0.012 * t + wobble(0.006))),
      slipped: Math.round(people * (0.05 - 0.01 * t + wobble(0.005))),
      drivers: {
        repeatClickers: Math.round(tiers.high * (0.82 + r() * 0.1)),
        neverReported: Math.round(tiers.moderate * (0.42 + r() * 0.08)),
        overdueTraining: Math.round(people * (0.041 - 0.012 * t + wobble(0.003))),
        quizFailures: Math.round(people * (0.021 - 0.005 * t + wobble(0.002))),
      },
      training: {
        assigned: tr('assigned'),
        started: tr('started'),
        completed,
        passed: tr('passed'),
        quizScore: completed ? sum((x) => x.training.quizScore * x.training.completed) / completed : null,
        badges: tr('badges'),
        points: tr('points'),
      },
      departments,
    };
  });
}
