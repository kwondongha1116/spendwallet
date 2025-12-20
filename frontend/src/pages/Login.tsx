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
      alert(e?.response?.data?.detail || e?.message || 'ë¡œê·¸?¸ì— ?¤íŒ¨?ˆìŠµ?ˆë‹¤. ?¤ì‹œ ?œë„?´ì£¼?¸ìš”.')
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
            ?¤ëŠ˜???Œë¹„ê°€ ?´ì¼???¨í„´??ë§Œë“­?ˆë‹¤.
          </h2>
          <p className="text-sm md:text-base text-blue-100">
            ?‘ì? ê¸°ë¡ë¶€???œì‘?´ë³´?¸ìš”.
          </p>
        </div>

        {/* Right login form section */}
        <div className="flex-1 flex items-center">
          <div className="bg-white rounded-md shadow p-6 md:p-8 w-full max-w-md ml-auto">
            <h1 className="text-xl font-semibold mb-4">ë¡œê·¸??/h1>
            <label className="text-xs text-gray-600">?´ë©”??/label>
            <input
              className="border rounded w-full px-2 py-2 mb-3"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <label className="text-xs text-gray-600">ë¹„ë?ë²ˆí˜¸</label>
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
              {loading ? 'ë¡œê·¸??ì¤?..' : 'ë¡œê·¸??}
            </button>
            <GoogleLoginButton />
            <div className="text-sm mt-4 text-center md:text-left">
              ê³„ì •???†ìœ¼? ê???{' '}
              <Link className="text-blue-600 font-medium" to="/register">
                ?Œì›ê°€??              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

