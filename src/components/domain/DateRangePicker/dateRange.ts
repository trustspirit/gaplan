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
 * 이미 정해진 것(이 둘은 dateRange.test.ts가 검사한다):
 *   - 아무것도 고르지 않은 상태에서 누르면 그날 하루짜리가 된다.
 *   - 시작일만 있는 상태에서 그보다 뒤 날짜를 누르면 그날이 종료일이 된다.
 *
 * 날짜는 YYYY-MM-DD 문자열이라 `<`, `>`로 바로 비교할 수 있다.
 */
export function nextDateRange(current: DateRange, clicked: string): DateRange {
  // 시작일만 있고 그보다 뒤를 눌렀다 → 범위가 완성된다.
  if (current.start && !current.end && clicked > current.start) {
    return { start: current.start, end: clicked }
  }

  // TODO(사용자 결정): 아래 세 경우는 아직 정하지 않았다. 지금은 셋 다 "누른 날부터 새로 시작"이다.
  //   1. 시작일만 있는데 그보다 **앞** 날짜를 눌렀다 → 시작일을 옮긴다? 두 날을 맞바꿔 범위로 만든다?
  //   2. 시작일만 있는데 **같은 날**을 다시 눌렀다 → 그대로 하루짜리? 선택을 지운다?
  //   3. 범위가 이미 있는데 또 눌렀다 → 누른 날부터 새로 시작? 가까운 쪽 끝을 옮긴다?
  return { start: clicked, end: '' }
}

/** 이 날짜가 선택 범위 안(양 끝 포함)에 있는가. 하루짜리는 시작일 하루만이다. */
export function isInDateRange(range: DateRange, date: string): boolean {
  if (!range.start) return false
  if (!range.end) return date === range.start
  return range.start <= date && date <= range.end
}
