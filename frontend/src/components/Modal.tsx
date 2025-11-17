import { ReactNode } from 'react'

export default function Modal({ open, onClose, children, title }: { open: boolean; onClose: () => void; children: ReactNode; title?: string }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose}></div>
      <div className="relative bg-white rounded-md shadow-xl w-full max-w-lg p-4">
        {title ? <h3 className="text-lg font-semibold mb-2">{title}</h3> : null}
        <div>{children}</div>
        <div className="mt-4 text-right">
          <button onClick={onClose} className="px-3 py-1 rounded bg-gray-100">닫기</button>
        </div>
      </div>
    </div>
  )
}

