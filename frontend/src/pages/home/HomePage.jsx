/** The opening screen. A judge, a ministry official or a citizen lands here and should understand
 *  the whole thing in about thirty seconds: what problem, what loop, what is real. */
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

export default function HomePage() {
  const { data: s } = useApi(() => api.publicSummary(), [])

  return (
    <div className="mx-auto max-w-[1200px] space-y-8 px-4 py-10">
      <header className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: COLOR.seq[3] }}>
          AI for Digital Public Infrastructure &amp; Governance
        </p>
        <h1 className="mt-2 text-3xl font-bold leading-tight sm:text-4xl" style={{ color: COLOR.ink }}>
          Citizens know what their area needs.<br />This turns that into evidence a ministry can act on.
        </h1>
        <p className="mt-3 text-base leading-relaxed" style={{ color: COLOR.ink2 }}>
          Development requests arrive scattered across phone lines, messaging apps and paper forms, in dozens of
          languages, and rarely reach the people setting infrastructure budgets. This platform collects them,
          understands them with Google AI, joins them to national data, and ranks where the need is greatest —
          showing its working at every step.
        </p>
      </header>

      {s ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Figure value={num(s.national.districts)} label="districts loaded" sub={`${s.national.states} states & UTs`} />
          <Figure value={`${(s.national.population / 1e9).toFixed(2)}bn`} label="people covered" sub="Census of India 2011" />
          <Figure value={num(s.unique_citizens)} label="citizens reporting" sub={`${num(s.total_requests)} messages, repeats counted once`} />
          <Figure value={Object.keys(s.languages).length} label="languages served" sub={Object.keys(s.languages).map((l) => LANG_NAME[l] || l).join(', ')} />
        </div>
      ) : <Spinner label="Loading coverage…" />}

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

      <Panel title="The three rules this is built on">
        <div className="grid gap-4 sm:grid-cols-3 text-sm">
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
  )
}

function Figure({ value, label, sub }) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm" style={{ borderColor: COLOR.grid }}>
      <div className="tnum text-2xl font-bold" style={{ color: COLOR.seq[3] }}>{value}</div>
      <div className="text-sm font-medium" style={{ color: COLOR.ink }}>{label}</div>
      <div className="mt-0.5 text-xs" style={{ color: COLOR.muted }}>{sub}</div>
    </div>
  )
}

function Door({ to, icon: Icon, title, body, cta, primary }) {
  return (
    <Link to={to} className="group flex flex-col rounded-xl border bg-white p-4 shadow-sm transition hover:shadow-md"
      style={{ borderColor: primary ? COLOR.seq[3] : COLOR.grid }}>
      <Icon sx={{ fontSize: 22, color: primary ? COLOR.seq[3] : COLOR.muted }} />
      <h3 className="mt-2 text-sm font-semibold" style={{ color: COLOR.ink }}>{title}</h3>
      <p className="mt-1 flex-1 text-sm leading-relaxed" style={{ color: COLOR.ink2 }}>{body}</p>
      <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium" style={{ color: COLOR.seq[3] }}>
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
