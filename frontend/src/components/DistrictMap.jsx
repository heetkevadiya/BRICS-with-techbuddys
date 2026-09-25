/** District choropleth, drawn as inline SVG from the backend's GeoJSON.
 *  Sequential encoding: one blue hue, light → dark, because the value is a magnitude.
 *  Hover layer is on by default, per the data-viz interaction rule. */
import { useEffect, useMemo, useRef, useState } from 'react'
import ChartTooltip from './Tooltip'
import GoogleDistrictMap from './GoogleDistrictMap'
import { COLOR, sequential } from '../theme'
import { num } from '../format'

/** Google Maps when a key is configured and loads; inline SVG otherwise.
 *  The SVG path needs no key, no network and no billing, so the demo always has a map. */
export default function DistrictMap(props) {
  const [mapsFailed, setMapsFailed] = useState(false)
  const hasKey = Boolean(import.meta.env.VITE_GOOGLE_MAPS_API_KEY)
  if (hasKey && !mapsFailed) return <GoogleDistrictMap {...props} onError={() => setMapsFailed(true)} />
  return <SvgDistrictMap {...props} />
}

function SvgDistrictMap({ geojson, metric = 'priority_score', metricLabel = 'Priority', selected, onSelect }) {
  const [hover, setHover] = useState(null)
  const [cursor, setCursor] = useState({ x: 0, y: 0 })
  const wrap = useRef(null)
  const [size, setSize] = useState({ w: 640, h: 500 })

  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => {
      const w = e.contentRect.width
      setSize({ w, h: Math.max(320, Math.min(560, w * 0.78)) })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const { shapes, max } = useMemo(() => {
    const features = geojson?.features || []
    if (!features.length) return { shapes: [], max: 1 }

    let [minX, minY, maxX, maxY] = [180, 90, -180, -90]
    const polysOf = (f) => (f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates : [f.geometry.coordinates])
    features.forEach((f) => polysOf(f).forEach((poly) => poly[0].forEach(([x, y]) => {
      if (x < minX) minX = x; if (x > maxX) maxX = x
      if (y < minY) minY = y; if (y > maxY) maxY = y
    })))

    const pad = 10
    const s = Math.min((size.w - pad * 2) / (maxX - minX), (size.h - pad * 2) / (maxY - minY))
    // centre the projected shape inside the viewport
    const offX = (size.w - (maxX - minX) * s) / 2
    const offY = (size.h - (maxY - minY) * s) / 2
    const px = (x) => offX + (x - minX) * s
    const py = (y) => size.h - offY - (y - minY) * s

    return {
      max: Math.max(...features.map((f) => f.properties[metric] || 0), 1),
      shapes: features.map((f) => ({
        props: f.properties,
        d: polysOf(f).map((poly) => `M${poly[0].map(([x, y]) => `${px(x).toFixed(1)},${py(y).toFixed(1)}`).join('L')}Z`).join(' '),
      })),
    }
  }, [geojson, metric, size])

  const active = hover || shapes.find((s) => s.props.geo_id === selected)?.props

  return (
    <div ref={wrap} className="relative" onMouseMove={(e) => {
      const r = wrap.current.getBoundingClientRect()
      setCursor({ x: e.clientX - r.left, y: e.clientY - r.top })
    }}>
      <svg width={size.w} height={size.h} className="block" role="img" aria-label={`${metricLabel} by district`}>
        {shapes.map((s) => {
          const isSelected = s.props.geo_id === selected
          return (
            <path key={s.props.geo_id} d={s.d}
              fill={s.props.unique_citizens ? sequential((s.props[metric] || 0) / max) : '#e8e8e4'}
              stroke={isSelected ? COLOR.ink : s.props.unique_citizens ? '#ffffff' : COLOR.axis}
              strokeWidth={isSelected ? 2 : 0.9}
              strokeLinejoin="round"
              className="cursor-pointer transition-opacity hover:opacity-75"
              onMouseEnter={() => setHover(s.props)}
              onMouseLeave={() => setHover(null)}
              onClick={() => onSelect?.(s.props)} />
          )
        })}
      </svg>

      {hover && (
        <div className="pointer-events-none absolute z-10"
          style={{ left: Math.min(cursor.x + 12, size.w - 190), top: Math.max(cursor.y - 10, 0) }}>
          <ChartTooltip title={hover.district} subtitle={hover.top_category ? `Top need: ${hover.top_category}` : 'No reports yet'}
            rows={hover.unique_citizens ? [
              [metricLabel, hover[metric] ?? '—'],
              ['Citizens', num(hover.unique_citizens)],
              ['Per 100,000', hover.per_100k],
              ['Infra index', `${hover.infra_index ?? '—'}/100`],
              ['Allocated', `₹${num(hover.allocated_inr_cr)} Cr`],
            ] : []} />
        </div>
      )}

      <div className="mt-3 flex items-center gap-2 text-xs" style={{ color: COLOR.muted }}>
        <span>0</span>
        <div className="h-2 flex-1 rounded-full"
          style={{ background: `linear-gradient(90deg, ${sequential(0)}, ${sequential(0.25)}, ${sequential(0.5)}, ${sequential(0.75)}, ${sequential(1)})` }} />
        <span className="tnum">{Math.round(max)}</span>
        <span className="ml-1">{metricLabel}</span>
        <span className="ml-3 flex items-center gap-1">
          <i className="inline-block h-2.5 w-2.5 rounded-sm ring-1" style={{ background: COLOR.page, '--tw-ring-color': COLOR.grid }} />no reports
        </span>
      </div>

      {active && (
        <p className="mt-1 text-xs" style={{ color: COLOR.muted }}>
          {active.district}: {num(active.unique_citizens || 0)} citizens of {num(active.population || 0)} people.
        </p>
      )}
    </div>
  )
}
