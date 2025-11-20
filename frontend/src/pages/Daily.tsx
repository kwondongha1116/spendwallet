import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import SpendingChart from '../components/SpendingChart'
import AICommentBox from '../components/AICommentBox'
import { useDailyReport } from '../hooks/useReports'
import { useSpendings, usePutBulk } from '../hooks/useSpendings'
import { useAuthState } from '../hooks/useAuth'

type Row = {
  memo: string
  amount: string
  category?: string
  tags?: string[]
}

export default function Daily() {
  const { date = '' } = useParams()
  const { user } = useAuthState()
  const user_id = user?.id || 'demo-user-1'

  const { data: daily } = useDailyReport({ user_id, date })
  const { data: list } = useSpendings({ user_id, from: date, to: date })
  const { mutateAsync, isPending } = usePutBulk()

  const [rows, setRows] = useState<Row[]>([])
  const [isEditing, setIsEditing] = useState(false)

  useEffect(() => {
    const items = list?.items || []
    setRows(
      items.map((it) => ({
        memo: it.memo,
        amount: String(it.amount),
        category: it.category,
        tags: it.tags,
      })),
    )
  }, [list])

  const total = useMemo(() => rows.reduce((s, r) => s + (Number(r.amount) || 0), 0), [rows])
  const displayTotal = daily?.total_amount ?? total

  const categoryData = useMemo(() => {
    const map: Record<string, number> = {}
    for (const it of list?.items || []) {
      const cat = it.category || '기타'
      map[cat] = (map[cat] || 0) + (it.amount || 0)
    }
    return map
  }, [list])

  const updateRow = (idx: number, key: 'memo' | 'amount', val: string) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [key]: val } : r)))
  }

  const addRow = () => setRows((prev) => [...prev, { memo: '', amount: '' }])
  const removeRow = (idx: number) => setRows((prev) => prev.filter((_, i) => i !== idx))

  const handleSave = async () => {
    const items = rows
      .map((r) => ({ memo: r.memo.trim(), amount: Number(r.amount) }))
      .filter((r) => r.memo && !isNaN(r.amount))
    try {
      await mutateAsync({ user_id, date, items, analyze: true })
      alert('수정 내용이 저장되었습니다.')
      setIsEditing(false)
    } catch (e: any) {
      alert(e?.response?.data?.detail || e?.message || '알 수 없는 오류가 발생했습니다.')
    }
  }

  const handleEditToggle = () => {
    if (isEditing) {
      void handleSave()
    } else {
      setIsEditing(true)
    }
  }

  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-12 bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
        <h2 className="text-lg font-semibold">일간 리포트</h2>
        <p className="text-xs text-gray-500 mt-0.5">{date}</p>
      </div>

      <div className="col-span-7 bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium">소비 목록</h3>
          <button
            className="text-xs px-3 py-1 rounded-full border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            disabled={isPending}
            onClick={handleEditToggle}
          >
            {isEditing ? (isPending ? '저장 중...' : '수정 저장') : '수정'}
          </button>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-600">
              <th className="py-1">메모</th>
              <th className="py-1">금액</th>
              <th className="py-1">카테고리</th>
              <th className="py-1">태그</th>
              {isEditing && <th className="py-1 w-16" />}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr key={idx} className="border-t">
                <td className="py-1 pr-2">
                  {isEditing ? (
                    <input
                      className="w-full border rounded px-2 py-1"
                      value={r.memo}
                      onChange={(e) => updateRow(idx, 'memo', e.target.value)}
                    />
                  ) : (
                    r.memo
                  )}
                </td>
                <td className="py-1 pr-2">
                  {isEditing ? (
                    <input
                      className="w-full border rounded px-2 py-1"
                      value={r.amount}
                      onChange={(e) => updateRow(idx, 'amount', e.target.value)}
                    />
                  ) : (
                    Number(r.amount || 0).toLocaleString()
                  )}
                </td>
                <td className="py-1 pr-2 text-gray-700">{r.category || '기타'}</td>
                <td className="py-1 pr-2 text-gray-500">{(r.tags || []).join(', ')}</td>
                {isEditing && (
                  <td className="py-1">
                    <button className="text-red-500 text-xs" onClick={() => removeRow(idx)}>
                      삭제
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {isEditing && (
          <button className="mt-2 text-blue-600 text-sm" onClick={addRow}>
            + 행 추가
          </button>
        )}
      </div>

      <div className="col-span-5 flex flex-col gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
          <div className="text-sm text-gray-600">총액</div>
          <div className="text-2xl font-bold">{displayTotal.toLocaleString()} 원</div>
        </div>
        <SpendingChart data={categoryData} />
        <AICommentBox comment={daily?.ai_comment} />
      </div>
    </div>
  )
}

