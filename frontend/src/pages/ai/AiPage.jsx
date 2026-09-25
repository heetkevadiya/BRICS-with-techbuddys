/** How the AI performs, in measured numbers.
 *  Accuracy comes from a labelled evaluation set committed to the repository; the operational
 *  figures are counted live from the database. Nothing on this page is asserted without a source. */
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import PsychologyIcon from '@mui/icons-material/Psychology'
import SpeedIcon from '@mui/icons-material/Speed'
import RuleIcon from '@mui/icons-material/Rule'
import TranslateIcon from '@mui/icons-material/Translate'
import PaidIcon from '@mui/icons-material/Paid'
import HubIcon from '@mui/icons-material/Hub'
import ScienceIcon from '@mui/icons-material/Science'
import BlockIcon from '@mui/icons-material/Block'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import { api } from '../../services/api'
import { useApi } from '../../hooks/useApi'
import { Panel, Stat, StatusChip, Chip, Spinner, ErrorBox, Explain } from '../../components/ui'
import ChartTooltip from '../../components/Tooltip'
import { num } from '../../format'
import { COLOR } from '../../theme'

const LANG_NAME = { gu: 'Gujarati', hi: 'Hindi', 'hi-Latn': 'Hinglish', en: 'English', mr: 'Marathi' }
const BAND_COLOR = { high: COLOR.good, good: COLOR.seq[2], fair: COLOR.warning, review: COLOR.critical }

export default function AiPage() {
  const { data, error, loading } = useApi(() => api.aiPerformance(), [])
  if (loading) return <Spinner label="Measuring…" />
  if (error) return <div className="p-6"><ErrorBox error={error} /></div>

  const { evaluation: ev, operational: op, services, pipeline } = data
  const run = ev?.runs?.find((r) => r.thinking_budget === 'off') || ev?.runs?.[0]
  const compare = ev?.runs?.length > 1 ? ev.runs : null
  const accepted = op.confidence_bands.filter((b) => b.band !== 'review').reduce((a, b) => a + b.count, 0)

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 px-4 py-6">
      <header>
        <h1 className="flex items-center gap-2 text-xl font-bold" style={{ color: COLOR.ink }}>
          <PsychologyIcon sx={{ fontSize: 22, color: COLOR.muted }} />
          What the AI does, and how well it does it
        </h1>
        <div className="mt-1.5 max-w-3xl">
          <Explain>
            Accuracy below is measured against {ev?.cases} labelled citizen messages committed to the repository,
            covering four languages and all 17 categories. The operational figures are counted live from the
            database. A government platform should be able to show its working — so this page exists.
          </Explain>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Stat icon={RuleIcon} label="Category accuracy" value={run ? `${Math.round(run.category_accuracy * 100)}%` : '—'}
          sub={`${ev?.cases} labelled cases, 17 categories`} />
        <Stat icon={SpeedIcon} label="Urgency error" value={run ? `±${run.urgency_mae}` : '—'} sub="mean absolute, on a 1–10 scale" />
        <Stat icon={TranslateIcon} label="Language detection" value={run ? `${Math.round(run.language_accuracy * 100)}%` : '—'}
          sub={Object.keys(run?.per_language || {}).map((l) => LANG_NAME[l] || l).join(', ')} />
        <Stat icon={PaidIcon} label="Cost per request" value={run ? `$${run.usd_per_request.toFixed(5)}` : '—'}
          sub={`about Rs ${((run?.usd_per_request || 0) * 88).toFixed(3)} each`} />
        <Stat icon={HubIcon} label="Issues clustered" value={num(op.clusters)}
          sub={`from ${num(op.total_requests)} messages`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel icon={ScienceIcon} title="Accuracy by language"
          explain="Measured per language, not averaged. A good overall score can hide one badly served language, which in a multilingual country is the failure that matters.">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase" style={{ color: COLOR.muted }}>
              <tr><th className="py-1.5 font-medium">Language</th><th className="font-medium">Cases</th>
                <th className="font-medium">Category</th><th className="font-medium">Urgency error</th>
                <th className="font-medium">Live volume</th></tr>
            </thead>
            <tbody>
              {Object.entries(run?.per_language || {}).map(([lang, m]) => {
                const live = op.by_language.find((l) => l.language === lang)
                return (
                  <tr key={lang} className="border-t" style={{ borderColor: COLOR.grid }}>
                    <td className="py-2 font-medium" style={{ color: COLOR.ink }}>{LANG_NAME[lang] || lang}</td>
                    <td className="tnum" style={{ color: COLOR.ink2 }}>{m.n}</td>
                    <td><StatusChip tone={m.category_accuracy === 1 ? 'good' : m.category_accuracy >= 0.8 ? 'warning' : 'critical'}>
                      {Math.round(m.category_accuracy * 100)}%</StatusChip></td>
                    <td className="tnum" style={{ color: COLOR.ink2 }}>{'±'}{m.urgency_mae}</td>
                    <td className="tnum" style={{ color: COLOR.ink2 }}>{num(live?.requests || 0)} msgs</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Panel>

        <Panel icon={SpeedIcon} title="Confidence, and what happens next"
          explain="The model reports its own confidence on every message. Below 0.60 the request is not used until a human has checked it — that band is the analyst's workload, not a hidden error rate.">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={op.confidence_bands} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
              <CartesianGrid stroke={COLOR.grid} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="band" tick={{ fontSize: 11, fill: COLOR.muted }} stroke={COLOR.axis} />
              <YAxis tick={{ fontSize: 11, fill: COLOR.muted }} stroke={COLOR.axis} width={52} />
              <Tooltip cursor={{ fill: `${COLOR.grid}66` }} content={({ payload }) => {
                const p = payload?.[0]?.payload
                return p ? <ChartTooltip title={p.label} rows={[['Requests', num(p.count)]]} /> : null
              }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                {op.confidence_bands.map((b) => <Cell key={b.band} fill={BAND_COLOR[b.band]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs" style={{ color: COLOR.ink2 }}>
            <div>Accepted automatically <b className="tnum" style={{ color: COLOR.ink }}>{num(accepted)}</b></div>
            <div>Held for a human <b className="tnum" style={{ color: COLOR.ink }}>{num(op.review_required)}</b></div>
            <div>Average confidence <b className="tnum" style={{ color: COLOR.ink }}>{op.avg_confidence}</b></div>
            <div>Repeat reports linked <b className="tnum" style={{ color: COLOR.ink }}>{num(op.duplicates_linked)}</b></div>
          </div>
        </Panel>
      </div>

      <Panel icon={HubIcon} title="What each Google service does, and what it is not allowed to do"
        explain="The separation is the design: AI turns messy human language into structured data, deterministic code computes every number a policymaker sees, and a person makes the decision."
        actions={<div className="flex flex-wrap gap-1.5">
          {Object.entries(services).map(([k, on]) => (
            <StatusChip key={k} tone={on ? 'good' : 'neutral'}>{k.replace(/_/g, ' ')}</StatusChip>
          ))}
        </div>}>
        <div className="space-y-2">
          {pipeline.map((p) => (
            <div key={p.step} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[190px_1fr]" style={{ borderColor: COLOR.grid }}>
              <div>
                <div className="text-sm font-medium" style={{ color: COLOR.ink }}>{p.step}</div>
                <Chip>{p.service}</Chip>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex items-start gap-1.5" style={{ color: COLOR.ink2 }}>
                  <CheckCircleIcon sx={{ fontSize: 15, color: COLOR.good, mt: '2px', flexShrink: 0 }} />{p.does}
                </div>
                <div className="flex items-start gap-1.5" style={{ color: COLOR.muted }}>
                  <BlockIcon sx={{ fontSize: 15, color: COLOR.critical, mt: '2px', flexShrink: 0 }} />{p.never}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {compare && (
        <Panel icon={PaidIcon} title="A cost decision, measured rather than assumed"
          explain="Gemini 2.5 can spend reasoning tokens before answering. For structured extraction it changed no categorical outcome and was marginally worse on urgency, so it is switched off — a large saving at no accuracy cost.">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase" style={{ color: COLOR.muted }}>
              <tr><th className="py-1.5 font-medium">Thinking budget</th><th className="font-medium">Category</th>
                <th className="font-medium">District</th><th className="font-medium">Urgency error</th>
                <th className="font-medium">Output tokens</th><th className="font-medium">Cost / request</th></tr>
            </thead>
            <tbody>
              {compare.map((r) => (
                <tr key={r.thinking_budget} className="border-t" style={{ borderColor: COLOR.grid }}>
                  <td className="py-2" style={{ color: COLOR.ink }}>
                    {r.thinking_budget === 'off' ? <StatusChip tone="good">off — in use</StatusChip> : <Chip>{r.thinking_budget}</Chip>}
                  </td>
                  <td className="tnum" style={{ color: COLOR.ink2 }}>{Math.round(r.category_accuracy * 100)}%</td>
                  <td className="tnum" style={{ color: COLOR.ink2 }}>{Math.round(r.district_accuracy * 100)}%</td>
                  <td className="tnum" style={{ color: COLOR.ink2 }}>{'±'}{r.urgency_mae}</td>
                  <td className="tnum" style={{ color: COLOR.ink2 }}>{r.output_tokens_per_request}</td>
                  <td className="tnum font-medium" style={{ color: COLOR.ink }}>${r.usd_per_request.toFixed(6)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs" style={{ color: COLOR.muted }}>
            Model {ev.model} · evaluated {new Date(ev.run_at).toLocaleDateString('en-IN', { dateStyle: 'medium' })} ·
            reproduce with <code>python -m scripts.eval_thinking_budget</code>
          </p>
        </Panel>
      )}
    </div>
  )
}
