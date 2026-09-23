/** App shell. Three audiences, three screens; the tab also sets the demo role sent to the API.
 *  In production a Firebase ID token carries the role instead and this switcher disappears. */
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import CampaignIcon from '@mui/icons-material/Campaign'
import FactCheckIcon from '@mui/icons-material/FactCheck'
import InsightsIcon from '@mui/icons-material/Insights'
import { getRole } from './services/api'
import CitizenPage from './pages/citizen/CitizenPage'
import AnalystPage from './pages/analyst/AnalystPage'
import PolicymakerPage from './pages/policymaker/PolicymakerPage'
import { COLOR } from './theme'

const TABS = [
  { to: '/citizen', label: 'Citizen', icon: CampaignIcon, blurb: 'report a problem' },
  { to: '/analyst', label: 'Analyst', icon: FactCheckIcon, blurb: 'check the AI' },
  { to: '/policymaker', label: 'Policymaker', icon: InsightsIcon, blurb: 'decide what to fund' },
]

function Nav() {
  const { pathname } = useLocation()
  return (
    <nav className="sticky top-0 z-20 border-b bg-white/95 backdrop-blur" style={{ borderColor: COLOR.grid }}>
      <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2.5">
        <span className="text-sm font-semibold" style={{ color: COLOR.ink }}>
          Citizen Demand <span style={{ color: COLOR.muted }}>→</span> Development Priorities
        </span>
        <div className="flex gap-1">
          {TABS.map(({ to, label, icon: Icon, blurb }) => {
            const active = pathname.startsWith(to)
            return (
              <Link key={to} to={to} title={blurb}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition"
                style={active ? { background: COLOR.seq[3], color: '#fff' } : { color: COLOR.ink2 }}>
                <Icon sx={{ fontSize: 17 }} />{label}
              </Link>
            )
          })}
        </div>
        <span className="ml-auto text-xs" style={{ color: COLOR.muted }}>
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
          <Route path="/" element={<Navigate to="/citizen" replace />} />
          <Route path="/citizen" element={<CitizenPage />} />
          <Route path="/analyst" element={<AnalystPage />} />
          <Route path="/policymaker" element={<PolicymakerPage />} />
          <Route path="*" element={<Navigate to="/citizen" replace />} />
        </Routes>
        <footer className="mx-auto max-w-[1500px] px-4 py-6 text-center text-xs" style={{ color: COLOR.muted }}>
          AI understands the messages · deterministic code calculates every score · people make the decisions
        </footer>
      </div>
    </BrowserRouter>
  )
}
