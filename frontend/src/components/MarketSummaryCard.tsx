import { useEffect, useState } from 'react'
import { Line } from 'react-chartjs-2'
import {
  Chart,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
} from 'chart.js'
import { useNavigate } from 'react-router-dom'
import { fetchMarketSummary, MarketSummary } from '../api/stocks'

Chart.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip)

export default function MarketSummaryCard() {
  const [data, setData] = useState<MarketSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const nav = useNavigate()

  useEffect(() => {
    fetchMarketSummary()
      .then(setData)
      .catch(() => setError('지수 정보를 불러오지 못했어요.'))
  }, [])

  if (error) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 text-sm text-gray-600">
        이번 주 주요 지수
        <div className="mt-2 text-xs text-red-400">{error}</div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 text-sm text-gray-600">
        이번 주 주요 지수
        <div className="mt-2 text-xs text-gray-500">불러오는 중…</div>
      </div>
    )
  }

  const entries = Object.entries(data)
  if (!entries.length) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 text-sm text-gray-600">
        이번 주 주요 지수
        <div className="mt-2 text-xs text-gray-500">표시할 데이터가 없습니다.</div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 text-xs md:text-sm">
      <h3 className="text-sm font-medium mb-3">이번 주 주요 지수</h3>
      <div className="space-y-3">
        {entries.map(([name, v]) => {
          const trendData = v.trend.map((val, i) => ({ x: i, y: val }))
          const color = v.change >= 0 ? '#ef4444' : '#3b82f6'
          const lineData = {
            labels: trendData.map((p) => p.x),
            datasets: [
              {
                data: trendData.map((p) => p.y),
                borderColor: color,
                backgroundColor: 'transparent',
                borderWidth: 2,
                pointRadius: 0,
                tension: 0.3,
              },
            ],
          }
          return (
            <div key={name} className="flex items-center gap-2">
              <button
                type="button"
                className="w-20 text-left font-medium text-blue-600 hover:underline"
                onClick={() => nav(`/markets/${encodeURIComponent(name)}`)}
              >
                {name}
              </button>
              <button
                type="button"
                className="flex-1 text-right"
                onClick={() => nav(`/markets/${encodeURIComponent(name)}`)}
              >
                {v.price.toLocaleString()}{' '}
                <span className={v.change >= 0 ? 'text-red-500' : 'text-blue-500'}>
                  ({v.change > 0 ? '+' : ''}
                  {v.change}%)
                </span>
              </button>
              <div className="w-20 h-6">
                <Line
                  data={lineData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false }, tooltip: { enabled: false } },
                    scales: {
                      x: { display: false },
                      y: { display: false },
                    },
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

