import { useAtomValue } from 'jotai'
import { authUserAtom } from '@/store/authAtom'
import { navItemsFor } from '@/components/layout/navItems'
import { useTasks } from '@/hooks/useTasks'

/**
 * 사이드바·탭바의 "처리 필요" 배지에 쓰는 숫자.
 *
 * 어떤 역할이 이 배지를 보는지는 navItems가 badge: 'pendingTasks'로 이미 선언한다 —
 * 여기서 역할을 다시 하드코딩하면 항목이 옮겨갈 때 조용히 어긋난다(배지를 그릴 곳이
 * 없는데도 Firestore 구독만 열리는 식으로).
 *
 * 셸은 모든 화면에서 마운트되어 있으므로, 배지가 없는 역할에는 빈 uid를 넘겨
 * 구독을 아예 열지 않는다 — useTasks는 빈 문자열이면 구독 없이 곧바로 빠진다.
 */
export function usePendingTaskCount(): number {
  const user = useAtomValue(authUserAtom)
  const needsBadge = user ? navItemsFor(user.role).some((i) => i.badge === 'pendingTasks') : false
  const { tasks } = useTasks(needsBadge && user ? user.uid : '')
  // subscribeToTasks는 pending + responded를 함께 실어 온다. "처리 필요"는
  // 아직 답하지 않은 것만 — 회장 홈 화면의 「처리 필요」 카드와 같은 기준이다.
  return needsBadge ? tasks.filter((task) => task.status === 'pending').length : 0
}
