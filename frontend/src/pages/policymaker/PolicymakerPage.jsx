import { useMemo, useState } from 'react'
import { BarChart, Bar, CartesianGrid, Cell, Legend, Line, LineChart, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from 'recharts'
import { api } from '../../services/api'
import { useApi } from '../../hooks/useApi'
import { Badge, Card, ErrorBox, Quadrant, REC_TYPE_LABEL, ScoreBar, Spinner, Stat, inr, num } from '../../components/ui'
import DistrictMap from '../../components/DistrictMap'

const QUAD_COLOR = { UNDERSERVED_GAP: '#e11d48', COVERED_MONITOR: '#f59e0b', POSSIBLE_MISMATCH: '#7c3aed', BALANCED: '#94a3b8' }

export default function PolicymakerPage() {
  const [category, setCategory] = useState('')
  const [district, setDistrict] = useState(null)
  const [openRec, setOpenRec] = useState(null)

  const { data: cats } = useApi(() => api.configCategories(), [])
  const { data: summary, error: sErr, loading } = useApi(() => api.summary({}), [])
  const { data: geo } = useApi(() => api.geo({ category: category || undefined }), [category])
  const { data: recs } = useApi(() => api.recommendations({ category: category || undefined, district: district?.district, limit: 30 }), [category, district?.district])
  const { data: align } = useApi(() => api.alignment({ category: category || undefined }), [category])
  const { data: trends } = useApi(() => api.trends({ category: category || undefined, months: 6 }), [category])

  const trendSeries = useMemo(() => {
    const byMonth = {}
    ;(trends || []).forEach((t) => { byMonth[t.month] = (byMonth[t.month] || 0) + t.unique_citizens })
    return Object.entries(byMonth).sort().map(([month, citizens]) => ({ month, citizens }))
  }, [trends])

  const scatter = useMemo(() => (align || []).filter((a) => a.unique_citizens > 0).map((a) => ({
    x: a.adjusted_per_1000, y: a.invest_per_capita_inr, z: a.unique_citizens, ...a,
  })), [align])

  if (loading) return <Spinner label="Loading national overview…" />
  if (sErr) return <div className="p-6"><ErrorBox error={sErr} /></div>

  return (
    <div className="mx-auto max-w-[1500px] space-y-5 px-4 py-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{summary.state} — citizen demand & development priorities</h1>
          <p className="text-sm text-slate-600">Every number below traces back to citizen submissions and named government datasets.</p>
        </div>
        <select value={category} onChange={(e) => { setCategory(e.target.value); setOpenRec(null) }} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          <option value="">All sectors</option>
          {(cats || []).map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
        </select>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Citizen requests" value={num(summary.total_requests)} sub={`${num(summary.unique_citizens)} unique citizens`} />
        <Stat label="Per 1,000 people" value={summary.per_1000_population} sub={`${summary.districts_reporting} districts reporting`} />
        <Stat label="30-day growth" value={`${summary.growth_30d_pct > 0 ? '+' : ''}${summary.growth_30d_pct}%`} tone={summary.growth_30d_pct > 20 ? 'rose' : 'slate'} sub="vs previous 30 days" />
        <Stat label="Languages served" value={Object.keys(summary.languages).length} sub={Object.keys(summary.languages).join(', ')} />
        <Stat label="Awaiting analyst review" value={num(summary.review_required)} sub="low-confidence AI output" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_1fr]">
        <Card title={`Demand map — ${category ? cats?.find((c) => c.code === category)?.name : 'all sectors'}`}
          actions={district && <button onClick={() => setDistrict(null)} className="text-xs text-blue-600">clear {district.district}</button>}>
          {geo ? <DistrictMap geojson={geo} metric="priority_score" selected={district?.geo_id} onSelect={setDistrict} /> : <Spinner />}
        </Card>

        <div className="space-y-4">
          <Card title="Investment alignment — is money going where demand is?">
            <ResponsiveContainer width="100%" height={260}>
              <ScatterChart margin={{ top: 8, right: 12, bottom: 24, left: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" dataKey="x" name="demand" tick={{ fontSize: 11 }} label={{ value: 'citizen demand per 1,000 (adjusted)', position: 'insideBottom', offset: -14, fontSize: 11 }} />
                <YAxis type="number" dataKey="y" name="investment" tick={{ fontSize: 11 }} label={{ value: '₹ per capita', angle: -90, position: 'insideLeft', fontSize: 11 }} />
                <ZAxis type="number" dataKey="z" range={[20, 300]} />
                <Tooltip content={({ payload }) => {
                  const p = payload?.[0]?.payload
                  return p ? <div className="rounded bg-white p-2 text-xs shadow ring-1 ring-slate-200">
                    <b>{p.district}</b> · {p.category}<br />{p.unique_citizens} citizens · {inr(p.allocated_inr_cr)}<br />
                    <span className="capitalize">{p.alignment_quadrant.replace(/_/g, ' ').toLowerCase()}</span>
                  </div> : null
                }} />
                <Scatter data={scatter}>
                  {scatter.map((p, i) => <Cell key={i} fill={QUAD_COLOR[p.alignment_quadrant]} fillOpacity={0.75} />)}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
            <div className="mt-1 flex flex-wrap gap-3 text-xs">
              {Object.entries(QUAD_COLOR).map(([k, c]) => (
                <span key={k} className="flex items-center gap-1.5 text-slate-600">
                  <i className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: c }} />{k.replace(/_/g, ' ').toLowerCase()}
                </span>
              ))}
            </div>
          </Card>

          <Card title="Demand trend (unique citizens / month)">
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={trendSeries} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="citizens" stroke="#2563eb" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </div>
      </div>

      <Card title={`Recommended priorities${district ? ` — ${district.district}` : ''}`}
        actions={<span className="text-xs text-slate-500">deterministic score · AI writes only the explanation</span>}>
        <div className="space-y-2">
          {(recs || []).map((r) => (
            <div key={r.id} className="rounded-lg border border-slate-200">
              <button onClick={() => setOpenRec(openRec === r.id ? null : r.id)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50">
                <span className="w-12 shrink-0 text-lg font-bold tabular-nums text-slate-900">{r.priority_score}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-slate-900">{r.title}</span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <Badge tone="blue">{REC_TYPE_LABEL[r.rec_type]}</Badge>
                    <Quadrant value={r.alignment_quadrant} />
                    <span>{num(r.evidence.unique_citizens)} citizens · infra {r.evidence.infrastructure_index ?? '—'}/100 · {inr(r.evidence.allocated_inr_cr)}</span>
                  </span>
                </span>
                <span className="shrink-0 text-slate-400">{openRec === r.id ? '▴' : '▾'}</span>
              </button>
              {openRec === r.id && <RecDetail rec={r} />}
            </div>
          ))}
          {!recs?.length && <p className="py-6 text-center text-sm text-slate-400">No recommendations for this filter.</p>}
        </div>
      </Card>

      <Card title="Data sources behind these numbers">
        <table className="w-full text-left text-xs">
          <thead className="text-slate-500"><tr><th className="py-1">Dataset</th><th>Source</th><th>Data date</th><th>Rows</th><th /></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {(summary.datasets || []).map((d) => (
              <tr key={d.name}><td className="py-1.5 pr-3 font-medium text-slate-800">{d.name}</td>
                <td className="pr-3 text-slate-600">{d.source}</td>
                <td className="pr-3 tabular-nums text-slate-600">{d.data_date || '—'}</td>
                <td className="pr-3 tabular-nums text-slate-600">{d.row_count ?? '—'}</td>
                <td>{d.is_synthetic ? <Badge tone="amber">demo data</Badge> : <Badge tone="green">official</Badge>}</td></tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

function RecDetail({ rec }) {
  const e = rec.evidence
  const [state, setState] = useState({ rec, busy: false, error: null, impact: null })
  const r = state.rec

  async function decide(decision) {
    setState((s) => ({ ...s, busy: true, error: null }))
    try {
      const updated = await api.decide(r.id, { decision, note: null })
      const impact = decision === 'ACCEPT' ? await api.impact(r.id).catch(() => null) : null
      setState({ rec: updated, busy: false, error: null, impact })
    } catch (err) { setState((s) => ({ ...s, busy: false, error: err })) }
  }

  return (
    <div className="border-t border-slate-100 bg-slate-50/60 p-4">
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-3">
          <div>
            <div className="text-xs font-semibold uppercase text-slate-500">Why this score</div>
            <div className="mt-2 space-y-1.5">
              <ScoreBar label={`Citizen demand (${Math.round(r.weights.demand * 100)}%)`} value={r.demand_score} />
              <ScoreBar label={`Infrastructure gap (${Math.round(r.weights.infrastructure_gap * 100)}%)`} value={r.infrastructure_gap_score} />
              <ScoreBar label={`Population impact (${Math.round(r.weights.population_impact * 100)}%)`} value={r.population_impact_score} />
              <ScoreBar label={`Urgency (${Math.round(r.weights.urgency * 100)}%)`} value={r.urgency_score} />
              <ScoreBar label={`Policy alignment (${Math.round(r.weights.policy_alignment * 100)}%)`} value={r.policy_alignment_score} />
            </div>
          </div>
          {r.explanation && (
            <div className="rounded-lg bg-white p-3 text-sm text-slate-700 ring-1 ring-slate-200">
              {r.explanation}
              <div className="mt-1.5 text-xs text-slate-400">Written by {r.explanation_model} from the evidence below — no new facts.</div>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="text-xs font-semibold uppercase text-slate-500">Evidence</div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <Row k="Citizens reporting" v={`${num(e.unique_citizens)} (${num(e.requests)} messages)`} />
            <Row k="Per 1,000 population" v={`${e.per_1000} → ${e.adjusted_per_1000} adjusted`} />
            <Row k="Channels used" v={e.channels_used} />
            <Row k="Average urgency" v={`${e.avg_urgency}/10`} />
            <Row k="30-day growth" v={`${e.growth_30d_pct}%`} />
            <Row k="People directly represented" v={num(e.people_directly_represented)} />
            <Row k="District population" v={num(e.population)} />
            <Row k="Infrastructure index" v={`${e.infrastructure_index ?? '—'}/100`} />
            <Row k="Allocated FY budget" v={inr(e.allocated_inr_cr)} />
            <Row k="Existing project" v={e.existing_project ? `${e.existing_project.name} (${e.existing_project.status.replace('_', ' ').toLowerCase()}, ${inr(e.existing_project.budget_inr_cr)})` : 'none active'} wide />
          </dl>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            {r.decision
              ? <Badge tone={r.decision === 'ACCEPT' ? 'green' : r.decision === 'REJECT' ? 'rose' : 'amber'}>decision: {r.decision.toLowerCase()}</Badge>
              : <>
                <button disabled={state.busy} onClick={() => decide('ACCEPT')} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40">Accept & set baseline</button>
                <button disabled={state.busy} onClick={() => decide('DEFER')} className="rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-slate-700 ring-1 ring-slate-300">Defer</button>
                <button disabled={state.busy} onClick={() => decide('REJECT')} className="rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-rose-700 ring-1 ring-rose-300">Reject</button>
              </>}
            <span className="text-xs text-slate-400">confidence {r.confidence}</span>
          </div>
          {state.impact && (
            <div className="rounded-lg bg-white p-3 text-xs ring-1 ring-slate-200">
              <b className="text-slate-800">Impact baseline frozen.</b> {num(state.impact.baseline.unique_citizens)} citizens, {state.impact.baseline.per_1000}/1,000,
              urgency {state.impact.baseline.avg_urgency}, infra {state.impact.baseline.infrastructure_index}. Future change is measured against this.
            </div>
          )}
          <ErrorBox error={state.error} />
        </div>
      </div>
    </div>
  )
}

const Row = ({ k, v, wide }) => (
  <div className={wide ? 'col-span-2' : ''}>
    <dt className="text-xs text-slate-500">{k}</dt>
    <dd className="text-slate-900">{v}</dd>
  </div>
)
