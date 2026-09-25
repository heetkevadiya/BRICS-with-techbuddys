/** App shell. Three audiences, three screens; the tab also sets the demo role sent to the API.
 *  In production a Firebase ID token carries the role instead and this switcher disappears. */
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import HomeIcon from '@mui/icons-material/Home'
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
  { to: '/home', label: 'Overview', icon: HomeIcon, blurb: 'what this is' },
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
        <span className="text-sm font-semibold" style={{ color: COLOR.ink }}>
          Citizen Demand <span style={{ color: COLOR.muted }}>→</span> Development Priorities
        </span>
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
        <span className="ml-auto hidden text-xs sm:inline" style={{ color: COLOR.muted }}>
          viewing as <b style={{ color: COLOR.ink2 }}>{getRole()}</b>
        </span>
      </div>
    </nav>
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
        <footer className="mx-auto max-w-[1500px] px-4 py-6 text-center text-xs" style={{ color: COLOR.muted }}>
          AI understands the messages · deterministic code calculates every score · people make the decisions
        </footer>
      </div>
    </BrowserRouter>
  )
}
