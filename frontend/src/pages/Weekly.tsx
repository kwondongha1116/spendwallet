import { useMemo, useState } from 'react'
import { Bar, Pie } from 'react-chartjs-2'
import {
  Chart,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js'
import { useWeeklyReport } from '../hooks/useReports'
import { useAuthState } from '../hooks/useAuth'
import { useSpendings } from '../hooks/useSpendings'
import { getISOWeekString } from '../lib/date'

Chart.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend)

const WEEK_LABELS = ['월', '화', '수', '목', '금', '토', '일']

function getMonday(date: Date) {
  const d = new Date(date)
  const day = d.getDay() || 7 // 1=Mon..7=Sun
  if (day !== 1) d.setDate(d.getDate() - (day - 1))
  return d
}

function formatDate(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

export default function Weekly() {
  const { user } = useAuthState()
  const userId = user?.id || 'demo-user-1'

  // 0: 이번 주, -1: 지난 주, -2: 2주 전
  const [offset, setOffset] = useState(0)

  const monday = useMemo(() => {
    const base = getMonday(new Date())
    const d = new Date(base)
    d.setDate(base.getDate() + offset * 7)
    return d
  }, [offset])

  const from = formatDate(monday)
  const to = formatDate(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6))
  const weekLabel = `${from} ~ ${to}`
  const isoWeek = getISOWeekString(monday)

  const { data: weekly } = useWeeklyReport({ user_id: userId, week: isoWeek })
  const { data: spend } = useSpendings({ user_id: userId, from, to })

  // 지난 주 범위
  const prevMonday = useMemo(() => {
    const d = new Date(monday)
    d.setDate(d.getDate() - 7)
    return d
  }, [monday])

  const prevFrom = formatDate(prevMonday)
  const prevTo = formatDate(
    new Date(prevMonday.getFullYear(), prevMonday.getMonth(), prevMonday.getDate() + 6),
  )
  const { data: prevSpend } = useSpendings({ user_id: userId, from: prevFrom, to: prevTo })

  const weekdayTotals = useMemo(() => {
    const arr = Array(7).fill(0)
    for (const it of spend?.items || []) {
      const d = new Date(it.spentAt)
      const day = d.getDay() // 0=Sun..6=Sat
      const idx = (day + 6) % 7 // 0=Mon..6=Sun
      arr[idx] += it.amount || 0
    }
    return arr
  }, [spend])

  const totalAmount = useMemo(() => weekdayTotals.reduce((a, b) => a + b, 0), [weekdayTotals])
  const dailyAvg = Math.round(totalAmount / 7)

  const prevTotalAmount = useMemo(
    () => (prevSpend?.items || []).reduce((a, b) => a + (b.amount || 0), 0),
    [prevSpend],
  )

  const deltaLabel = useMemo(() => {
    if (!prevTotalAmount) return '-'
    const pct = ((totalAmount - prevTotalAmount) / prevTotalAmount) * 100
    const arrow = pct >= 0 ? '🔺' : '🔻'
    return `${arrow}${Math.abs(pct).toFixed(1)}%`
  }, [totalAmount, prevTotalAmount])

  const categoryTotals: Record<string, number> = useMemo(() => {
    const map: Record<string, number> = {}
    for (const it of spend?.items || []) {
      const cat = it.category || '기타'
      map[cat] = (map[cat] || 0) + (it.amount || 0)
    }
    return map
  }, [spend])

  const focusWeekday = useMemo(() => {
    const max = Math.max(...weekdayTotals)
    if (!isFinite(max) || max <= 0) return '-'
    const idx = weekdayTotals.findIndex((v) => v === max)
    return WEEK_LABELS[idx]
  }, [weekdayTotals])

  const barData = {
    labels: WEEK_LABELS,
    datasets: [
      {
        label: '요일별 소비',
        data: weekdayTotals,
        backgroundColor: '#3b82f6',
      },
    ],
  }

  const pieData = {
    labels: Object.keys(categoryTotals),
    datasets: [
      {
        data: Object.values(categoryTotals),
        backgroundColor: ['#3b82f6', '#22c55e', '#f97316', '#a855f7', '#e11d48'],
      },
    ],
  }

  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-12 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">주간 리포트</h2>
          <p className="text-xs text-gray-500 mt-0.5">{weekLabel}</p>
        </div>
        <select
          className="border rounded px-2 py-1 text-xs"
          value={offset}
          onChange={(e) => setOffset(Number(e.target.value))}
        >
          <option value={0}>이번 주</option>
          <option value={-1}>지난 주</option>
          <option value={-2}>2주 전</option>
        </select>
      </div>

      {/* 요약 카드 */}
      <div className="col-span-12 grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-3 text-xs">
          <div className="text-slate-500">이번 주 총 소비</div>
          <div className="mt-1 text-lg font-semibold text-slate-900">
            ₩{totalAmount.toLocaleString()}
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-3 text-xs">
          <div className="text-slate-500">하루 평균 소비</div>
          <div className="mt-1 text-lg font-semibold text-slate-900">
            ₩{dailyAvg.toLocaleString()}
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-3 text-xs">
          <div className="text-slate-500">지난 주 대비 증감률</div>
          <div className="mt-1 text-lg font-semibold text-slate-900">{deltaLabel}</div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-3 text-xs">
          <div className="text-slate-500">소비 집중 요일</div>
          <div className="mt-1 text-lg font-semibold text-slate-900">{focusWeekday}</div>
        </div>
      </div>

      {/* 그래프 */}
      <div className="col-span-12 md:col-span-7 bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
        <h3 className="text-sm font-medium mb-2">요일별 소비</h3>
        <Bar data={barData} options={{ responsive: true, plugins: { legend: { display: false } } }} />
      </div>
      <div className="col-span-12 md:col-span-5 bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
        <h3 className="text-sm font-medium mb-2">카테고리 비율</h3>
        {Object.keys(categoryTotals).length ? (
          <Pie data={pieData} />
        ) : (
          <div className="text-xs text-gray-500">데이터가 없습니다.</div>
        )}
      </div>

      {/* AI 인사이트 */}
      <div className="col-span-12 bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
        <h3 className="text-sm font-semibold mb-1">💡 SpendWallet Insight</h3>
        <p className="text-sm text-gray-700 whitespace-pre-line">
          {weekly?.comment || '아직 통계를 만들 만큼 데이터가 충분하지 않습니다.'}
        </p>
      </div>
    </div>
  )
}

