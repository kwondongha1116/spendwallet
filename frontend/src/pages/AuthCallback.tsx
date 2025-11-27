import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'

export default function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')
    const user_id = params.get('user_id')
    const email = params.get('email')
    const display_name = params.get('display_name') || '사용자'

    if (token && user_id && email) {
      const user = { id: user_id, email, display_name }
      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(user))
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      navigate('/dashboard', { replace: true })
    } else {
      navigate('/login', { replace: true })
    }
  }, [navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-md shadow p-6 w-full max-w-sm text-center text-sm text-gray-700">
        Google 계정으로 로그인 처리중입니다...
      </div>
    </div>
  )
}

