import { api } from './client'

export async function signup(p: { email: string; password: string; display_name: string }) {
  const { data } = await api.post('/api/auth/signup', p)
  return data as { access_token: string; user: { id: string; email: string; display_name: string } }
}

export async function login(p: { email: string; password: string }) {
  const { data } = await api.post('/api/auth/login', p)
  return data as { access_token: string; user: { id: string; email: string; display_name: string } }
}

export async function logout() {
  const { data } = await api.post('/api/auth/logout')
  return data as { ok: boolean }
}

