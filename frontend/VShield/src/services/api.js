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
    const message = payload?.error?.message || `Request failed (${res.status})`;
    throw new Error(message);
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
  landingPages: { list: () => request('/landing-pages') },
  userLists: {
    list: () => request('/user-lists'),
    members: (id) => request(`/user-lists/${encodeURIComponent(id)}/members`),
  },
  gamificationRules: { list: () => request('/gamification-rules') },
  training: {
    paths: () => request('/training/paths'),
    videos: () => request('/training/videos'),
    quizzes: () => request('/training/quizzes'),
    certificates: () => request('/training/certificates'),
  },
  campaignsCatalog: { list: () => request('/campaigns-catalog') },
};

export { BASE_URL };
