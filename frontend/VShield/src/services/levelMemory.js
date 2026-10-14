/**
 * The level a person last saw on this browser, so My Space can mark a change:
 * a celebration when it went up, a short note when it went down. Nothing is
 * shown the first time (there is nothing to compare with).
 *
 * Kept per browser for now; the server will hold it with the points ledger.
 * `storage` is passed in (localStorage in the app), so `node --test` can use
 * a stand-in. Storage that is missing or throws is treated as empty.
 */
import { LEVEL_BY_ID, levelChange } from './levels.js';

const key = (email) => `voisshield_last_level:${String(email || '').trim().toLowerCase()}`;

export function readLastLevel(storage, email) {
  try {
    const id = storage?.getItem(key(email));
    return id && LEVEL_BY_ID[id] ? id : null;
  } catch {
    return null;
  }
}

export function rememberLevel(storage, email, levelId) {
  if (!levelId) return;
  try {
    storage?.setItem(key(email), levelId);
  } catch {
    // private window or blocked storage: the note just won't show next time
  }
}

/** { kind: 'up' | 'down', from, to } between the last seen level and now, or null. */
export function levelNotice(lastId, currentId) {
  const kind = levelChange(lastId, currentId);
  return kind ? { kind, from: LEVEL_BY_ID[lastId], to: LEVEL_BY_ID[currentId] } : null;
}
