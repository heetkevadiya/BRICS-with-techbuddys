import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'

function Home() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 p-8">
      <h1 className="text-3xl font-bold">Citizen Demand & Policy Decision-Support</h1>
      <p className="mt-2 text-slate-600">
        Multilingual AI Digital Public Good — citizen voice → evidence-based development priorities.
      </p>
      <nav className="mt-6 flex gap-4">
        <Link className="underline" to="/citizen">Citizen</Link>
        <Link className="underline" to="/analyst">Analyst</Link>
        <Link className="underline" to="/policymaker">Policymaker</Link>
      </nav>
    </main>
  )
}

const Placeholder = ({ name }) => (
  <main className="min-h-screen p-8"><h2 className="text-2xl font-semibold">{name}</h2></main>
)

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/citizen" element={<Placeholder name="Citizen" />} />
        <Route path="/analyst" element={<Placeholder name="Analyst" />} />
        <Route path="/policymaker" element={<Placeholder name="Policymaker" />} />
      </Routes>
    </BrowserRouter>
  )
}
