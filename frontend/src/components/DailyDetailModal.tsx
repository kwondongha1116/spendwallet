import Modal from './Modal'

type Item = { memo: string; amount: number; category?: string; tags?: string[]; spentAt: string }

export default function DailyDetailModal({ open, onClose, date, items, aiComment }: { open: boolean; onClose: () => void; date: string; items: Item[]; aiComment?: string }) {
  return (
    <Modal open={open} onClose={onClose} title={`${date} 소비 내역`}>
      {items.length === 0 ? (
        <div className="text-sm text-gray-600">기록이 없습니다.</div>
      ) : (
        <div className="space-y-2">
          {items.map((it, idx) => (
            <div key={idx} className="flex justify-between text-sm">
              <div>
                <div className="font-medium">{it.memo}</div>
                <div className="text-gray-500">{it.category || '기타'} · {(it.tags || []).join(', ')}</div>
              </div>
              <div className="font-semibold">{it.amount.toLocaleString()}원</div>
            </div>
          ))}
        </div>
      )}
      <div className="mt-4 p-3 rounded bg-gray-50">
        <div className="text-xs text-gray-600 mb-1">AI 코멘트</div>
        <div className="text-sm text-gray-800">{aiComment || '코멘트가 없습니다.'}</div>
      </div>
    </Modal>
  )
}

