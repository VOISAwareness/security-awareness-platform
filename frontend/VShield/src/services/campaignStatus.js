/**
 * campaignStatus — the single vocabulary for campaign state across the app.
 *
 * Two orthogonal ideas are deliberately kept apart:
 *
 *  1. WORKFLOW STATUS — where a campaign sits in the approval pipeline. The
 *     backend owns it (`status`), it is the only value that ever gets written,
 *     and it is the truth: DRAFT -> PENDING_APPROVAL -> APPROVED -> SENDING ->
 *     SENT, with REJECTED and FAILED as the off-ramps.
 *
 *  2. LIFECYCLE PHASE — Upcoming / Live / Completed. This is NOT stored; it is
 *     derived from startTime/endTime and only means anything once a campaign
 *     has actually been approved to run. The frontend's original dummy data
 *     (CampaignsData.json) used these as if they were the status, which is why
 *     they are defined here rather than invented separately on each screen.
 *
 * `normalizeCampaign` also exists because three different field vocabularies
 * are live in the campaigns table at once:
 *   - the wizard / campaigns-api:  campaignTitle, emailSubject, senderEmailId
 *   - the original send POC:       campaignName,  subject,      senderName
 *   - the bundled dummy JSON:      CampaignTitle, EmailSubject, SenderEmailID
 * Screens read the normalized shape so none of them has to know this.
 */

export const STATUS = {
  DRAFT: 'DRAFT',
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  SENDING: 'SENDING',
  SENT: 'SENT',
  FAILED: 'FAILED',
};

// Display metadata. `tone` drives the chip colours below; `blurb` is the plain
// explanation shown in empty states and tooltips.
export const STATUS_META = {
  DRAFT: {
    label: 'Draft',
    tone: 'neutral',
    blurb: 'Still being built in the wizard. Not submitted.',
  },
  PENDING_APPROVAL: {
    label: 'Pending Approval',
    tone: 'amber',
    blurb: 'Submitted and waiting for an approver to review it.',
  },
  APPROVED: {
    label: 'Approved',
    tone: 'green',
    blurb: 'Cleared to run. Sending has not started yet.',
  },
  REJECTED: {
    label: 'Rejected',
    tone: 'red',
    blurb: 'Sent back by an approver. Editable again.',
  },
  SENDING: {
    label: 'Sending',
    tone: 'blue',
    blurb: 'Emails are going out right now.',
  },
  SENT: {
    label: 'Sent',
    tone: 'violet',
    blurb: 'All emails dispatched.',
  },
  FAILED: {
    label: 'Failed',
    tone: 'red',
    blurb: 'Sending could not complete. Check the campaign for details.',
  },
};

const UNKNOWN_META = { label: 'Unknown', tone: 'neutral', blurb: '' };

export function statusMeta(status) {
  return STATUS_META[status] || { ...UNKNOWN_META, label: status || 'Unknown' };
}

// Order used by every status filter/tab so the screens agree.
export const STATUS_ORDER = [
  STATUS.DRAFT,
  STATUS.PENDING_APPROVAL,
  STATUS.APPROVED,
  STATUS.SENDING,
  STATUS.SENT,
  STATUS.REJECTED,
  STATUS.FAILED,
];

// Only these can still be opened in the wizard (mirrors EDITABLE_STATUSES in
// backend/campaigns-api/lambda_function.py — keep the two in step).
export const EDITABLE_STATUSES = [STATUS.DRAFT, STATUS.REJECTED];

export function isEditable(status) {
  return EDITABLE_STATUSES.includes(status);
}

/**
 * Chip classes for a status. Written as full class strings (not interpolated
 * fragments) so Tailwind's scanner keeps them.
 */
export function statusChipClasses(status, isDark) {
  const tone = statusMeta(status).tone;
  const dark = {
    neutral: 'bg-slate-500/15 text-slate-300 border-slate-400/25',
    amber: 'bg-amber-500/15 text-amber-300 border-amber-400/30',
    green: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30',
    red: 'bg-rose-500/15 text-rose-300 border-rose-400/30',
    blue: 'bg-sky-500/15 text-sky-300 border-sky-400/30',
    violet: 'bg-violet-500/15 text-violet-300 border-violet-400/30',
  };
  const light = {
    neutral: 'bg-slate-100 text-slate-700 border-slate-300',
    amber: 'bg-amber-50 text-amber-700 border-amber-300',
    green: 'bg-emerald-50 text-emerald-700 border-emerald-300',
    red: 'bg-rose-50 text-rose-700 border-rose-300',
    blue: 'bg-sky-50 text-sky-700 border-sky-300',
    violet: 'bg-violet-50 text-violet-700 border-violet-300',
  };
  return (isDark ? dark : light)[tone] || (isDark ? dark.neutral : light.neutral);
}

// --- Lifecycle phase (derived, never stored) --------------------------------

export const PHASE = {
  UPCOMING: 'Upcoming',
  LIVE: 'Live',
  COMPLETED: 'Completed',
};

/**
 * Where an approved campaign sits in real time. Returns null when the campaign
 * has not been approved yet (a DRAFT with a future start date is not
 * "Upcoming" in any meaningful sense — it may never be approved) or when the
 * dates are missing/unparseable.
 */
export function derivePhase(campaign, now = new Date()) {
  const running = [STATUS.APPROVED, STATUS.SENDING, STATUS.SENT];
  if (!campaign || !running.includes(campaign.status)) return null;

  const start = parseDate(campaign.startTime);
  const end = parseDate(campaign.endTime);

  if (start && now < start) return PHASE.UPCOMING;
  if (end && now > end) return PHASE.COMPLETED;
  if (start && now >= start && (!end || now <= end)) return PHASE.LIVE;
  // Sent with no usable dates: treat as finished rather than claiming it's live.
  return campaign.status === STATUS.SENT ? PHASE.COMPLETED : null;
}

/**
 * Dates arrive in several shapes: ISO from the API, the wizard's
 * `datetime-local` value (`2026-10-01T09:00`), and `MM/DD/YYYY hh:mm AM` from
 * the bundled dummy data. Returns null rather than an Invalid Date.
 */
export function parseDate(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

  const raw = String(value).trim();
  if (!raw) return null;

  const direct = new Date(raw);
  if (!Number.isNaN(direct.getTime())) return direct;

  // MM/DD/YYYY hh:mm AM|PM
  const m = raw.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})\s*(AM|PM)?$/i
  );
  if (m) {
    const [, mm, dd, yyyy, hh, min, ap] = m;
    let hour = Number(hh);
    if (ap) {
      const upper = ap.toUpperCase();
      if (upper === 'PM' && hour !== 12) hour += 12;
      if (upper === 'AM' && hour === 12) hour = 0;
    }
    const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd), hour, Number(min));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/** Short, stable display format. Returns an em dash when there is no date. */
export function formatDateTime(value) {
  const d = parseDate(value);
  if (!d) return '—';
  return d.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** "3 hours ago" / "in 2 days" — for the approvals queue's waiting time. */
export function relativeTime(value, now = new Date()) {
  const d = parseDate(value);
  if (!d) return '—';
  const diffMs = d.getTime() - now.getTime();
  const abs = Math.abs(diffMs);
  const units = [
    ['year', 365 * 24 * 60 * 60 * 1000],
    ['month', 30 * 24 * 60 * 60 * 1000],
    ['day', 24 * 60 * 60 * 1000],
    ['hour', 60 * 60 * 1000],
    ['minute', 60 * 1000],
  ];
  for (const [unit, ms] of units) {
    if (abs >= ms) {
      const n = Math.round(diffMs / ms);
      return new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' }).format(n, unit);
    }
  }
  return 'just now';
}

// --- Field normalization ----------------------------------------------------

/** First non-empty value among the given keys. */
function pick(raw, ...keys) {
  for (const k of keys) {
    const v = raw?.[k];
    if (v !== undefined && v !== null && String(v).trim() !== '') return v;
  }
  return '';
}

/**
 * Map any campaign row — whichever of the three vocabularies wrote it — onto
 * one shape. Unknown extra fields are preserved so detail views can still read
 * them.
 */
export function normalizeCampaign(raw) {
  if (!raw) return null;

  const status = String(pick(raw, 'status', 'campaignStatus') || STATUS.DRAFT)
    .toUpperCase()
    .replace(/\s+/g, '_');

  const normalized = {
    ...raw,
    campaignId: pick(raw, 'campaignId', 'CampaignID', 'id'),
    // `campaignStatus` in the dummy data held a lifecycle phase, not a workflow
    // status, so it must not win over a real one.
    status: STATUS_META[status] ? status : STATUS.DRAFT,
    campaignTitle: pick(raw, 'campaignTitle', 'CampaignTitle', 'campaignName'),
    campaignDescription: pick(raw, 'campaignDescription', 'CampaignDescription'),
    emailSubject: pick(raw, 'emailSubject', 'EmailSubject', 'subject'),
    emailBody: pick(raw, 'emailBody', 'EmailBody'),
    senderEmailId: pick(raw, 'senderEmailId', 'SenderEmailID'),
    senderName: pick(raw, 'senderName', 'SenderName'),
    startTime: pick(raw, 'startTime', 'StartTime'),
    endTime: pick(raw, 'endTime', 'EndTime'),
    createdAt: pick(raw, 'createdAt', 'CreationDate'),
    updatedAt: pick(raw, 'updatedAt'),
    scenarioId: pick(raw, 'scenarioId', 'ScenarioID'),
    landingPageId: pick(raw, 'landingPageId', 'LandingPageID'),
    trainingId: pick(raw, 'trainingId', 'TrainingPathID'),
    // `pick` does flat lookups only; the nested legacy reference is handled
    // explicitly below.
    selectedListId: pick(raw, 'selectedListId'),
    selectedListName: pick(raw, 'selectedListName'),
    recipientCount: raw?.recipientCount ?? raw?.totalUsers ?? null,
    submittedBy: pick(raw, 'submittedBy'),
    submittedAt: pick(raw, 'submittedAt'),
    submissionComments: pick(raw, 'submissionComments'),
    approvedBy: pick(raw, 'approvedBy'),
    approvedAt: pick(raw, 'approvedAt'),
    approvalComments: pick(raw, 'approvalComments'),
    rejectedBy: pick(raw, 'rejectedBy'),
    rejectedAt: pick(raw, 'rejectedAt'),
    rejectionComments: pick(raw, 'rejectionComments'),
  };

  // Nested legacy recipient reference.
  if (!normalized.selectedListId && raw?.RecipientDetails?.UserListID) {
    normalized.selectedListId = raw.RecipientDetails.UserListID;
  }

  // Some campaigns target individually chosen addresses rather than a saved
  // list. "Who receives this" is the single most important thing an approver
  // checks, so surface those the same way a list is surfaced instead of
  // leaving the recipient column empty.
  const explicit =
    raw?.recipientDetails?.EmailIDsListed || raw?.RecipientDetails?.EmailIDsListed;
  normalized.recipientEmails = Array.isArray(explicit) ? explicit : [];
  if (!normalized.selectedListId && normalized.recipientEmails.length) {
    const n = normalized.recipientEmails.length;
    normalized.selectedListName =
      normalized.selectedListName || `${n} individually selected recipient${n === 1 ? '' : 's'}`;
    if (normalized.recipientCount == null) normalized.recipientCount = n;
  }

  normalized.phase = derivePhase(normalized);
  return normalized;
}

/** Best available human label for a campaign that may have no title yet. */
export function campaignLabel(campaign) {
  return (
    campaign?.campaignTitle ||
    campaign?.emailSubject ||
    `Untitled campaign (${campaign?.campaignId || 'unknown'})`
  );
}
