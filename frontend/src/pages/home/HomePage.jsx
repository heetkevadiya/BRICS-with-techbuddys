import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import CampaignIcon from '@mui/icons-material/Campaign'
import PsychologyIcon from '@mui/icons-material/Psychology'
import HubIcon from '@mui/icons-material/Hub'
import AccountBalanceIcon from '@mui/icons-material/AccountBalance'
import CalculateIcon from '@mui/icons-material/Calculate'
import RecommendIcon from '@mui/icons-material/Recommend'
import FactCheckIcon from '@mui/icons-material/FactCheck'
import InsightsIcon from '@mui/icons-material/Insights'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import SouthIcon from '@mui/icons-material/South'
import CloudQueueIcon from '@mui/icons-material/CloudQueue'
import WhatsAppIcon from '@mui/icons-material/WhatsApp'
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive'
import SupportAgentIcon from '@mui/icons-material/SupportAgent'
import { api } from '../../services/api'
import { useApi } from '../../hooks/useApi'
import { Panel, Spinner } from '../../components/ui'
import { num } from '../../format'
import { COLOR } from '../../theme'

const LANG_NAME = { gu: 'Gujarati', hi: 'Hindi', 'hi-Latn': 'Hinglish', en: 'English', mr: 'Marathi' }

const LOOP = [
  { icon: CampaignIcon, title: 'A citizen speaks', body: 'Voice, text, WhatsApp, SMS, IVR or a field office — in their own language. The original words are never altered.' },
  { icon: PsychologyIcon, title: 'Gemini understands', body: 'Detects the language, translates, and extracts category, location and urgency into a validated schema.' },
  { icon: HubIcon, title: 'Voices become an issue', body: 'Embeddings group differently-worded reports of the same problem. One person reporting twice is counted once.' },
  { icon: AccountBalanceIcon, title: 'Joined to government data', body: 'Census population, infrastructure indices, the live project pipeline and this year’s budget, by district.' },
  { icon: CalculateIcon, title: 'Scored, not guessed', body: 'A fixed formula weighs demand, infrastructure gap, population, urgency and national priorities. No model decides.' },
  { icon: RecommendIcon, title: 'A policymaker decides', body: 'Every score opens into its evidence. Accepting one freezes today’s numbers so impact can be measured later.' },
]

const STACK = [
  ['Gemini 3.8 Flash', 'understands every message'],
  ['Gemini Embedding', 'groups reports of one issue'],
  ['Cloud Speech-to-Text', 'transcribes voice notes'],
  ['Cloud Translation', 'serves 14 Indian languages'],
  ['BigQuery', 'holds the national tables'],
  ['Google Maps Platform', 'draws the district map'],
  ['Firebase Auth', 'verifies ID tokens on guarded routes'],
  ['Firestore', 'carries the live feed of new reports'],
  ['Cloud Run', 'runs the API'],
  ['Firebase Hosting', 'serves this site'],
]

const NEXT = [
  { icon: NotificationsActiveIcon, title: 'WhatsApp alert when a report is high-risk',
    body: 'When Gemini returns urgency 9–10 on a safety category — a collapsed road, contaminated water, an unlit crossing — the district reviewer gets a WhatsApp message in seconds instead of finding it in a queue the next morning.',
    rests: 'The urgency score, the risk categories and the review queue already run. This adds delivery.' },
  { icon: WhatsAppIcon, title: 'WhatsApp status updates for the citizen',
    body: 'Today a tracking code is the only way to find out what happened, and the citizen has to come back and ask. The same update would be pushed to them when the status changes — understood, grouped with others, accepted into a plan.',
    rests: 'The phone number is deliberately stored as a one-way hash, so this needs a separate opt-in contact store kept apart from the analysis data.' },
  { icon: SupportAgentIcon, title: 'A voice agent that talks with the citizen',
    body: 'A voice note is transcribed in one shot today. A conversational agent would call back, ask what is wrong, ask the follow-up a form cannot — which road, since when, how many households — and confirm the district out loud. The people least served by a web form would be served best.',
    rests: 'WHATSAPP, SMS and IVR are already channels in the data model; the pipeline does not care which one a message arrives on.' },
]

export default function HomePage() {
  const { data: s } = useApi(() => api.publicSummary(), [])

  return (
    <div>
      <section style={{ background: `linear-gradient(180deg, ${COLOR.seq[0]}66 0%, ${COLOR.page} 100%)` }}>
        <div className="mx-auto grid max-w-[1200px] items-center gap-10 px-4 py-14 lg:grid-cols-[1.05fr_1fr] lg:py-20">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
              style={{ background: '#ffffff', color: COLOR.seq[4], boxShadow: `inset 0 0 0 1px ${COLOR.seq[1]}` }}>
              <AutoAwesomeIcon sx={{ fontSize: 14 }} />AI for Digital Public Infrastructure &amp; Governance
            </span>
            <h1 className="mt-4 text-4xl font-bold leading-[1.12] tracking-tight sm:text-5xl" style={{ color: COLOR.ink }}>
              Citizens know what their area needs.
              <span className="block" style={{ color: COLOR.seq[4] }}>This turns it into evidence a ministry can act on.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed sm:text-lg" style={{ color: COLOR.ink2 }}>
              Development requests arrive scattered across phone lines, messaging apps and paper forms, in dozens of
              languages, and rarely reach the people setting infrastructure budgets. This platform collects them,
              understands them with Google AI, joins them to Census data for all 640 districts, and ranks where the
              need is greatest — showing its working at every step.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/policymaker"
                className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
                style={{ background: COLOR.seq[4] }}>
                <InsightsIcon sx={{ fontSize: 18 }} />Open the policymaker dashboard
              </Link>
              <Link to="/citizen"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold shadow-sm ring-1 transition hover:shadow-md"
                style={{ color: COLOR.ink, '--tw-ring-color': COLOR.grid }}>
                <CampaignIcon sx={{ fontSize: 18 }} />Report a problem
              </Link>
            </div>
            <p className="mt-5 text-xs" style={{ color: COLOR.muted }}>
              Live pilot in Gujarat · Census of India 2011 loaded for 35 states &amp; UTs · every score is a published formula
            </p>
          </div>
          <LiveExtraction />
        </div>
      </section>

      <div className="mx-auto max-w-[1200px] space-y-8 px-4 pb-14">
        {s ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Figure value={num(s.national.districts)} label="districts loaded" sub={`${s.national.states} states & UTs`} />
            <Figure value={`${(s.national.population / 1e9).toFixed(2)}bn`} label="people covered" sub="Census of India 2011" />
            <Figure value={num(s.unique_citizens)} label="citizens reporting" sub={`${num(s.total_requests)} messages, repeats counted once`} />
            <Figure value={Object.keys(s.languages).length} label="languages served" sub={Object.keys(s.languages).map((l) => LANG_NAME[l] || l).join(', ')} />
          </div>
        ) : <Spinner label="Loading coverage…" />}

        <Panel icon={CloudQueueIcon} title="Built on Google Cloud"
          explain="Each service does one job the platform genuinely needs. The AI accuracy page shows what each one is allowed to do, and what it is not. Firebase ID-token verification sits on every guarded route; this public preview opens the citizen, analyst and policymaker screens directly so the whole loop can be followed without an account.">
          <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
            {STACK.map(([name, role]) => (
              <div key={name} className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: COLOR.seq[3] }} />
                <div>
                  <div className="text-sm font-semibold" style={{ color: COLOR.ink }}>{name}</div>
                  <div className="text-xs" style={{ color: COLOR.muted }}>{role}</div>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="How one citizen message becomes a funded project"
          explain="Each step is visible in the interface — nothing here is a diagram of something that does not exist.">
          <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {LOOP.map(({ icon: Icon, title, body }, i) => (
              <li key={title} className="rounded-lg border p-3" style={{ borderColor: COLOR.grid }}>
                <div className="flex items-center gap-2">
                  <span className="tnum flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold"
                    style={{ background: `${COLOR.seq[3]}1a`, color: COLOR.seq[3] }}>{i + 1}</span>
                  <Icon sx={{ fontSize: 18, color: COLOR.muted }} />
                  <span className="text-sm font-semibold" style={{ color: COLOR.ink }}>{title}</span>
                </div>
                <p className="mt-1.5 text-sm leading-relaxed" style={{ color: COLOR.ink2 }}>{body}</p>
              </li>
            ))}
          </ol>
        </Panel>

        <div className="grid gap-4 sm:grid-cols-3">
          <Door to="/citizen" icon={CampaignIcon} title="Report a problem"
            body="The citizen's view. Speak or type in Gujarati, Hindi, Hinglish or English and track what happens." cta="Try it" />
          <Door to="/policymaker" icon={InsightsIcon} title="See the priorities"
            body="The decision screen. Demand map, investment alignment, and ranked recommendations that open into their evidence." cta="Open dashboard" primary />
          <Door to="/ai" icon={PsychologyIcon} title="Check the AI"
            body="Measured accuracy per language, confidence distribution, cost per request, and what each Google service is allowed to do." cta="See the numbers" />
        </div>

        <Panel title="What comes next"
          actions={<span className="rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide"
            style={{ background: `${COLOR.warning}1f`, color: '#8a6100' }}>Planned · not built</span>}
          explain="None of this is built yet — it is listed here so the line between what runs today and what is planned stays visible. Each one closes the same gap: the loop ends when a policymaker decides, and the citizen is never told.">
          <ol className="grid gap-3 lg:grid-cols-3">
            {NEXT.map(({ icon: Icon, title, body, rests }) => (
              <li key={title} className="flex flex-col rounded-lg border p-3" style={{ borderColor: COLOR.grid, background: COLOR.page }}>
                <div className="flex items-start gap-2">
                  <Icon sx={{ fontSize: 18, color: COLOR.muted, mt: '2px', flexShrink: 0 }} />
                  <span className="text-sm font-semibold" style={{ color: COLOR.ink }}>{title}</span>
                </div>
                <p className="mt-1.5 text-sm leading-relaxed" style={{ color: COLOR.ink2 }}>{body}</p>
                <p className="mt-auto border-t pt-2 text-xs leading-relaxed" style={{ borderColor: COLOR.grid, color: COLOR.muted }}>{rests}</p>
              </li>
            ))}
          </ol>
        </Panel>

        <Panel title="The three rules this is built on">
          <div className="grid gap-4 text-sm sm:grid-cols-3">
            <Rule icon={PsychologyIcon} title="AI understands">
              Gemini reads messy, multilingual, half-spelled human language and turns it into structured data. That is
              genuinely hard, and it is what AI is good at.
            </Rule>
            <Rule icon={CalculateIcon} title="Code calculates">
              Every number a policymaker sees comes from a formula in version control. Same inputs, same answer, every
              time — auditable and arguable.
            </Rule>
            <Rule icon={FactCheckIcon} title="People decide">
              Low-confidence output waits for an analyst. Recommendations are proposals. No model has ever moved a rupee.
            </Rule>
          </div>
        </Panel>
      </div>
    </div>
  )
}

function LiveExtraction() {
  const { data } = useApi(() => api.showcase(), [])
  const [i, setI] = useState(0)

  useEffect(() => {
    if (!data || data.length < 2) return
    const id = setInterval(() => setI((n) => (n + 1) % data.length), 6000)
    return () => clearInterval(id)
  }, [data])

  if (!data?.length) {
    return <div className="rounded-2xl bg-white p-6 shadow-sm ring-1" style={{ '--tw-ring-color': COLOR.grid }}>
      <Spinner label="Loading a live example…" />
    </div>
  }

  const x = data[Math.min(i, data.length - 1)]
  const chips = [
    ['Category', x.sub_category ? `${x.category} · ${x.sub_category}` : x.category],
    ['District', x.district],
    ['Urgency', `${x.urgency}/10`],
    ['Confidence', x.confidence?.toFixed(2)],
  ]

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-lg ring-1" style={{ '--tw-ring-color': COLOR.grid }}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2.5" style={{ borderColor: COLOR.grid }}>
        <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: COLOR.ink }}>
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: COLOR.good }} />
          Live from the database
        </span>
        <div className="flex gap-1">
          {data.map((d, n) => (
            <button key={d.language} type="button" onClick={() => setI(n)}
              className="rounded-md px-2 py-0.5 text-xs font-medium transition"
              style={n === i ? { background: COLOR.seq[4], color: '#ffffff' } : { color: COLOR.muted }}>
              {LANG_NAME[d.language] || d.language}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3 p-4">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide" style={{ color: COLOR.muted }}>
            A citizen wrote — {x.channel.toLowerCase()}
          </div>
          <p className="mt-1 text-[15px] leading-relaxed" style={{ color: COLOR.ink }}>{x.original_text}</p>
        </div>

        <div className="flex items-center gap-2">
          <SouthIcon sx={{ fontSize: 15, color: COLOR.seq[3] }} />
          <span className="text-xs font-semibold" style={{ color: COLOR.seq[4] }}>Gemini 3.8 Flash</span>
          <span className="h-px flex-1" style={{ background: COLOR.grid }} />
        </div>

        <p className="text-sm italic leading-relaxed" style={{ color: COLOR.ink2 }}>{x.translated_text}</p>

        <dl className="grid grid-cols-2 gap-2">
          {chips.map(([k, v]) => (
            <div key={k} className="rounded-lg px-3 py-2" style={{ background: COLOR.page }}>
              <dt className="text-[11px] font-medium uppercase tracking-wide" style={{ color: COLOR.muted }}>{k}</dt>
              <dd className="tnum text-sm font-semibold" style={{ color: COLOR.ink }}>{v ?? '—'}</dd>
            </div>
          ))}
        </dl>

        <p className="text-xs" style={{ color: COLOR.muted }}>
          The citizen's words are stored unchanged. Everything below the line is Gemini's structured output, and every
          number it feeds is computed by formula, never by the model.
        </p>
      </div>
    </div>
  )
}

function Figure({ value, label, sub }) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm" style={{ borderColor: COLOR.grid }}>
      <div className="tnum text-2xl font-bold" style={{ color: COLOR.seq[4] }}>{value}</div>
      <div className="text-sm font-medium" style={{ color: COLOR.ink }}>{label}</div>
      <div className="mt-0.5 text-xs" style={{ color: COLOR.muted }}>{sub}</div>
    </div>
  )
}

function Door({ to, icon: Icon, title, body, cta, primary }) {
  return (
    <Link to={to} className="group flex flex-col rounded-xl border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
      style={{ borderColor: primary ? COLOR.seq[3] : COLOR.grid }}>
      <Icon sx={{ fontSize: 22, color: primary ? COLOR.seq[3] : COLOR.muted }} />
      <h3 className="mt-2 text-sm font-semibold" style={{ color: COLOR.ink }}>{title}</h3>
      <p className="mt-1 flex-1 text-sm leading-relaxed" style={{ color: COLOR.ink2 }}>{body}</p>
      <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium" style={{ color: COLOR.seq[4] }}>
        {cta}<ArrowForwardIcon sx={{ fontSize: 16 }} className="transition group-hover:translate-x-0.5" />
      </span>
    </Link>
  )
}

function Rule({ icon: Icon, title, children }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 font-semibold" style={{ color: COLOR.ink }}>
        <Icon sx={{ fontSize: 17, color: COLOR.muted }} />{title}
      </div>
      <p className="mt-1 leading-relaxed" style={{ color: COLOR.ink2 }}>{children}</p>
    </div>
  )
}
