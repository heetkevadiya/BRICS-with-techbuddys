const BASE = import.meta.env.VITE_API_URL || '/api'

/** The route is the role, so a deep link or a refresh on /policymaker works the same as clicking the tab.
 *  Outside production the backend trusts X-Demo-Role; in production a Firebase ID token carries the role
 *  in its claims and this header is ignored. */
export function getRole() {
  const seg = window.location.pathname.split('/')[1]
  if (['citizen', 'analyst', 'policymaker'].includes(seg)) return seg
  // the AI transparency page reads analyst-level metrics; the landing page uses a public endpoint
  return seg === 'ai' ? 'analyst' : 'citizen'
}

async function request(path, { method = 'GET', body, form } = {}) {
  const headers = { 'X-Demo-Role': getRole() }
  if (!form) headers['Content-Type'] = 'application/json'

  const res = await fetch(`${BASE}${path}`, { method, headers, body: form || (body ? JSON.stringify(body) : undefined) })
  if (!res.ok) {
    const err = new Error(await readError(res))
    err.status = res.status
    throw err
  }
  return res.status === 204 ? null : res.json()
}

/** FastAPI returns {"detail": ...}; surface that rather than a raw JSON blob. */
async function readError(res) {
  const text = await res.text().catch(() => '')
  try {
    const { detail } = JSON.parse(text)
    if (typeof detail === 'string') return detail
    if (Array.isArray(detail)) return detail.map((d) => d.msg || JSON.stringify(d)).join('; ')
  } catch { /* not JSON */ }
  return text || `${res.status} ${res.statusText}`
}

const qs = (params) =>
  Object.entries(params || {})
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&')

export const api = {
  // citizen
  submit: (body) => request('/requests', { method: 'POST', body }),
  submitVoice: (form) => request('/requests/voice', { method: 'POST', form }),
  track: (code) => request(`/requests/track/${code}`),

  // analyst
  listRequests: (p) => request(`/requests?${qs(p)}`),
  verify: (id, body) => request(`/requests/${id}/verify`, { method: 'POST', body }),
  reprocess: (id) => request(`/requests/${id}/reprocess`, { method: 'POST' }),

  // dashboard
  summary: (p) => request(`/dashboard/summary?${qs(p)}`),
  trends: (p) => request(`/dashboard/trends?${qs(p)}`),
  alignment: (p) => request(`/dashboard/alignment?${qs(p)}`),
  geo: (p) => request(`/dashboard/geo?${qs(p)}`),

  // recommendations
  recommendations: (p) => request(`/recommendations?${qs(p)}`),
  recommendation: (id) => request(`/recommendations/${id}`),
  decide: (id, body) => request(`/recommendations/${id}/decision`, { method: 'POST', body }),
  impact: (id) => request(`/recommendations/${id}/impact`),

  // public
  publicSummary: () => request('/config/coverage'),
  showcase: () => request('/config/showcase'),

  // AI transparency
  aiPerformance: () => request('/ai/performance'),

  // data provenance & national warehouse
  datasets: () => request('/datasets'),
  warehouse: () => request('/datasets/warehouse'),

  // config
  configCategories: (lang) => request(`/config/categories?lang=${lang || 'en'}`),
  states: () => request('/config/states'),
  languages: () => request('/config/languages'),
}
