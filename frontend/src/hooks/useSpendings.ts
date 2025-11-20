import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getSpendings, postBulkSpendings, putBulkSpendings, type BulkItem } from '../api/spendings'

export function usePostBulk() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (p: { user_id: string; items: BulkItem[]; date?: string; analyze?: boolean }) => postBulkSpendings(p),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['spendings'] })
      qc.invalidateQueries({ queryKey: ['daily'] })
    },
  })
}

export function usePutBulk() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (p: { user_id: string; items: BulkItem[]; date?: string; analyze?: boolean }) => putBulkSpendings(p),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['spendings'] })
      qc.invalidateQueries({ queryKey: ['daily'] })
    },
  })
}

export function useSpendings(p: { user_id: string; from: string; to: string }) {
  return useQuery({
    queryKey: ['spendings', p],
    queryFn: () => getSpendings(p),
  })
}
