import { api } from './client'

export type BulkItem = { memo: string; amount: number }

export async function postBulkSpendings(params: { user_id: string; items: BulkItem[]; date?: string; analyze?: boolean }) {
  const { data } = await api.post('/api/spendings/bulk', params)
  return data as { saved: number; daily: { id: string; date: string } }
}

export async function putBulkSpendings(params: { user_id: string; items: BulkItem[]; date?: string; analyze?: boolean }) {
  const { data } = await api.put('/api/spendings/bulk', params)
  return data as { saved: number; daily: { id: string | null; date: string } }
}

export async function getSpendings(params: { user_id: string; from: string; to: string }) {
  const { data } = await api.get('/api/spendings', { params })
  return data as { items: { memo: string; amount: number; category?: string; tags?: string[]; spentAt: string }[] }
}
