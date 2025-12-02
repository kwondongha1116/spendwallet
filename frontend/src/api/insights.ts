import { api } from './client'

export type WeeklyNewsHeadline = {
  title: string
  url?: string
}

export type WeeklyNewsInsight = {
  headlines: WeeklyNewsHeadline[]
  top_category: string
  insight: {
    summary: string
    mood: string
  }
}

export async function getWeeklyNewsInsight(params: { user_id: string }) {
  const { data } = await api.get('/api/insights/week_news', { params })
  return data as WeeklyNewsInsight
}
