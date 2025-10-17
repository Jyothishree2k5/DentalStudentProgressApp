const API_BASE = (import.meta.env.VITE_API_URL) ? import.meta.env.VITE_API_URL : 'http://localhost:5001';

export function apiFetch(path, opts = {}, auth=true) {
  const headers = opts.headers || {};
  headers['Content-Type'] = 'application/json';
  opts.headers = headers;
  return fetch(API_BASE + path, opts);
}

export function apiPost(path, data, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  return fetch(API_BASE + path, { method: 'POST', headers, body: JSON.stringify(data) });
}
