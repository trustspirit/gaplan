import { useAtomValue } from 'jotai'
import { authUserAtom } from '@/store/authAtom'
import { ROLE } from '@/constants/roles'
import { useTasks } from '@/hooks/useTasks'

// 배지가 붙는 항목(`tasks`)은 회장에게만 있다. 셸은 모든 화면에서 마운트되어
// 있으므로 다른 역할에서는 빈 uid를 넘겨 구독을 열지 않는다 — useTasks는 빈
// 문자열이면 구독 없이 곧바로 빠진다.
export function usePendingTaskCount(): number {
  const user = useAtomValue(authUserAtom)
  const isPresident = user?.role === ROLE.PRESIDENT
  const { tasks } = useTasks(isPresident ? user.uid : '')
  return isPresident ? tasks.length : 0
}
