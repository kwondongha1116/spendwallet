import { useQuery } from '@tanstack/react-query'
import { getDailyReport, getMonthlyProfile, getWeeklyReport } from '../api/reports'

export function useDailyReport(p: { user_id: string; date: string }) {
  return useQuery({ queryKey: ['daily', p], queryFn: () => getDailyReport(p) })
}

export function useWeeklyReport(p: { user_id: string; week: string }) {
  return useQuery({ queryKey: ['weekly', p], queryFn: () => getWeeklyReport(p) })
}

export function useMonthlyProfile(p: { user_id: string; month: string }) {
  return useQuery({ queryKey: ['monthly', p], queryFn: () => getMonthlyProfile(p) })
}

