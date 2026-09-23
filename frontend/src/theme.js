/** Single source of truth for colour, shared by CSS (index.css) and JS (Recharts, SVG map).
 *  Values are validated against the data-viz palette checks — see index.css for the results. */
export const COLOR = {
  surface: '#fcfcfb',
  page: '#f7f7f5',
  ink: '#0b0b0b',
  ink2: '#52514e',
  muted: '#898781',
  grid: '#e1e0d9',
  axis: '#c3c2b7',

  // sequential — magnitude (choropleth, bars)
  seq: ['#cde2fb', '#86b6ef', '#3987e5', '#2a78d6', '#1c5cab', '#0d366b'],

  // diverging — polarity (misalignment index, −100…+100)
  divNeg: '#d03b3b',
  divMid: '#f0efec',
  divPos: '#2a78d6',

  // status — reserved; always rendered with an icon + text label
  critical: '#d03b3b',
  warning: '#fab219',
  good: '#0ca30c',
  neutral: '#898781',
}

/** Linear interpolation across the sequential ramp. t is 0…1. */
export function sequential(t) {
  const c = COLOR.seq
  const x = Math.max(0, Math.min(1, t || 0)) * (c.length - 1)
  const i = Math.floor(x)
  return i >= c.length - 1 ? c[c.length - 1] : mix(c[i], c[i + 1], x - i)
}

/** Diverging ramp for a −100…+100 index: red (underserved) ← gray → blue (overspent). */
export function diverging(v, span = 100) {
  const t = Math.max(-1, Math.min(1, (v || 0) / span))
  return t < 0 ? mix(COLOR.divMid, COLOR.divNeg, -t) : mix(COLOR.divMid, COLOR.divPos, t)
}

function mix(a, b, t) {
  const [ar, ag, ab] = hex(a)
  const [br, bg, bb] = hex(b)
  const ch = (x, y) => Math.round(x + (y - x) * t)
  return `rgb(${ch(ar, br)},${ch(ag, bg)},${ch(ab, bb)})`
}

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))

/** The four investment-alignment states. Icon + label always accompany the colour. */
export const QUADRANT = {
  UNDERSERVED_GAP: { label: 'Underserved gap', color: COLOR.critical, tone: 'critical',
    meaning: 'Citizens are reporting this loudly, but little money is allocated. The strongest candidate for new investment.' },
  COVERED_MONITOR: { label: 'Covered — monitor', color: COLOR.good, tone: 'good',
    meaning: 'High demand and money is already allocated. Verify the project is actually being delivered.' },
  POSSIBLE_MISMATCH: { label: 'Possible mismatch', color: COLOR.warning, tone: 'warning',
    meaning: 'Spending is high relative to what citizens report. Worth reviewing — it may be preventive or strategic.' },
  BALANCED: { label: 'Balanced', color: COLOR.neutral, tone: 'neutral',
    meaning: 'Demand and investment are broadly in step. No action indicated.' },
}

export const REC_TYPE = {
  NEW_PROJECT: { label: 'New project', meaning: 'No active government project covers this need.' },
  ACCELERATE_EXISTING: { label: 'Accelerate existing', meaning: 'A project already exists but has not started or has stalled — speed it up rather than duplicating it.' },
  MONITOR_EXISTING: { label: 'Monitor delivery', meaning: 'A project is under way. Track whether citizen complaints actually fall.' },
  REVIEW_ALLOCATION: { label: 'Review allocation', meaning: 'Spending looks high relative to reported demand. Review, do not assume it is wrong.' },
}
