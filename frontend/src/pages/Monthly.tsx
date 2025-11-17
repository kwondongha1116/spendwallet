import { useMemo, useState } from 'react'
import { useMonthlyProfile } from '../hooks/useReports'
import { useAuthState } from '../hooks/useAuth'

/**
 * Monthly 페이지
 * - month(YYYY-MM) 선택 → 소비자 타입/근거/조언 표시
 */
export default function Monthly() {
  const { user } = useAuthState()
  const [userId] = useState(user?.id || 'demo-user-1')
  const now = new Date()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const month = `${now.getFullYear()}-${mm}`
  const { data } = useMonthlyProfile({ user_id: userId, month })

  const type = useMemo(() => data?.type || '-', [data])
  const rationale = useMemo(() => data?.rationale || '-', [data])
  const advice = useMemo(() => data?.advice || '-', [data])

  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-12 bg-white rounded-md shadow p-4">
        <h2 className="text-lg font-semibold mb-2">월간 타입 ({month})</h2>
        <div className="text-2xl font-bold mb-3">{type}</div>
        <div className="text-sm text-gray-700 mb-2">{rationale}</div>
        <div className="text-sm text-gray-900">👉 {advice}</div>
      </div>
    </div>
  )
}
