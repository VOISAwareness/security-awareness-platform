/**
 * Insights' sources from the backend: GET /insights (backend/insights-api)
 * answers with the campaign reports, the organisation in thirty-day steps,
 * the people table and the training programmes, in the shapes the pure
 * functions in insights.js and insightsPeople.js take (docs/insights-data.md).
 *
 * The one thing reshaped here is the people's campaign records, which come
 * compacted as [campaign index, clicked, reported, gave] to keep the answer
 * small; they are named back into { campaign, type, clicked, reported, gave }.
 */
import { useEffect, useState } from 'react';

import { api } from './api.js';

const EMPTY_PEOPLE = { rows: [], months: [] };

/** GET /insights' data as the page reads it. */
export function fromApi(data) {
  const d = data && typeof data === 'object' ? data : {};
  const people = d.people && Array.isArray(d.people.rows) ? d.people : EMPTY_PEOPLE;
  const named = Array.isArray(people.campaigns) ? people.campaigns : [];
  const rows = people.rows.map((x) => ({
    ...x,
    trained: x.trained || 'None',
    records: (x.records || []).map((r) => (Array.isArray(r)
      ? { campaign: named[r[0]]?.name ?? '', type: named[r[0]]?.type ?? 'Other', clicked: r[1] || 0, reported: r[2] || 0, gave: r[3] || 0 }
      : r)),
  }));
  return {
    asOf: Number.isFinite(d.asOf) ? d.asOf : Date.now(),
    items: Array.isArray(d.items) ? d.items : [],
    org: Array.isArray(d.org) ? d.org : [],
    people: { rows, months: Array.isArray(people.months) ? people.months : [] },
    programmes: Array.isArray(d.programmes) ? d.programmes : [],
  };
}

// one answer at a time, shared by everything that asks, and asked again
// after five minutes (as long as the API keeps it)
const FRESH_MS = 5 * 60 * 1000;
let pending = null;
let askedAt = 0;

/** Insights' data for `role`: { status: 'loading' | 'ready' | 'failed', data, error, retry }. */
export function useInsightsData(role) {
  const [state, setState] = useState({ status: 'loading', data: null, error: null });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true;
    if (!pending || attempt || Date.now() - askedAt > FRESH_MS) {
      pending = api.insights.get(role).then(fromApi);
      askedAt = Date.now();
    }
    const asked = pending;
    asked
      .then((data) => { if (live) setState({ status: 'ready', data, error: null }); })
      .catch((error) => {
        if (pending === asked) pending = null;
        if (live) setState({ status: 'failed', data: null, error });
      });
    return () => { live = false; };
  }, [role, attempt]);
  return { ...state, retry: () => { setState({ status: 'loading', data: null, error: null }); setAttempt((n) => n + 1); } };
}
