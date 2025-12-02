import { useQuery } from '@tanstack/react-query'
import { getWeeklyNewsInsight } from '../api/insights'

export function useWeeklyNewsInsight(p: { user_id: string }) {
  return useQuery({ queryKey: ['weeklyNewsInsight', p], queryFn: () => getWeeklyNewsInsight(p) })
}

