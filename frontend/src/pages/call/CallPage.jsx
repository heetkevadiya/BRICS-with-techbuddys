/** Voice-call intake, end to end: the call, what Gemini understood, what the formula
 *  computed, the human check, and the follow-up loop back to the citizen. */
import { useEffect, useMemo, useRef, useState } from 'react'
import PhoneInTalkIcon from '@mui/icons-material/PhoneInTalk'
import CallIcon from '@mui/icons-material/Call'
import CallEndIcon from '@mui/icons-material/CallEnd'
import VolumeUpIcon from '@mui/icons-material/VolumeUp'
import VolumeOffIcon from '@mui/icons-material/VolumeOff'
import PsychologyIcon from '@mui/icons-material/Psychology'
import CalculateIcon from '@mui/icons-material/Calculate'
import FactCheckIcon from '@mui/icons-material/FactCheck'
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive'
import TimelineIcon from '@mui/icons-material/Timeline'
import GroupWorkIcon from '@mui/icons-material/GroupWork'
import TranslateIcon from '@mui/icons-material/Translate'
import ReplayIcon from '@mui/icons-material/Replay'
import { Panel, StatusChip, Chip, Explain } from '../../components/ui'
import { COLOR } from '../../theme'
import {
  CALL, TURNS, SLOTS, TRANSLATION, CLUSTER, REVIEW_CHECKS, TIMELINE, REMINDERS,
  COMPONENT_META, computePriority,
} from './script'

const RING_MS = 1500

export default function CallPage() {
  const [phase, setPhase] = useState('idle')
  const [turn, setTurn] = useState(-1)
  const [seconds, setSeconds] = useState(0)
  const [sound, setSound] = useState(true)

  useEffect(() => {
    if (phase !== 'ringing') return
    const t = setTimeout(() => { setTurn(0); setPhase('live') }, RING_MS)
    return () => clearTimeout(t)
  }, [phase])

  useEffect(() => {
    if (phase !== 'live') return
    if (turn >= TURNS.length - 1) {
      const t = setTimeout(() => setPhase('ended'), 1400)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => setTurn((i) => i + 1), TURNS[turn].ms)
    return () => clearTimeout(t)
  }, [phase, turn])

  useEffect(() => {
    if (phase !== 'live') return
    const id = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [phase])

  useEffect(() => {
    const synth = window.speechSynthesis
    if (!sound || !synth || phase !== 'live' || turn < 0) return
    const line = TURNS[turn]
    const utter = new SpeechSynthesisUtterance(line.text)
    utter.lang = 'gu-IN'
    utter.rate = 0.95
    utter.pitch = line.who === 'agent' ? 0.9 : 1.15
    synth.speak(utter)
    return () => synth.cancel()
  }, [turn, phase, sound])

  useEffect(() => () => window.speechSynthesis?.cancel(), [])

  function start() {
    setTurn(-1)
    setSeconds(0)
    setPhase('ringing')
  }

  function hangUp() {
    window.speechSynthesis?.cancel()
    setPhase(turn >= TURNS.length - 1 ? 'ended' : 'idle')
  }

  const visible = turn < 0 ? [] : TURNS.slice(0, turn + 1)
  const extracted = useMemo(
    () => Object.assign({}, ...visible.map((t) => t.extract || {})),
    [turn], // eslint-disable-line react-hooks/exhaustive-deps
  )
  const ended = phase === 'ended'

  return (
    <div className="mx-auto max-w-[1500px] space-y-5 px-4 py-8">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold sm:text-3xl" style={{ color: COLOR.ink }}>
            A phone call becomes a funded priority
          </h1>
          <span className="rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide"
            style={{ background: `${COLOR.warning}1f`, color: '#8a6100' }}>Planned · not built</span>
        </div>
        <div className="max-w-3xl">
          <Explain>
            Most citizens with the worst infrastructure do not fill in web forms — they call. None of this screen is
            built yet; it is a design preview of the planned voice agent, with an example conversation standing in for
            a real one. The scoring is the exception — the weights and arithmetic further down are the production ones
            from <code>priority_service.py</code>, calculated on this page rather than written in.
          </Explain>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <CallScreen
            phase={phase} seconds={seconds} sound={sound}
            onStart={start} onHangUp={hangUp} onToggleSound={() => setSound((s) => !s)}
            speaking={phase === 'live' && turn >= 0 ? TURNS[turn].who : null}
          />
          <Transcript turns={visible} phase={phase} />
        </div>
        <Extraction values={extracted} ended={ended} />
      </div>

      {ended && (
        <div className="space-y-5">
          <Analysis />
          <Review />
          <FollowUp />
          <div className="flex justify-center pb-4">
            <button type="button" onClick={start}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
              style={{ background: COLOR.seq[4] }}>
              <ReplayIcon sx={{ fontSize: 18 }} />Play the example again
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

function CallScreen({ phase, seconds, sound, speaking, onStart, onHangUp, onToggleSound }) {
  const idle = phase === 'idle'
  const ringing = phase === 'ringing'
  const live = phase === 'live'
  const label = idle ? 'Ready to dial' : ringing ? 'Ringing…' : live ? 'Connected' : 'Call ended'

  return (
    <section className="overflow-hidden rounded-xl border shadow-sm" style={{ borderColor: COLOR.grid, background: COLOR.ink }}>
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5"
        style={{ borderBottom: `1px solid ${COLOR.ink2}` }}>
        <span className="flex items-center gap-2 text-xs font-semibold text-white">
          <PhoneInTalkIcon sx={{ fontSize: 16 }} />
          Gujarat citizen helpline · {CALL.helpline}
        </span>
        <span className="tnum text-xs" style={{ color: COLOR.axis }}>{CALL.caller}</span>
      </div>

      <div className="flex flex-col items-center gap-4 px-4 py-8">
        <div className="relative flex h-20 w-20 items-center justify-center">
          <span className={`absolute inset-0 rounded-full ${ringing || live ? 'ring-pulse' : ''}`}
            style={{ color: COLOR.seq[2] }} />
          <span className="relative flex h-20 w-20 items-center justify-center rounded-full text-white"
            style={{ background: COLOR.seq[4] }}>
            <PhoneInTalkIcon sx={{ fontSize: 32 }} />
          </span>
        </div>

        <div className="text-center">
          <div className="text-sm font-semibold text-white">{label}</div>
          <div className="tnum mt-0.5 text-2xl font-semibold" style={{ color: COLOR.axis }}>{mmss(seconds)}</div>
          <div className="mt-1 text-xs" style={{ color: COLOR.muted }}>
            {CALL.language.native} · {CALL.language.name}
          </div>
        </div>

        <Waveform active={live} who={speaking} />

        <div className="flex items-center gap-3">
          {!live && !ringing ? (
            <button type="button" onClick={onStart}
              className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
              style={{ background: COLOR.good }}>
              <CallIcon sx={{ fontSize: 18 }} />{phase === 'ended' ? 'Call again' : 'Start the call'}
            </button>
          ) : (
            <button type="button" onClick={onHangUp}
              className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
              style={{ background: COLOR.critical }}>
              <CallEndIcon sx={{ fontSize: 18 }} />End call
            </button>
          )}
          <button type="button" onClick={onToggleSound} aria-pressed={sound}
            title={sound ? 'Mute the spoken audio' : 'Speak the conversation aloud'}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full transition hover:opacity-80"
            style={{ background: COLOR.ink2, color: '#fff' }}>
            {sound ? <VolumeUpIcon sx={{ fontSize: 18 }} /> : <VolumeOffIcon sx={{ fontSize: 18 }} />}
          </button>
        </div>
      </div>
    </section>
  )
}

function Waveform({ active, who }) {
  const bars = [0.35, 0.6, 0.9, 1, 0.75, 0.5, 0.85, 0.65, 0.4, 0.7, 0.95, 0.55]
  const tint = who === 'citizen' ? COLOR.seq[1] : COLOR.seq[2]
  return (
    <div className="flex h-10 items-center gap-1" aria-hidden="true">
      {bars.map((h, i) => (
        <span key={i}
          className={`w-1 rounded-full ${active ? 'wave-bar' : ''}`}
          style={{
            height: `${h * 100}%`,
            background: active ? tint : COLOR.ink2,
            animationDelay: `${i * 0.07}s`,
            opacity: active ? 1 : 0.4,
          }} />
      ))}
    </div>
  )
}

function Transcript({ turns, phase }) {
  const endRef = useRef(null)
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'nearest' }) }, [turns.length])

  return (
    <Panel icon={TranslateIcon} title="Example conversation"
      explain="An illustration of how the call would run. The citizen speaks Gujarati, and the rule the rest of the platform already follows would hold here too: nothing is translated away, the original words are kept verbatim, and the English line underneath is a faithful translation a reviewer can check the AI against."
      actions={phase === 'live' && <StatusChip tone="neutral">example</StatusChip>}>
      {turns.length === 0 ? (
        <p className="py-6 text-center text-sm" style={{ color: COLOR.muted }}>
          Play the example to see how the call would run.
        </p>
      ) : (
        <ul className="space-y-3">
          {turns.map((t, i) => {
            const agent = t.who === 'agent'
            return (
              <li key={i} className={`bubble-in flex ${agent ? 'justify-start' : 'justify-end'}`}>
                <div className="max-w-[85%] rounded-2xl px-3.5 py-2.5"
                  style={agent
                    ? { background: `${COLOR.seq[0]}99`, borderBottomLeftRadius: 6 }
                    : { background: COLOR.page, border: `1px solid ${COLOR.grid}`, borderBottomRightRadius: 6 }}>
                  <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide" style={{ color: COLOR.muted }}>
                    {agent ? 'AI agent' : 'Citizen'}
                  </div>
                  <div className="text-sm leading-relaxed" style={{ color: COLOR.ink }} lang="gu">{t.text}</div>
                  <div className="mt-1 text-xs leading-relaxed" style={{ color: COLOR.ink2 }} lang="en">{t.gloss}</div>
                </div>
              </li>
            )
          })}
          <li ref={endRef} />
        </ul>
      )}
    </Panel>
  )
}

function Extraction({ values, ended }) {
  const filled = SLOTS.filter((s) => values[s.key]).length
  return (
    <div className="lg:sticky lg:top-20 lg:self-start">
      <Panel icon={PsychologyIcon} title="What the agent would extract"
        explain="Gemini would fill these in as the citizen speaks. None of it is a number the formula uses — this is language understanding only."
        actions={<Chip>{filled} / {SLOTS.length}</Chip>}>
        <ul className="space-y-2">
          {SLOTS.map((s) => {
            const v = values[s.key]
            return (
              <li key={s.key} className={`flex items-baseline justify-between gap-3 border-b pb-2 text-sm last:border-0 ${v ? 'slot-in' : ''}`}
                style={{ borderColor: COLOR.grid }}>
                <span className="shrink-0 text-xs font-medium uppercase tracking-wide" style={{ color: COLOR.muted }}>
                  {s.label}
                </span>
                <span className="text-right font-medium" style={{ color: v ? COLOR.ink : COLOR.axis }}>
                  {v || '—'}
                </span>
              </li>
            )
          })}
        </ul>
        {ended && (
          <div className="mt-3 rounded-lg p-3" style={{ background: COLOR.page }}>
            <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: COLOR.muted }}>
              English translation
            </div>
            <p className="mt-1 text-sm leading-relaxed" style={{ color: COLOR.ink2 }}>{TRANSLATION}</p>
          </div>
        )}
      </Panel>
    </div>
  )
}

function Analysis() {
  const { terms, priority } = computePriority()
  return (
    <Panel icon={CalculateIcon} title="What the AI decided, and what the formula calculated"
      explain="The split that matters: Gemini only reads language. Every number below is computed by deterministic Python from Census data and report counts — no model output enters the formula. The five inputs here are an example; the weights and the arithmetic are the production ones."
      actions={<StatusChip tone="good">no LLM in the formula</StatusChip>}>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <div className="rounded-lg p-4" style={{ background: COLOR.page }}>
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide" style={{ color: COLOR.muted }}>
            <GroupWorkIcon sx={{ fontSize: 15 }} />Grouped, not counted twice
          </div>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: COLOR.ink2 }}>
            This call was embedded and matched to <b style={{ color: COLOR.ink }}>{CLUSTER.size} reports</b> about the
            same issue in {CLUSTER.district} over {CLUSTER.window}. One problem, not {CLUSTER.size} tickets.
          </p>
          <p className="mt-2 rounded-md px-2.5 py-2 text-xs italic" style={{ background: '#fff', color: COLOR.ink2 }}>
            “{CLUSTER.representative}”
          </p>
        </div>

        <div>
          <div className="space-y-2.5">
            {terms.map((t, i) => (
              <div key={t.key}>
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="font-medium" style={{ color: COLOR.ink }}>{COMPONENT_META[t.key].label}</span>
                  <span className="tnum text-xs" style={{ color: COLOR.muted }}>
                    {t.value} × {t.weight} = <b style={{ color: COLOR.ink }}>{t.product.toFixed(2)}</b>
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full" style={{ background: COLOR.grid }}>
                  <div className="grow-bar h-full rounded-full"
                    style={{ width: `${t.value}%`, background: COLOR.seq[3], animationDelay: `${i * 0.08}s` }} />
                </div>
                <p className="mt-1 text-xs leading-relaxed" style={{ color: COLOR.muted }}>{COMPONENT_META[t.key].source}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg px-4 py-3"
            style={{ background: COLOR.seq[0] }}>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: COLOR.seq[5] }}>
                Priority score
              </div>
              <div className="tnum text-xs" style={{ color: COLOR.ink2 }}>
                {terms.map((t) => t.product.toFixed(2)).join(' + ')}
              </div>
            </div>
            <div className="tnum text-3xl font-bold" style={{ color: COLOR.seq[5] }}>{priority}</div>
          </div>
        </div>
      </div>
    </Panel>
  )
}

function Review() {
  return (
    <Panel icon={FactCheckIcon} title="The machine hands over to a person"
      explain="These four thresholds are not planned — they run today in pipeline_service.py on every report, whatever channel it arrived on, and a call would be routed through the same checks. A human can override any field, and the original audio and Gujarati text stay attached to the record."
      actions={<StatusChip tone="good">checks already in the pipeline</StatusChip>}>
      <ul className="space-y-2">
        {REVIEW_CHECKS.map((c) => (
          <li key={c.check} className="flex flex-wrap items-center justify-between gap-2 border-b pb-2 text-sm last:border-0"
            style={{ borderColor: COLOR.grid }}>
            <span style={{ color: COLOR.ink }}>{c.check}</span>
            <span className="flex items-center gap-2">
              <span className="text-xs" style={{ color: COLOR.muted }}>{c.detail}</span>
              <StatusChip tone={c.verdict === 'pass' ? 'good' : 'neutral'}>
                {c.verdict === 'pass' ? 'pass' : 'note'}
              </StatusChip>
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  )
}

function FollowUp() {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Panel icon={TimelineIcon} title="What happens next"
        explain="A complaint that disappears into an office is the problem this replaces. Understanding, grouping, analyst review and the priority ranking run today; the call itself and the callback at the end are planned.">
        <ol className="space-y-0">
          {TIMELINE.map((s, i) => (
            <li key={s.title} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span className="mt-1 flex h-3 w-3 shrink-0 rounded-full ring-2 ring-white"
                  style={{ background: s.done ? COLOR.good : COLOR.axis }} />
                {i < TIMELINE.length - 1 && <span className="w-px flex-1" style={{ background: COLOR.grid }} />}
              </div>
              <div className="pb-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold" style={{ color: COLOR.ink }}>{s.title}</span>
                  <Chip>{s.at}</Chip>
                </div>
                <p className="mt-0.5 text-xs leading-relaxed" style={{ color: COLOR.ink2 }}>{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </Panel>

      <Panel icon={NotificationsActiveIcon} title="Reminders that close the loop"
        explain="Planned. The citizen would be told what happened in their own language, and officials nudged when a decision goes stale. The last message asks the citizen to confirm the fix — that answer is what impact would be measured against.">
        <ul className="space-y-2.5">
          {REMINDERS.map((r, i) => (
            <li key={i} className="rounded-lg border p-2.5" style={{ borderColor: COLOR.grid }}>
              <div className="flex flex-wrap items-center gap-2">
                <Chip>{r.when}</Chip>
                <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: COLOR.muted }}>
                  {r.channel} → {r.to}
                </span>
              </div>
              <div className="mt-1 text-sm" style={{ color: COLOR.ink }} lang={r.gloss ? 'gu' : 'en'}>{r.text}</div>
              {r.gloss && <div className="text-xs" style={{ color: COLOR.muted }} lang="en">{r.gloss}</div>}
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  )
}
