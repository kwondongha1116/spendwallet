import { api } from './client'

export async function getDailyReport(params: { user_id: string; date: string }) {
  const { data } = await api.get('/api/reports/daily', { params })
  return data as { total_amount: number; chart_data: Record<string, number>; ai_comment?: string }
}

export async function getWeeklyReport(params: { user_id: string; week: string }) {
  const { data } = await api.get('/api/reports/weekly', { params })
  return data as { totals: Record<string, number>; deltas: Record<string, number>; comment: string; total_amount?: number }
}

export async function getMonthlyProfile(params: { user_id: string; month: string }) {
  const { data } = await api.get('/api/reports/monthly', { params })
  return data as { type: string; rationale: string; advice: string }
}
