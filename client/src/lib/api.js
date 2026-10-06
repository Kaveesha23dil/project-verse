// On your own computer the Vite dev server proxies /api to localhost:4000.
// When hosted, set VITE_API_URL to the live API address (e.g. https://your-api.onrender.com/api).
const BASE = import.meta.env.VITE_API_URL || '/api';
const TOKEN_KEY = 'pv_token';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export class ApiError extends Error {
  constructor(status, payload) {
    super(payload?.error || 'Something went wrong');
    this.status = status;
    this.code = payload?.code;
    this.payload = payload || {};
  }
  /** True when the plan blocked the action rather than the request being wrong. */
  get isQuota() {
    return this.status === 402;
  }
}

async function request(path, { method = 'GET', body, headers = {} } = {}) {
  const token = tokenStore.get();
  const res = await fetch(BASE + path, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  let payload = null;
  const text = await res.text();
  if (text) {
    try { payload = JSON.parse(text); } catch { payload = { error: text }; }
  }

  if (res.status === 401) {
    tokenStore.clear();
    if (!path.startsWith('/auth/')) window.dispatchEvent(new CustomEvent('pv:signed-out'));
  }
  if (!res.ok) throw new ApiError(res.status, payload);
  return payload;
}

const qs = (params = {}) => {
  const clean = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '');
  return clean.length ? `?${new URLSearchParams(clean)}` : '';
};

export const api = {
  get: (p, params) => request(p + qs(params)),
  post: (p, body) => request(p, { method: 'POST', body }),
  put: (p, body) => request(p, { method: 'PUT', body }),
  patch: (p, body) => request(p, { method: 'PATCH', body }),
  del: (p) => request(p, { method: 'DELETE' }),

  auth: {
    login: (body) => request('/auth/login', { method: 'POST', body }),
    register: (body) => request('/auth/register', { method: 'POST', body }),
    me: () => request('/auth/me'),
    changePassword: (body) => request('/auth/change-password', { method: 'POST', body }),
  },
};

export default api;
