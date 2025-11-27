export default function GoogleLoginButton() {
  const backendUrl =
    import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

  const handleGoogleLogin = () => {
    window.location.href = `${backendUrl}/api/auth/google/login`
  }

  return (
    <button
      type="button"
      onClick={handleGoogleLogin}
      className="mt-3 w-full border border-slate-200 text-slate-700 py-2 rounded flex items-center justify-center gap-2 hover:bg-slate-50 text-sm"
    >
      <span>Google 계정으로 로그인</span>
    </button>
  )
}

