/** Citizen interface — the only screen an ordinary person sees.
 *  Everything here is in the citizen's own language: labels, placeholder, acknowledgement and status. */
import { useRef, useState } from 'react'
import MicIcon from '@mui/icons-material/Mic'
import StopCircleIcon from '@mui/icons-material/StopCircle'
import SendIcon from '@mui/icons-material/Send'
import SearchIcon from '@mui/icons-material/Search'
import TaskAltIcon from '@mui/icons-material/TaskAlt'
import TranslateIcon from '@mui/icons-material/Translate'
import PlaceIcon from '@mui/icons-material/Place'
import LockIcon from '@mui/icons-material/Lock'
import { api } from '../../services/api'
import { useApi } from '../../hooks/useApi'
import { Panel, ErrorBox } from '../../components/ui'
import { COLOR } from '../../theme'

/** UI strings per language. Adding a language is a new entry here plus a backend tier — no code change. */
const UI = {
  en: { title: 'Report a problem in your area', sub: 'Speak or write in your own language. A government analyst reads every submission.',
    lang: 'Language', district: 'District', pick: 'Select your district', text: 'What is the problem?',
    ph: 'e.g. The road to our village is broken and ambulances cannot reach us during the rains.',
    phone: 'Phone number', phoneHint: 'Optional. Stored only as a one-way hash so repeat reports are not counted twice. Officials never see it.',
    submit: 'Submit', rec: 'Record instead', stop: 'Stop and send', sending: 'Sending…',
    track: 'Check a request you already sent', code: 'Tracking code', check: 'Check', received: 'Received' },
  gu: { title: 'તમારા વિસ્તારની સમસ્યા જણાવો', sub: 'તમારી ભાષામાં બોલો અથવા લખો. દરેક રજૂઆત સરકારી વિશ્લેષક વાંચે છે.',
    lang: 'ભાષા', district: 'જિલ્લો', pick: 'તમારો જિલ્લો પસંદ કરો', text: 'સમસ્યા શું છે?',
    ph: 'દા.ત. અમારા ગામનો રસ્તો તૂટી ગયો છે અને વરસાદમાં એમ્બ્યુલન્સ આવી શકતી નથી.',
    phone: 'ફોન નંબર', phoneHint: 'વૈકલ્પિક. માત્ર હેશ તરીકે સાચવાય છે જેથી એક જ રજૂઆત બે વાર ન ગણાય. અધિકારીઓ તેને જોઈ શકતા નથી.',
    submit: 'મોકલો', rec: 'અવાજમાં જણાવો', stop: 'બંધ કરી મોકલો', sending: 'મોકલાઈ રહ્યું છે…',
    track: 'અગાઉ મોકલેલી વિનંતી તપાસો', code: 'ટ્રેકિંગ કોડ', check: 'તપાસો', received: 'મળી ગયું' },
  hi: { title: 'अपने क्षेत्र की समस्या बताइए', sub: 'अपनी भाषा में बोलिए या लिखिए। हर शिकायत सरकारी विश्लेषक पढ़ता है।',
    lang: 'भाषा', district: 'ज़िला', pick: 'अपना ज़िला चुनें', text: 'समस्या क्या है?',
    ph: 'जैसे: हमारे गाँव की सड़क टूटी है और बारिश में एम्बुलेंस नहीं आ पाती।',
    phone: 'फ़ोन नंबर', phoneHint: 'वैकल्पिक। केवल हैश के रूप में रखा जाता है ताकि एक ही शिकायत दो बार न गिने। अधिकारी इसे नहीं देखते।',
    submit: 'भेजें', rec: 'बोलकर बताइए', stop: 'रोककर भेजें', sending: 'भेजा जा रहा है…',
    track: 'पहले भेजा अनुरोध देखें', code: 'ट्रैकिंग कोड', check: 'देखें', received: 'प्राप्त हुआ' },
}

export default function CitizenPage() {
  const [lang, setLang] = useState('en')
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
  const stateGroups = [...(states || [])].sort((a, b) => Number(b.is_default) - Number(a.is_default))
  const langOptions = langs ? [...langs.tier1, ...langs.tier2] : ['gu', 'hi', 'en']

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
      mr.ondataavailable = (ev) => chunks.push(ev.data)
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

  const field = 'mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2'
  const fieldStyle = { borderColor: COLOR.grid, '--tw-ring-color': `${COLOR.seq[3]}55` }

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-8">
      <header>
        <h1 className="text-2xl font-bold" style={{ color: COLOR.ink }}>{t.title}</h1>
        <p className="mt-1 text-sm" style={{ color: COLOR.ink2 }}>{t.sub}</p>
      </header>

      <Panel>
        <form onSubmit={submitText} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="flex items-center gap-1 text-xs font-medium" style={{ color: COLOR.ink2 }}>
                <TranslateIcon sx={{ fontSize: 14 }} />{t.lang}
              </span>
              <select value={lang} onChange={(e) => setLang(e.target.value)} className={field} style={fieldStyle}>
                {langOptions.map((c) => <option key={c} value={c}>{langs?.labels?.[c] || c}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="flex items-center gap-1 text-xs font-medium" style={{ color: COLOR.ink2 }}>
                <PlaceIcon sx={{ fontSize: 14 }} />{t.district}
              </span>
              <select value={district} onChange={(e) => setDistrict(e.target.value)} className={field} style={fieldStyle}>
                <option value="">{t.pick}</option>
                {stateGroups.map((s) => (
                  <optgroup key={s.id} label={s.name}>
                    {s.districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </optgroup>
                ))}
              </select>
            </label>
          </div>

          <label className="block">
            <span className="text-xs font-medium" style={{ color: COLOR.ink2 }}>{t.text}</span>
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} placeholder={t.ph} className={field} style={fieldStyle} />
          </label>

          <label className="block">
            <span className="flex items-center gap-1 text-xs font-medium" style={{ color: COLOR.ink2 }}>
              <LockIcon sx={{ fontSize: 14 }} />{t.phone}
            </span>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="+91…" className={field} style={fieldStyle} />
            <span className="mt-1 block text-xs" style={{ color: COLOR.muted }}>{t.phoneHint}</span>
          </label>

          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={busy || text.trim().length < 3}
              className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-white transition disabled:opacity-40"
              style={{ background: COLOR.seq[3] }}>
              <SendIcon sx={{ fontSize: 17 }} />{busy && !recording ? t.sending : t.submit}
            </button>
            <button type="button" onClick={toggleRecording} disabled={busy && !recording}
              className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium ring-1 transition disabled:opacity-40"
              style={recording
                ? { background: COLOR.critical, color: '#fff', '--tw-ring-color': COLOR.critical }
                : { background: '#fff', color: COLOR.ink2, '--tw-ring-color': COLOR.grid }}>
              {recording ? <><StopCircleIcon sx={{ fontSize: 17 }} />{t.stop}</> : <><MicIcon sx={{ fontSize: 17 }} />{t.rec}</>}
            </button>
          </div>
          <ErrorBox error={error} />
        </form>
      </Panel>

      {ack && (
        <div className="flex items-start gap-2.5 rounded-xl p-4" style={{ background: `${COLOR.good}12`, border: `1px solid ${COLOR.good}40` }}>
          <TaskAltIcon sx={{ fontSize: 20, color: COLOR.good, flexShrink: 0, mt: '2px' }} />
          <div>
            <p className="text-sm" style={{ color: COLOR.ink }}>{ack.message}</p>
            <p className="mt-1 font-mono text-lg font-semibold" style={{ color: COLOR.good }}>{ack.tracking_code}</p>
          </div>
        </div>
      )}

      <TrackBox t={t} field={field} fieldStyle={fieldStyle} />
    </div>
  )
}

function TrackBox({ t, field, fieldStyle }) {
  const [code, setCode] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  return (
    <Panel icon={SearchIcon} title={t.track}>
      <div className="flex gap-2">
        <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder={t.code}
          className={`${field} !mt-0 flex-1 font-mono`} style={fieldStyle} />
        <button onClick={() => api.track(code).then((r) => { setResult(r); setError(null) }, (e) => { setError(e); setResult(null) })}
          disabled={!code} className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-40" style={{ background: COLOR.ink }}>
          {t.check}
        </button>
      </div>
      <div className="mt-3 space-y-3"><ErrorBox error={error} /></div>
      {result && (
        <div className="mt-3 rounded-lg p-3 text-sm" style={{ background: COLOR.page }}>
          <div className="text-xs" style={{ color: COLOR.muted }}>
            {result.status}{result.category && <> · {result.category}</>}{result.district && <> · {result.district}</>}
          </div>
          <p className="mt-1" style={{ color: COLOR.ink }}>{result.message}</p>
        </div>
      )}
    </Panel>
  )
}
