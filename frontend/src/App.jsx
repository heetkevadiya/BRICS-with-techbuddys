/** App shell. Three audiences, three screens; the tab also sets the demo role sent to the API.
 *  In production a Firebase ID token carries the role instead and this switcher disappears. */
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import HomeIcon from '@mui/icons-material/Home'
import PersonIcon from '@mui/icons-material/Person'
import CampaignIcon from '@mui/icons-material/Campaign'
import PsychologyIcon from '@mui/icons-material/Psychology'
import FactCheckIcon from '@mui/icons-material/FactCheck'
import InsightsIcon from '@mui/icons-material/Insights'
import { getRole } from './services/api'
import HomePage from './pages/home/HomePage'
import CitizenPage from './pages/citizen/CitizenPage'
import AiPage from './pages/ai/AiPage'
import AnalystPage from './pages/analyst/AnalystPage'
import PolicymakerPage from './pages/policymaker/PolicymakerPage'
import { COLOR } from './theme'

const TABS = [
  { to: '/citizen', label: 'Citizen', icon: CampaignIcon, blurb: 'report a problem' },
  { to: '/analyst', label: 'Analyst', icon: FactCheckIcon, blurb: 'check the AI' },
  { to: '/policymaker', label: 'Policymaker', icon: InsightsIcon, blurb: 'decide what to fund' },
  { to: '/ai', label: 'AI accuracy', icon: PsychologyIcon, blurb: 'measured performance' },
]

function Nav() {
  const { pathname } = useLocation()
  return (
    <nav className="sticky top-0 z-20 border-b bg-white/95 backdrop-blur" style={{ borderColor: COLOR.grid }}>
      <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2.5">
        <Link to="/home" className="group flex items-center gap-2 text-sm font-semibold transition hover:opacity-70"
          style={{ color: COLOR.ink }}>
          <span className="flex h-6 w-6 items-center justify-center rounded-md" style={{ background: COLOR.seq[4] }}>
            <HomeIcon sx={{ fontSize: 15, color: '#ffffff' }} />
          </span>
          Citizen Demand <span style={{ color: COLOR.muted }}>→</span> Development Priorities
        </Link>
        {/* the tab row scrolls rather than overflowing the page on a phone */}
        <div className="-mx-4 flex max-w-full gap-1 overflow-x-auto px-4 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {TABS.map(({ to, label, icon: Icon, blurb }) => {
            const active = pathname.startsWith(to)
            return (
              <Link key={to} to={to} title={blurb}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition"
                style={active ? { background: COLOR.seq[3], color: '#fff' } : { color: COLOR.ink2 }}>
                <Icon sx={{ fontSize: 17 }} />{label}
              </Link>
            )
          })}
        </div>
        <AccountChip />
      </div>
    </nav>
  )
}

const ACCOUNT = {
  citizen: { name: 'Citizen', org: 'Public access' },
  analyst: { name: 'Data Analyst', org: 'Department of Planning' },
  policymaker: { name: 'Policy Officer', org: 'Government of Gujarat' },
}

function AccountChip() {
  const role = getRole()
  const who = ACCOUNT[role] || ACCOUNT.citizen
  return (
    <div className="ml-auto hidden items-center gap-2 sm:flex">
      <span className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold text-white"
        style={{ background: COLOR.seq[4] }}>
        <PersonIcon sx={{ fontSize: 16 }} />
      </span>
      <span className="leading-tight">
        <span className="block text-xs font-semibold" style={{ color: COLOR.ink }}>{who.name}</span>
        <span className="block text-[11px]" style={{ color: COLOR.muted }}>{who.org}</span>
      </span>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen" style={{ background: COLOR.page, color: COLOR.ink }}>
        <Nav />
        <Routes>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/ai" element={<AiPage />} />
          <Route path="/citizen" element={<CitizenPage />} />
          <Route path="/analyst" element={<AnalystPage />} />
          <Route path="/policymaker" element={<PolicymakerPage />} />
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
        <footer className="mt-4 border-t bg-white" style={{ borderColor: COLOR.grid }}>
          <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-3 px-4 py-6 text-xs"
            style={{ color: COLOR.muted }}>
            <span>AI understands the messages · deterministic code calculates every score · people make the decisions</span>
            <span className="flex flex-wrap items-center gap-4">
              <Link to="/home" className="hover:underline">Overview</Link>
              <Link to="/ai" className="hover:underline">AI accuracy</Link>
              <a href={`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/docs`} target="_blank" rel="noreferrer" className="hover:underline">API docs</a>
              <span>Build with AI: Code for Communities 2026</span>
            </span>
          </div>
        </footer>
      </div>
    </BrowserRouter>
  )
}
