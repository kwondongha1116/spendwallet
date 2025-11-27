import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import { useMemo } from 'react'

type Props = {
  summaries: Record<string, number>
  onDateClick?: (dateStr: string) => void
  onMonthChange?: (monthStr: string) => void // YYYY-MM
}

/**
 * CalendarView
 * - 날짜별 합계를 "- 20k" 형태로 표시
 * - summaries: { 'YYYY-MM-DD': totalAmount }
 */
export default function CalendarView({ summaries, onDateClick, onMonthChange }: Props) {
  const events = useMemo(() => {
    return Object.entries(summaries).map(([date, amount]) => {
      const k = Math.round((amount || 0) / 1000)
      const label = k > 0 ? `- ${k}k` : `- ${amount.toLocaleString()}`
      return {
        title: label,
        start: date,
        allDay: true,
      }
    })
  }, [summaries])

  return (
    <div className="bg-white rounded-md shadow p-4">
      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        events={events}
        eventDisplay="block"
        height={650}
        dateClick={(info) => onDateClick?.(info.dateStr)}
        eventClick={(info) => {
          const d = info.event.startStr?.slice(0, 10)
          if (d) onDateClick?.(d)
        }}
        datesSet={(arg) => {
          const currentStart: Date = (arg.view as any).currentStart || arg.start
          const y = currentStart.getFullYear()
          const m = String(currentStart.getMonth() + 1).padStart(2, '0')
          onMonthChange?.(`${y}-${m}`)
        }}
        dayCellDidMount={(arg) => {
          arg.el.setAttribute('title', '일간 분석 확인하기')
          arg.el.style.cursor = 'pointer'
          arg.el.classList.add('calendar-cell')
        }}
      />
    </div>
  )
}

