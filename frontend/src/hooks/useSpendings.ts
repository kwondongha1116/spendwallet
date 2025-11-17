import { useMutation, useQuery } from '@tanstack/react-query'
import { getSpendings, postBulkSpendings, type BulkItem } from '../api/spendings'

export function usePostBulk() {
  return useMutation({
    mutationFn: (p: { user_id: string; items: BulkItem[]; date?: string; analyze?: boolean }) => postBulkSpendings(p),
  })
}

export function useSpendings(p: { user_id: string; from: string; to: string }) {
  return useQuery({
    queryKey: ['spendings', p],
    queryFn: () => getSpendings(p),
  })
}

