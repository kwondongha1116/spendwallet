import { api } from './client'

export type UserProfile = {
  id: string
  email: string
  display_name: string
  birthdate?: string
  phone?: string
}

export async function getUserProfile(id: string): Promise<UserProfile> {
  const { data } = await api.get(`/api/users/${id}`)
  return data as UserProfile
}

export async function updateUserProfile(id: string, payload: { display_name: string; birthdate: string; phone: string; email: string }) {
  const { data } = await api.put(`/api/users/${id}`, payload)
  return data as UserProfile
}

