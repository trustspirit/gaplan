/**
 * 행사(generalSchedules) 한 건을 구글 캘린더 이벤트 본문(summary/description/start/end)으로 만드는
 * 순수 함수. `calendarSync.ts`(schedules용)와 달리 startTime/endTime이 없을 수 있어(스테이크 대회처럼
 * 하루 종일인 경우) 종일(all-day) 표현이 필요하다 — `generalScheduleIcsEvent.ts`가 ICS VEVENT에서
 * 하는 것과 같은 구분을, 여기서는 구글 캘린더 API가 기대하는 { date } / { dateTime, timeZone } 형태로 한다.
 *
 * 시간대는 `calendarSync.ts`와 동일하게 KST(+09:00, Asia/Seoul)로 맞춘다.
 */
import dayjs from 'dayjs'
import { resolveGeneralScheduleEnd } from './generalScheduleDefaults'

export interface GeneralScheduleForCalendar {
  title: string
  description?: string | null
  date: string       // YYYY-MM-DD
  startTime?: string // HH:mm
  endTime?: string   // HH:mm
  // 여러 날에 걸친 행사의 종료일. 없으면 date 하루짜리로 취급한다.
  endDate?: string    // YYYY-MM-DD
}

export type CalendarEventTime = { date: string } | { dateTime: string; timeZone: string }

export interface GeneralScheduleEventBody {
  summary: string
  description?: string
  start: CalendarEventTime
  end: CalendarEventTime
}

export function generalScheduleEventBody(gs: GeneralScheduleForCalendar): GeneralScheduleEventBody {
  const description = gs.description ?? undefined

  if (gs.startTime) {
    // 행사는 endTime이 선택이라 시작만 있는 문서가 실제로 존재한다. 같은 시각으로 채우면
    // 길이 0짜리 이벤트가 되어 구글 캘린더에 점처럼 그려지므로, 폼이 자동으로 채우는 것과
    // 같은 기본 길이를 쓴다(generalScheduleDefaults.ts).
    // 여러 날에 걸친 행사는 종료가 endDate에 찍혀야 한다 — gs.date를 쓰면 둘째 날이 잘린다.
    const end = resolveGeneralScheduleEnd(
      gs.date,
      gs.startTime,
      gs.endDate ?? undefined,
      gs.endTime ?? undefined,
    )
    return {
      summary: gs.title,
      ...(description ? { description } : {}),
      start: { dateTime: `${gs.date}T${gs.startTime}:00+09:00`, timeZone: 'Asia/Seoul' },
      end: { dateTime: `${end.date}T${end.time}:00+09:00`, timeZone: 'Asia/Seoul' },
    }
  }

  // 종일 이벤트. 구글 캘린더의 end.date는 배타적(exclusive)이라 마지막 날 다음 날을 넣어야
  // 그 날까지 포함해 표시된다. endDate가 없으면 date 하루짜리이므로 date의 다음 날을 쓴다.
  const lastDay = gs.endDate ?? gs.date
  const endDateExclusive = dayjs(lastDay).add(1, 'day').format('YYYY-MM-DD')

  return {
    summary: gs.title,
    ...(description ? { description } : {}),
    start: { date: gs.date },
    end: { date: endDateExclusive },
  }
}
