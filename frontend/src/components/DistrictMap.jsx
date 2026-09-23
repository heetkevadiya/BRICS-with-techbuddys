import { useEffect, useMemo, useRef, useState } from 'react'

/** District choropleth drawn as inline SVG from the backend's GeoJSON.
 *  No map key needed for the demo; Google Maps Platform can replace this layer without touching the API. */
export default function DistrictMap({ geojson, metric = 'priority_score', selected, onSelect }) {
  const [hover, setHover] = useState(null)
  const wrap = useRef(null)
  const [size, setSize] = useState({ w: 640, h: 520 })

  useEffect(() => {
    if (!wrap.current) return
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: Math.max(360, e.contentRect.width * 0.8) }))
    ro.observe(wrap.current)
    return () => ro.disconnect()
  }, [])

  const { paths, max } = useMemo(() => {
    if (!geojson?.features?.length) return { paths: [], max: 0 }
    let [minX, minY, maxX, maxY] = [180, 90, -180, -90]
    const rings = geojson.features.map((f) => {
      const polys = f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates : [f.geometry.coordinates]
      polys.forEach((p) => p[0].forEach(([x, y]) => {
        if (x < minX) minX = x; if (x > maxX) maxX = x
        if (y < minY) minY = y; if (y > maxY) maxY = y
      }))
      return { f, polys }
    })
    const pad = 8
    const sx = (size.w - pad * 2) / (maxX - minX)
    const sy = (size.h - pad * 2) / (maxY - minY)
    const s = Math.min(sx, sy)
    const px = (x) => pad + (x - minX) * s
    const py = (y) => size.h - pad - (y - minY) * s
    const max = Math.max(...geojson.features.map((f) => f.properties[metric] || 0), 1)
    return {
      max,
      paths: rings.map(({ f, polys }) => ({
        props: f.properties,
        d: polys.map((p) => 'M' + p[0].map(([x, y]) => `${px(x).toFixed(1)},${py(y).toFixed(1)}`).join('L') + 'Z').join(' '),
      })),
    }
  }, [geojson, metric, size])

  const color = (v) => {
    const t = Math.max(0, Math.min(1, (v || 0) / max))
    // slate-100 → rose-600
    const r = Math.round(241 + (225 - 241) * t), g = Math.round(245 + (29 - 245) * t), b = Math.round(249 + (72 - 249) * t)
    return `rgb(${r},${g},${b})`
  }

  const active = hover || paths.find((p) => p.props.geo_id === selected)?.props

  return (
    <div ref={wrap} className="relative">
      <svg width={size.w} height={size.h} className="block">
        {paths.map((p) => (
          <path key={p.props.geo_id} d={p.d} fill={color(p.props[metric])}
            stroke={p.props.geo_id === selected ? '#1d4ed8' : '#94a3b8'} strokeWidth={p.props.geo_id === selected ? 2 : 0.5}
            className="cursor-pointer transition-opacity hover:opacity-80"
            onMouseEnter={() => setHover(p.props)} onMouseLeave={() => setHover(null)}
            onClick={() => onSelect?.(p.props)} />
        ))}
      </svg>
      {active && (
        <div className="pointer-events-none absolute left-2 top-2 rounded-lg bg-white/95 p-3 text-xs shadow ring-1 ring-slate-200">
          <div className="text-sm font-semibold text-slate-900">{active.district}</div>
          <div className="mt-1 space-y-0.5 text-slate-600">
            <div>Priority <b className="text-slate-900">{active.priority_score ?? '—'}</b> · Hotspot <b className="text-slate-900">{active.hotspot_score ?? '—'}</b></div>
            <div>{Number(active.unique_citizens || 0).toLocaleString('en-IN')} citizens · {active.per_1000 ?? 0}/1,000</div>
            <div>Infra index {active.infra_index ?? '—'} · Avg urgency {active.avg_urgency ?? '—'}</div>
            {active.top_category && <div>Top need: <b className="text-slate-900">{active.top_category}</b></div>}
          </div>
        </div>
      )}
      <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
        <span>low</span>
        <div className="h-2 flex-1 rounded-full" style={{ background: `linear-gradient(90deg, ${color(0)}, ${color(max)})` }} />
        <span>high {metric.replace('_', ' ')}</span>
      </div>
    </div>
  )
}
