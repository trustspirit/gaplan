// schedules/{id} 문서에는 두 개의 onWrite 트리거가 걸려 있고(calendarSync,
// kakaoCalendarSync) 둘 다 동기화 결과를 같은 문서에 되쓴다. 그 되쓰기는 다시
// 두 트리거를 모두 깨우는데, 이때 상대 트리거는 "아직 내 이벤트 id가 없다"고
// 오판해 이벤트를 한 번 더 만든다. 되쓰기 순서는 비결정적이라 어느 쪽이든
// 당할 수 있다.
//
// 해결: 장부(bookkeeping) 필드만 바뀐 write는 두 트리거 모두 무시한다.
// 이 필드들은 동기화의 "결과"일 뿐 입력이 아니므로, 이것만 바뀐 write에는
// 캘린더 쪽에서 할 일이 아무것도 없다.
//
// generalSchedules/{id}의 generalScheduleCalendarSync도 같은 문제를 겪는다 —
// 그 트리거가 googleCalendarEventIds(복수형)를 되쓰면 스스로를 재호출한다.
// schedules 컬렉션 문서에는 이 필드가 존재하지 않으므로 목록에 같이 둬도
// 기존 두 트리거의 판단에는 영향이 없다.
const BOOKKEEPING_FIELDS = ['googleCalendarEventId', 'kakaoEventIds', 'googleCalendarEventIds']

export function isBookkeepingOnlyWrite(
  before: Record<string, unknown> | undefined,
  after: Record<string, unknown> | undefined,
): boolean {
  // 생성(before 없음)과 삭제(after 없음)는 장부 write가 아니다 — 각 트리거의
  // 생성/삭제 경로가 그대로 돌아야 한다.
  if (!before || !after) return false
  const keys = new Set([...Object.keys(before), ...Object.keys(after)])
  for (const k of keys) {
    if (BOOKKEEPING_FIELDS.includes(k)) continue
    if (JSON.stringify(before[k]) !== JSON.stringify(after[k])) return false
  }
  return true
}
