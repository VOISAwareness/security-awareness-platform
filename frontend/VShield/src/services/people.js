/**
 * The people directory, from the backend (GET /users, the users table).
 *
 * Every screen that needs people reads it through here: the login picker,
 * the campaign and announcement recipient steps, and the user lists. One
 * request is shared by everyone who asks within PEOPLE_TTL_MS, so opening
 * several screens costs one read.
 *
 * Rows keep the table's field names (UserID, UserName, UserEMailID,
 * Department, Country, role). When SSO arrives, the same table is filled
 * from Active Directory and nothing here changes.
 */
import { useEffect, useState } from 'react';

import { api } from './api.js';

export const PEOPLE_TTL_MS = 5 * 60 * 1000;
export const ROLES = Object.freeze([
  'Admin',
  'Campaign Manager',
  'Campaign Creator',
  'Gamification Engine Manager',
  'GMT',
  'Regular User',
]);
const EVERYONE = 'Regular User';

let cache = { at: 0, people: null };
let pending = null;

/** Rows as the screens use them: real rows only, sorted by name. */
export function tidyPeople(rows) {
  return (Array.isArray(rows) ? rows : [])
    .filter((p) => p && p.UserID && p.UserEMailID && p.active !== false)
    .sort((a, b) => String(a.UserName || '').localeCompare(String(b.UserName || '')));
}

/**
 * Everyone, read at most once per PEOPLE_TTL_MS; callers at the same moment
 * share one request. `list` and `now` are for tests.
 */
export function loadPeople({ force = false, list = () => api.users.list(), now = Date.now() } = {}) {
  if (!force && cache.people && now - cache.at < PEOPLE_TTL_MS) return Promise.resolve(cache.people);
  if (!pending) {
    pending = Promise.resolve()
      .then(list)
      .then((rows) => {
        cache = { at: now, people: tidyPeople(rows) };
        return cache.people;
      })
      .finally(() => {
        pending = null;
      });
  }
  return pending;
}

/** Forget what was read (tests, and after sign-out). */
export function forgetPeople() {
  cache = { at: 0, people: null };
  pending = null;
}

/**
 * role -> the people who can sign in with it. A person's role is the one on
 * their row; anyone can also sign in as a Regular User.
 */
export function peopleByRole(people) {
  const out = Object.fromEntries(ROLES.map((r) => [r, []]));
  (people || []).forEach((p) => {
    if (p.role && p.role !== EVERYONE && out[p.role]) out[p.role].push(p);
    out[EVERYONE].push(p);
  });
  return out;
}

/** Find one person by email, whatever its letter case. */
export function personByEmail(people, email) {
  const wanted = String(email || '').trim().toLowerCase();
  if (!wanted) return undefined;
  return (people || []).find((p) => String(p.UserEMailID || '').toLowerCase() === wanted);
}

/**
 * The directory for a component: `people` is [] until the API answers,
 * `loading` while it hasn't, `error` if it failed (retry with `reload`).
 */
export function usePeople() {
  const [state, setState] = useState({ people: cache.people || [], loading: !cache.people, error: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    loadPeople({ force: attempt > 0 })
      .then((people) => {
        if (active) setState({ people, loading: false, error: null });
      })
      .catch((error) => {
        console.error('Could not load people', error);
        if (active) setState((s) => ({ ...s, loading: false, error }));
      });
    return () => {
      active = false;
    };
  }, [attempt]);

  return {
    ...state,
    reload: () => {
      setState((s) => ({ ...s, loading: true, error: null }));
      setAttempt((n) => n + 1);
    },
  };
}
