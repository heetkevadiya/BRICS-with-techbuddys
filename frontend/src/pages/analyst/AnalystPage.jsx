import { useState } from 'react'
import { api } from '../../services/api'
import { useApi } from '../../hooks/useApi'
import { Badge, Card, ErrorBox, Spinner, num } from '../../components/ui'

const STATUS_TONE = { PROCESSED: 'green', REVIEW_REQUIRED: 'amber', FAILED: 'rose', PROCESSING: 'blue', RECEIVED: 'slate' }

export default function AnalystPage() {
  const [filters, setFilters] = useState({ status: 'REVIEW_REQUIRED', district: '', category: '', q: '' })
  const [selected, setSelected] = useState(null)
  const { data: cats } = useApi(() => api.configCategories(), [])
  const { data: states } = useApi(() => api.states(), [])
  const districts = states?.find((s) => s.is_default)?.districts || []
  const { data, error, loading, reload } = useApi(() => api.listRequests({ ...filters, page_size: 50 }), [JSON.stringify(filters)])

  const set = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value }))

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 px-4 py-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Analyst review queue</h1>
          <p className="text-sm text-slate-600">AI results are proposals. Approve, correct or reject — every change is audited.</p>
        </div>
        {data && <Badge tone="blue">{num(data.total)} matching requests</Badge>}
      </header>

      <Card>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <select value={filters.status} onChange={set('status')} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="">All statuses</option>
            {['RECEIVED', 'PROCESSING', 'PROCESSED', 'REVIEW_REQUIRED', 'FAILED'].map((s) => <option key={s}>{s}</option>)}
          </select>
          <select value={filters.district} onChange={set('district')} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="">All districts</option>
            {districts.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
          </select>
          <select value={filters.category} onChange={set('category')} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="">All categories</option>
            {(cats || []).map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
          </select>
          <input value={filters.q} onChange={set('q')} placeholder="Search text…" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </div>
      </Card>

      <ErrorBox error={error} />
      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <Card className="overflow-hidden" title="Requests">
          {loading ? <Spinner /> : (
            <div className="max-h-[70vh] overflow-auto">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-white text-xs uppercase text-slate-500">
                  <tr><th className="py-2">Message</th><th>Category</th><th>District</th><th>Urg</th><th>Conf</th><th>Status</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(data?.items || []).map((r) => (
                    <tr key={r.id} onClick={() => setSelected(r)} className={`cursor-pointer hover:bg-slate-50 ${selected?.id === r.id ? 'bg-blue-50' : ''}`}>
                      <td className="max-w-[320px] truncate py-2 pr-2">
                        <span className="text-slate-900">{r.original_text || r.transcript || '(voice)'}</span>
                        <span className="ml-1 text-xs text-slate-400">{r.detected_language}</span>
                      </td>
                      <td className="pr-2 text-slate-700">{r.category_code}</td>
                      <td className="pr-2 text-slate-700">{r.resolved_geo?.name || '—'}</td>
                      <td className="pr-2 tabular-nums">{r.urgency_score ?? '—'}</td>
                      <td className="pr-2 tabular-nums">{r.ai_confidence?.toFixed(2) ?? '—'}</td>
                      <td><Badge tone={STATUS_TONE[r.processing_status]}>{r.processing_status.replace('_', ' ').toLowerCase()}</Badge></td>
                    </tr>
                  ))}
                  {!data?.items?.length && <tr><td colSpan={6} className="py-8 text-center text-slate-400">No requests match these filters.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {selected ? <Detail request={selected} categories={cats || []} districts={districts} onDone={(r) => { setSelected(r); reload() }} />
          : <Card title="Detail"><p className="text-sm text-slate-500">Select a request to review the AI output beside the citizen's original words.</p></Card>}
      </div>
    </div>
  )
}

function Detail({ request, categories, districts, onDone }) {
  const [form, setForm] = useState({})
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const r = request
  const val = (k) => (k in form ? form[k] : r[k])

  async function act(action) {
    setBusy(true); setError(null)
    try {
      const corrections = action === 'CORRECT'
        ? Object.fromEntries(Object.entries(form).map(([k, v]) => [k, k === 'urgency_score' || k === 'resolved_geo_id' ? Number(v) : v]))
        : undefined
      const updated = await api.verify(r.id, { action, corrections, reason: reason || null })
      setForm({}); setReason(''); onDone(updated)
    } catch (e) { setError(e) } finally { setBusy(false) }
  }

  return (
    <Card title={`Request #${r.id} · ${r.tracking_code}`} actions={<Badge tone={STATUS_TONE[r.processing_status]}>{r.processing_status}</Badge>}>
      <div className="space-y-4">
        <div className="rounded-lg bg-slate-50 p-3">
          <div className="text-xs font-medium uppercase text-slate-500">Citizen's original ({r.detected_language || r.declared_language || '?'}) · {r.channel}</div>
          <p className="mt-1 text-slate-900">{r.original_text || r.transcript || '(voice only)'}</p>
          {r.translated_text && <p className="mt-2 border-t border-slate-200 pt-2 text-sm text-slate-600">EN: {r.translated_text}</p>}
        </div>

        {r.processing_error && <div className="rounded-lg bg-amber-50 p-2 text-xs text-amber-800">Flagged: {r.processing_error}</div>}

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block"><span className="text-xs text-slate-600">Category</span>
            <select value={val('category_code') || ''} onChange={(e) => setForm({ ...form, category_code: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
              {categories.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
            </select></label>
          <label className="block"><span className="text-xs text-slate-600">District</span>
            <select value={val('resolved_geo_id') || ''} onChange={(e) => setForm({ ...form, resolved_geo_id: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
              <option value="">— unresolved —</option>
              {districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select></label>
          <label className="block"><span className="text-xs text-slate-600">Sub-category</span>
            <input value={val('sub_category') || ''} onChange={(e) => setForm({ ...form, sub_category: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm" /></label>
          <label className="block"><span className="text-xs text-slate-600">Urgency (1–10)</span>
            <input type="number" min={1} max={10} value={val('urgency_score') ?? ''} onChange={(e) => setForm({ ...form, urgency_score: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm" /></label>
        </div>

        <label className="block"><span className="text-xs text-slate-600">Problem description (AI)</span>
          <textarea rows={2} value={val('problem_description') || ''} onChange={(e) => setForm({ ...form, problem_description: e.target.value })}
            className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm" /></label>

        <div className="flex flex-wrap gap-4 text-xs text-slate-500">
          <span>AI confidence: <b className="text-slate-800">{r.ai_confidence?.toFixed(2) ?? '—'}</b></span>
          <span>Model: <b className="text-slate-800">{r.ai_model || '—'}</b></span>
          <span>Cluster: <b className="text-slate-800">{r.cluster_id ?? '—'}</b></span>
          {r.duplicate_of_id && <span>Duplicate of #{r.duplicate_of_id}</span>}
        </div>

        <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (stored in the audit trail)"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />

        <div className="flex flex-wrap gap-2">
          <button disabled={busy} onClick={() => act('APPROVE')} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-40">Approve</button>
          <button disabled={busy || !Object.keys(form).length} onClick={() => act('CORRECT')} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-40">Save correction</button>
          <button disabled={busy} onClick={() => act('REJECT')} className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-40">Reject</button>
          <button disabled={busy} onClick={() => api.reprocess(r.id)} className="rounded-lg bg-white px-3 py-2 text-sm font-medium text-slate-700 ring-1 ring-slate-300">Re-run AI</button>
        </div>
        <ErrorBox error={error} />
      </div>
    </Card>
  )
}
