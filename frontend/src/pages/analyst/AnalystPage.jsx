/** Analyst interface — the human check on the AI.
 *  The citizen's original words sit beside every AI-derived field, and every edit is written to an audit trail. */
import { useCallback, useRef, useState } from 'react'
import FactCheckIcon from '@mui/icons-material/FactCheck'
import FilterAltIcon from '@mui/icons-material/FilterAlt'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import EditIcon from '@mui/icons-material/Edit'
import BlockIcon from '@mui/icons-material/Block'
import RefreshIcon from '@mui/icons-material/Refresh'
import RecordVoiceOverIcon from '@mui/icons-material/RecordVoiceOver'
import SmartToyIcon from '@mui/icons-material/SmartToy'
import InboxIcon from '@mui/icons-material/Inbox'
import TaskAltIcon from '@mui/icons-material/TaskAlt'
import PendingActionsIcon from '@mui/icons-material/PendingActions'
import ForumIcon from '@mui/icons-material/Forum'
import EditNoteIcon from '@mui/icons-material/EditNote'
import CloseIcon from '@mui/icons-material/Close'
import { api } from '../../services/api'
import { useApi } from '../../hooks/useApi'
import { useInfiniteScroll, usePagedList } from '../../hooks/usePagedList'
import { Panel, Stat, StatusChip, Chip, ErrorBox, Spinner, Empty, Explain } from '../../components/ui'
import { num } from '../../format'
import { COLOR } from '../../theme'

const STATUS_TONE = { PROCESSED: 'good', REVIEW_REQUIRED: 'warning', FAILED: 'critical', PROCESSING: 'neutral', RECEIVED: 'neutral', LANGUAGE_UNSUPPORTED: 'warning' }
const STATUSES = ['RECEIVED', 'PROCESSING', 'PROCESSED', 'REVIEW_REQUIRED', 'FAILED', 'LANGUAGE_UNSUPPORTED']

export default function AnalystPage() {
  const [filters, setFilters] = useState({ status: '', district: '', category: '', q: '' })
  const [selected, setSelected] = useState(null)
  const { data: cats } = useApi(() => api.configCategories(), [])
  const { data: states } = useApi(() => api.states(), [])
  const { data: perf } = useApi(() => api.aiPerformance(), [])
  const districts = states?.find((s) => s.is_default)?.districts || []
  const scrollBox = useRef(null)
  // `filters` is a fresh object each render, so the serialised form is what should drive the fetch.
  // Parsing it back inside the callback keeps the dependency list honest and statically checkable.
  const filterKey = JSON.stringify(filters)
  const fetchPage = useCallback((p) => api.listRequests({ ...JSON.parse(filterKey), ...p }), [filterKey])
  const { items, total, hasMore, loading, loadingMore, error, loadMore, reload } =
    usePagedList(fetchPage, [fetchPage], 50)
  // the sentinel lives inside the scrolling table, so the observer watches that box, not the page
  const sentinel = useInfiniteScroll(loadMore, { enabled: hasMore && !loading, rootRef: scrollBox })

  const set = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value }))
  const select = 'rounded-lg border px-3 py-2 text-sm outline-none'

  return (
    <div className="mx-auto max-w-[1500px] space-y-4 px-4 py-6">
      <header>
        <h1 className="flex items-center gap-2 text-xl font-bold" style={{ color: COLOR.ink }}>
          <FactCheckIcon sx={{ fontSize: 22, color: COLOR.muted }} />Analyst workspace
        </h1>
        <div className="mt-1.5 max-w-3xl">
          <Explain>
            Gemini proposes a category, location and urgency for every message; it never decides. Most messages clear
            its confidence bar and are accepted automatically. Anything below 0.60 confidence, with an unresolved district,
            or in an unsupported language waits for a human — filter to <b>review required</b> to work through those.
            Approving, correcting or rejecting writes the old value, the new value, your ID and your reason to the audit trail.
          </Explain>
        </div>
      </header>

      {perf?.operational && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat icon={ForumIcon} label="Messages processed" value={num(perf.operational.with_ai_output)}
            sub={`${num(perf.operational.total_requests)} received in the pilot`} />
          <Stat icon={TaskAltIcon} label="Accepted automatically"
            value={`${Math.round((perf.operational.with_ai_output - perf.operational.review_required) / perf.operational.with_ai_output * 100)}%`}
            sub={`${num(perf.operational.with_ai_output - perf.operational.review_required)} cleared the confidence bar`} />
          <Stat icon={PendingActionsIcon} label="Waiting for a human"
            value={`${Math.round(perf.operational.review_required / perf.operational.with_ai_output * 100)}%`}
            sub={`${num(perf.operational.review_required)} waiting — filter to review required`} />
          <Stat icon={EditNoteIcon} label="Corrected by an analyst"
            value={perf.operational.correction_rate === null ? '—' : `${Math.round(perf.operational.correction_rate * 100)}%`}
            sub={perf.operational.correction_rate === null
              ? 'no analyst decisions recorded yet'
              : 'of the decisions made so far'} />
        </div>
      )}

      <Panel icon={FilterAltIcon} title="Filters" actions={<Chip>{num(total)} matching</Chip>}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <select value={filters.status} onChange={set('status')} className={select} style={{ borderColor: COLOR.grid }}>
            <option value="">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ').toLowerCase()}</option>)}
          </select>
          <select value={filters.district} onChange={set('district')} className={select} style={{ borderColor: COLOR.grid }}>
            <option value="">All districts</option>
            {districts.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
          </select>
          <select value={filters.category} onChange={set('category')} className={select} style={{ borderColor: COLOR.grid }}>
            <option value="">All categories</option>
            {(cats || []).map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
          </select>
          <input value={filters.q} onChange={set('q')} placeholder="Search original or translated text…" className={select} style={{ borderColor: COLOR.grid }} />
        </div>
      </Panel>

      <ErrorBox error={error} />

      <div className={`grid gap-4 ${selected ? 'xl:grid-cols-[1.35fr_1fr]' : 'grid-cols-1'}`}>
        <Panel title="Requests" explain="Confidence is Gemini's own estimate that the category, location and urgency are right — not an error rate. A low number means the model is unsure and asked for a person, which is the behaviour you want. Click any row to review it beside the citizen's original words.">
          {loading ? <Spinner /> : !items.length ? <Empty icon={InboxIcon}>No requests match these filters.</Empty> : (
            <div ref={scrollBox} className="-m-4 max-h-[68vh] overflow-auto">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-white text-xs uppercase" style={{ color: COLOR.muted, boxShadow: `inset 0 -1px 0 ${COLOR.grid}` }}>
                  <tr>
                    <th className="px-4 py-2 font-medium">Citizen message</th>
                    <th className="w-32 py-2 pr-3 font-medium">Category</th>
                    <th className="w-28 py-2 pr-3 font-medium">District</th>
                    <th className="w-16 py-2 pr-3 text-right font-medium">Urg.</th>
                    <th className="w-20 py-2 pr-3 text-right font-medium">Conf.</th>
                    <th className="w-28 py-2 pr-4 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((r) => (
                    <tr key={r.id} onClick={() => setSelected(r)}
                      className="cursor-pointer border-t transition hover:bg-slate-50"
                      style={{ borderColor: COLOR.grid, background: selected?.id === r.id ? `${COLOR.seq[3]}0f` : undefined }}>
                      <td className="max-w-0 truncate px-4 py-2">
                        <span style={{ color: COLOR.ink }}>{r.original_text || r.transcript || '(voice message)'}</span>
                        <span className="ml-1.5 text-xs" style={{ color: COLOR.muted }}>{r.detected_language}</span>
                      </td>
                      <td className="py-2 pr-3" style={{ color: COLOR.ink2 }}>{r.category_code || '—'}</td>
                      <td className="py-2 pr-3" style={{ color: COLOR.ink2 }}>{r.resolved_geo?.name || '—'}</td>
                      <td className="tnum py-2 pr-3 text-right" style={{ color: COLOR.ink2 }}>{r.urgency_score ?? '—'}</td>
                      <td className="tnum py-2 pr-3 text-right" style={{ color: COLOR.ink2 }}>
                        {r.ai_confidence?.toFixed(2) ?? '—'}
                      </td>
                      <td className="py-2 pr-4">
                        <StatusChip tone={STATUS_TONE[r.processing_status]}>
                          {r.processing_status === 'REVIEW_REQUIRED' ? 'review' : r.processing_status.replace(/_/g, ' ').toLowerCase()}
                        </StatusChip>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* scrolling to here pulls the next page */}
              <div ref={sentinel} className="px-4 py-3 text-center text-xs" style={{ color: COLOR.muted }}>
                {loadingMore
                  ? 'Loading more…'
                  : hasMore
                    ? <button onClick={loadMore} className="underline">Showing {num(items.length)} of {num(total)} — load more</button>
                    : `All ${num(total)} loaded`}
              </div>
            </div>
          )}
        </Panel>

        {selected && (
          <Detail key={selected.id} request={selected} categories={cats || []} districts={districts}
            onClose={() => setSelected(null)} onDone={(r) => { setSelected(r); reload() }} />
        )}
      </div>
    </div>
  )
}

function Detail({ request: r, categories, districts, onDone, onClose }) {
  const [form, setForm] = useState({})
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const val = (k) => (k in form ? form[k] : r[k])
  const dirty = Object.keys(form).length > 0

  async function act(action) {
    setBusy(true); setError(null)
    try {
      const corrections = action === 'CORRECT'
        ? Object.fromEntries(Object.entries(form).map(([k, v]) => [k, k === 'urgency_score' || k === 'resolved_geo_id' ? Number(v) || null : v]))
        : undefined
      const updated = await api.verify(r.id, { action, corrections, reason: reason || null })
      setForm({}); setReason(''); onDone(updated)
    } catch (e) { setError(e) } finally { setBusy(false) }
  }

  const field = 'mt-1 w-full rounded-lg border px-2 py-1.5 text-sm outline-none'
  const fs = { borderColor: COLOR.grid }
  const btn = 'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition disabled:opacity-40'

  return (
    <Panel title={`Request #${r.id} · ${r.tracking_code}`}
      actions={<>
        <StatusChip tone={STATUS_TONE[r.processing_status]}>{r.processing_status.replace(/_/g, ' ').toLowerCase()}</StatusChip>
        <button onClick={onClose} title="Close" className="rounded-lg p-1 transition hover:bg-slate-100" style={{ color: COLOR.muted }}>
          <CloseIcon sx={{ fontSize: 17 }} />
        </button>
      </>}>
      <div className="space-y-4">
        <div className="rounded-lg p-3" style={{ background: COLOR.page }}>
          <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide" style={{ color: COLOR.muted }}>
            <RecordVoiceOverIcon sx={{ fontSize: 14 }} />
            Citizen's own words · {r.detected_language || r.declared_language || 'unknown'} · {r.channel.toLowerCase()}
          </div>
          <p className="mt-1.5" style={{ color: COLOR.ink }}>{r.original_text || r.transcript || '(voice only — no transcript yet)'}</p>
          {r.translated_text && (
            <p className="mt-2 border-t pt-2 text-sm" style={{ borderColor: COLOR.grid, color: COLOR.ink2 }}>
              English: {r.translated_text}
            </p>
          )}
          <p className="mt-2 text-xs" style={{ color: COLOR.muted }}>This text is never modified. Corrections below change only the AI-derived fields.</p>
        </div>

        {r.processing_error && (
          <div className="flex items-start gap-2 rounded-lg p-2.5 text-xs" style={{ background: `${COLOR.warning}18`, color: '#7a5600' }}>
            <span className="font-medium">Why it is here:</span> {r.processing_error}
          </div>
        )}

        <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide" style={{ color: COLOR.muted }}>
          <SmartToyIcon sx={{ fontSize: 14 }} />AI-derived — editable
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block"><span className="text-xs" style={{ color: COLOR.ink2 }}>Category</span>
            <select value={val('category_code') || ''} onChange={(e) => setForm({ ...form, category_code: e.target.value })} className={field} style={fs}>
              {categories.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
            </select></label>
          <label className="block"><span className="text-xs" style={{ color: COLOR.ink2 }}>District</span>
            <select value={val('resolved_geo_id') || ''} onChange={(e) => setForm({ ...form, resolved_geo_id: e.target.value })} className={field} style={fs}>
              <option value="">— unresolved —</option>
              {districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select></label>
          <label className="block"><span className="text-xs" style={{ color: COLOR.ink2 }}>Sub-category</span>
            <input value={val('sub_category') || ''} onChange={(e) => setForm({ ...form, sub_category: e.target.value })} className={field} style={fs} /></label>
          <label className="block"><span className="text-xs" style={{ color: COLOR.ink2 }}>Urgency (1–10)</span>
            <input type="number" min={1} max={10} value={val('urgency_score') ?? ''} onChange={(e) => setForm({ ...form, urgency_score: e.target.value })} className={`${field} tnum`} style={fs} /></label>
        </div>

        <label className="block"><span className="text-xs" style={{ color: COLOR.ink2 }}>Problem description</span>
          <textarea rows={2} value={val('problem_description') || ''} onChange={(e) => setForm({ ...form, problem_description: e.target.value })} className={field} style={fs} /></label>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: COLOR.muted }}>
          <span>Confidence <b className="tnum" style={{ color: COLOR.ink }}>{r.ai_confidence?.toFixed(2) ?? '—'}</b></span>
          <span>Model <b style={{ color: COLOR.ink }}>{r.ai_model || '—'}</b></span>
          <span>Cluster <b className="tnum" style={{ color: COLOR.ink }}>{r.cluster_id ?? '—'}</b></span>
          {r.duplicate_of_id && <span>Repeat of #{r.duplicate_of_id} — counted once</span>}
        </div>

        <label className="block">
          <span className="text-xs" style={{ color: COLOR.ink2 }}>Reason (stored in the audit trail)</span>
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why are you making this decision?" className={field} style={fs} />
        </label>

        <div className="flex flex-wrap gap-2">
          <button disabled={busy} onClick={() => act('APPROVE')} className={`${btn} text-white`} style={{ background: COLOR.good }}>
            <CheckCircleIcon sx={{ fontSize: 17 }} />Approve
          </button>
          <button disabled={busy || !dirty} onClick={() => act('CORRECT')} className={`${btn} text-white`} style={{ background: COLOR.seq[3] }}>
            <EditIcon sx={{ fontSize: 17 }} />Save correction
          </button>
          <button disabled={busy} onClick={() => act('REJECT')} className={`${btn} text-white`} style={{ background: COLOR.critical }}>
            <BlockIcon sx={{ fontSize: 17 }} />Reject
          </button>
          <button disabled={busy} onClick={() => api.reprocess(r.id)} className={`${btn} ring-1`} style={{ background: '#fff', color: COLOR.ink2, '--tw-ring-color': COLOR.grid }}>
            <RefreshIcon sx={{ fontSize: 17 }} />Re-run AI
          </button>
        </div>
        <ErrorBox error={error} />
      </div>
    </Panel>
  )
}
