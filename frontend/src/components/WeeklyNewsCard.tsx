import { useWeeklyNewsInsight } from '../hooks/useInsights'
import { useAuthState } from '../hooks/useAuth'

export default function WeeklyNewsCard() {
  const { user } = useAuthState()
  const userId = user?.id || 'demo-user-1'
  const { data, isLoading, error } = useWeeklyNewsInsight({ user_id: userId })

  if (error) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 text-sm text-gray-700">
        <div className="text-sm font-medium mb-2">📢 이번 주 이슈 브리핑</div>
        <div className="text-xs text-red-400">뉴스 인사이트를 불러오지 못했어요.</div>
      </div>
    )
  }

  if (isLoading || !data) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 text-sm text-gray-700">
        <div className="text-sm font-medium mb-2">📢 이번 주 이슈 브리핑</div>
        <div className="text-xs text-gray-500">뉴스를 모으는 중이에요…</div>
      </div>
    )
  }

  const { headlines, top_category, insight } = data

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 text-sm text-gray-800">
      <div className="text-sm font-medium mb-2">📢 이번 주 이슈 브리핑</div>

      <div className="space-y-1 mb-3">
        {headlines.map((h, idx) => {
          const hasUrl = h.url && h.url.length > 0
          const content = (
            <>
              <span className="mt-[2px] text-[11px]">📰</span>
              <span className="leading-snug">{h.title}</span>
            </>
          )
          return (
            <div key={idx} className="flex items-start gap-1">
              {hasUrl ? (
                <a
                  href={h.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 text-blue-700 hover:underline"
                >
                  {content}
                </a>
              ) : (
                <div className="flex-1">{content}</div>
              )}
            </div>
          )
        })}
        {headlines.length === 0 && (
          <div className="text-xs text-gray-500">
            이번 주에는 가져올 헤드라인이 많지 않았어요. 대신 분위기만 간단히 정리해 드릴게요.
          </div>
        )}
      </div>

      <div className="mt-1 border-t border-slate-100 pt-2">
        <div className="text-[11px] text-gray-500 mb-1">
          내 대표 소비 카테고리: <span className="font-medium">{top_category}</span>
        </div>
        <div className="text-sm leading-relaxed whitespace-pre-line">{insight.summary}</div>
      </div>
    </div>
  )
}

