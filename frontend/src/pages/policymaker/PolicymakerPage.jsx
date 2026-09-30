/** Policymaker interface — the decision screen.
 *  Every figure is traceable: the score decomposes into five weighted parts, each part into raw evidence,
 *  and the evidence into named datasets with their dates. */
import { useMemo, useState } from 'react'
import { CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from 'recharts'
import PublicIcon from '@mui/icons-material/Public'
import MapIcon from '@mui/icons-material/Map'
import AccountBalanceIcon from '@mui/icons-material/AccountBalance'
import ShowChartIcon from '@mui/icons-material/ShowChart'
import RecommendIcon from '@mui/icons-material/Recommend'
import SourceIcon from '@mui/icons-material/Source'
import StorageIcon from '@mui/icons-material/Storage'
import GroupsIcon from '@mui/icons-material/Groups'
import PersonPinCircleIcon from '@mui/icons-material/PersonPinCircle'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import TranslateIcon from '@mui/icons-material/Translate'
import PendingActionsIcon from '@mui/icons-material/PendingActions'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import ThumbUpAltIcon from '@mui/icons-material/ThumbUpAlt'
import ScheduleIcon from '@mui/icons-material/Schedule'
import CloseIcon from '@mui/icons-material/Close'
import FlagIcon from '@mui/icons-material/Flag'
import { api } from '../../services/api'
import { useApi } from '../../hooks/useApi'
import { Panel, Stat, StatusChip, QuadrantChip, Chip, ScoreBar, Spinner, ErrorBox, Empty, Explain } from '../../components/ui'
import { inr, num } from '../../format'
import ChartTooltip from '../../components/Tooltip'
import DistrictMap from '../../components/DistrictMap'
import LiveFeed from '../../components/LiveFeed'
import { COLOR, REC_TYPE, diverging } from '../../theme'

export default function PolicymakerPage() {
  const [state, setState] = useState('')
  const [category, setCategory] = useState('')
  const [district, setDistrict] = useState(null)
  const [openRec, setOpenRec] = useState(null)
  const q = { state: state || undefined, category: category || undefined }

  const { data: cats } = useApi(() => api.configCategories(), [])
  const { data: states } = useApi(() => api.states(), [])
  const { data: summary, error, loading } = useApi(() => api.summary({ state: state || undefined }), [state])
  const { data: geo } = useApi(() => api.geo(q), [state, category])
  const { data: recs } = useApi(() => api.recommendations({ ...q, district: district?.district, limit: 30 }), [state, category, district?.district])
  const { data: align } = useApi(() => api.alignment(q), [state, category])
  const { data: trends } = useApi(() => api.trends({ ...q, months: 6 }), [state, category])
  const { data: warehouse } = useApi(() => api.warehouse(), [])

  const trendSeries = useMemo(() => {
    const byMonth = {}
    ;(trends || []).forEach((t) => { byMonth[t.month] = (byMonth[t.month] || 0) + t.unique_citizens })
    return Object.entries(byMonth).sort().map(([month, citizens]) => ({ month, citizens }))
  }, [trends])

  const scatter = useMemo(() => (align || [])
    .filter((a) => a.unique_citizens > 0)
    .map((a) => ({ ...a, x: a.adjusted_per_100k, y: a.invest_per_capita_inr, z: a.unique_citizens })), [align])

  const categoryName = cats?.find((c) => c.code === category)?.name

  if (loading) return <Spinner label="Loading national overview…" />
  if (error) return <div className="p-6"><ErrorBox error={error} /></div>

  return (
    <div className="mx-auto max-w-[1500px] space-y-5 px-4 py-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-xl font-bold" style={{ color: COLOR.ink }}>
            <PublicIcon sx={{ fontSize: 22, color: COLOR.muted }} />
            {summary.state} — citizen demand and development priorities
          </h1>
          <div className="mt-1.5 max-w-3xl">
            <Explain>
              What citizens reported, joined to census population, infrastructure indices, live projects and this
              year's budget. Scores are calculated by fixed formula — the same inputs always give the same number.
              AI understands the messages; it never sets a priority.
            </Explain>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <select value={state} onChange={(e) => { setState(e.target.value); setDistrict(null); setOpenRec(null) }}
            className="rounded-lg border bg-white px-3 py-2 text-sm" style={{ borderColor: COLOR.grid }}>
            {(states || []).map((st) => (
              <option key={st.id} value={st.is_default ? '' : st.name}>
                {st.name}{st.is_default ? ' — pilot live' : ''}
              </option>
            ))}
          </select>
          <select value={category} onChange={(e) => { setCategory(e.target.value); setOpenRec(null) }}
            className="rounded-lg border bg-white px-3 py-2 text-sm" style={{ borderColor: COLOR.grid }}>
            <option value="">All sectors</option>
            {(cats || []).map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
          </select>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-white px-4 py-2.5 text-xs shadow-sm"
        style={{ borderColor: COLOR.grid, color: COLOR.ink2 }}>
        <StorageIcon sx={{ fontSize: 16, color: COLOR.muted }} />
        <span><b style={{ color: COLOR.ink }}>{num(summary.national?.districts ?? 0)}</b> districts across{' '}
          <b style={{ color: COLOR.ink }}>{summary.national?.states ?? 0}</b> states &amp; UTs loaded from Census 2011</span>
        <span style={{ color: COLOR.grid }}>|</span>
        <span>viewing <b style={{ color: COLOR.ink }}>{summary.state}</b> · pilot live in <b style={{ color: COLOR.ink }}>Gujarat</b></span>
        <span style={{ color: COLOR.grid }}>|</span>
        {warehouse?.enabled
          ? <StatusChip tone="good" title={`${warehouse.dataset} — ${Object.entries(warehouse.row_counts || {}).map(([t, n]) => `${t}: ${n} rows`).join(', ')}`}>
              BigQuery national layer live
            </StatusChip>
          : <StatusChip tone="neutral" title={warehouse?.reason || warehouse?.purpose}>
              running on Postgres{warehouse?.configured ? ' — BigQuery not synced yet' : ''}
            </StatusChip>}
      </div>

      {summary.total_requests === 0 && (
        <div className="flex items-start gap-2.5 rounded-xl p-4" style={{ background: `${COLOR.seq[3]}0f`, border: `1px solid ${COLOR.seq[3]}40` }}>
          <PublicIcon sx={{ fontSize: 20, color: COLOR.seq[3], flexShrink: 0, mt: '2px' }} />
          <div className="text-sm" style={{ color: COLOR.ink2 }}>
            <b style={{ color: COLOR.ink }}>{summary.state} is loaded but the pilot has not started here.</b>{' '}
            All {summary.state_districts} districts carry real Census 2011 population and infrastructure data, and the map
            below is drawn from official boundaries — so the platform is ready the day citizen reporting opens.
            Demand, hotspots and recommendations appear once people start reporting.
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Stat icon={GroupsIcon} label="Citizens reporting" value={num(summary.unique_citizens)} sub={`${num(summary.total_requests)} messages, repeats counted once`} />
        <Stat icon={PersonPinCircleIcon} label="Per 100,000 people" value={summary.per_100k_population} sub={`${summary.districts_reporting} of ${summary.state_districts ?? 0} districts reporting`} />
        <Stat icon={TrendingUpIcon} label="30-day change" value={`${summary.growth_30d_pct > 0 ? '+' : ''}${summary.growth_30d_pct}%`} delta={summary.growth_30d_pct} />
        <Stat icon={TranslateIcon} label="Languages served" value={Object.keys(summary.languages).length} sub={Object.keys(summary.languages).join(', ')} />
        <Stat icon={PendingActionsIcon} label="Awaiting human review" value={num(summary.review_required)} sub="low-confidence AI output" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_1fr]">
        <Panel icon={MapIcon} title={`Where the need is — ${categoryName || 'all sectors'}`}
          explain="Darker means a higher priority score. Click a district to filter the recommendations below. Pale districts have no reports yet — absence of complaints is not evidence of no problem."
          actions={district && (
            <button onClick={() => setDistrict(null)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs ring-1"
              style={{ color: COLOR.ink2, '--tw-ring-color': COLOR.grid }}>
              <CloseIcon sx={{ fontSize: 14 }} />{district.district}
            </button>
          )}>
          {geo ? <DistrictMap geojson={geo} metric="priority_score" metricLabel="Priority" selected={district?.geo_id} onSelect={setDistrict} /> : <Spinner />}
        </Panel>

        <div className="space-y-4">
          <LiveFeed />

          <Panel icon={AccountBalanceIcon} title="Is the money going where the need is?"
            explain="Each dot is one district in one sector. Right = citizens report more per head. Up = more rupees budgeted per head. Colour is the gap between those two ranks: red means demand outruns spending, blue means spending outruns demand.">
            {scatter.length === 0 ? (
              <Empty icon={AccountBalanceIcon}>
                No citizen reports in {summary.state} yet, so there is no demand to compare spending against.
              </Empty>
            ) : (
            <ResponsiveContainer width="100%" height={250}>
              <ScatterChart margin={{ top: 8, right: 14, bottom: 26, left: 6 }}>
                <CartesianGrid stroke={COLOR.grid} strokeDasharray="3 3" />
                <XAxis type="number" dataKey="x" tick={{ fontSize: 11, fill: COLOR.muted }} stroke={COLOR.axis}
                  label={{ value: 'citizens reporting per 100,000', position: 'insideBottom', offset: -16, fontSize: 11, fill: COLOR.muted }} />
                <YAxis type="number" dataKey="y" tick={{ fontSize: 11, fill: COLOR.muted }} stroke={COLOR.axis}
                  label={{ value: '₹ budgeted per person', angle: -90, position: 'insideLeft', fontSize: 11, fill: COLOR.muted }} />
                <ZAxis type="number" dataKey="z" range={[30, 320]} />
                <Tooltip cursor={{ stroke: COLOR.axis, strokeDasharray: '3 3' }} content={({ payload }) => {
                  const p = payload?.[0]?.payload
                  if (!p) return null
                  return <ChartTooltip title={p.district} subtitle={p.category}
                    rows={[['Citizens', num(p.unique_citizens)], ['Per 100,000', p.adjusted_per_100k],
                      ['Budgeted', inr(p.allocated_inr_cr)], ['Gap in ranks', `${p.misalignment_index > 0 ? '+' : ''}${p.misalignment_index}`]]}
                    footer={<QuadrantChip value={p.alignment_quadrant} />} />
                }} />
                <Scatter data={scatter} isAnimationActive={false}>
                  {scatter.map((p) => (
                    <Cell key={`${p.geo_id}-${p.category_code}`} fill={diverging(p.misalignment_index)} stroke="#fff" strokeWidth={1} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
            )}
            {scatter.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs" style={{ color: COLOR.muted }}>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-16 rounded-full" style={{ background: `linear-gradient(90deg, ${diverging(-100)}, ${diverging(0)}, ${diverging(100)})` }} />
              </span>
              <span>← demand outruns spending</span>
              <span>spending outruns demand →</span>
              <span className="ml-auto">dot size = citizens reporting</span>
            </div>
            )}
          </Panel>

          <Panel icon={ShowChartIcon} title="Is it getting better or worse?"
            explain="Unique citizens reporting each month. A rising line means a problem is spreading, which the priority score weights separately from its absolute size.">
            {trendSeries.length === 0 ? (
              <Empty icon={ShowChartIcon}>No reports yet in {summary.state} — the trend begins when people start reporting.</Empty>
            ) : (
            <ResponsiveContainer width="100%" height={170}>
              <LineChart data={trendSeries} margin={{ top: 8, right: 14, bottom: 4, left: 6 }}>
                <CartesianGrid stroke={COLOR.grid} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: COLOR.muted }} stroke={COLOR.axis} />
                <YAxis tick={{ fontSize: 11, fill: COLOR.muted }} stroke={COLOR.axis} width={44} />
                <Tooltip cursor={{ stroke: COLOR.axis, strokeDasharray: '3 3' }} content={({ payload, label }) => {
                  const p = payload?.[0]
                  return p ? <ChartTooltip title={label} rows={[['Citizens reporting', num(p.value)]]} /> : null
                }} />
                <Line type="monotone" dataKey="citizens" stroke={COLOR.seq[3]} strokeWidth={2} dot={false}
                  activeDot={{ r: 4, fill: COLOR.seq[3], stroke: '#fff', strokeWidth: 2 }} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
            )}
          </Panel>
        </div>
      </div>

      <Panel icon={RecommendIcon} title={`Recommended priorities${district ? ` — ${district.district}` : ''}`}
        explain="Ranked by a fixed formula: 30% citizen demand, 25% infrastructure gap, 20% population impact, 15% urgency, 10% alignment with national programmes. Open any row to see every input. Each recommendation checks the project pipeline first, so it can tell you to accelerate what exists rather than fund a duplicate."
        actions={<Chip title="The order is reproducible: same data in, same order out.">deterministic ranking</Chip>}>
        <div className="space-y-2">
          {(recs || []).map((r) => {
            const open = openRec === r.id
            const type = REC_TYPE[r.rec_type]
            return (
              <div key={r.id} className="overflow-hidden rounded-lg border" style={{ borderColor: COLOR.grid }}>
                <button onClick={() => setOpenRec(open ? null : r.id)} className="flex w-full items-start gap-3 px-3 py-2.5 text-left transition hover:bg-slate-50">
                  <span className="tnum w-11 shrink-0 text-center">
                    <span className="block text-lg font-bold leading-tight" style={{ color: COLOR.ink }}>{r.priority_score}</span>
                    <span className="block text-[10px] uppercase" style={{ color: COLOR.muted }}>score</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium" style={{ color: COLOR.ink }}>{r.title}</span>
                    <span className="mt-1 flex flex-wrap items-center gap-1.5 text-xs" style={{ color: COLOR.muted }}>
                      <Chip title={type?.meaning}>{type?.label || r.rec_type}</Chip>
                      <QuadrantChip value={r.alignment_quadrant} />
                      <span className="tnum">{num(r.evidence.unique_citizens)} citizens · infra {r.evidence.infrastructure_index ?? '—'}/100 · {inr(r.evidence.allocated_inr_cr)}</span>
                    </span>
                  </span>
                  <span className="shrink-0" style={{ color: COLOR.muted }}>
                    {open ? <ExpandLessIcon sx={{ fontSize: 20 }} /> : <ExpandMoreIcon sx={{ fontSize: 20 }} />}
                  </span>
                </button>
                {open && <RecDetail rec={r} />}
              </div>
            )
          })}
          {!recs?.length && <Empty icon={RecommendIcon}>No recommendations for this filter.</Empty>}
        </div>
      </Panel>

      <Panel icon={SourceIcon} title="Where these numbers come from"
        explain="Every figure above traces to one of these datasets. Census figures are measured; anything estimated is labelled, because a policymaker has to be able to tell the two apart.">
        <div className="-m-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead style={{ color: COLOR.muted, boxShadow: `inset 0 -1px 0 ${COLOR.grid}` }}>
              <tr>
                <th className="px-4 py-2 font-medium">Dataset</th>
                <th className="py-2 pr-3 font-medium">Source</th>
                <th className="py-2 pr-3 font-medium">Data date</th>
                <th className="py-2 pr-3 font-medium">Coverage</th>
                <th className="py-2 pr-3 text-right font-medium">Rows</th>
                <th className="py-2 pr-4 font-medium">Provenance</th>
              </tr>
            </thead>
            <tbody>
              {(summary.datasets || []).map((d) => (
                <tr key={d.name} className="border-t" style={{ borderColor: COLOR.grid }}>
                  <td className="px-4 py-2 font-medium" style={{ color: COLOR.ink }}>{d.name}</td>
                  <td className="py-2 pr-3" style={{ color: COLOR.ink2 }}>{d.source}</td>
                  <td className="tnum py-2 pr-3" style={{ color: COLOR.ink2 }}>{d.data_date || '—'}</td>
                  <td className="py-2 pr-3" style={{ color: COLOR.ink2 }}>{d.coverage || '—'}</td>
                  <td className="tnum py-2 pr-3 text-right" style={{ color: COLOR.ink2 }}>{num(d.row_count ?? 0) || '—'}</td>
                  <td className="py-2 pr-4">
                    {d.is_synthetic
                      ? <StatusChip tone="warning" title={d.notes}>estimated</StatusChip>
                      : <StatusChip tone="good" title={d.notes}>official</StatusChip>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  )
}

function RecDetail({ rec }) {
  const [state, setState] = useState({ rec, busy: false, error: null, impact: null })
  const r = state.rec
  const e = r.evidence
  const w = r.weights

  async function decide(decision) {
    setState((s) => ({ ...s, busy: true, error: null }))
    try {
      const updated = await api.decide(r.id, { decision, note: null })
      const impact = decision === 'ACCEPT' ? await api.impact(r.id).catch(() => null) : null
      setState({ rec: updated, busy: false, error: null, impact })
    } catch (err) { setState((s) => ({ ...s, busy: false, error: err })) }
  }

  const btn = 'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition disabled:opacity-40'

  return (
    <div className="border-t p-4" style={{ borderColor: COLOR.grid, background: COLOR.page }}>
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-3">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: COLOR.muted }}>How the score is built</h3>
            <div className="mt-2 space-y-1.5">
              <ScoreBar label="Citizen demand" weight={w.demand} value={r.demand_score} />
              <ScoreBar label="Infrastructure gap" weight={w.infrastructure_gap} value={r.infrastructure_gap_score} />
              <ScoreBar label="Population impact" weight={w.population_impact} value={r.population_impact_score} />
              <ScoreBar label="Urgency" weight={w.urgency} value={r.urgency_score} />
              <ScoreBar label="Policy alignment" weight={w.policy_alignment} value={r.policy_alignment_score} />
            </div>
            <p className="mt-2 text-xs" style={{ color: COLOR.muted }}>
              Each part is scaled 0–100, multiplied by its weight, and summed to {r.priority_score}.
            </p>
          </div>

          {r.explanation && (
            <div className="rounded-lg bg-white p-3 ring-1" style={{ '--tw-ring-color': COLOR.grid }}>
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide" style={{ color: COLOR.muted }}>
                <AutoAwesomeIcon sx={{ fontSize: 14 }} />Plain-language briefing
              </div>
              <p className="mt-1.5 text-sm" style={{ color: COLOR.ink2 }}>{r.explanation}</p>
              <p className="mt-1.5 text-xs" style={{ color: COLOR.muted }}>
                Written by {r.explanation_model} from the evidence on the right and nothing else. It cannot change the score.
              </p>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: COLOR.muted }}>The evidence</h3>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <Fact k="Citizens reporting" v={`${num(e.unique_citizens)} (${num(e.requests)} messages)`} />
            <Fact k="Per 100,000 people" v={`${e.per_100k} → ${e.adjusted_per_100k} adjusted`} hint="Adjusted upward where mobile coverage is low, so poorly connected districts are not under-counted." />
            <Fact k="Channels used" v={`${e.channels_used} of 6`} hint="A problem reported through several channels is stronger evidence than the same volume from one." />
            <Fact k="Average urgency" v={`${e.avg_urgency} / 10`} />
            <Fact k="30-day change" v={`${e.growth_30d_pct > 0 ? '+' : ''}${e.growth_30d_pct}%`} />
            <Fact k="People represented" v={num(e.people_directly_represented)} hint="Households behind the citizens who reported. Not the size of the affected area." />
            <Fact k="District population" v={num(e.population)} />
            <Fact k="Infrastructure index" v={`${e.infrastructure_index ?? '—'} / 100`} hint="Higher is better. The gap is 100 minus this." />
            <Fact k="Budgeted this year" v={inr(e.allocated_inr_cr)} wide />
            <Fact k="Existing project" wide
              v={e.existing_project
                ? `${e.existing_project.name} — ${e.existing_project.status.replace(/_/g, ' ').toLowerCase()}, ${inr(e.existing_project.budget_inr_cr)}`
                : 'None active — nothing in the pipeline covers this'} />
          </dl>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            {r.decision
              ? <StatusChip tone={r.decision === 'ACCEPT' ? 'good' : r.decision === 'REJECT' ? 'critical' : 'warning'}>
                  decision recorded: {r.decision.toLowerCase()}
                </StatusChip>
              : <>
                <button disabled={state.busy} onClick={() => decide('ACCEPT')} className={`${btn} text-white`} style={{ background: COLOR.good }}>
                  <ThumbUpAltIcon sx={{ fontSize: 16 }} />Accept
                </button>
                <button disabled={state.busy} onClick={() => decide('DEFER')} className={`${btn} ring-1`} style={{ background: '#fff', color: COLOR.ink2, '--tw-ring-color': COLOR.grid }}>
                  <ScheduleIcon sx={{ fontSize: 16 }} />Defer
                </button>
                <button disabled={state.busy} onClick={() => decide('REJECT')} className={`${btn} ring-1`} style={{ background: '#fff', color: COLOR.critical, '--tw-ring-color': `${COLOR.critical}55` }}>
                  <CloseIcon sx={{ fontSize: 16 }} />Reject
                </button>
              </>}
          </div>
          <p className="text-xs" style={{ color: COLOR.muted }}>
            Accepting freezes today's numbers as a baseline, so the effect of the project can be measured against it later.
          </p>

          {state.impact && (
            <div className="rounded-lg bg-white p-3 text-xs ring-1" style={{ '--tw-ring-color': COLOR.grid }}>
              <div className="flex items-center gap-1.5 font-semibold" style={{ color: COLOR.ink }}>
                <FlagIcon sx={{ fontSize: 15, color: COLOR.good }} />Baseline frozen
              </div>
              <p className="tnum mt-1" style={{ color: COLOR.ink2 }}>
                {num(state.impact.baseline.unique_citizens)} citizens · {state.impact.baseline.per_100k} per 100k ·
                urgency {state.impact.baseline.avg_urgency} · infra {state.impact.baseline.infrastructure_index}/100
              </p>
            </div>
          )}
          <ErrorBox error={state.error} />
        </div>
      </div>
    </div>
  )
}

function Fact({ k, v, hint, wide }) {
  return (
    <div className={wide ? 'col-span-2' : ''}>
      <dt className="text-xs" style={{ color: COLOR.muted }} title={hint}>{k}{hint && ' ⓘ'}</dt>
      <dd className="tnum" style={{ color: COLOR.ink }}>{v}</dd>
    </div>
  )
}
