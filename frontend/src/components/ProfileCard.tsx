import { useState } from 'react'
import { useAuthState } from '../hooks/useAuth'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getUserProfile, updateUserProfile } from '../api/users'
import Modal from './Modal'

/**
 * ProfileCard
 * - 대시보드 상단 입력 카드 옆에 표시되는 사용자 프로필 카드
 * - 이름/이메일/간단 인사 + 프로필 수정 버튼
 */
export default function ProfileCard() {
  const { user } = useAuthState()
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)

  if (!user) return null

  const { data } = useQuery({
    queryKey: ['user-profile', user.id],
    queryFn: () => getUserProfile(user.id),
  })

  const m = useMutation({
    mutationFn: (payload: { display_name: string; birthdate: string; phone: string; email: string }) =>
      updateUserProfile(user.id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user-profile', user.id] })
      setOpen(false)
    },
  })

  const profile = data || { display_name: user.display_name, email: user.email, birthdate: '', phone: '' }
  const initial = (profile.display_name || profile.email || '?')[0]

  const [name, setName] = useState(profile.display_name || '')
  const [birth, setBirth] = useState(profile.birthdate || '')
  const [phone, setPhone] = useState(profile.phone || '')
  const [email, setEmail] = useState(profile.email || '')

  const handleOpen = () => {
    setName(profile.display_name || '')
    setBirth(profile.birthdate || '')
    setPhone(profile.phone || '')
    setEmail(profile.email || '')
    setOpen(true)
  }

  const handleSave = async () => {
    await m.mutateAsync({ display_name: name, birthdate: birth, phone, email })
  }

  return (
    <>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 h-full flex flex-col px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-blue-500 text-white flex items-center justify-center text-lg font-semibold">
            {initial}
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-slate-900">{profile.display_name}</div>
            <div className="text-xs text-slate-500">{profile.email}</div>
          </div>
        </div>
        <div className="mt-3 text-xs text-slate-500">
          오늘의 소비가 내일의 패턴을 만듭니다. 작은 기록부터 시작해보세요.
        </div>
        <button
          className="mt-4 self-start px-4 py-1.5 rounded-full border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50"
          onClick={handleOpen}
        >
          프로필 수정
        </button>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="프로필 수정">
        <div className="space-y-3 text-sm">
          <div>
            <label className="block text-xs text-slate-600 mb-1">이름</label>
            <input className="w-full border rounded px-2 py-1" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-slate-600 mb-1">생년월일</label>
            <input type="date" className="w-full border rounded px-2 py-1" value={birth} onChange={(e) => setBirth(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-slate-600 mb-1">전화번호</label>
            <input className="w-full border rounded px-2 py-1" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="010-0000-0000" />
          </div>
          <div>
            <label className="block text-xs text-slate-600 mb-1">이메일</label>
            <input className="w-full border rounded px-2 py-1" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <button className="px-3 py-1 rounded border text-xs" onClick={() => setOpen(false)}>
              취소
            </button>
            <button
              className="px-4 py-1 rounded bg-blue-600 text-white text-xs font-semibold disabled:opacity-60"
              onClick={handleSave}
              disabled={m.isPending}
            >
              {m.isPending ? '저장 중…' : '저장'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}

