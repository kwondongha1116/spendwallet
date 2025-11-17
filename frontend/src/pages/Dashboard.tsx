import { useEffect, useMemo, useState } from 'react'
import BulkInput from '../components/BulkInput'
import SpendingChart from '../components/SpendingChart'
import AICommentBox from '../components/AICommentBox'
import CalendarView from '../components/CalendarView'
import { useDailyReport } from '../hooks/useReports'
import { useSpendings } from '../hooks/useSpendings'
import { getISOWeekString } from '../lib/date'
import { useAuthState } from '../hooks/useAuth'
import { useNavigate } from 'react-router-dom'

/**
 * Dashboard 페이지
 * - 벌크 입력 + 달력(일별 합계) + 선택일 일간 차트/코멘트
 */
export default function Dashboard() {
  const { user } = useAuthState()
  const userId = user?.id || 'demo-user-1'
  const today = new Date()
  const yyyy = today.getFullYear()
  const mm = String(today.getMonth() + 1).padStart(2, '0')
  const dd = String(today.getDate()).padStart(2, '0')
  const [date, setDate] = useState<string>(`${yyyy}-${mm}-${dd}`)

  // 현재 달 범위 계산
  const from = `${yyyy}-${mm}-01`
  const to = `${yyyy}-${mm}-31`

  const nav = useNavigate()
  const { data: spend } = useSpendings({ user_id: userId, from, to })
  const { data: daily } = useDailyReport({ user_id: userId, date })

  // 달력 요약: 날짜별 합계 집계
  const summaries = useMemo(() => {
    const map: Record<string, number> = {}
    for (const it of spend?.items || []) {
      map[it.spentAt] = (map[it.spentAt] || 0) + (it.amount || 0)
    }
    return map
  }, [spend])

  useEffect(() => {
    // 저장 직후 결과 확인을 위해 훅 자동 갱신 등 추가 가능
  }, [])

  // 월 총액 / 주 요약 계산(간단)
  const monthTotal = useMemo(() => (spend?.items || []).reduce((a, b) => a + (b.amount || 0), 0), [spend])
  const isoWeek = getISOWeekString(new Date())
  // 주간 변화율은 간단 표기로 대체 (실제는 /api/reports/weekly를 호출해도 됨)

  return (
    <div className="grid grid-cols-12 gap-4">
      {/* 상단 버튼/요약 */}
      <div className="col-span-12 flex items-center gap-3">
        <BulkInput />
      </div>
      <div className="col-span-7">
        <CalendarView summaries={summaries} onDateClick={(d)=>{ setDate(d); nav(`/daily/${d}`) }} />
      </div>
      <div className="col-span-5 flex flex-col gap-4">
        <div className="bg-white rounded-md shadow p-4 grid grid-cols-2 gap-3">
          <div>
            <div className="text-xs text-gray-600">이번 달 총 소비</div>
            <div className="text-xl font-bold">₩{monthTotal.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-xs text-gray-600">이번 주</div>
            <div className="text-xl font-bold">{isoWeek}</div>
          </div>
        </div>
        <SpendingChart data={daily?.chart_data || {}} />
        <AICommentBox comment={daily?.ai_comment} />
      </div>
    </div>
  )
}
