import { useMemo, useState } from 'react'
import { useWeeklyReport } from '../hooks/useReports'
import { getISOWeekString } from '../lib/date'
import { useAuthState } from '../hooks/useAuth'

/**
 * Weekly 페이지
 * - 'YYYY-WW' 형식 주 선택 후 리포트 표시
 * - 간단한 표로 totals/deltas 표시 + 코멘트
 */
export default function Weekly() {
  const { user } = useAuthState()
  const [userId] = useState(user?.id || 'demo-user-1')
  // 현재 주(ISO): 'YYYY-WW'
  const [isoWeek] = useState<string>(getISOWeekString(new Date()))

  const { data } = useWeeklyReport({ user_id: userId, week: isoWeek })

  const rows = useMemo(() => {
    const keys = new Set<string>(Object.keys(data?.totals || {}).concat(Object.keys(data?.deltas || {})))
    return Array.from(keys).map((k) => ({
      cat: k,
      total: data?.totals?.[k] ?? 0,
      delta: data?.deltas?.[k] ?? 0,
    }))
  }, [data])

  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-12 bg-white rounded-md shadow p-4">
        <h2 className="text-lg font-semibold mb-2">주간 리포트 ({isoWeek})</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-600">
              <th className="py-1">카테고리</th>
              <th className="py-1">합계</th>
              <th className="py-1">증감률</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.cat} className="border-t">
                <td className="py-1">{r.cat}</td>
                <td className="py-1">{r.total.toLocaleString()}</td>
                <td className={`py-1 ${r.delta > 0 ? 'text-red-600' : r.delta < 0 ? 'text-blue-600' : ''}`}>{(r.delta * 100).toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="col-span-12 bg-white rounded-md shadow p-4">
        <h3 className="text-sm font-medium mb-2">AI 코멘트</h3>
        <p className="text-gray-700 text-sm whitespace-pre-line">{data?.comment || '데이터가 충분하지 않습니다.'}</p>
      </div>
    </div>
  )
}
