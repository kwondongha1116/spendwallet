/**
 * AICommentBox
 * - AI 코멘트를 카드 형태로 표시
 */
export default function AICommentBox({ comment }: { comment?: string }) {
  return (
    <div className="bg-white rounded-md shadow p-4">
      <h3 className="text-sm font-medium mb-2">AI 코멘트</h3>
      <p className="text-gray-700 text-sm whitespace-pre-line">{comment || '코멘트가 없습니다.'}</p>
    </div>
  )
}

