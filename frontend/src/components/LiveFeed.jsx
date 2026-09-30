import { useEffect, useState } from 'react'
import BoltIcon from '@mui/icons-material/Bolt'
import { Panel, Empty } from './ui'
import { COLOR } from '../theme'
import { firebaseConfigured, subscribeLiveFeed } from '../services/firebase'

const LANG = { gu: 'Gujarati', hi: 'Hindi', 'hi-Latn': 'Hinglish', en: 'English' }

function ago(iso) {
  if (!iso) return ''
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  return hrs < 24 ? `${hrs}h ago` : `${Math.round(hrs / 24)}d ago`
}

export default function LiveFeed() {
  const [rows, setRows] = useState(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!firebaseConfigured) return
    return subscribeLiveFeed(setRows, () => setFailed(true))
  }, [])

  if (!firebaseConfigured || failed) return null

  return (
    <Panel icon={BoltIcon} title="Arriving now"
      explain="Every processed report is mirrored to Firebase Firestore, so this list updates the moment a citizen submits — no refresh. PostgreSQL stays the system of record; this carries no citizen text, phone number or identifier."
      actions={
        <span className="inline-flex items-center gap-1.5 text-xs font-medium" style={{ color: COLOR.good }}>
          <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: COLOR.good }} />live
        </span>
      }>
      {rows === null && <p className="text-sm" style={{ color: COLOR.muted }}>Connecting to the live feed…</p>}
      {rows?.length === 0 && (
        <Empty icon={BoltIcon}>Nothing has arrived yet. Submit a report from the citizen screen and it appears here.</Empty>
      )}
      {rows?.length > 0 && (
        <ul className="divide-y" style={{ borderColor: COLOR.grid }}>
          {rows.map((r) => (
            <li key={r.id} className="flex items-center gap-3 py-2 text-sm">
              <span className="tnum w-9 shrink-0 rounded-md px-1.5 py-0.5 text-center text-xs font-semibold"
                style={{ background: `${COLOR.seq[3]}1a`, color: COLOR.seq[4] }}>{r.urgency ?? '—'}</span>
              <span className="min-w-0 flex-1 truncate" style={{ color: COLOR.ink }}>
                {r.category_code}{r.sub_category ? ` · ${r.sub_category}` : ''}
              </span>
              <span className="shrink-0" style={{ color: COLOR.ink2 }}>{r.district || '—'}</span>
              <span className="hidden shrink-0 sm:inline" style={{ color: COLOR.muted }}>{LANG[r.language] || r.language}</span>
              <span className="hidden shrink-0 text-xs sm:inline" style={{ color: COLOR.muted }}>{(r.channel || '').toLowerCase()}</span>
              <span className="shrink-0 text-xs" style={{ color: COLOR.muted }}>{ago(r.submitted_at)}</span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}
