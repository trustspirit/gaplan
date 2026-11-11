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
  if (!isMultiDaySchedule(s)) return { startTime: s.startTime, endTime: s.endTime }
  return {
    startTime: date === s.date ? s.startTime : '00:00',
    endTime: date === scheduleLastDate(s) ? s.endTime : '24:00',
  }
}
