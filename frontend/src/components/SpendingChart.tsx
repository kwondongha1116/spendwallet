import { Pie } from 'react-chartjs-2'
import { Chart, ArcElement, Tooltip, Legend } from 'chart.js'
Chart.register(ArcElement, Tooltip, Legend)

/**
 * SpendingChart (Pie)
 * - 태그 비율을 원형 차트로 표현
 */
export default function SpendingChart({ data }: { data: Record<string, number> }) {
  const labels = Object.keys(data)
  const values = Object.values(data)
  const colors = ['#60a5fa', '#34d399', '#f472b6', '#f59e0b', '#a78bfa', '#fb7185']

  return (
    <div className="bg-white rounded-md shadow p-4">
      <h3 className="text-sm font-medium mb-2">태그 비율</h3>
      {labels.length === 0 ? (
        <p className="text-sm text-gray-500">데이터가 없습니다.</p>
      ) : (
        <Pie
          data={{
            labels,
            datasets: [
              {
                data: values,
                backgroundColor: values.map((_, i) => colors[i % colors.length]),
                borderWidth: 0,
              },
            ],
          }}
        />
      )}
    </div>
  )
}

