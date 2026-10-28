/**
 * 일정 확정 함수들(adminConfirmSchedule · adminConfirmWardVisit · confirmSchedule)이 쓰는 판정.
 * firebase를 import하지 않는 순수 함수로 두어 테스트에서 바로 부른다.
 */

export interface ConfirmCaller {
  role: string | undefined
  uid: string
  assignedSeventyUid?: string
}

/**
 * 이 사람이 이 seventy의 과제를 확정해도 되는지. 안 되면 이유를, 되면 null을 돌려준다.
 * 확정은 같은 과제의 기존 일정을 지우고 다시 만들기도 하므로, 남의 과제를 확정할 수 있으면
 * 남의 일정을 지울 수 있다는 뜻이다.
 */
export function confirmDeniedReason(caller: ConfirmCaller, taskSeventyUid: string | undefined): string | null {
  if (caller.role === 'admin') return null
  if (caller.role === 'seventy') {
    return taskSeventyUid === caller.uid ? null : 'seventy can only confirm their own tasks'
  }
  if (caller.role === 'exec_secretary') {
    return caller.assignedSeventyUid && taskSeventyUid === caller.assignedSeventyUid
      ? null
      : 'exec_secretary can only confirm schedules for their assigned seventy'
  }
  return 'Only admin, seventy, or exec_secretary can confirm'
}

/**
 * 결정적 ID 자리에 이미 일정이 있어 확정할 수 없는지.
 * 취소는 문서를 지우지 않고 status만 'cancelled'로 바꾸므로, 취소된 자리는 다시 비어 있다.
 */
export function isSlotTaken(existing: { status?: unknown } | undefined): boolean {
  return existing !== undefined && existing.status !== 'cancelled'
}

/**
 * 회장이 직접 방문 날짜를 확정할 때(confirmSchedule) 요청이 과제와 맞는지. 맞으면 null.
 * 예전에는 type·unitId를 요청에서 그대로 받아, 다른 지역 와드의 확정 방문을 끼워 넣을 수 있었다.
 */
export function wardVisitConfirmError(
  task: { type?: unknown; unitId?: unknown; availableDates?: unknown },
  request: { unitId: string; date: string },
  callerUnitId: string | undefined,
): string | null {
  if (task.type !== 'select_visit') return 'Only ward visit tasks can be confirmed this way'
  const unitId = typeof task.unitId === 'string' && task.unitId ? task.unitId : callerUnitId
  if (!unitId || request.unitId !== unitId) return 'unitId does not match your unit'
  const dates = Array.isArray(task.availableDates) ? task.availableDates : []
  if (dates.length > 0 && !dates.includes(request.date)) return 'That date was not offered for this task'
  return null
}
