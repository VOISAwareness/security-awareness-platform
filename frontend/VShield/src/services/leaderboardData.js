/**
 * The Leaderboard's My Campaigns boards and Big Picture from the backend:
 * GET /insights/board (backend/insights-api) answers with every sent
 * campaign and everyone's points today with what they did with each email.
 *
 * `fromBoardApi` names each event's campaign, so bigPicture() can read the
 * people as they are; `campaignBoard` ranks one campaign's recipients by the
 * points that campaign gave them; `ongoing` picks the campaigns still open.
 */
import { useEffect, useState } from 'react';

import { api } from './api.js';
import { levelFor } from './levels.js';

const POINTS = { Reported: 80, Clicked: -30, Compromised: -50 };
const pointsOf = (rules, key) => (Number.isFinite(rules?.[key]) ? rules[key] : POINTS[key]);

const initialsOf = (name) => String(name || '?').split(/\s+/).map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?';

/** GET /insights/board's data as the Leaderboard reads it. */
export function fromBoardApi(data) {
  const d = data && typeof data === 'object' ? data : {};
  const campaigns = (Array.isArray(d.campaigns) ? d.campaigns : []).filter((c) => c && c.id);
  const people = (Array.isArray(d.people) ? d.people : []).map((p) => ({
    key: String(p.key),
    name: p.name || '',
    email: '',
    dept: p.dept || 'Unassigned',
    points: Number(p.points) || 0,
    events: (Array.isArray(p.events) ? p.events : [])
      .filter((e) => Array.isArray(e) && campaigns[e[0]])
      .map(([i, at, clicked, reported, gave]) => ({ campaign: campaigns[i].id, type: campaigns[i].type, at: Number(at), clicked: Boolean(clicked), reported: Boolean(reported), gave: Boolean(gave) })),
  }));
  return { asOf: Number.isFinite(d.asOf) ? d.asOf : Date.now(), you: d.you == null ? null : String(d.you), campaigns, people };
}

/** The campaigns still open at `asOf` (sending, or not yet ended), newest first. */
export function ongoing(board) {
  return board.campaigns.filter((c) => c.status === 'SENDING' || (Number.isFinite(c.endsAt) && c.endsAt > board.asOf));
}

/** The pairs bigPicture() takes for the campaigns. */
export const pictureItems = (board) => board.campaigns.map((campaign) => ({ campaign }));

/**
 * One campaign's board: its recipients ranked by the points it gave them
 * (a report earns, a click and details given cost, by the live rules), each
 * with their overall level, in the shape the Leaderboard's boards take.
 */
export function campaignBoard(board, campaignId, rules = {}) {
  const all = board.people
    .map((p) => ({ p, e: p.events.find((x) => x.campaign === campaignId) }))
    .filter((x) => x.e)
    .map(({ p, e }) => ({
      p,
      score: (e.reported ? pointsOf(rules, 'Reported') : 0) + (e.clicked ? pointsOf(rules, 'Clicked') : 0) + (e.gave ? pointsOf(rules, 'Compromised') : 0),
    }))
    .sort((a, b) => b.score - a.score || a.p.name.localeCompare(b.p.name) || a.p.key.localeCompare(b.p.key))
    .map(({ p, score }, i) => ({
      rank: i + 1,
      key: p.key,
      name: p.name,
      dept: p.dept,
      initials: initialsOf(p.name),
      pts: score.toLocaleString('en-US'),
      points: score,
      move: 0,
      levelId: levelFor(p.points)?.id || null,
      overall: p.points,
      you: p.key === board.you,
    }));
  return {
    podium: { first: all[0] || null, second: all[1] || null, third: all[2] || null },
    rows: all.slice(3),
    total: all.length,
    youRank: all.find((r) => r.you)?.rank ?? null,
    sample: false,
  };
}

/** The board for `role` (and `viewer`, to find their own row): { status, board, error }. */
export function useBoardData(role, viewer, enabled = true) {
  const [state, setState] = useState({ status: 'loading', board: null, error: null });
  useEffect(() => {
    if (!enabled) return undefined;
    let live = true;
    api.insights.board(role, viewer)
      .then((data) => { if (live) setState({ status: 'ready', board: fromBoardApi(data), error: null }); })
      .catch((error) => { if (live) setState({ status: 'failed', board: null, error }); });
    return () => { live = false; };
  }, [role, viewer, enabled]);
  return state;
}
