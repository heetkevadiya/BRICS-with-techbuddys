import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { getRole, setRole } from './services/api'
import CitizenPage from './pages/citizen/CitizenPage'
import AnalystPage from './pages/analyst/AnalystPage'
import PolicymakerPage from './pages/policymaker/PolicymakerPage'

const TABS = [
  { to: '/citizen', label: 'Citizen', role: 'citizen' },
  { to: '/analyst', label: 'Analyst', role: 'analyst' },
  { to: '/policymaker', label: 'Policymaker', role: 'policymaker' },
]

function Nav() {
  const { pathname } = useLocation()
  return (
    <nav className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-[1500px] items-center gap-6 px-4 py-2.5">
        <span className="text-sm font-semibold text-slate-900">Citizen Demand → Development Priorities</span>
        <div className="flex gap-1">
          {TABS.map((t) => (
            <Link key={t.to} to={t.to} onClick={() => setRole(t.role)}
              className={`rounded-lg px-3 py-1.5 text-sm ${pathname.startsWith(t.to) ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
              {t.label}
            </Link>
          ))}
        </div>
        <span className="ml-auto text-xs text-slate-400">role: {getRole()}</span>
      </div>
    </nav>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <Nav />
        <Routes>
          <Route path="/" element={<Navigate to="/citizen" replace />} />
          <Route path="/citizen" element={<CitizenPage />} />
          <Route path="/analyst" element={<AnalystPage />} />
          <Route path="/policymaker" element={<PolicymakerPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}
