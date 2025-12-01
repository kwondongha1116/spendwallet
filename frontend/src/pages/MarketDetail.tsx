import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Chart,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import { fetchMarketSummary, MarketIndex, MarketSummary } from '../api/stocks'

Chart.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend)

export default function MarketDetail() {
  const { name: encodedName } = useParams<{ name: string }>()
  const name = decodeURIComponent(encodedName || '')
  const nav = useNavigate()

  const [summary, setSummary] = useState<MarketSummary | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchMarketSummary()
      .then(setSummary)
      .catch(() => setError('지수 정보를 불러오지 못했어요.'))
  }, [])

  const index: MarketIndex | null = useMemo(() => {
    if (!summary) return null
    return summary[name] ?? null
  }, [summary, name])

  if (!encodedName) {
    return null
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 text-sm text-gray-700">
        <button
          type="button"
          onClick={() => nav(-1)}
          className="text-xs text-blue-500 mb-3 hover:underline"
        >
          ← 돌아가기
        </button>
        <div className="font-semibold mb-2">시장 지수 상세</div>
        <div className="text-red-500 text-xs">{error}</div>
      </div>
    )
  }

  if (!summary || !index) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 text-sm text-gray-700">
        <button
          type="button"
          onClick={() => nav(-1)}
          className="text-xs text-blue-500 mb-3 hover:underline"
        >
          ← 돌아가기
        </button>
        <div className="font-semibold mb-2">시장 지수 상세</div>
        <div className="text-xs text-gray-500">지수 데이터를 불러오는 중이에요…</div>
      </div>
    )
  }

  const color = index.change >= 0 ? '#ef4444' : '#3b82f6'
  const labels = index.trend.map((_, i) => `${i + 1}`)
  const chartData = {
    labels,
    datasets: [
      {
        label: `${name} (최근 7일)`,
        data: index.trend,
        borderColor: color,
        backgroundColor: 'rgba(239,68,68,0.05)',
        borderWidth: 2,
        pointRadius: 3,
        tension: 0.3,
      },
    ],
  }

  const min = Math.min(...index.trend)
  const max = Math.max(...index.trend)

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 text-sm text-gray-800">
      <button
        type="button"
        onClick={() => nav(-1)}
        className="text-xs text-blue-500 mb-3 hover:underline"
      >
        ← Dashboard로 돌아가기
      </button>

      <div className="flex items-baseline justify-between mb-4">
        <div>
          <div className="text-xs text-gray-500 mb-1">이번 주 주요 지수</div>
          <div className="text-xl font-semibold">{name}</div>
        </div>
        <div className="text-right">
          <div className="text-lg font-semibold">
            {index.price.toLocaleString()}{' '}
            <span className={index.change >= 0 ? 'text-red-500' : 'text-blue-500'}>
              ({index.change > 0 ? '+' : ''}
              {index.change}%)
            </span>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            최근 7일 범위: {min.toLocaleString()} ~ {max.toLocaleString()}
          </div>
        </div>
      </div>

      <div className="h-64 md:h-80">
        <Line
          data={chartData}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: { enabled: true },
            },
            scales: {
              x: {
                title: { display: true, text: '최근 7일 (상대 순서)' },
              },
              y: {
                title: { display: true, text: '지수 / 환율' },
              },
            },
          }}
        />
      </div>

      <div className="mt-4 text-xs text-gray-500">
        * 야후 파이낸스 기준 데이터로, 약간의 지연이 있을 수 있어요.
      </div>
    </div>
  )
}

