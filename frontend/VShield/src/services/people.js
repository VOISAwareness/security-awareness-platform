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
import { useEffect, useMemo, useState } from 'react';

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
 * share one request. `force` reads the server again, past every cache.
 * `list` and `now` are for tests.
 */
export function loadPeople({ force = false, list = (opts) => api.users.list(opts), now = Date.now() } = {}) {
  if (!force && cache.people && now - cache.at < PEOPLE_TTL_MS) return Promise.resolve(cache.people);
  if (!pending) {
    pending = Promise.resolve()
      .then(() => list({ fresh: force }))
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
  lastMissRefresh = 0;
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

const indexes = new WeakMap();

/**
 * email (lower case) -> person, built once per list. Screens that match many
 * emails (a bulk upload, a list's members) look each one up here instead of
 * searching the whole directory every time.
 */
export function emailIndex(people) {
  if (!Array.isArray(people)) return new Map();
  let index = indexes.get(people);
  if (!index) {
    index = new Map();
    for (const p of people) {
      const email = String(p?.UserEMailID || '').trim().toLowerCase();
      if (email && !index.has(email)) index.set(email, p);
    }
    indexes.set(people, index);
  }
  return index;
}

/** Find one person by email, whatever its letter case. */
export function personByEmail(people, email) {
  const wanted = String(email || '').trim().toLowerCase();
  if (!wanted) return undefined;
  return emailIndex(people).get(wanted);
}

const REFRESH_GAP_MS = 60 * 1000;
const NOBODY = Object.freeze([]);
let lastMissRefresh = 0;

/**
 * A person by email, reading the directory again (at most once a minute) if
 * they aren't in it yet: someone added since it was read.
 */
export async function findPerson(email, { now = Date.now(), load = loadPeople } = {}) {
  const found = personByEmail(await load(), email);
  if (found || now - lastMissRefresh < REFRESH_GAP_MS) return found;
  lastMissRefresh = now;
  return personByEmail(await load({ force: true }), email);
}

/**
 * Who can sign in with `role` (GET /users?role=): their profile only, by
 * name. Filtered here too, so an API that ignores ?role= (before the backend
 * that answers it is deployed) still gives the right people.
 */
export function loadRolePeople(role, { list = (r) => api.users.forRole(r) } = {}) {
  if (!role) return Promise.resolve([]);
  return Promise.resolve(list(role)).then((rows) =>
    tidyPeople(rows).filter((p) => role === EVERYONE || p.role === role),
  );
}

/**
 * The login picker's people for one role, read only while `enabled` (the
 * sign-in window is open), so the landing page never downloads the directory.
 */
export function useRolePeople(role, enabled = true) {
  const [state, setState] = useState({ key: '', people: [], error: null });
  const [attempt, setAttempt] = useState(0);
  const key = enabled && role ? `${role}#${attempt}` : '';

  useEffect(() => {
    if (!key) return undefined;
    let active = true;
    loadRolePeople(role)
      .then((people) => active && setState({ key, people, error: null }))
      .catch((error) => active && setState({ key, people: [], error }));
    return () => {
      active = false;
    };
  }, [key, role]);

  const ready = state.key === key;
  return {
    people: ready ? state.people : NOBODY,
    loading: Boolean(key) && !ready,
    error: ready ? state.error : null,
    reload: () => setAttempt((n) => n + 1),
  };
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

  const byEmail = useMemo(() => emailIndex(state.people), [state.people]);
  return {
    ...state,
    byEmail,
    reload: () => {
      setState((s) => ({ ...s, loading: true, error: null }));
      setAttempt((n) => n + 1);
    },
  };
}
