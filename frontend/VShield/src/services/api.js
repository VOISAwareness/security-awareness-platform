// Central API client for the VShield backend (AWS HTTP API).
// Base URL comes from VITE_API_BASE_URL; falls back to the POC endpoint so the
// app works out of the box in development.

const BASE_URL = (
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) ||
  'https://1ldu4adn0l.execute-api.ap-south-1.amazonaws.com'
).replace(/\/$/, '');

async function request(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
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
  scenarios: { list: () => request('/scenarios') },
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
      const put = await fetch(presign.uploadUrl, {
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
  gamificationRules: { list: () => request('/gamification-rules') },
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
    reject: (id, actor, comments) =>
      request(`/campaigns/${encodeURIComponent(id)}/reject`, {
        method: 'POST',
        body: { actor, comments },
      }),
  },
};

export { BASE_URL };
