// How many times each recipient list has been used: the campaigns that went
// out to it (selectedListId), counted from the campaign rows. Drafts, requests
// still waiting for approval and rejected ones are not uses; a campaign is
// counted once it is sending or sent.

export const USED_STATUSES = new Set(['SENDING', 'SENT']);

/** { listId: count } from raw campaign rows. */
export function listUsageCounts(campaigns) {
  const counts = {};
  (Array.isArray(campaigns) ? campaigns : []).forEach((c) => {
    const id = c && String(c.selectedListId || '').trim();
    if (id && USED_STATUSES.has(c.status)) counts[id] = (counts[id] || 0) + 1;
  });
  return counts;
}

/**
 * The "Used N times" figure for a list: counted from the campaigns once they
 * have loaded (0 when none went to it), else the number stored on the list.
 */
export function timesUsed(list, counts) {
  if (counts) return counts[list?.id] || 0;
  return Number(list?.NumberofTimesUsed ?? list?.usedCount ?? 0) || 0;
}
