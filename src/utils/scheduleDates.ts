import dayjs from 'dayjs'
import { isAllDaySchedule, isMultiDaySchedule, scheduleLastDate } from '../../functions/src/scheduleDates'
// 여러 날 모임의 날짜 규칙은 서버와 브라우저가 같은 파일을 쓴다 — 규칙과 이유는 그쪽 주석에 있다.
export * from '../../functions/src/scheduleDates'


/**
 * 일정의 시간을 한 줄로. 목록·달력·홈·공개 페이지가 같은 모양을 쓰도록 여기 하나로 둔다.
 *   하루짜리        "10:00 – 11:00"
 *   여러 날         "18:00 – 12.5 12:00"   (종료 시각 앞에 마지막 날)
 *   종일            "종일"
 *   여러 날 종일    "종일 – 12.5"
 * @param allDayLabel "종일"에 해당하는 번역 문자열
 */
export function scheduleTimeLabel(
  s: { date: string; endDate?: string | null; startTime: string; endTime: string; allDay?: boolean | null },
  allDayLabel: string,
): string {
  const lastDay = isMultiDaySchedule(s) ? dayjs(scheduleLastDate(s)).format('M.D') : null
  if (isAllDaySchedule(s)) return lastDay ? `${allDayLabel} – ${lastDay}` : allDayLabel
  return lastDay ? `${s.startTime} – ${lastDay} ${s.endTime}` : `${s.startTime} – ${s.endTime}`
}

