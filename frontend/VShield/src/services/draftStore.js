/**
 * draftStore — small per-user browser-storage helpers for work in progress
 * (the campaign wizard's draft pointer and step, the scenario editor's form).
 *
 * Every key is scoped to the signed-in person (`<base>:<actor>`), so two people
 * sharing a browser never see or resume each other's drafts. Storage can be
 * unavailable (private mode, blocked site data), so every access is wrapped and
 * callers get null / false instead of an exception.
 *
 * Templates (built-in scenarios, emails, landing pages, training paths) are never
 * written from here: a draft is always the user's own copy.
 */
import { currentActor } from './identity.js';

/** `voisshield_scenario_draft` + `a@b.com` -> `voisshield_scenario_draft:a@b.com` */
export function scopedKey(base, actor = currentActor()) {
  const who = String(actor || '').trim().toLowerCase() || 'anonymous';
  return `${base}:${who}`;
}

export function readString(key) {
  try {
    return localStorage.getItem(key) || '';
  } catch {
    return '';
  }
}

export function writeString(key, value) {
  try {
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export function readJSON(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    // Quota exceeded or storage blocked: the caller keeps working in memory.
    return false;
  }
}

export function removeKey(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* storage unavailable — nothing to remove */
  }
}
