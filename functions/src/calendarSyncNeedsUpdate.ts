/**
 * calendarSync 트리거가 "이미 만든 구글 캘린더 이벤트를 다시 보낼지" 결정하는 비교.
 *
 * 트리거 안에 인라인으로 있던 것을 순수 함수로 뽑아 단위 테스트한다 — 트리거 자체는
 * firebase-admin Change 객체를 받아 리스트럭처링하기 부담스러워 여기서는 손대지 않는다.
 */
export interface CalendarSyncComparable {
  date?: unknown
  startTime?: unknown
  endTime?: unknown
  zoomLink?: string | null
  customTitle?: string | null
  unitId?: string | null
  wardName?: string | null
  notes?: string | null
  location?: string | null
  targetKind?: string | null
}

export function calendarSyncNeedsUpdate(
  before: CalendarSyncComparable | undefined,
  after: CalendarSyncComparable,
): boolean {
  return (
    before?.date !== after.date ||
    before?.startTime !== after.startTime ||
    before?.endTime !== after.endTime ||
    (before?.zoomLink ?? null) !== (after.zoomLink ?? null) ||
    (before?.customTitle ?? null) !== (after.customTitle ?? null) ||
    (before?.unitId ?? '') !== (after.unitId ?? '') ||
    (before?.wardName ?? null) !== (after.wardName ?? null) ||
    (before?.notes ?? null) !== (after.notes ?? null) ||
    (before?.location ?? null) !== (after.location ?? null) ||
    (before?.targetKind ?? null) !== (after.targetKind ?? null)
  )
}
