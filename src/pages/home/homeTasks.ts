import type { Task } from '@/types'

export interface HomeTaskSplit {
  /** 큰 카드로 올릴 하나. 지금 할 수 있는 일이 없으면 null. */
  primary: Task | null
  /** 접힘 목록에 들어갈 나머지. pending이 먼저, responded가 뒤. */
  rest: Task[]
}

/**
 * 마감이 이른 순, 동률이면 id 순. 구독 순서가 화면을 정하지 못하게 한다
 * (판정 R39) — 정렬이 불안정하면 같은 화면을 두 번 열 때 다른 Task가 올라온다.
 */
function byDueThenId(a: Task, b: Task): number {
  return a.dueDate === b.dueDate ? a.id.localeCompare(b.id) : a.dueDate.localeCompare(b.dueDate)
}

export function splitHomeTasks(tasks: Task[]): HomeTaskSplit {
  // 호출자의 배열은 Firestore 구독이 들고 있는 것이다. sort는 제자리 정렬이므로
  // 반드시 복사본에 건다.
  const pending = tasks.filter((t) => t.status === 'pending').sort(byDueThenId)
  const responded = tasks.filter((t) => t.status === 'responded').sort(byDueThenId)

  // 판정 R40 — responded는 회장이 더 할 게 없는 상태라 주 카드가 되지 않는다.
  const [primary = null, ...restPending] = pending
  return { primary, rest: [...restPending, ...responded] }
}
