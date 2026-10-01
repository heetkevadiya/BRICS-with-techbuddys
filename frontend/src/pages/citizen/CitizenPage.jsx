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
import MyLocationIcon from '@mui/icons-material/MyLocation'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import PhoneIphoneIcon from '@mui/icons-material/PhoneIphone'
import ForumIcon from '@mui/icons-material/Forum'
import PsychologyIcon from '@mui/icons-material/Psychology'
import InsightsIcon from '@mui/icons-material/Insights'
import AccountBalanceIcon from '@mui/icons-material/AccountBalance'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import { api } from '../../services/api'
import { useApi } from '../../hooks/useApi'
import { Panel, ErrorBox } from '../../components/ui'
import { COLOR } from '../../theme'

/** UI strings per language. Adding a language is a new entry here plus a backend tier — no code change. */
const UI = {
  en: { title: 'Report a problem in your area', sub: 'Speak or write in your own language. A government analyst reads every submission.',
    trust: ['Free to use', 'No login needed', 'Your words are never edited'],
    lang: 'Language', district: 'District', pick: 'Select your district', text: 'What is the problem?',
    ph: 'e.g. The road to our village is broken and ambulances cannot reach us during the rains.',
    chars: 'characters', optional: 'optional', category: 'Category',
    phone: 'Mobile number', phoneHint: 'Stored only as a one-way hash so repeat reports are not counted twice. Officials never see it.',
    phoneInvalid: 'Enter the 10 digits after +91.',
    loc: 'Add my location', locLabel: 'My location', locOn: 'Location added', locFail: 'Location unavailable.',
    locHint: 'Helps place your report when the district is not obvious.',
    submit: 'Submit', rec: 'Record instead', stop: 'Stop and send', sending: 'Sending…',
    stepsTitle: 'What happens to your report',
    steps: [['You report', 'In your own language, by voice or by text.'],
            ['AI understands it', 'Gemini identifies the problem, the place and how urgent it is.'],
            ['Your district is measured', 'Your report is counted with every other report from your district.'],
            ['Officials decide', 'Departments see which districts need work the most.']],
    ackTitle: 'Report received', saveCode: 'Save this code. You can check your report with it at any time.',
    copy: 'Copy', copied: 'Copied',
    track: 'Check a request you already sent', code: 'Tracking code', check: 'Check', submitted: 'Submitted',
    status: { RECEIVED: 'Received', PROCESSING: 'Being analysed', PROCESSED: 'Analysed',
      REVIEW_REQUIRED: 'With an analyst', FAILED: 'Could not be processed', LANGUAGE_UNSUPPORTED: 'Language not supported yet' },
    notFound: 'No request found with that code. Check it and try again.', failed: 'Your report could not be sent. Please try again.' },
  gu: { title: 'તમારા વિસ્તારની સમસ્યા જણાવો', sub: 'તમારી ભાષામાં બોલો અથવા લખો. દરેક રજૂઆત સરકારી વિશ્લેષક વાંચે છે.',
    trust: ['મફત', 'લોગિન વગર', 'તમારા શબ્દો બદલાતા નથી'],
    lang: 'ભાષા', district: 'જિલ્લો', pick: 'તમારો જિલ્લો પસંદ કરો', text: 'સમસ્યા શું છે?',
    ph: 'દા.ત. અમારા ગામનો રસ્તો તૂટી ગયો છે અને વરસાદમાં એમ્બ્યુલન્સ આવી શકતી નથી.',
    chars: 'અક્ષરો', optional: 'વૈકલ્પિક', category: 'શ્રેણી',
    phone: 'મોબાઇલ નંબર', phoneHint: 'માત્ર હેશ તરીકે સાચવાય છે જેથી એક જ રજૂઆત બે વાર ન ગણાય. અધિકારીઓ તેને જોઈ શકતા નથી.',
    phoneInvalid: '+91 પછીના 10 અંક લખો.',
    loc: 'મારું સ્થાન ઉમેરો', locLabel: 'મારું સ્થાન', locOn: 'સ્થાન ઉમેરાયું', locFail: 'સ્થાન મળી શક્યું નથી.',
    locHint: 'જિલ્લો સ્પષ્ટ ન હોય ત્યારે તમારી રજૂઆત યોગ્ય જગ્યાએ પહોંચાડે છે.',
    submit: 'મોકલો', rec: 'અવાજમાં જણાવો', stop: 'બંધ કરી મોકલો', sending: 'મોકલાઈ રહ્યું છે…',
    stepsTitle: 'તમારી રજૂઆતનું શું થાય છે',
    steps: [['તમે જણાવો છો', 'તમારી ભાષામાં, બોલીને કે લખીને.'],
            ['AI સમજે છે', 'Gemini સમસ્યા, સ્થળ અને તાકીદ ઓળખે છે.'],
            ['તમારો જિલ્લો મપાય છે', 'તમારી રજૂઆત જિલ્લાની બીજી બધી રજૂઆતો સાથે ગણાય છે.'],
            ['અધિકારીઓ નિર્ણય લે છે', 'વિભાગો જુએ છે કે કયા જિલ્લામાં સૌથી વધુ કામ જરૂરી છે.']],
    ackTitle: 'રજૂઆત મળી ગઈ', saveCode: 'આ કોડ સાચવી રાખો. તેનાથી તમે ગમે ત્યારે સ્થિતિ જોઈ શકો છો.',
    copy: 'નકલ કરો', copied: 'નકલ થઈ',
    track: 'અગાઉ મોકલેલી વિનંતી તપાસો', code: 'ટ્રેકિંગ કોડ', check: 'તપાસો', submitted: 'મોકલ્યું',
    status: { RECEIVED: 'મળી ગયું', PROCESSING: 'વિશ્લેષણ ચાલુ', PROCESSED: 'વિશ્લેષણ થયું',
      REVIEW_REQUIRED: 'વિશ્લેષક પાસે', FAILED: 'પ્રક્રિયા થઈ શકી નથી', LANGUAGE_UNSUPPORTED: 'ભાષા હજી સમર્થિત નથી' },
    notFound: 'આ કોડથી કોઈ વિનંતી મળી નથી. કોડ તપાસીને ફરી પ્રયત્ન કરો.', failed: 'તમારી રજૂઆત મોકલી શકાઈ નથી. ફરી પ્રયત્ન કરો.' },
  hi: { title: 'अपने क्षेत्र की समस्या बताइए', sub: 'अपनी भाषा में बोलिए या लिखिए। हर शिकायत सरकारी विश्लेषक पढ़ता है।',
    trust: ['निःशुल्क', 'बिना लॉगिन', 'आपके शब्द बदले नहीं जाते'],
    lang: 'भाषा', district: 'ज़िला', pick: 'अपना ज़िला चुनें', text: 'समस्या क्या है?',
    ph: 'जैसे: हमारे गाँव की सड़क टूटी है और बारिश में एम्बुलेंस नहीं आ पाती।',
    chars: 'अक्षर', optional: 'वैकल्पिक', category: 'श्रेणी',
    phone: 'मोबाइल नंबर', phoneHint: 'केवल हैश के रूप में रखा जाता है ताकि एक ही शिकायत दो बार न गिने। अधिकारी इसे नहीं देखते।',
    phoneInvalid: '+91 के बाद के 10 अंक लिखें।',
    loc: 'मेरा स्थान जोड़ें', locLabel: 'मेरा स्थान', locOn: 'स्थान जुड़ गया', locFail: 'स्थान उपलब्ध नहीं।',
    locHint: 'ज़िला स्पष्ट न हो तब आपकी शिकायत सही जगह पहुँचाने में मदद करता है।',
    submit: 'भेजें', rec: 'बोलकर बताइए', stop: 'रोककर भेजें', sending: 'भेजा जा रहा है…',
    stepsTitle: 'आपकी शिकायत का क्या होता है',
    steps: [['आप बताते हैं', 'अपनी भाषा में, बोलकर या लिखकर।'],
            ['AI समझता है', 'Gemini समस्या, जगह और तात्कालिकता पहचानता है।'],
            ['आपका ज़िला मापा जाता है', 'आपकी शिकायत ज़िले की बाकी सब शिकायतों के साथ गिनी जाती है।'],
            ['अधिकारी निर्णय लेते हैं', 'विभाग देखते हैं कि किस ज़िले में सबसे ज़्यादा काम चाहिए।']],
    ackTitle: 'शिकायत मिल गई', saveCode: 'यह कोड सँभालकर रखें। इससे आप कभी भी स्थिति देख सकते हैं।',
    copy: 'कॉपी करें', copied: 'कॉपी हुआ',
    track: 'पहले भेजा अनुरोध देखें', code: 'ट्रैकिंग कोड', check: 'देखें', submitted: 'भेजा गया',
    status: { RECEIVED: 'प्राप्त हुआ', PROCESSING: 'विश्लेषण जारी', PROCESSED: 'विश्लेषण हो गया',
      REVIEW_REQUIRED: 'विश्लेषक के पास', FAILED: 'प्रक्रिया नहीं हो सकी', LANGUAGE_UNSUPPORTED: 'भाषा अभी समर्थित नहीं' },
    notFound: 'इस कोड से कोई अनुरोध नहीं मिला। कोड जाँचकर फिर कोशिश करें।', failed: 'आपकी शिकायत भेजी नहीं जा सकी। कृपया फिर कोशिश करें।' },
}

const STEP_ICON = [ForumIcon, PsychologyIcon, InsightsIcon, AccountBalanceIcon]
const MAX_TEXT = 4000

function nationalDigits(value) {
  const d = value.replace(/\D/g, '')
  if (d.length === 12 && d.startsWith('91')) return d.slice(2)
  if (d.length === 11 && d.startsWith('0')) return d.slice(1)
  return d.slice(0, 10)
}

export default function CitizenPage() {
  const [lang, setLang] = useState('en')
  const [district, setDistrict] = useState('')
  const [text, setText] = useState('')
  const [phone, setPhone] = useState('')
  const [coords, setCoords] = useState(null)
  const [ack, setAck] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [recording, setRecording] = useState(false)
  const [code, setCode] = useState('')
  const recorder = useRef(null)

  const { data: langs } = useApi(() => api.languages(), [])
  const { data: states } = useApi(() => api.states(), [])
  const t = UI[lang] || UI.en
  const stateGroups = [...(states || [])].sort((a, b) => Number(b.is_default) - Number(a.is_default))
  const langOptions = langs ? [...langs.tier1, ...langs.tier2] : ['gu', 'hi', 'en']
  const phoneBad = phone.length > 0 && phone.length < 10
  const citizenRef = phone.length === 10 ? `+91${phone}` : null

  function askLocation() {
    if (!navigator.geolocation) { setError(new Error(t.locFail)); return }
    navigator.geolocation.getCurrentPosition(
      (p) => setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => setError(new Error(t.locFail)),
      { enableHighAccuracy: true, timeout: 8000 },
    )
  }

  function received(a) {
    setAck(a)
    setCode(a.tracking_code)
  }

  async function submitText(e) {
    e.preventDefault()
    if (phoneBad) return
    setBusy(true); setError(null)
    try {
      received(await api.submit({
        text, language: lang, district: district || null, citizen_ref: citizenRef,
        lat: coords?.lat ?? null, lng: coords?.lng ?? null, channel: 'WEB',
      }))
      setText('')
    } catch { setError(new Error(t.failed)) } finally { setBusy(false) }
  }

  async function toggleRecording() {
    if (recording) { recorder.current?.stop(); return }
    if (phoneBad) return
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
          if (citizenRef) form.append('citizen_ref', citizenRef)
          if (coords) { form.append('lat', coords.lat); form.append('lng', coords.lng) }
          received(await api.submitVoice(form))
        } catch { setError(new Error(t.failed)) } finally { setBusy(false) }
      }
      recorder.current = mr
      mr.start(); setRecording(true)
    } catch (err) { setError(new Error('Microphone unavailable: ' + err.message)) }
  }

  const field = 'mt-1.5 w-full rounded-lg border bg-white px-3 py-2.5 text-sm outline-none transition focus:ring-2'
  const fieldStyle = { borderColor: COLOR.grid, '--tw-ring-color': `${COLOR.seq[3]}55` }
  const labelCls = 'flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide'

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-8">
      <header>
        <h1 className="text-2xl font-bold sm:text-3xl" style={{ color: COLOR.ink }}>{t.title}</h1>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: COLOR.ink2 }}>{t.sub}</p>
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
          {t.trust.map((item) => (
            <li key={item} className="flex items-center gap-1 text-xs" style={{ color: COLOR.muted }}>
              <CheckCircleIcon sx={{ fontSize: 14, color: COLOR.good }} />{item}
            </li>
          ))}
        </ul>
      </header>

      <Panel>
        <form onSubmit={submitText} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className={labelCls} style={{ color: COLOR.ink2 }}>
                <TranslateIcon sx={{ fontSize: 15 }} />{t.lang}
              </span>
              <select value={lang} onChange={(e) => setLang(e.target.value)} className={field} style={fieldStyle}>
                {langOptions.map((c) => <option key={c} value={c}>{langs?.labels?.[c] || c}</option>)}
              </select>
            </label>
            <label className="block">
              <span className={labelCls} style={{ color: COLOR.ink2 }}>
                <PlaceIcon sx={{ fontSize: 15 }} />{t.district}
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
            <span className={labelCls} style={{ color: COLOR.ink2 }}>{t.text}</span>
            <textarea value={text} onChange={(e) => setText(e.target.value.slice(0, MAX_TEXT))} rows={5}
              placeholder={t.ph} className={`${field} resize-y leading-relaxed`} style={fieldStyle} />
            <span className="tnum mt-1 block text-right text-xs" style={{ color: COLOR.muted }}>
              {text.length} / {MAX_TEXT} {t.chars}
            </span>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <span className={labelCls} style={{ color: COLOR.ink2 }}>
                <PhoneIphoneIcon sx={{ fontSize: 15 }} />{t.phone}
                <span className="font-normal normal-case tracking-normal" style={{ color: COLOR.muted }}>· {t.optional}</span>
              </span>
              <div className="mt-1.5 flex items-stretch overflow-hidden rounded-lg border" style={{ borderColor: phoneBad ? COLOR.critical : COLOR.grid }}>
                <span className="tnum flex items-center px-3 text-sm font-medium" style={{ background: COLOR.page, color: COLOR.ink2, borderRight: `1px solid ${COLOR.grid}` }}>+91</span>
                <input value={phone} onChange={(e) => setPhone(nationalDigits(e.target.value))}
                  inputMode="numeric" autoComplete="tel-national" placeholder="98765 43210"
                  className="tnum w-full px-3 py-2.5 text-sm outline-none" />
              </div>
              <span className="mt-1 flex items-start gap-1 text-xs leading-relaxed" style={{ color: phoneBad ? COLOR.critical : COLOR.muted }}>
                {!phoneBad && <LockIcon sx={{ fontSize: 13, mt: '2px', flexShrink: 0 }} />}
                {phoneBad ? t.phoneInvalid : t.phoneHint}
              </span>
            </div>

            <div>
              <span className={labelCls} style={{ color: COLOR.ink2 }}>
                <MyLocationIcon sx={{ fontSize: 15 }} />{t.locLabel}
                <span className="font-normal normal-case tracking-normal" style={{ color: COLOR.muted }}>· {t.optional}</span>
              </span>
              <button type="button" onClick={askLocation}
                className="mt-1.5 flex w-full items-center justify-center gap-1.5 rounded-lg border px-3 py-2.5 text-sm font-medium transition"
                style={coords
                  ? { borderColor: `${COLOR.good}60`, background: `${COLOR.good}10`, color: COLOR.good }
                  : { borderColor: COLOR.grid, background: '#fff', color: COLOR.ink2 }}>
                {coords ? <><TaskAltIcon sx={{ fontSize: 17 }} />{t.locOn}</> : <><MyLocationIcon sx={{ fontSize: 17 }} />{t.loc}</>}
              </button>
              <span className="mt-1 block text-xs leading-relaxed" style={{ color: COLOR.muted }}>
                {coords ? `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : t.locHint}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 border-t pt-4" style={{ borderColor: COLOR.grid }}>
            <button type="submit" disabled={busy || phoneBad || text.trim().length < 3}
              className="inline-flex items-center gap-1.5 rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition disabled:opacity-40"
              style={{ background: COLOR.seq[3] }}>
              <SendIcon sx={{ fontSize: 17 }} />{busy && !recording ? t.sending : t.submit}
            </button>
            <button type="button" onClick={toggleRecording} disabled={(busy && !recording) || phoneBad}
              className="inline-flex items-center gap-1.5 rounded-lg px-5 py-2.5 text-sm font-semibold ring-1 transition disabled:opacity-40"
              style={recording
                ? { background: COLOR.critical, color: '#fff', '--tw-ring-color': COLOR.critical }
                : { background: '#fff', color: COLOR.ink2, '--tw-ring-color': COLOR.grid }}>
              {recording ? <><StopCircleIcon sx={{ fontSize: 17 }} />{t.stop}</> : <><MicIcon sx={{ fontSize: 17 }} />{t.rec}</>}
            </button>
          </div>
          <ErrorBox error={error} />
        </form>
      </Panel>

      {ack && <Acknowledgement t={t} ack={ack} />}

      <Panel title={t.stepsTitle}>
        <ol className="grid gap-4 sm:grid-cols-2">
          {t.steps.map(([label, note], i) => {
            const Icon = STEP_ICON[i]
            return (
              <li key={label} className="flex gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                  style={{ background: `${COLOR.seq[3]}14`, color: COLOR.seq[3] }}>
                  <Icon sx={{ fontSize: 18 }} />
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-semibold" style={{ color: COLOR.ink }}>{i + 1}. {label}</div>
                  <p className="mt-0.5 text-xs leading-relaxed" style={{ color: COLOR.ink2 }}>{note}</p>
                </div>
              </li>
            )
          })}
        </ol>
      </Panel>

      <TrackBox t={t} code={code} setCode={setCode} field={field} fieldStyle={fieldStyle} />
    </div>
  )
}

function Acknowledgement({ t, ack }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="rounded-xl p-4" style={{ background: `${COLOR.good}0d`, border: `1px solid ${COLOR.good}40` }}>
      <div className="flex items-start gap-2.5">
        <TaskAltIcon sx={{ fontSize: 20, color: COLOR.good, flexShrink: 0, mt: '2px' }} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold" style={{ color: COLOR.ink }}>{t.ackTitle}</p>
          <p className="mt-1 text-sm leading-relaxed" style={{ color: COLOR.ink2 }}>{ack.message}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="rounded-lg px-3 py-1.5 font-mono text-lg font-semibold tracking-wider"
              style={{ background: '#fff', border: `1px solid ${COLOR.good}40`, color: COLOR.good }}>
              {ack.tracking_code}
            </span>
            <button type="button"
              onClick={() => navigator.clipboard?.writeText(ack.tracking_code).then(() => setCopied(true), () => {})}
              className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium ring-1 transition"
              style={{ background: '#fff', color: COLOR.ink2, '--tw-ring-color': COLOR.grid }}>
              <ContentCopyIcon sx={{ fontSize: 14 }} />{copied ? t.copied : t.copy}
            </button>
          </div>
          <p className="mt-2 text-xs leading-relaxed" style={{ color: COLOR.muted }}>{t.saveCode}</p>
        </div>
      </div>
    </div>
  )
}

function TrackBox({ t, code, setCode, field, fieldStyle }) {
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  function check() {
    setBusy(true)
    api.track(code).then(
      (r) => { setResult(r); setError(null) },
      (e) => { setError(e); setResult(null) },
    ).finally(() => setBusy(false))
  }

  const tone = result && (result.status === 'FAILED' ? COLOR.critical
    : result.status === 'PROCESSED' ? COLOR.good : COLOR.warning)

  return (
    <Panel icon={SearchIcon} title={t.track}>
      <div className="flex flex-wrap gap-2">
        <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase().trim())} placeholder={t.code}
          onKeyDown={(e) => { if (e.key === 'Enter' && code) check() }}
          className={`${field} !mt-0 min-w-40 flex-1 font-mono tracking-wider`} style={fieldStyle} />
        <button onClick={check} disabled={!code || busy}
          className="rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition disabled:opacity-40" style={{ background: COLOR.ink }}>
          {t.check}
        </button>
      </div>
      <div className="mt-3"><ErrorBox error={error && { message: error.status === 404 ? t.notFound : error.message }} /></div>
      {result && (
        <div className="mt-3 rounded-lg border p-4" style={{ borderColor: COLOR.grid, background: COLOR.page }}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold"
              style={{ background: `${tone}14`, color: tone }}>
              <AccessTimeIcon sx={{ fontSize: 14 }} />{t.status[result.status] || result.status}
            </span>
            <span className="font-mono text-xs tracking-wider" style={{ color: COLOR.muted }}>{result.tracking_code}</span>
          </div>
          <p className="mt-2.5 text-sm leading-relaxed" style={{ color: COLOR.ink }}>{result.message}</p>
          <dl className="mt-3 grid gap-x-6 gap-y-1.5 border-t pt-3 text-xs sm:grid-cols-2" style={{ borderColor: COLOR.grid }}>
            {result.category && <Row label={t.category} value={result.category} />}
            {result.district && <Row label={t.district} value={result.district} />}
            <Row label={t.submitted} value={new Date(result.submitted_at).toLocaleString()} />
          </dl>
        </div>
      )}
    </Panel>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-3">
      <dt style={{ color: COLOR.muted }}>{label}</dt>
      <dd className="text-right font-medium" style={{ color: COLOR.ink }}>{value}</dd>
    </div>
  )
}
