import { useState, useEffect } from 'react'
import { usePostBulk } from '../hooks/useSpendings'
import { useAuthState } from '../hooks/useAuth'

/**
 * BulkInput 컴포넌트
 * - 여러 줄로 메모/금액을 입력하고 한 번에 저장
 */
export default function BulkInput() {
  const [rows, setRows] = useState<{ memo: string; amount: string }[]>([
    { memo: '', amount: '' },
  ])
  const [date, setDate] = useState<string>('')
  const { user } = useAuthState()
  const [userId, setUserId] = useState<string>('')
  const { mutateAsync, isPending } = usePostBulk()

  useEffect(() => {
    if (user?.id) setUserId(user.id)
  }, [user])

  useEffect(() => {
    // 초기값: 오늘 날짜
    const t = new Date()
    const y = t.getFullYear()
    const m = String(t.getMonth() + 1).padStart(2, '0')
    const d = String(t.getDate()).padStart(2, '0')
    setDate(`${y}-${m}-${d}`)
  }, [])

  const addRow = () => setRows((r) => [...r, { memo: '', amount: '' }])
  const removeRow = (idx: number) => setRows((r) => r.filter((_, i) => i !== idx))
  const updateRow = (idx: number, key: 'memo' | 'amount', val: string) =>
    setRows((r) => r.map((x, i) => (i === idx ? { ...x, [key]: val } : x)))

  const handleSubmit = async () => {
    const items = rows
      .map((r) => ({ memo: r.memo.trim(), amount: Number(r.amount) }))
      .filter((r) => r.memo && !isNaN(r.amount))

    if (!userId) return alert('로그인 정보가 없습니다. 다시 로그인 해주세요.')
    if (items.length === 0) return alert('입력 가능한 행이 없습니다')

    try {
      await mutateAsync({ user_id: userId, items, date: date || undefined, analyze: true })
      alert('저장되었습니다. 오른쪽 패널에서 결과를 확인하세요!')
      setRows([{ memo: '', amount: '' }])
    } catch (e: any) {
      const msg = e?.response?.data?.detail || e?.message || '저장 중 오류가 발생했습니다'
      alert(msg)
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
      <div className="flex gap-3 items-end mb-3">
        <div>
          <label className="text-xs text-gray-600">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border px-3 py-2 rounded-md text-sm"
          />
        </div>
        <button
          disabled={isPending}
          onClick={handleSubmit}
          className="ml-auto bg-blue-600 text-white px-5 py-2 rounded-md text-sm font-semibold disabled:opacity-60"
        >
          {isPending ? '저장 중…' : '저장'}
        </button>
      </div>

      <div className="grid grid-cols-12 gap-2 text-sm font-medium text-gray-600 mb-1">
        <div className="col-span-8">메모</div>
        <div className="col-span-3">금액</div>
        <div className="col-span-1" />
      </div>
      {rows.map((r, i) => (
        <div key={i} className="grid grid-cols-12 gap-2 mb-2">
          <input
            className="col-span-8 border px-3 py-2 rounded text-sm"
            value={r.memo}
            onChange={(e) => updateRow(i, 'memo', e.target.value)}
            placeholder="예: 택시"
          />
          <input
            className="col-span-3 border px-3 py-2 rounded text-sm"
            value={r.amount}
            onChange={(e) => updateRow(i, 'amount', e.target.value)}
            placeholder="예: 12000"
          />
          <button onClick={() => removeRow(i)} className="col-span-1 text-red-500 text-sm">
            삭제
          </button>
        </div>
      ))}
      <button onClick={addRow} className="text-blue-600 text-sm">
        + 행 추가
      </button>
    </div>
  )
}

