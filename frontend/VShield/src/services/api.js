// Central API client for the VShield backend (AWS HTTP API).
// Base URL comes from VITE_API_BASE_URL; falls back to the POC endpoint so the
// app works out of the box in development.

const BASE_URL = (
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) ||
  'https://1ldu4adn0l.execute-api.ap-south-1.amazonaws.com'
).replace(/\/$/, '');

// Recipient uploads PUT straight to a presigned S3 URL, bypassing the dev
// proxy. The bucket's CORS allowlist only covers the localhost dev origins, so
// in dev the PUT is routed through the dev server instead — see the
// s3-upload proxy in vite.config.js. Builds keep PUTting to S3 directly.
const uploadTarget = (url) =>
  typeof import.meta !== 'undefined' && import.meta.env?.DEV
    ? `/__s3-upload?url=${encodeURIComponent(url)}`
    : url;

// `keepalive` lets a request outlive the page (sent as it closes). Browsers
// refuse a keepalive body over 64 KB, so callers check the size first.
async function request(path, { method = 'GET', body, keepalive = false } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    ...(keepalive ? { keepalive: true } : {}),
  });

  // 204 No Content (e.g. DELETE) has no body.
  if (res.status === 204) return null;

  let payload;
  try {
    payload = await res.json();
  } catch {
    payload = null;
  }

  if (!res.ok) {
    // Two error shapes are in play: the newer `{ error: { message } }` envelope
    // and the original Lambdas' flat `{ message, problems: [...] }`. Read both so
    // validation failures surface their reasons instead of "Request failed (400)".
    const message =
      payload?.error?.message ||
      payload?.message ||
      `Request failed (${res.status})`;
    const error = new Error(message);
    error.status = res.status;
    error.problems = payload?.problems || payload?.error?.problems || [];
    error.payload = payload;
    throw error;
  }
  // Endpoints wrap results as { data, ... }; return the data.
  return payload?.data ?? payload;
}

export const api = {
  senderIdentities: {
    list: () => request('/sender-identities'),
    create: (item) => request('/sender-identities', { method: 'POST', body: item }),
    update: (id, patch) =>
      request(`/sender-identities/${encodeURIComponent(id)}`, { method: 'PUT', body: patch }),
    remove: (id) =>
      request(`/sender-identities/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  },
  // Read-only reference data (used by later screens).
  users: { list: () => request('/users') },
  // Ownership (scenarioOwnership.js): `viewer` asks for what that person may
  // see, each row annotated with its `ownership`; `actor` says who is changing
  // a row. Both are client-asserted until sign-in exists (identity.js), so they
  // keep honest users apart but are not a security boundary.
  scenarios: {
    list: ({ viewer } = {}) =>
      request(`/scenarios${viewer ? `?viewer=${encodeURIComponent(viewer)}` : ''}`),
    get: (id) => request(`/scenarios/${encodeURIComponent(id)}`),
    // A copy or revision carries createdBy and copyOf / revisionOf.
    create: (item) => request('/scenarios', { method: 'POST', body: item }),
    update: (id, patch, actor) =>
      request(`/scenarios/${encodeURIComponent(id)}`, { method: 'PUT', body: { ...patch, actor } }),
    remove: (id, actor) =>
      request(`/scenarios/${encodeURIComponent(id)}?actor=${encodeURIComponent(actor || '')}`, {
        method: 'DELETE',
      }),

    // Presign, then PUT the image straight to S3. Returns the key to store as
    // CoverImageID; the API hands back a presigned GET for it on later reads.
    async uploadCover({ scenarioId, file }) {
      const presign = await request('/scenarios/cover-upload', {
        method: 'POST',
        body: { scenarioId, fileName: file.name, contentType: file.type },
      });
      const put = await fetch(uploadTarget(presign.uploadUrl), {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!put.ok) throw new Error(`Cover upload failed (${put.status})`);
      return presign.coverImageKey;
    },
  },
  // The scenario editor's unpublished drafts, per person (`owner`, the
  // client-asserted email as for `viewer` / `actor`). list() is summaries for
  // the Drafts tab; get() one whole draft. save() body:
  // { owner, baseRev, saveId, draft: { version, savedAt, activeTab, formData, edit? }, summary };
  // a 409 DRAFT_CONFLICT error carries `payload.error.current`. See
  // scenarioDraftSync.js.
  scenarioDrafts: {
    list: (owner) => request(`/scenario-drafts?owner=${encodeURIComponent(owner || '')}`),
    get: (id, owner) =>
      request(`/scenario-drafts/${encodeURIComponent(id)}?owner=${encodeURIComponent(owner || '')}`),
    save: (id, body, { keepalive = false } = {}) =>
      request(`/scenario-drafts/${encodeURIComponent(id)}`, { method: 'PUT', body, keepalive }),
    remove: (id, owner) =>
      request(`/scenario-drafts/${encodeURIComponent(id)}?owner=${encodeURIComponent(owner || '')}`, {
        method: 'DELETE',
      }),
  },
  landingPages: {
    list: () => request('/landing-pages'),
    create: (item) => request('/landing-pages', { method: 'POST', body: item }),
    update: (id, patch) =>
      request(`/landing-pages/${encodeURIComponent(id)}`, { method: 'PUT', body: patch }),
    remove: (id) =>
      request(`/landing-pages/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  },
  userLists: {
    list: () => request('/user-lists'),
    members: (id) => request(`/user-lists/${encodeURIComponent(id)}/members`),
    update: (id, patch) =>
      request(`/user-lists/${encodeURIComponent(id)}`, { method: 'PUT', body: patch }),
    remove: (id) =>
      request(`/user-lists/${encodeURIComponent(id)}`, { method: 'DELETE' }),

    // Option A upload: presign -> PUT the file straight to S3 -> trigger ingest.
    // `listId` is optional; passing it replaces an existing list in place.
    async upload({ name, description, file, listId }) {
      const presign = await request('/user-lists/bulk-upload', {
        method: 'POST',
        body: { name, description, fileName: file.name, listId },
      });
      const put = await fetch(uploadTarget(presign.uploadUrl), {
        method: 'PUT',
        headers: { 'Content-Type': 'text/csv' },
        body: file,
      });
      if (!put.ok) throw new Error(`Upload to storage failed (${put.status})`);
      return request(`/user-lists/${encodeURIComponent(presign.listId)}/ingest`, {
        method: 'POST',
      });
    },
  },
  gamificationRules: {
    list: () => request('/gamification-rules'),
    // eventOperation is the rule's name, e.g. "Clicked". actor is recorded as
    // ModifiedBy so the Gamification Engine shows who changed it last.
    update: (eventOperation, points, actor) =>
      request(`/gamification-rules/${encodeURIComponent(eventOperation)}`, {
        method: 'PUT',
        body: { PointsAssigned: points, ModifiedBy: actor },
      }),
  },
  // Levels and points: reference-api reads the points ledger the
  // points-engine Lambda writes. `viewer` is client-asserted, like elsewhere.
  points: {
    standing: (viewer) => request(`/standing?viewer=${encodeURIComponent(viewer || '')}`),
    levels: () => request('/levels'),
    // The whole global board, ranked. `role` lets an Admin see levels below
    // zero; like `viewer`, it is not a security boundary until sign-in exists.
    leaderboard: (viewer, role) =>
      request(
        `/leaderboard?viewer=${encodeURIComponent(viewer || '')}${role ? `&role=${encodeURIComponent(role)}` : ''}`,
      ),
  },
  training: {
    paths: () => request('/training/paths'),
    videos: () => request('/training/videos'),
    quizzes: () => request('/training/quizzes'),
    certificates: () => request('/training/certificates'),
  },
  campaignsCatalog: { list: () => request('/campaigns-catalog') },

  campaigns: {
    // status is the backend enum: DRAFT | PENDING_APPROVAL | APPROVED |
    // REJECTED | SENDING | SENT | FAILED
    list: (status) =>
      request(`/campaigns${status ? `?status=${encodeURIComponent(status)}` : ''}`),
    get: (id) => request(`/campaigns/${encodeURIComponent(id)}`),
    create: (fields) => request('/campaigns', { method: 'POST', body: fields }),
    update: (id, patch) =>
      request(`/campaigns/${encodeURIComponent(id)}`, { method: 'PUT', body: patch }),
    remove: (id) =>
      request(`/campaigns/${encodeURIComponent(id)}`, { method: 'DELETE' }),

    // Workflow transitions are owned by the approval Lambda.
    submit: (id, actor, comments) =>
      request(`/campaigns/${encodeURIComponent(id)}/submit`, {
        method: 'POST',
        body: { actor, comments },
      }),
    approve: (id, actor, comments) =>
      request(`/campaigns/${encodeURIComponent(id)}/approve`, {
        method: 'POST',
        body: { actor, comments },
      }),
    // `notify: true` is "reject with notification": `comments` becomes the
    // message asking the creator for changes, and is then required.
    reject: (id, actor, comments, { notify = false } = {}) =>
      request(`/campaigns/${encodeURIComponent(id)}/reject`, {
        method: 'POST',
        body: { actor, comments, notify },
      }),
    // Creator only: pulls a pending request back to DRAFT (e.g. to reschedule).
    withdraw: (id, actor, comments) =>
      request(`/campaigns/${encodeURIComponent(id)}/withdraw`, {
        method: 'POST',
        body: { actor, comments },
      }),
    // Trigger the send for an APPROVED campaign. The email-sender Lambda owns
    // the APPROVED -> SENDING -> SENT transition and, in the SES sandbox,
    // delivers only to its configured verified recipient — never the campaign's
    // real audience. `actor` is recorded for audit; the body is otherwise
    // ignored by the Lambda.
    send: (id, actor) =>
      request(`/campaigns/${encodeURIComponent(id)}/send`, {
        method: 'POST',
        body: { actor },
      }),
  },
};

export { BASE_URL };
