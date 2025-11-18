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
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 py-4">
        {/* 상단 네비게이션 */}
        <header className="flex items-center justify-between mb-4">
          <button
            className="text-xl font-semibold text-blue-600"
            onClick={() => nav('/dashboard')}
          >
            spendWallet
          </button>

          <nav className="flex gap-6 text-sm">
            <Link
              to="/dashboard"
              className={loc.pathname.includes('dashboard') || loc.pathname === '/' ? 'font-semibold text-blue-600' : 'text-gray-500'}
            >
              Dashboard
            </Link>
            <Link
              to="/weekly"
              className={loc.pathname.includes('weekly') ? 'font-semibold text-blue-600' : 'text-gray-500'}
            >
              Weekly
            </Link>
            <Link
              to="/monthly"
              className={loc.pathname.includes('monthly') ? 'font-semibold text-blue-600' : 'text-gray-500'}
            >
              Monthly
            </Link>
            {user ? (
              <button
                className="text-gray-500"
                onClick={async () => {
                  await logout()
                  nav('/login')
                }}
              >
                Logout
              </button>
            ) : (
              <Link to="/login">Login</Link>
            )}
          </nav>
        </header>

        <main>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
