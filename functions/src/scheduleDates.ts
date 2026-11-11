/**
 * 여러 날에 걸친 일정(모임)의 날짜 규칙.
 *
 * 일정은 원래 하루짜리였다(date 하나). 모임만 여러 날일 수 있어 endDate(마지막 날)가 붙는다.
 * 행사(generalSchedules)와 같은 약속이다: startTime은 첫날의 시작 시각, endTime은 마지막 날의
 * 종료 시각. endDate가 없거나 date보다 이르거나 같으면 하루짜리로 읽는다.
 *
 * 서버(캘린더 동기화·공개 페이지·구독)와 브라우저(달력·목록)가 같은 규칙을 써야 같은 모임을
 * 다르게 보여주지 않는다. 그래서 `scheduleRules.ts`처럼 import가 하나도 없고, 브라우저 쪽도
 * 이 파일을 그대로 가져다 쓴다.
 */
export interface ScheduleDates {
  date: string             // YYYY-MM-DD, 첫날
  endDate?: string | null  // YYYY-MM-DD, 마지막 날. 하루짜리면 없다
}

export function isMultiDaySchedule(s: ScheduleDates): boolean {
  return !!s.endDate && s.endDate > s.date
}

/** 일정의 마지막 날. 하루짜리면 date 그대로다. */
export function scheduleLastDate(s: ScheduleDates): string {
  return isMultiDaySchedule(s) ? (s.endDate as string) : s.date
}

/** 이 일정이 주어진 날짜에 걸쳐 있는가(첫날·마지막 날 포함). */
export function scheduleCoversDate(s: ScheduleDates, date: string): boolean {
  return s.date <= date && date <= scheduleLastDate(s)
}

/**
 * 여러 날 일정이 주어진 날짜에 차지하는 시간 구간. 달력의 시간 격자가 하루 단위로 그리므로
 * 날마다 잘라서 준다: 첫날은 시작 시각부터 자정까지, 가운데 날은 하루 종일, 마지막 날은
 * 자정부터 종료 시각까지. 하루짜리는 원래 시간 그대로다.
 */
export function scheduleTimesOnDate(
  s: ScheduleDates & { startTime: string; endTime: string },
  date: string,
): { startTime: string; endTime: string } {
  // 종일 일정은 걸쳐 있는 모든 날에 하루 종일이다.
  if ((s as { allDay?: unknown }).allDay === true) return { startTime: '00:00', endTime: '24:00' }
  if (!isMultiDaySchedule(s)) return { startTime: s.startTime, endTime: s.endTime }
  return {
    startTime: date === s.date ? s.startTime : '00:00',
    endTime: date === scheduleLastDate(s) ? s.endTime : '24:00',
  }
}

// ── 종일 일정 ────────────────────────────────────────────────────────────────
// 시간을 정하지 않은 일정은 allDay: true로 저장한다. startTime/endTime은 비우지 않고 하루의
// 처음과 끝으로 채워 둔다 — 정렬·진행 중 판정·겹침 계산이 전부 이 두 문자열을 비교하므로,
// 비워 두면 그 경로를 하나하나 고쳐야 하고 하나라도 빠뜨리면 깨진다. 화면과 캘린더 동기화는
// allDay를 보고 시각 대신 "종일"로 다룬다.
export const ALL_DAY_START_TIME = '00:00'
export const ALL_DAY_END_TIME = '23:59'

export function isAllDaySchedule(s: { allDay?: unknown } | null | undefined): boolean {
  return s?.allDay === true
}

/** YYYY-MM-DD에 하루를 더한다. UTC로 계산해 실행 환경의 시간대에 흔들리지 않는다. */
export function addOneDay(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  const next = new Date(Date.UTC(y, m - 1, d))
  next.setUTCDate(next.getUTCDate() + 1)
  return next.toISOString().slice(0, 10)
}

/**
 * 종일 일정이 캘린더에서 끝나는 날. 구글 캘린더·ICS·카카오 모두 종일 이벤트의 끝을
 * "마지막 날 다음 날"(그날은 포함하지 않음)로 적는다.
 */
export function allDayExclusiveEndDate(s: ScheduleDates): string {
  return addOneDay(scheduleLastDate(s))
}

