import { useParams } from 'react-router-dom'
import SpendingChart from '../components/SpendingChart'
import AICommentBox from '../components/AICommentBox'
import { useDailyReport } from '../hooks/useReports'
import { useSpendings } from '../hooks/useSpendings'
import { useAuthState } from '../hooks/useAuth'

export default function Daily() {
  const { date = '' } = useParams()
  const { user } = useAuthState()
  const user_id = user?.id || 'demo-user-1'

  const { data: daily } = useDailyReport({ user_id, date })
  const { data: list } = useSpendings({ user_id, from: date, to: date })

  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-12 bg-white rounded-md shadow p-4">
        <h2 className="text-lg font-semibold">{date} 일간 분석</h2>
      </div>
      <div className="col-span-7 bg-white rounded-md shadow p-4">
        <h3 className="text-sm font-medium mb-2">소비 목록</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-600">
              <th className="py-1">메모</th>
              <th className="py-1">금액</th>
              <th className="py-1">카테고리</th>
              <th className="py-1">태그</th>
            </tr>
          </thead>
          <tbody>
            {(list?.items || []).map((it, idx) => (
              <tr key={idx} className="border-t">
                <td className="py-1">{it.memo}</td>
                <td className="py-1">{it.amount.toLocaleString()}</td>
                <td className="py-1">{it.category || '기타'}</td>
                <td className="py-1">{(it.tags || []).join(', ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="col-span-5 flex flex-col gap-4">
        <div className="bg-white rounded-md shadow p-4">
          <div className="text-sm text-gray-600">총액</div>
          <div className="text-2xl font-bold">{(daily?.total_amount || 0).toLocaleString()} 원</div>
        </div>
        <SpendingChart data={daily?.chart_data || {}} />
        <AICommentBox comment={daily?.ai_comment} />
      </div>
    </div>
  )
}

