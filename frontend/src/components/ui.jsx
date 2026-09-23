export const QUADRANT_STYLE = {
  UNDERSERVED_GAP: 'bg-rose-100 text-rose-800 ring-rose-200',
  COVERED_MONITOR: 'bg-amber-100 text-amber-800 ring-amber-200',
  POSSIBLE_MISMATCH: 'bg-violet-100 text-violet-800 ring-violet-200',
  BALANCED: 'bg-slate-100 text-slate-700 ring-slate-200',
}

export const REC_TYPE_LABEL = {
  NEW_PROJECT: 'New project',
  ACCELERATE_EXISTING: 'Accelerate existing',
  MONITOR_EXISTING: 'Monitor delivery',
  REVIEW_ALLOCATION: 'Review allocation',
}

export function Badge({ children, tone = 'slate' }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-700 ring-slate-200',
    blue: 'bg-blue-100 text-blue-800 ring-blue-200',
    green: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
    amber: 'bg-amber-100 text-amber-800 ring-amber-200',
    rose: 'bg-rose-100 text-rose-800 ring-rose-200',
  }
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${tones[tone] || tones.slate}`}>{children}</span>
}

export function Quadrant({ value }) {
  if (!value) return null
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${QUADRANT_STYLE[value] || QUADRANT_STYLE.BALANCED}`}>{value.replace(/_/g, ' ').toLowerCase()}</span>
}

export function Stat({ label, value, sub, tone = 'slate' }) {
  const ring = { slate: 'border-slate-200', rose: 'border-rose-300', blue: 'border-blue-300' }[tone]
  return (
    <div className={`rounded-xl border ${ring} bg-white p-4 shadow-sm`}>
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-slate-900">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-slate-500">{sub}</div>}
    </div>
  )
}

export function Card({ title, actions, children, className = '' }) {
  return (
    <section className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>
      {(title || actions) && (
        <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
          {actions}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  )
}

export function ScoreBar({ label, value }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-36 shrink-0 text-slate-600">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
      <span className="w-8 text-right tabular-nums text-slate-700">{Math.round(value)}</span>
    </div>
  )
}

export function Spinner({ label = 'Loading…' }) {
  return <div className="p-6 text-center text-sm text-slate-500">{label}</div>
}

export function ErrorBox({ error }) {
  if (!error) return null
  return <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{String(error.message || error)}</div>
}

export const inr = (cr) => `₹${Number(cr).toLocaleString('en-IN', { maximumFractionDigits: 1 })} Cr`
export const num = (n) => Number(n || 0).toLocaleString('en-IN')
