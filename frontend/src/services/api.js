const BASE = import.meta.env.VITE_API_URL || '/api'

// Demo role switching: the backend accepts X-Demo-Role outside production (Firebase tokens take precedence).
export function getRole() {
  try { return localStorage.getItem('role') || 'citizen' } catch { return 'citizen' }
}
export function setRole(role) {
  try { localStorage.setItem('role', role) } catch { /* private mode */ }
}

async function request(path, { method = 'GET', body, form } = {}) {
  const headers = { 'X-Demo-Role': getRole() }
  if (!form) headers['Content-Type'] = 'application/json'
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: form || (body ? JSON.stringify(body) : undefined),
  })
  if (!res.ok) throw new Error((await res.text().catch(() => '')) || `${res.status} ${res.statusText}`)
  return res.status === 204 ? null : res.json()
}

const qs = (params) =>
  Object.entries(params || {}).filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')

export const api = {
  health: () => request('/health'),

  // citizen
  submit: (body) => request('/requests', { method: 'POST', body }),
  submitVoice: (form) => request('/requests/voice', { method: 'POST', form }),
  track: (code) => request(`/requests/track/${code}`),

  // analyst
  listRequests: (p) => request(`/requests?${qs(p)}`),
  getRequest: (id) => request(`/requests/${id}`),
  verify: (id, body) => request(`/requests/${id}/verify`, { method: 'POST', body }),
  reprocess: (id) => request(`/requests/${id}/reprocess`, { method: 'POST' }),

  // dashboard
  summary: (p) => request(`/dashboard/summary?${qs(p)}`),
  hotspots: (p) => request(`/dashboard/hotspots?${qs(p)}`),
  categories: (p) => request(`/dashboard/categories?${qs(p)}`),
  trends: (p) => request(`/dashboard/trends?${qs(p)}`),
  clusters: (p) => request(`/dashboard/clusters?${qs(p)}`),
  alignment: (p) => request(`/dashboard/alignment?${qs(p)}`),
  geo: (p) => request(`/dashboard/geo?${qs(p)}`),

  // recommendations
  recommendations: (p) => request(`/recommendations?${qs(p)}`),
  recommendation: (id) => request(`/recommendations/${id}`),
  recompute: (p) => request(`/recommendations/recompute?${qs(p)}`, { method: 'POST' }),
  explain: (id) => request(`/recommendations/${id}/explain`, { method: 'POST' }),
  decide: (id, body) => request(`/recommendations/${id}/decision`, { method: 'POST', body }),
  impact: (id) => request(`/recommendations/${id}/impact`),

  // config
  configCategories: (lang) => request(`/config/categories?lang=${lang || 'en'}`),
  states: () => request('/config/states'),
  languages: () => request('/config/languages'),
  datasets: () => request('/datasets'),
}
