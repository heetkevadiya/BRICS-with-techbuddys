/** District choropleth on Google Maps Platform.
 *  Rendered only when VITE_GOOGLE_MAPS_API_KEY is set; DistrictMap falls back to inline SVG otherwise,
 *  so a missing or rate-limited key can never leave the dashboard without a map. */
import { useEffect, useRef, useState } from 'react'
import { COLOR, sequential } from '../theme'
import { num } from '../format'

const INDIA_CENTRE = { lat: 22.6, lng: 78.9 }

/** Load the Maps JS API once per page, no matter how many maps mount. */
let loader = null
function loadMaps(key) {
  if (loader) return loader
  loader = new Promise((resolve, reject) => {
    if (window.google?.maps) return resolve(window.google.maps)
    const s = document.createElement('script')
    s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&v=weekly`
    s.async = true
    s.onload = () => (window.google?.maps ? resolve(window.google.maps) : reject(new Error('Maps API loaded but unavailable')))
    s.onerror = () => reject(new Error('Could not load Google Maps'))
    document.head.appendChild(s)
  })
  return loader
}

export default function GoogleDistrictMap({ geojson, metric = 'priority_score', metricLabel = 'Priority',
                                            selected, onSelect, onError }) {
  const el = useRef(null)
  const map = useRef(null)
  const info = useRef(null)
  const [ready, setReady] = useState(false)
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

  useEffect(() => {
    let cancelled = false
    loadMaps(apiKey).then((maps) => {
      if (cancelled || !el.current) return
      map.current = new maps.Map(el.current, {
        center: INDIA_CENTRE, zoom: 6, mapTypeId: 'roadmap',
        streetViewControl: false, mapTypeControl: false, fullscreenControl: false,
        styles: [{ featureType: 'poi', stylers: [{ visibility: 'off' }] },
                 { featureType: 'transit', stylers: [{ visibility: 'off' }] }],
      })
      info.current = new maps.InfoWindow()
      setReady(true)
    }).catch((e) => onError?.(e))
    return () => { cancelled = true }
  }, [apiKey, onError])

  useEffect(() => {
    if (!ready || !geojson?.features?.length) return
    const maps = window.google.maps
    const data = map.current.data
    data.forEach((f) => data.remove(f))
    data.addGeoJson(geojson)

    const max = Math.max(...geojson.features.map((f) => f.properties[metric] || 0), 1)
    data.setStyle((feature) => {
      const v = feature.getProperty(metric) || 0
      const isSelected = feature.getProperty('geo_id') === selected
      return {
        fillColor: feature.getProperty('unique_citizens') ? sequential(v / max) : COLOR.page,
        fillOpacity: 0.78,
        strokeColor: isSelected ? COLOR.ink : '#ffffff',
        strokeWeight: isSelected ? 2.5 : 0.8,
      }
    })

    const clickListener = data.addListener('click', (e) => {
      const p = {}
      e.feature.forEachProperty((v, k) => { p[k] = v })
      onSelect?.(p)
    })
    const overListener = data.addListener('mouseover', (e) => {
      const g = (k) => e.feature.getProperty(k)
      info.current.setContent(
        `<div style="font:13px system-ui;padding:2px 4px">
           <b>${g('district')}</b><br>
           ${g('unique_citizens') ? `${metricLabel} ${g(metric)} · ${num(g('unique_citizens'))} citizens<br>
             Infra ${g('infra_index') ?? '—'}/100 · ₹${num(g('allocated_inr_cr'))} Cr` : 'No reports yet'}
         </div>`)
      info.current.setPosition(e.latLng)
      info.current.open(map.current)
    })
    const outListener = data.addListener('mouseout', () => info.current.close())

    // fit to whatever the backend returned, so a single-state view zooms to that state
    const bounds = new maps.LatLngBounds()
    data.forEach((f) => f.getGeometry().forEachLatLng((ll) => bounds.extend(ll)))
    if (!bounds.isEmpty()) map.current.fitBounds(bounds, 12)

    return () => [clickListener, overListener, outListener].forEach((l) => maps.event.removeListener(l))
  }, [ready, geojson, metric, metricLabel, selected, onSelect])

  return (
    <div>
      <div ref={el} className="h-[440px] w-full rounded-lg" style={{ background: COLOR.page }} />
      <div className="mt-3 flex items-center gap-2 text-xs" style={{ color: COLOR.muted }}>
        <span>low</span>
        <div className="h-2 flex-1 rounded-full"
          style={{ background: `linear-gradient(90deg, ${sequential(0)}, ${sequential(0.5)}, ${sequential(1)})` }} />
        <span>high {metricLabel.toLowerCase()}</span>
        <span className="ml-2">Google Maps Platform</span>
      </div>
    </div>
  )
}
