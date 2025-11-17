import { Link, Outlet, useLocation, Navigate, useNavigate } from 'react-router-dom'
import { useAuthState } from './hooks/useAuth'

export default function App() {
  const { user, logout } = useAuthState()
  const loc = useLocation()
  const nav = useNavigate()
  if (!user && !loc.pathname.startsWith('/login') && !loc.pathname.startsWith('/register')) {
    return <Navigate to="/login" replace />
  }
  return (
    <div className="max-w-6xl mx-auto p-4">
      {/* 상단 네비게이션 - 심플 */}
      <header className="flex items-center justify-between py-2">
        <h1 className="text-xl font-semibold">spendWallet</h1>
        <nav className="flex gap-4 text-sm">
          <Link to="/dashboard" className={loc.pathname.includes('dashboard') || loc.pathname === '/' ? 'font-bold' : ''}>Dashboard</Link>
          <Link to="/weekly" className={loc.pathname.includes('weekly') ? 'font-bold' : ''}>Weekly</Link>
          <Link to="/monthly" className={loc.pathname.includes('monthly') ? 'font-bold' : ''}>Monthly</Link>
          {user ? (
            <button className="text-gray-600" onClick={async ()=>{ await logout(); nav('/login') }}>Logout</button>
          ) : (
            <Link to="/login">Login</Link>
          )}
        </nav>
      </header>
      <main className="mt-4">
        <Outlet />
      </main>
    </div>
  )
}
