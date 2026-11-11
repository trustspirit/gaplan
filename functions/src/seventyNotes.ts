/**
 * 일정의 "칠십인 전용 메모".
 *
 * 일정 문서(schedules/{id})의 notes는 그 일정에 연결된 회장도 읽고, CC·스테이크 공개 페이지와
 * 구글·카카오 캘린더에도 실린다. 칠십인만 봐야 하는 메모는 그래서 일정 문서에 둘 수 없다 —
 * Firestore 규칙은 문서 단위라 한 필드만 가릴 수 없다. 별도 컬렉션
 * scheduleSeventyNotes/{scheduleId}에 두고 규칙으로 관리자·그 칠십인·담당 집행서기만 읽게 한다.
 *
 * 이 메모가 나가는 곳은 둘뿐이다: 로그인한 그 세 역할의 앱 화면, 그리고 칠십인 전용 공개
 * 페이지(전체 공유 토큰)와 그 구독. 캘린더 동기화는 일정 문서만 읽으므로 자동으로 빠진다.
 *
 * 문서 모양: { seventyUid, date, notes }. seventyUid는 규칙이 읽을 사람을 가리는 데 쓰고,
 * date는 공개 페이지가 지난 메모를 통째로 읽지 않도록 범위 조회하는 데 쓴다 — 일정의 날짜를
 * 고치면 이 값도 같이 고쳐야 한다(adminEditSchedule).
 *
 * `scheduleRules.ts`처럼 import가 하나도 없다.
 */
export const SEVENTY_NOTES_COLLECTION = 'scheduleSeventyNotes'
export const SEVENTY_NOTES_MAX_LENGTH = 1000

// 행사(generalSchedules)의 칠십인 전용 메모. 행사 문서도 회장이 읽으므로 같은 이유로 따로 둔다.
// 문서 모양: { date, notes } — 행사는 한 칠십인의 것이 아니라서 seventyUid가 없고,
// 관리자·칠십인·집행서기 누구나 읽는다(칠십인 전용 행사를 볼 수 있는 사람과 같다).
// 행사는 Cloud Functions를 거치지 않고 브라우저가 직접 쓰므로 이 문서도 브라우저가 쓴다.
export const GENERAL_SEVENTY_NOTES_COLLECTION = 'generalScheduleSeventyNotes'

/** 앞뒤 공백을 걷어낸 메모. 비어 있으면 null(= 메모 없음, 문서를 지운다). */
export function normalizeSeventyNotes(value: string | null | undefined): string | null {
  const trimmed = typeof value === 'string' ? value.trim() : ''
  return trimmed ? trimmed : null
}

/** 요청으로 받은 값이 받아들일 수 있는 모양인가(문자열이고 길이 제한 안). null은 '지움'이다. */
export function isValidSeventyNotesInput(value: unknown): value is string | null {
  if (value === null) return true
  return typeof value === 'string' && value.length <= SEVENTY_NOTES_MAX_LENGTH
}
