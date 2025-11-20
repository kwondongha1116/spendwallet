import { useMemo, useState } from 'react'
import { Line, Pie } from 'react-chartjs-2'
import {
  Chart,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js'
import { useMonthlyProfile } from '../hooks/useReports'
import { useAuthState } from '../hooks/useAuth'
import { useSpendings } from '../hooks/useSpendings'

Chart.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Legend)

export default function Monthly() {
  const { user } = useAuthState()
  const [userId] = useState(user?.id || 'demo-user-1')

  const now = new Date()
  // 0: 이번 달, -1: 지난 달, -2: 2달 전
  const [offset, setOffset] = useState(0)
  const target = useMemo(() => new Date(now.getFullYear(), now.getMonth() + offset, 1), [now, offset])

  const monthStr = useMemo(() => {
    const y = target.getFullYear()
    const m = String(target.getMonth() + 1).padStart(2, '0')
    return `${y}-${m}`
  }, [target])

  const prevTarget = useMemo(() => new Date(target.getFullYear(), target.getMonth() - 1, 1), [target])
  const prevMonthStr = useMemo(() => {
    const y = prevTarget.getFullYear()
    const m = String(prevTarget.getMonth() + 1).padStart(2, '0')
    return `${y}-${m}`
  }, [prevTarget])

  const { data } = useMonthlyProfile({ user_id: userId, month: monthStr })

  const from = `${monthStr}-01`
  const to = `${monthStr}-31`
  const { data: spend } = useSpendings({ user_id: userId, from, to })

  const fromPrev = `${prevMonthStr}-01`
  const toPrev = `${prevMonthStr}-31`
  const { data: spendPrev } = useSpendings({ user_id: userId, from: fromPrev, to: toPrev })

  const totalAmount = useMemo(
    () => (spend?.items || []).reduce((a, b) => a + (b.amount || 0), 0),
    [spend],
  )
  const prevTotalAmount = useMemo(
    () => (spendPrev?.items || []).reduce((a, b) => a + (b.amount || 0), 0),
    [spendPrev],
  )
  const dailyAvg = Math.round(totalAmount / 30)

  const deltaLabel = useMemo(() => {
    if (!prevTotalAmount) return '-'
    const pct = ((totalAmount - prevTotalAmount) / prevTotalAmount) * 100
    const arrow = pct >= 0 ? '🔺' : '🔻'
    return `${arrow}${Math.abs(pct).toFixed(1)}%`
  }, [totalAmount, prevTotalAmount])

  const type = data?.type || '-' // 예: 쇼핑중독형 소비자 (“지갑이 울어도 마음은 행복한 쇼핑 매니아 💖🛒”)
  const rationale = data?.rationale || '' // 예: 이번 달엔 쇼핑으로 행복을 사는 데 집중했네요! 🛍️😆
  const advice = data?.advice || '' // 예: 다음 달엔 할인 대신 마음의 평화를 찾아보세요! 🧘‍♂️💸

  const year = target.getFullYear()
  const monthIndex = target.getMonth()
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()

  const dailyTotals = useMemo(() => {
    const arr = Array(daysInMonth).fill(0)
    for (const it of spend?.items || []) {
      const d = new Date(it.spentAt)
      if (d.getFullYear() === year && d.getMonth() === monthIndex) {
        const day = d.getDate()
        arr[day - 1] += it.amount || 0
      }
    }
    return arr
  }, [spend, daysInMonth, year, monthIndex])

  const categoryTotals = useMemo(() => {
    const map: Record<string, number> = {}
    for (const it of spend?.items || []) {
      const cat = it.category || '기타'
      map[cat] = (map[cat] || 0) + (it.amount || 0)
    }
    return map
  }, [spend])

  const topItems = useMemo(() => {
    const map: Record<string, number> = {}
    for (const it of spend?.items || []) {
      const key = it.memo || '기타'
      map[key] = (map[key] || 0) + (it.amount || 0)
    }
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
  }, [spend])

  const lineData = {
    labels: Array.from({ length: daysInMonth }, (_, i) => `${i + 1}일`),
    datasets: [
      {
        label: '누적 소비 금액',
        data: dailyTotals.reduce((acc: number[], v) => {
          const last = acc.length ? acc[acc.length - 1] : 0
          acc.push(last + v)
          return acc
        }, [] as number[]),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59,130,246,0.1)',
        tension: 0.2,
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
          <h2 className="text-lg font-semibold">월간 리포트</h2>
          <p className="text-xs text-gray-500 mt-0.5">{monthStr}</p>
        </div>
        <select
          className="border rounded px-2 py-1 text-xs"
          value={offset}
          onChange={(e) => setOffset(Number(e.target.value))}
        >
          <option value={0}>이번 달</option>
          <option value={-1}>지난 달</option>
          <option value={-2}>2달 전</option>
        </select>
      </div>

      {/* 요약 카드 */}
      <div className="col-span-12 grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-3 text-xs">
          <div className="text-slate-500">이번 달 ({monthStr}) 총 지출</div>
          <div className="mt-1 text-lg font-semibold text-slate-900">
            ₩{totalAmount.toLocaleString()}
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-3 text-xs">
          <div className="text-slate-500">하루 평균 지출 (30일 기준)</div>
          <div className="mt-1 text-lg font-semibold text-slate-900">
            ₩{dailyAvg.toLocaleString()}
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-3 text-xs">
          <div className="text-slate-500">지난 달 대비 증감률</div>
          <div className="mt-1 text-lg font-semibold text-slate-900">{deltaLabel}</div>
        </div>
        {/* 이번 달 지출 TOP 3 항목 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-3 text-xs">
          <div className="text-slate-500">이번 달 지출 TOP 3 항목</div>
          {topItems.length ? (
            <ul className="mt-2 text-xs text-gray-800 space-y-1">
              {topItems.map(([memo, amount]) => (
                <li key={memo} className="flex justify-between">
                  <span className="font-semibold">{memo}</span>
                  <span className="font-semibold text-slate-900">
                    ₩{(amount as number).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-1 text-xs text-gray-500">데이터가 없습니다.</div>
          )}
        </div>
      </div>

      {/* 누적 소비 추이 + 카테고리별 점유율 */}
      <div className="col-span-12 md:col-span-7 bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
        <h3 className="text-sm font-medium mb-2">누적 소비 추이 (1~{daysInMonth}일)</h3>
        <Line data={lineData} options={{ responsive: true, plugins: { legend: { display: false } } }} />
      </div>
      <div className="col-span-12 md:col-span-5 bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
        <h3 className="text-sm font-medium mb-2">카테고리별 누적 점유율</h3>
        {Object.keys(categoryTotals).length ? (
          <Pie data={pieData} />
        ) : (
          <div className="text-xs text-gray-500">데이터가 없습니다.</div>
        )}
      </div>

      {/* 월간 타입 카드 */}
      <div className="col-span-12 bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
        <h3 className="text-sm font-medium mb-1">월간 타입</h3>
        <div className="mt-1 text-base font-semibold text-slate-900">{type}</div>
        {(rationale || advice) && (
          <p className="mt-2 text-sm text-gray-700 whitespace-pre-line">
            {rationale}
            {advice && `\n👉 ${advice}`}
          </p>
        )}
      </div>
    </div>
  )
}

