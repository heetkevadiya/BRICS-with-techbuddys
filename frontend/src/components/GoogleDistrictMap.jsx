/** District choropleth on Google Maps Platform.
 *  Rendered only when VITE_GOOGLE_MAPS_API_KEY is set; DistrictMap falls back to inline SVG otherwise,
 *  so a missing or rate-limited key can never leave the dashboard without a map. */
import { useEffect, useRef, useState } from 'react'
import { COLOR, sequential } from '../theme'
import { num } from '../format'

const INDIA_CENTRE = { lat: 22.6, lng: 78.9 }

/** Load the Maps JS API once per page, no matter how many maps mount.
 *  loading=async is Google's documented bootstrap; it pairs with a callback, because with it the
 *  script's own onload can fire before google.maps is populated. */
let loader = null
function loadMaps(key) {
  if (loader) return loader
  loader = new Promise((resolve, reject) => {
    if (window.google?.maps) return resolve(window.google.maps)
    window.__bricsMapsReady = () => resolve(window.google.maps)
    const s = document.createElement('script')
    s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&v=weekly&loading=async&callback=__bricsMapsReady`
    s.async = true
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

  // The parent passes onError as an inline arrow, so it is a new value on every render. Held in a
  // ref it cannot re-trigger the effect below — building a second Map on the same <div> would
  // silently replace the one holding the districts, leaving bare tiles and no choropleth.
  const onErrorRef = useRef(onError)
  onErrorRef.current = onError

  useEffect(() => {
    let cancelled = false
    loadMaps(apiKey).then((maps) => {
      if (cancelled || map.current || !el.current) return
      map.current = new maps.Map(el.current, {
        center: INDIA_CENTRE, zoom: 6, mapTypeId: 'roadmap',
        streetViewControl: false, mapTypeControl: false, fullscreenControl: false,
        // off by default on raster maps, which makes fitBounds round down a whole step — a tall
        // state like Gujarat then sits as a small shape in a mostly empty frame
        isFractionalZoomEnabled: true,
        styles: [{ featureType: 'poi', stylers: [{ visibility: 'off' }] },
                 { featureType: 'transit', stylers: [{ visibility: 'off' }] }],
      })
      info.current = new maps.InfoWindow()
      // Wait for the first idle: fitBounds on a map that has not settled moves the centre but
      // leaves the zoom alone, which draws the districts as a small blob in a half-empty frame.
      maps.event.addListenerOnce(map.current, 'idle', () => setReady(true))
    }).catch((e) => onErrorRef.current?.(e))
    return () => { cancelled = true }
  }, [apiKey])

  useEffect(() => {
    if (!ready || !geojson?.features?.length) return
    const maps = window.google.maps
    const data = map.current.data
    // collect first: removing inside forEach mutates the collection being walked and skips features
    const stale = []
    data.forEach((f) => stale.push(f))
    stale.forEach((f) => data.remove(f))
    data.addGeoJson(geojson)

    const max = Math.max(...geojson.features.map((f) => f.properties[metric] || 0), 1)
    data.setStyle((feature) => {
      const v = feature.getProperty(metric) || 0
      const isSelected = feature.getProperty('geo_id') === selected
      // A district with no reports still needs a visible outline — on a state where the pilot has
      // not started, every district is in this branch, and a near-white fill over map tiles reads
      // as no map at all.
      const reported = feature.getProperty('unique_citizens')
      return {
        fillColor: reported ? sequential(v / max) : COLOR.muted,
        fillOpacity: reported ? 0.75 : 0.18,
        strokeColor: isSelected ? COLOR.ink : reported ? '#ffffff' : COLOR.ink2,
        strokeWeight: isSelected ? 2.5 : reported ? 0.9 : 1.1,
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
      <div ref={el} className="h-[520px] w-full rounded-lg" style={{ background: COLOR.page }} />
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
