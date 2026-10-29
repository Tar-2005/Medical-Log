/**
 * API Service — Centralized HTTP client
 * ───────────────────────────────────────────────
 * All backend calls flow through here.
 * ⚠ NEVER log PHI to the console.
 */

function getApiBase() {
  if (typeof window !== 'undefined' && window.location && window.location.hostname === 'localhost') {
    return 'http://localhost:4000/api';
  }
  const rawBase = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000/api';
  return rawBase.replace(/\/+$/, '');
}

async function request(method, path, body = null, headers = {}) {
  const config = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };
  if (body) {
    config.body = JSON.stringify(body);
  }

  const apiBase = getApiBase();
  let cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (apiBase.endsWith('/api') && cleanPath.startsWith('/api/')) {
    cleanPath = cleanPath.substring(4);
  }
  const url = `${apiBase}${cleanPath}`;

  const res = await fetch(url, config);
  if (!res.ok) {
    throw new Error(`API ${method} ${cleanPath} failed with status ${res.status}`);
  }
  return res.json();
}

export const api = {
  get: (path, headers) => request('GET', path, null, headers),
  post: (path, body, headers) => request('POST', path, body, headers),
  put: (path, body, headers) => request('PUT', path, body, headers),
  del: (path, headers) => request('DELETE', path, null, headers),
};

export default api;
