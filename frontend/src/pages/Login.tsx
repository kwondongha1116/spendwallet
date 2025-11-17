import { useState } from 'react'
import { useAuthState } from '../hooks/useAuth'
import { Link, useNavigate } from 'react-router-dom'

export default function Login() {
  const nav = useNavigate()
  const { login } = useAuthState()
  const [email, setEmail] = useState('test@example.com')
  const [password, setPassword] = useState('test1234')
  const [loading, setLoading] = useState(false)

  const onSubmit = async () => {
    try {
      setLoading(true)
      await login(email, password)
      nav('/dashboard')
    } catch (e: any) {
      alert(e?.response?.data?.detail || e?.message || '로그인 실패')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-md shadow p-6 w-full max-w-sm">
        <h1 className="text-xl font-semibold mb-4">로그인</h1>
        <label className="text-xs text-gray-600">이메일</label>
        <input className="border rounded w-full px-2 py-2 mb-3" value={email} onChange={e=>setEmail(e.target.value)} />
        <label className="text-xs text-gray-600">비밀번호</label>
        <input className="border rounded w-full px-2 py-2 mb-4" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
        <button onClick={onSubmit} disabled={loading} className="w-full bg-blue-600 text-white py-2 rounded">{loading? '로그인 중…':'로그인'}</button>
        <div className="text-sm mt-3">계정이 없으신가요? <Link className="text-blue-600" to="/register">회원가입</Link></div>
      </div>
    </div>
  )
}

