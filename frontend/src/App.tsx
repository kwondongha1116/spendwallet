import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation, Navigate, useNavigate } from 'react-router-dom'
import { useAuthState } from './hooks/useAuth'

export default function App() {
  const { user, logout } = useAuthState()
  const loc = useLocation()
  const nav = useNavigate()
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('theme') === 'dark'
  })

  useEffect(() => {
    if (isDark) {
      document.body.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.body.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }, [isDark])

  if (!user && !loc.pathname.startsWith('/login') && !loc.pathname.startsWith('/register')) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto px-4 py-4">
        {/* 상단 내비게이션 */}
        <header className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button
              className="text-xl font-semibold text-blue-600"
              onClick={() => nav('/dashboard')}
            >
              spendWallet
            </button>
            <button
              type="button"
              className="theme-toggle"
              aria-label="다크 모드 전환"
              onClick={() => setIsDark((v) => !v)}
            >
              {isDark ? '🌞' : '🌙'}
            </button>
          </div>

          <nav className="flex gap-6 text-sm">
            <Link
              to="/dashboard"
              className={
                loc.pathname.includes('dashboard') || loc.pathname === '/'
                  ? 'font-semibold text-blue-600'
                  : 'text-gray-500'
              }
            >
              Dashboard
            </Link>
            <Link
              to="/weekly"
              className={
                loc.pathname.includes('weekly') ? 'font-semibold text-blue-600' : 'text-gray-500'
              }
            >
              Weekly
            </Link>
            <Link
              to="/monthly"
              className={
                loc.pathname.includes('monthly') ? 'font-semibold text-blue-600' : 'text-gray-500'
              }
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

