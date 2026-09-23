import { useRef, useState } from 'react'
import { api } from '../../services/api'
import { useApi } from '../../hooks/useApi'
import { Card, ErrorBox } from '../../components/ui'

const UI = {
  en: { title: 'Report a problem in your area', sub: 'Speak or write in your own language. A government analyst will see it.',
    lang: 'Language', district: 'District (optional)', pick: 'Select', text: 'Describe the problem', ph: 'e.g. The road to our village is broken and ambulances cannot reach during rain.',
    phone: 'Phone (optional, never shown to officials)', submit: 'Submit', rec: 'Record voice', stop: 'Stop & submit', sending: 'Sending…',
    track: 'Track a request', code: 'Tracking code', check: 'Check status', status: 'Status' },
  gu: { title: 'તમારા વિસ્તારની સમસ્યા જણાવો', sub: 'તમારી ભાષામાં બોલો અથવા લખો. સરકારી વિશ્લેષક તે જોશે.',
    lang: 'ભાષા', district: 'જિલ્લો (વૈકલ્પિક)', pick: 'પસંદ કરો', text: 'સમસ્યા વર્ણવો', ph: 'દા.ત. અમારા ગામનો રસ્તો તૂટી ગયો છે અને વરસાદમાં એમ્બ્યુલન્સ આવી શકતી નથી.',
    phone: 'ફોન (વૈકલ્પિક, અધિકારીઓને દેખાશે નહીં)', submit: 'મોકલો', rec: 'અવાજ રેકોર્ડ કરો', stop: 'બંધ કરી મોકલો', sending: 'મોકલાઈ રહ્યું છે…',
    track: 'વિનંતી ટ્રૅક કરો', code: 'ટ્રેકિંગ કોડ', check: 'સ્થિતિ જુઓ', status: 'સ્થિતિ' },
  hi: { title: 'अपने क्षेत्र की समस्या बताइए', sub: 'अपनी भाषा में बोलिए या लिखिए। सरकारी विश्लेषक इसे देखेंगे।',
    lang: 'भाषा', district: 'ज़िला (वैकल्पिक)', pick: 'चुनें', text: 'समस्या बताइए', ph: 'जैसे: हमारे गाँव की सड़क टूटी है और बारिश में एम्बुलेंस नहीं आ पाती।',
    phone: 'फ़ोन (वैकल्पिक, अधिकारियों को नहीं दिखेगा)', submit: 'भेजें', rec: 'आवाज़ रिकॉर्ड करें', stop: 'रोककर भेजें', sending: 'भेजा जा रहा है…',
    track: 'अनुरोध ट्रैक करें', code: 'ट्रैकिंग कोड', check: 'स्थिति देखें', status: 'स्थिति' },
}

export default function CitizenPage() {
  const [lang, setLang] = useState('gu')
  const [district, setDistrict] = useState('')
  const [text, setText] = useState('')
  const [phone, setPhone] = useState('')
  const [ack, setAck] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [recording, setRecording] = useState(false)
  const recorder = useRef(null)

  const { data: langs } = useApi(() => api.languages(), [])
  const { data: states } = useApi(() => api.states(), [])
  const t = UI[lang] || UI.en
  const districts = states?.find((s) => s.is_default)?.districts || []

  async function submitText(e) {
    e.preventDefault()
    setBusy(true); setError(null)
    try {
      setAck(await api.submit({ text, language: lang, district: district || null, citizen_ref: phone || null, channel: 'WEB' }))
      setText('')
    } catch (err) { setError(err) } finally { setBusy(false) }
  }

  async function toggleRecording() {
    if (recording) { recorder.current?.stop(); return }
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      const chunks = []
      mr.ondataavailable = (e) => chunks.push(e.data)
      mr.onstop = async () => {
        stream.getTracks().forEach((tr) => tr.stop())
        setRecording(false); setBusy(true)
        try {
          const form = new FormData()
          form.append('audio', new Blob(chunks, { type: mr.mimeType }), 'voice.webm')
          form.append('language', lang)
          if (district) form.append('district', district)
          if (phone) form.append('citizen_ref', phone)
          setAck(await api.submitVoice(form))
        } catch (err) { setError(err) } finally { setBusy(false) }
      }
      recorder.current = mr
      mr.start(); setRecording(true)
    } catch (err) { setError(new Error('Microphone unavailable: ' + err.message)) }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">{t.title}</h1>
        <p className="mt-1 text-sm text-slate-600">{t.sub}</p>
      </header>

      <Card>
        <form onSubmit={submitText} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-medium text-slate-600">{t.lang}</span>
              <select value={lang} onChange={(e) => setLang(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                {(langs ? [...langs.tier1, ...langs.tier2] : ['gu', 'hi', 'en']).map((c) => (
                  <option key={c} value={c}>{langs?.labels?.[c] || c}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-medium text-slate-600">{t.district}</span>
              <select value={district} onChange={(e) => setDistrict(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                <option value="">{t.pick}</option>
                {districts.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
              </select>
            </label>
          </div>

          <label className="block">
            <span className="text-xs font-medium text-slate-600">{t.text}</span>
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} placeholder={t.ph}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </label>

          <label className="block">
            <span className="text-xs font-medium text-slate-600">{t.phone}</span>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="+91…"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </label>

          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={busy || text.trim().length < 3}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-40">
              {busy ? t.sending : t.submit}
            </button>
            <button type="button" onClick={toggleRecording} disabled={busy}
              className={`rounded-lg px-4 py-2 text-sm font-medium ring-1 ${recording ? 'bg-rose-600 text-white ring-rose-600' : 'bg-white text-slate-700 ring-slate-300'}`}>
              {recording ? `⏹ ${t.stop}` : `🎙 ${t.rec}`}
            </button>
          </div>
          <ErrorBox error={error} />
        </form>
      </Card>

      {ack && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm text-emerald-900">{ack.message}</p>
          <p className="mt-1 font-mono text-lg font-semibold text-emerald-900">{ack.tracking_code}</p>
        </div>
      )}

      <TrackBox t={t} />

      <p className="text-center text-xs text-slate-400">
        Your phone number is hashed before storage and never shown to officials. Your original message is always preserved.
      </p>
    </div>
  )
}

function TrackBox({ t }) {
  const [code, setCode] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  return (
    <Card title={t.track}>
      <div className="flex gap-2">
        <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder={t.code}
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm" />
        <button onClick={() => api.track(code).then((r) => { setResult(r); setError(null) }, (e) => { setError(e); setResult(null) })}
          disabled={!code} className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white disabled:opacity-40">{t.check}</button>
      </div>
      <ErrorBox error={error} />
      {result && (
        <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm">
          <div className="text-slate-500">{t.status}: <span className="font-medium text-slate-800">{result.status}</span>
            {result.category && <> · {result.category}</>}{result.district && <> · {result.district}</>}</div>
          <p className="mt-1 text-slate-800">{result.message}</p>
        </div>
      )}
    </Card>
  )
}
