import { readString, scopedKey, writeString } from './draftStore.js';

// What the bell in the top bar shows a campaign's creator: their campaigns an
// approver sent back ("Notify for changes") or rejected, with the approver's
// message. Read straight from the campaign rows (GET /campaigns), so nothing
// new is stored on the server; which ones the person has already seen is a
// per-browser convenience kept in localStorage.

export const NOTICE_KIND = {
  CHANGES: 'changes', // rejected with notification: edit and resubmit
  REJECTED: 'rejected', // final: delete or copy to a new draft
};

const owner = (c) => String(c?.createdBy || c?.submittedBy || '').trim().toLowerCase();

/**
 * The notices for `actor` (an email, lower case) from raw campaign rows,
 * newest first: [{ key, campaignId, title, kind, by, message, at }].
 * `key` changes each time the campaign is sent back again, so a second
 * request for changes shows as new.
 */
export function noticesFor(campaigns, actor) {
  const me = String(actor || '').trim().toLowerCase();
  if (!me) return [];
  return (Array.isArray(campaigns) ? campaigns : [])
    .filter((c) => c && c.status === 'REJECTED' && owner(c) === me)
    .map((c) => {
      const at = c.rejectedAt || c.updatedAt || '';
      return {
        key: `${c.campaignId}:${at}`,
        campaignId: c.campaignId,
        title: c.campaignTitle || c.title || c.campaignId,
        kind: c.changesRequested === true ? NOTICE_KIND.CHANGES : NOTICE_KIND.REJECTED,
        by: c.rejectedBy || '',
        message: String(c.rejectionComments || '').trim(),
        at,
        wizardStep: c.wizardStep,
      };
    })
    .sort((a, b) => String(b.at).localeCompare(String(a.at)));
}

const SEEN_BASE = 'voisshield_seen_campaign_notices';
const MAX_SEEN = 200;

/** The notice keys this person has opened or dismissed, in this browser. */
export function seenNotices(actor) {
  try {
    const list = JSON.parse(readString(scopedKey(SEEN_BASE, actor)) || '[]');
    return new Set(Array.isArray(list) ? list : []);
  } catch {
    return new Set();
  }
}

export function markNoticesSeen(actor, keys) {
  const all = [...seenNotices(actor), ...keys];
  writeString(scopedKey(SEEN_BASE, actor), JSON.stringify([...new Set(all)].slice(-MAX_SEEN)));
}

/** How a notice reads. */
export function noticeText(n) {
  return n.kind === NOTICE_KIND.CHANGES
    ? { headline: 'Changes requested', action: 'Open draft' }
    : { headline: 'Rejected', action: 'View' };
}
