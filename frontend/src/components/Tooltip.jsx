/** One tooltip shell for every chart, so the hover layer looks the same everywhere.
 *  The data-viz rule: an HTML/SVG chart ships a hover layer by default. */
import { COLOR } from '../theme'

export default function ChartTooltip({ title, subtitle, rows = [], footer }) {
  return (
    <div className="rounded-lg bg-white px-3 py-2 text-xs shadow-lg ring-1" style={{ '--tw-ring-color': COLOR.grid }}>
      <div className="font-semibold" style={{ color: COLOR.ink }}>{title}</div>
      {subtitle && <div style={{ color: COLOR.muted }}>{subtitle}</div>}
      {rows.length > 0 && (
        <dl className="mt-1.5 space-y-0.5">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4">
              <dt style={{ color: COLOR.ink2 }}>{k}</dt>
              <dd className="tnum font-medium" style={{ color: COLOR.ink }}>{v}</dd>
            </div>
          ))}
        </dl>
      )}
      {footer && <div className="mt-1.5 border-t pt-1.5" style={{ borderColor: COLOR.grid }}>{footer}</div>}
    </div>
  )
}
