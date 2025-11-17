import { useState } from 'react'
import { useAuthState } from '../hooks/useAuth'
import { Link, useNavigate } from 'react-router-dom'

export default function Register() {
  const nav = useNavigate()
  const { signup } = useAuthState()
  const [email, setEmail] = useState('test@example.com')
  const [password, setPassword] = useState('test1234')
  const [displayName, setDisplayName] = useState('테스트유저')
  const [loading, setLoading] = useState(false)

  const onSubmit = async () => {
    try {
      setLoading(true)
      await signup(email, password, displayName)
      nav('/dashboard')
    } catch (e: any) {
      alert(e?.response?.data?.detail || e?.message || '회원가입 실패')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-md shadow p-6 w-full max-w-sm">
        <h1 className="text-xl font-semibold mb-4">회원가입</h1>
        <label className="text-xs text-gray-600">이메일</label>
        <input className="border rounded w-full px-2 py-2 mb-3" value={email} onChange={e=>setEmail(e.target.value)} />
        <label className="text-xs text-gray-600">표시 이름</label>
        <input className="border rounded w-full px-2 py-2 mb-3" value={displayName} onChange={e=>setDisplayName(e.target.value)} />
        <label className="text-xs text-gray-600">비밀번호</label>
        <input className="border rounded w-full px-2 py-2 mb-4" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
        <button onClick={onSubmit} disabled={loading} className="w-full bg-blue-600 text-white py-2 rounded">{loading? '가입 중…':'가입'}</button>
        <div className="text-sm mt-3">이미 계정이 있으신가요? <Link className="text-blue-600" to="/login">로그인</Link></div>
      </div>
    </div>
  )
}

