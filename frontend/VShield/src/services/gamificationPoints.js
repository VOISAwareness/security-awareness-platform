/**
 * Gamification rules: the points each tracked event awards or deducts.
 * The Gamification Engine edits them (PUT /gamification-rules/{name}); the
 * campaign wizard shows them. Pure helpers, so `node --test` can cover them.
 */
export const GAMIFICATION_EVENTS = ['Opened', 'Clicked', 'Compromised', 'Reported', 'Trained', 'Evaluated'];

/** The stored rule name for a card id or any casing ("clicked" -> "Clicked"). */
export function eventName(id) {
  const key = String(id || '').trim().toLowerCase();
  return GAMIFICATION_EVENTS.find((name) => name.toLowerCase() === key) || null;
}

/** Rule rows -> { Opened: 0, Clicked: -30, ... }; null where a rule is missing. */
export function pointsByEvent(rows) {
  const points = Object.fromEntries(GAMIFICATION_EVENTS.map((name) => [name, null]));
  (Array.isArray(rows) ? rows : []).forEach((row) => {
    const name = eventName(row?.EventOperation);
    const value = Number(row?.PointsAssigned);
    if (name && row?.PointsAssigned !== null && row?.PointsAssigned !== '' && Number.isFinite(value)) {
      points[name] = value;
    }
  });
  return points;
}

/** "+80", "-30", "0"; an em dash when the value is unknown. */
export function formatPoints(value) {
  if (value === null || value === undefined) return '—';
  return value > 0 ? `+${value}` : String(value);
}
