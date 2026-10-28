import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

dayjs.extend(utc)
dayjs.extend(timezone)

/**
 * 다음 달 첫 일요일(금식 주일)을 'YYYY-MM-DD'로 돌려준다.
 * 함수는 UTC에서 도는데 스케줄은 KST 1일 01:00이라, 서버 시계로 세면 아직 전달 말일이다 —
 * 그러면 "다음 달"이 막 시작한 이번 달이 된다. 그래서 날짜는 반드시 Asia/Seoul 기준으로 센다.
 * Formula: (7 - dow) % 7 — must stay in sync with src/utils/fastSunday.ts
 */
export function firstSundayOfNextMonthKst(nowMs: number = Date.now()): string {
  const nextMonth = dayjs(nowMs).tz('Asia/Seoul').add(1, 'month').startOf('month')
  const daysToSunday = (7 - nextMonth.day()) % 7
  return nextMonth.add(daysToSunday, 'day').format('YYYY-MM-DD')
}
