import { REGIONS } from '@/constants/regions'
import type { Task } from '@/types'

export interface TaskTotals {
  responded: number
  pending: number
  completed: number
  expired: number
}

/** 지역을 못 찾은 Task가 모이는 자리. `regionId: ''`가 실제로 들어온다. */
export const UNKNOWN_REGION = 'unknown'

export function countByStatus(tasks: Task[]): TaskTotals {
  return {
    responded: tasks.filter((t) => t.status === 'responded').length,
    pending: tasks.filter((t) => t.status === 'pending').length,
    completed: tasks.filter((t) => t.status === 'completed').length,
    expired: tasks.filter((t) => t.status === 'expired').length,
  }
}

export function groupTasksByRegion(tasks: Task[]): Record<string, Task[]> {
  return tasks.reduce<Record<string, Task[]>>((acc, task) => {
    const key = task.regionId || UNKNOWN_REGION
    ;(acc[key] ??= []).push(task)
    return acc
  }, {})
}

/**
 * 화면에 그릴 지역 순서. REGIONS가 정한 순서를 따르고, REGIONS가 모르는 키는
 * 뒤에 붙인다 — 지역이 추가되거나 이름이 바뀌어도 목록이 무작위로 흔들리지 않는다.
 */
export function orderedRegionIds(byRegion: Record<string, Task[]>): string[] {
  const known = REGIONS.map((r) => r.id).filter((id) => byRegion[id])
  const rest = Object.keys(byRegion).filter((id) => !REGIONS.some((r) => r.id === id))
  return [...known, ...rest]
}

/**
 * 응답 매트릭스를 그릴 접견 Task 묶음. 한 번에 뿌린 Task들이 같은 `batchId`를
 * 갖는다. 아무도 답하지 않은 배치는 빈 격자만 남으므로 뺀다.
 */
export function interviewBatches(tasks: Task[]): Task[][] {
  const groups: Record<string, Task[]> = {}
  for (const task of tasks) {
    if (task.type !== 'select_interview') continue
    const key = task.batchId ?? task.id
    ;(groups[key] ??= []).push(task)
  }
  return Object.values(groups).filter((batch) =>
    batch.some((t) => t.status === 'responded' || t.status === 'completed'),
  )
}
