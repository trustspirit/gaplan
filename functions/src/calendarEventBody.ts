import { allDayExclusiveEndDate, isAllDaySchedule, scheduleLastDate } from './scheduleDates'

/**
 * 구글 캘린더 이벤트의 location·description.
 *
 * location은 예전에 Zoom URL을 담고 있었다. 지도 검색에 쓰이는 칸이라 URL은 맞지
 * 않지만, 그렇다고 그냥 빼면 캘린더에서 회의 링크가 사라진다. 그래서 URL은
 * description으로 옮긴다 — 구글이 설명 안의 URL을 클릭 가능하게 렌더한다.
 *
 * 빈 문자열과 undefined는 뜻이 다르다. 빈 문자열은 "이 칸을 지워라",
 * undefined는 "건드리지 마라"다. 장소가 없어졌으면 지워야 한다.
 */
export function buildCalendarEventFields(p: {
  location?: string | null
  zoomLink?: string | null
  notes?: string | null
}): { location: string; description: string } {
  const lines: string[] = []
  const zoom = p.zoomLink?.trim()
  if (zoom) lines.push(`줌: ${zoom}`)
  const notes = p.notes?.trim()
  if (notes) lines.push(notes)
  return { location: p.location?.trim() ?? '', description: lines.join('\n') }
}

export interface GoogleEventTimesInput {
  date: string
  endDate?: string | null
  startTime: string
  endTime: string
  allDay?: boolean | null
}

type GoogleEventTime = { dateTime: string; timeZone: string } | { date: string }

/**
 * 구글 캘린더 이벤트의 start·end.
 *
 * 시간이 있는 일정은 KST 시각으로, 종일 일정은 시각 없이 날짜로 보낸다. 종일 이벤트의 end는
 * 마지막 날 다음 날이다(구글은 그날을 포함하지 않는다) — 하루짜리 종일 일정도 end가 다음 날이다.
 * 여러 날 모임은 마지막 날(endDate)의 endTime에 끝난다.
 */
export function googleEventTimes(s: GoogleEventTimesInput): { start: GoogleEventTime; end: GoogleEventTime } {
  if (isAllDaySchedule(s)) {
    return { start: { date: s.date }, end: { date: allDayExclusiveEndDate(s) } }
  }
  return {
    start: { dateTime: `${s.date}T${s.startTime}:00+09:00`, timeZone: 'Asia/Seoul' },
    end: { dateTime: `${scheduleLastDate(s)}T${s.endTime}:00+09:00`, timeZone: 'Asia/Seoul' },
  }
}
