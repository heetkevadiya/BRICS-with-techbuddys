/** Shared presentation primitives. Every one of them is styling only — no data fetching,
 *  so a page can be read top to bottom without chasing logic through components. */
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlineOutlined'
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlineOutlined'
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutlineOutlined'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'
import { COLOR, QUADRANT } from '../theme'

/* ── Status: colour never carries meaning alone, an icon and a label always come with it ── */
const STATUS_ICON = {
  critical: ErrorOutlineIcon,
  warning: ReportProblemOutlinedIcon,
  good: CheckCircleOutlineIcon,
  neutral: RemoveCircleOutlineIcon,
}

export function StatusChip({ tone = 'neutral', children, title }) {
  const Icon = STATUS_ICON[tone] || RemoveCircleOutlineIcon
  const color = COLOR[tone] || COLOR.neutral
  return (
    <span title={title} className="inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1"
      style={{ color, backgroundColor: `${color}14`, borderColor: 'transparent', '--tw-ring-color': `${color}40` }}>
      <Icon sx={{ fontSize: 14 }} />
      {children}
    </span>
  )
}

export function QuadrantChip({ value }) {
  const q = QUADRANT[value]
  if (!q) return null
  return <StatusChip tone={q.tone} title={q.meaning}>{q.label}</StatusChip>
}

export function Chip({ children, title }) {
  return <span title={title} className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200">{children}</span>
}

/* ── Explanation: the "what am I looking at?" line that appears under every panel title ── */
export function Explain({ children }) {
  return (
    <p className="flex items-start gap-1.5 text-xs leading-relaxed" style={{ color: COLOR.ink2 }}>
      <InfoOutlinedIcon sx={{ fontSize: 15, mt: '1px', flexShrink: 0, color: COLOR.muted }} />
      <span>{children}</span>
    </p>
  )
}

/* ── Containers ── */
export function Panel({ icon: Icon, title, explain, actions, children, className = '' }) {
  return (
    <section className={`rounded-xl border bg-white shadow-sm ${className}`} style={{ borderColor: COLOR.grid }}>
      {(title || actions) && (
        <header className="flex flex-wrap items-start justify-between gap-2 border-b px-4 py-3" style={{ borderColor: COLOR.grid }}>
          <div className="min-w-0">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: COLOR.ink }}>
              {Icon && <Icon sx={{ fontSize: 18, color: COLOR.muted }} />}
              {title}
            </h2>
            {explain && <div className="mt-1.5 max-w-3xl"><Explain>{explain}</Explain></div>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  )
}

/* ── Stat tile: a hero number needs no plot, per the data-viz form heuristic ── */
export function Stat({ icon: Icon, label, value, sub, delta }) {
  const up = delta > 0
  const DeltaIcon = up ? TrendingUpIcon : TrendingDownIcon
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm" style={{ borderColor: COLOR.grid }}>
      <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide" style={{ color: COLOR.muted }}>
        {Icon && <Icon sx={{ fontSize: 15 }} />}
        {label}
      </div>
      <div className="tnum mt-1.5 text-2xl font-semibold" style={{ color: COLOR.ink }}>{value}</div>
      {delta !== undefined && delta !== null && (
        <div className="tnum mt-1 flex items-center gap-1 text-xs font-medium" style={{ color: up ? COLOR.critical : COLOR.good }}>
          <DeltaIcon sx={{ fontSize: 15 }} />{up ? '+' : ''}{delta}%
          <span className="font-normal" style={{ color: COLOR.muted }}>vs previous 30 days</span>
        </div>
      )}
      {sub && <div className="mt-1 text-xs" style={{ color: COLOR.muted }}>{sub}</div>}
    </div>
  )
}

/* ── Score bar: shows the weight beside the value, so the formula is legible ── */
export function ScoreBar({ label, weight, value }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-32 shrink-0" style={{ color: COLOR.ink2 }}>{label}</span>
      {weight !== undefined && <span className="tnum w-9 shrink-0 text-right" style={{ color: COLOR.muted }}>×{weight}</span>}
      <div className="h-2 flex-1 overflow-hidden rounded-full" style={{ background: COLOR.grid }}>
        <div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: COLOR.seq[3] }} />
      </div>
      <span className="tnum w-7 text-right font-medium" style={{ color: COLOR.ink }}>{Math.round(value)}</span>
    </div>
  )
}

/* ── Feedback states ── */
export function Spinner({ label = 'Loading…' }) {
  return (
    <div className="flex items-center justify-center gap-2 p-8 text-sm" style={{ color: COLOR.muted }}>
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
      {label}
    </div>
  )
}

export function ErrorBox({ error }) {
  if (!error) return null
  return (
    <div className="flex items-start gap-2 rounded-lg p-3 text-sm" style={{ background: `${COLOR.critical}12`, color: COLOR.critical }}>
      <ErrorOutlineIcon sx={{ fontSize: 18, flexShrink: 0 }} />
      <span>{String(error.message || error)}</span>
    </div>
  )
}

export function Empty({ icon: Icon, children }) {
  return (
    <div className="flex flex-col items-center gap-2 p-8 text-center text-sm" style={{ color: COLOR.muted }}>
      {Icon && <Icon sx={{ fontSize: 30, opacity: 0.4 }} />}
      {children}
    </div>
  )
}

