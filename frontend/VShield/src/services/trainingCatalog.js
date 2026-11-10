/**
 * The training catalogue from the backend: paths, videos, quizzes and
 * certificates (GET /training/...). The Training screen edits it; the
 * campaign wizard and the scenario editor pick paths from it.
 *
 * One read of all four is shared by every screen for CATALOG_TTL_MS, and a
 * save or delete made through here updates that copy, so a screen opened
 * next shows the change without waiting.
 */
import { useEffect, useState } from 'react';

import { api } from './api.js';

export const CATALOG_TTL_MS = 60 * 1000;
export const KINDS = Object.freeze({
  paths: 'TrainingPathID',
  videos: 'TrainingVideoID',
  quizzes: 'TrainingQuizID',
  certificates: 'TrainingCertificateID',
});
const EMPTY = Object.freeze({ paths: [], videos: [], quizzes: [], certificates: [] });

let cache = { at: 0, catalog: null };
let pending = null;
const listeners = new Set();

/** IDs in the screen's order: TP-00001 before TP-00002. */
export function byId(kind) {
  const key = KINDS[kind];
  return (a, b) => String(a?.[key] || '').localeCompare(String(b?.[key] || ''), undefined, { numeric: true });
}

/** What a row sends: no browser-only blob: URLs (they mean nothing elsewhere). */
export function forServer(row) {
  return Object.fromEntries(
    Object.entries(row || {}).filter(([, v]) => !(typeof v === 'string' && v.startsWith('blob:'))),
  );
}

function publish(catalog) {
  cache = { at: Date.now(), catalog };
  listeners.forEach((fn) => fn(catalog));
  return catalog;
}

/** All four lists, read at most once per CATALOG_TTL_MS; callers at the same moment share one read. */
export function loadTraining({ force = false, client = api.training, now = Date.now() } = {}) {
  if (!force && cache.catalog && now - cache.at < CATALOG_TTL_MS) return Promise.resolve(cache.catalog);
  if (!pending) {
    pending = Promise.all(Object.keys(KINDS).map((kind) => client[kind]()))
      .then((lists) =>
        publish(
          Object.fromEntries(
            Object.keys(KINDS).map((kind, i) => [kind, (Array.isArray(lists[i]) ? lists[i] : []).sort(byId(kind))]),
          ),
        ),
      )
      .finally(() => {
        pending = null;
      });
  }
  return pending;
}

/** The last catalogue read (empty lists before the first), for code outside React. */
export function trainingSnapshot() {
  return cache.catalog || EMPTY;
}

/** Forget what was read (tests). */
export function forgetTraining() {
  cache = { at: 0, catalog: null };
  pending = null;
}

/** Save one row (the server's answer replaces it in the shared copy). */
export async function saveTraining(kind, row, { client = api.training } = {}) {
  const id = row?.[KINDS[kind]];
  if (!id) throw new Error(`${KINDS[kind]} is required`);
  const saved = (await client.save(kind, id, forServer(row))) || row;
  if (cache.catalog) {
    const rest = cache.catalog[kind].filter((r) => r[KINDS[kind]] !== id);
    publish({ ...cache.catalog, [kind]: [...rest, saved].sort(byId(kind)) });
  }
  return saved;
}

/** Delete one row, here and on the server. */
export async function deleteTraining(kind, id, { client = api.training } = {}) {
  await client.remove(kind, id);
  if (cache.catalog) {
    publish({ ...cache.catalog, [kind]: cache.catalog[kind].filter((r) => r[KINDS[kind]] !== id) });
  }
}

/**
 * The catalogue for a component: lists are [] until the API answers;
 * `loading` until then, `error` if it failed (retry with `reload`).
 */
export function useTrainingCatalog() {
  const [state, setState] = useState(() => ({
    catalog: cache.catalog || EMPTY,
    loading: !cache.catalog,
    error: null,
  }));
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    const onChange = (catalog) => {
      if (active) setState({ catalog, loading: false, error: null });
    };
    listeners.add(onChange);
    loadTraining({ force: attempt > 0 })
      .then(onChange)
      .catch((error) => {
        console.error('Could not load training', error);
        if (active) setState((s) => ({ ...s, loading: false, error }));
      });
    return () => {
      active = false;
      listeners.delete(onChange);
    };
  }, [attempt]);

  return {
    ...state.catalog,
    loading: state.loading,
    error: state.error,
    reload: () => {
      setState((s) => ({ ...s, loading: true, error: null }));
      setAttempt((n) => n + 1);
    },
  };
}
