import { useState } from 'react'
import { useAuthState } from '../hooks/useAuth'
import { Link, useNavigate } from 'react-router-dom'
import GoogleLoginButton from '../components/GoogleLoginButton'

export default function Login() {
  const nav = useNavigate()
  const { login } = useAuthState()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const onSubmit = async () => {
    try {
      setLoading(true)
      await login(email, password)
      nav('/dashboard')
    } catch (e: any) {
      alert(e?.response?.data?.detail || e?.message || '로그인 중 오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-5xl px-4 md:px-0 flex flex-col md:flex-row items-stretch gap-8">
        {/* Left message section */}
        <div className="flex-1 bg-blue-600 text-white rounded-xl p-8 md:p-10 flex flex-col justify-center shadow-md">
          <p className="text-xs font-semibold tracking-[0.2em] text-blue-100 mb-3">
            SPENDWALLET
          </p>
          <h2 className="text-2xl md:text-3xl font-bold leading-snug mb-4">
            오늘의 소비가 내일의 패턴을 만듭니다.
          </h2>
          <p className="text-sm md:text-base text-blue-100">
            작은 기록부터 시작해보세요.
          </p>
        </div>

        {/* Right login form section */}
        <div className="flex-1 flex items-center">
          <div className="bg-white rounded-md shadow p-6 md:p-8 w-full max-w-md ml-auto">
            <h1 className="text-xl font-semibold mb-4">로그인</h1>
            <label className="text-xs text-gray-600">이메일</label>
            <input
              className="border rounded w-full px-2 py-2 mb-3"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <label className="text-xs text-gray-600">비밀번호</label>
            <input
              className="border rounded w-full px-2 py-2 mb-4"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              onClick={onSubmit}
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 rounded mb-3 disabled:opacity-70"
            >
              {loading ? '로그인 중..' : '로그인'}
            </button>
            <GoogleLoginButton />
            <div className="text-sm mt-4 text-center md:text-left">
              계정이 없으신가요?{' '}
              <Link className="text-blue-600 font-medium" to="/register">
                회원가입
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
