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
      <svg
        className="w-4 h-4"
        viewBox="0 0 48 48"
        aria-hidden="true"
      >
        <path
          fill="#EA4335"
          d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.22 13.02 17.62 9.5 24 9.5z"
        />
        <path
          fill="#4285F4"
          d="M46.98 24.55c0-1.57-.14-3.08-.39-4.55H24v9.02h12.94c-.56 2.9-2.25 5.36-4.79 7.01l7.73 6c4.53-4.18 7.1-10.34 7.1-17.48z"
        />
        <path
          fill="#FBBC05"
          d="M10.54 28.41A14.5 14.5 0 0 1 9.5 24c0-1.54.27-3.02.76-4.41l-7.98-6.19A23.86 23.86 0 0 0 0 24c0 3.82.88 7.42 2.44 10.64l8.1-6.23z"
        />
        <path
          fill="#34A853"
          d="M24 48c6.48 0 11.93-2.13 15.9-5.79l-7.73-6c-2.16 1.46-4.94 2.29-8.17 2.29-6.38 0-11.78-3.52-13.86-8.69l-8.1 6.23C6.51 42.62 14.62 48 24 48z"
        />
        <path fill="none" d="M0 0h48v48H0z" />
      </svg>
      <span>Google 계정으로 로그인</span>
    </button>
  )
}

