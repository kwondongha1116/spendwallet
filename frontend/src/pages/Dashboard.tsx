import { useEffect, useMemo, useState } from 'react'
import BulkInput from '../components/BulkInput'
import CalendarView from '../components/CalendarView'
import ProfileCard from '../components/ProfileCard'
import MarketSummaryCard from '../components/MarketSummaryCard'
import { useDailyReport, useMonthlyProfile } from '../hooks/useReports'
import { useSpendings } from '../hooks/useSpendings'
import { getISOWeekString } from '../lib/date'
import { useAuthState } from '../hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import WeeklyNewsCard from '../components/WeeklyNewsCard'

/**
 * Dashboard 페이지
 * - 상단: 벌크 입력 카드 + 프로필 카드
 * - 중앙: 월간 캘린더
 * - 우측: 선택 월 요약 + 시장 지수 + 일간 코멘트
 */
export default function Dashboard() {
  const { user } = useAuthState()
  const userId = user?.id || 'demo-user-1'

  const today = new Date()
  const yyyy = today.getFullYear()
  const mm = String(today.getMonth() + 1).padStart(2, '0')
  const dd = String(today.getDate()).padStart(2, '0')
  const [date, setDate] = useState<string>(`${yyyy}-${mm}-${dd}`)

  // 캘린더에서 보고 있는 월 (YYYY-MM)
  const [calendarMonth, setCalendarMonth] = useState<string>(`${yyyy}-${mm}`)

  const from = `${calendarMonth}-01`
  const to = `${calendarMonth}-31`

  const nav = useNavigate()
  const { data: spend } = useSpendings({ user_id: userId, from, to })
  const { data: daily } = useDailyReport({ user_id: userId, date })
  const { data: monthly } = useMonthlyProfile({ user_id: userId, month: calendarMonth })

  // 날짜별 합계 집계 (캘린더)
  const summaries = useMemo(() => {
    const map: Record<string, number> = {}
    for (const it of spend?.items || []) {
      map[it.spentAt] = (map[it.spentAt] || 0) + (it.amount || 0)
    }
    return map
  }, [spend])

  useEffect(() => {
    // 필요하면 여기에서 추가 로직 사용
  }, [])

  const monthTotal = useMemo(
    () => (spend?.items || []).reduce((a, b) => a + (b.amount || 0), 0),
    [spend],
  )
  const isoWeek = getISOWeekString(new Date())

  return (
    <div className="grid grid-cols-12 gap-5">
      {/* 상단: 입력 + 프로필 */}
      <div className="col-span-12 grid grid-cols-12 gap-5 items-stretch">
        <div className="col-span-8">
          <BulkInput />
        </div>
        <div className="col-span-4">
          <ProfileCard />
        </div>
      </div>

      {/* 중앙: 캘린더 */}
      <div className="col-span-7">
        <CalendarView
          summaries={summaries}
          onDateClick={(d) => {
            setDate(d)
            nav(`/daily/${d}`)
          }}
          onMonthChange={(m) => setCalendarMonth(m)}
        />
      </div>

      {/* 오른쪽: 월간/주간 요약 + 시장 지수 + 일간 코멘트 */}
      <div className="col-span-5 flex flex-col gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 grid grid-cols-2 gap-3">
          <div>
            <div className="text-xs text-gray-500">선택 월 총 지출</div>
            <div className="text-2xl font-bold text-slate-900">₩{monthTotal.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">이번 주</div>
            <div className="text-2xl font-bold text-slate-900">{isoWeek}</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
          <div className="text-xs text-gray-500 mb-1">월간 타입 ({calendarMonth})</div>
          <div className="text-lg font-semibold mb-2 text-slate-900">
            {monthly?.type || '월간 타입 분석 없음'}
          </div>
          <div className="text-sm text-gray-700 mb-1 whitespace-pre-line">
            {monthly?.rationale}
          </div>
          <div className="text-sm text-gray-800">
            {monthly?.advice && `👉 ${monthly.advice}`}
          </div>
        </div>

        <MarketSummaryCard />
        <WeeklyNewsCard />
      </div>
    </div>
  )
}
