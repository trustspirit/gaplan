/**
 * 날짜 범위 선택의 상태와, 날짜를 한 번 눌렀을 때 그 상태가 어떻게 바뀌는지에 대한 규칙.
 *
 * 달력 컴포넌트(DateRangePicker)는 그리기만 하고, "누르면 무엇이 선택되는가"는 전부 여기서
 * 정한다 — 그래서 달력을 띄우지 않고도 규칙만 따로 검사할 수 있다.
 */
export interface DateRange {
  start: string   // YYYY-MM-DD. '' = 아직 아무것도 고르지 않음
  end: string     // YYYY-MM-DD. '' = 하루짜리(종료일 없음). 있으면 항상 start보다 뒤다
}

export const EMPTY_DATE_RANGE: DateRange = { start: '', end: '' }

/**
 * 지금 선택이 `current`일 때 `clicked` 날짜를 누르면 선택이 무엇이 되는가.
 *
 *   - 아무것도 고르지 않았으면 그날 하루짜리가 된다.
 *   - 시작일만 있고 그보다 뒤 날짜를 누르면 그날이 종료일이 된다.
 *   - 그 밖에는(시작일보다 앞이나 같은 날을 눌렀거나, 이미 범위가 있는데 또 눌렀으면)
 *     누른 날부터 새로 시작한다. 범위를 고치려면 처음부터 다시 누른다 — 어느 쪽 끝이 옮겨질지
 *     짐작하게 하지 않는다.
 *
 * 날짜는 YYYY-MM-DD 문자열이라 `<`, `>`로 바로 비교할 수 있다.
 */
export function nextDateRange(current: DateRange, clicked: string): DateRange {
  if (current.start && !current.end && clicked > current.start) {
    return { start: current.start, end: clicked }
  }
  return { start: clicked, end: '' }
}

/** 이 날짜가 선택 범위 안(양 끝 포함)에 있는가. 하루짜리는 시작일 하루만이다. */
export function isInDateRange(range: DateRange, date: string): boolean {
  if (!range.start) return false
  if (!range.end) return date === range.start
  return range.start <= date && date <= range.end
}
