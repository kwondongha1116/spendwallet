import { useState, useEffect } from 'react'
import { usePostBulk } from '../hooks/useSpendings'
import { useAuthState } from '../hooks/useAuth'

/**
 * BulkInput 컴포넌트
 * - 여러 줄로 항목/금액을 입력하고 한 번에 저장
 * - 한국어 주석: 사용자가 최소 입력으로 빠르게 기록할 수 있게 함
 */
export default function BulkInput() {
  const [rows, setRows] = useState<{ memo: string; amount: string }[]>([
    { memo: '', amount: '' },
  ])
  const [date, setDate] = useState<string>('')
  const { user } = useAuthState()
  const [userId, setUserId] = useState<string>('')
  useEffect(()=>{ if(user?.id) setUserId(user.id) },[user])
  const { mutateAsync, isPending } = usePostBulk()

  const addRow = () => setRows((r) => [...r, { memo: '', amount: '' }])
  const removeRow = (idx: number) => setRows((r) => r.filter((_, i) => i !== idx))
  const updateRow = (idx: number, key: 'memo' | 'amount', val: string) =>
    setRows((r) => r.map((x, i) => (i === idx ? { ...x, [key]: val } : x)))

  useEffect(() => {
    // 초기값: 오늘 날짜를 기본으로 설정 (YYYY-MM-DD)
    const t = new Date()
    const y = t.getFullYear()
    const m = String(t.getMonth()+1).padStart(2,'0')
    const d = String(t.getDate()).padStart(2,'0')
    setDate(`${y}-${m}-${d}`)
  }, [])

  const handleSubmit = async () => {
    const items = rows
      .map((r) => ({ memo: r.memo.trim(), amount: Number(r.amount) }))
      .filter((r) => r.memo && !isNaN(r.amount))
    if (!userId) return alert('user_id를 입력해주세요')
    if (items.length === 0) return alert('입력 가능한 행이 없습니다')

    try {
      // date는 서버에서 YYYY-MM-DD 또는 MM-DD 모두 처리하지만,
      // 여기서는 YYYY-MM-DD를 기본으로 전송
      await mutateAsync({ user_id: userId, items, date: date || undefined, analyze: true })
      alert('저장되었습니다. 대시보드에서 결과를 확인하세요!')
      setRows([{ memo: '', amount: '' }])
    } catch (e: any) {
      const msg = e?.response?.data?.detail || e?.message || '저장 중 오류가 발생했습니다'
      alert(msg)
    }
  }

  return (
    <div className="bg-white rounded-md shadow p-4">
      <div className="flex gap-2 items-end mb-3">
        <div>
          <label className="text-xs text-gray-600">User ID</label>
          <input value={userId} onChange={(e) => setUserId(e.target.value)} className="border px-2 py-1 rounded w-48" disabled />
        </div>
        <div>
          <label className="text-xs text-gray-600">Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="border px-2 py-1 rounded w-44" />
        </div>
        <button disabled={isPending} onClick={handleSubmit} className="ml-auto bg-blue-600 text-white px-3 py-2 rounded disabled:opacity-60">
          {isPending ? '저장 중…' : '저장'}
        </button>
      </div>

      <div className="grid grid-cols-12 gap-2 text-sm font-medium text-gray-600 mb-1">
        <div className="col-span-8">메모</div>
        <div className="col-span-3">금액</div>
        <div className="col-span-1"></div>
      </div>
      {rows.map((r, i) => (
        <div key={i} className="grid grid-cols-12 gap-2 mb-2">
          <input className="col-span-8 border px-2 py-1 rounded" value={r.memo} onChange={(e) => updateRow(i, 'memo', e.target.value)} placeholder="예: 택시" />
          <input className="col-span-3 border px-2 py-1 rounded" value={r.amount} onChange={(e) => updateRow(i, 'amount', e.target.value)} placeholder="예: 12000" />
          <button onClick={() => removeRow(i)} className="col-span-1 text-red-500">삭제</button>
        </div>
      ))}
      <button onClick={addRow} className="text-blue-600 text-sm">+ 행 추가</button>
    </div>
  )
}
