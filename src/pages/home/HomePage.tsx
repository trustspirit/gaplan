import { useAtomValue } from 'jotai'
import { authUserAtom } from '@/store/authAtom'
import { ROLE } from '@/constants/roles'
import { PresidentHome } from './PresidentHome'
import { SeventyHome } from './SeventyHome'
import { AdminHome } from './AdminHome'

/**
 * 역할만 고른다. 세 화면은 서로 아무것도 공유하지 않으므로 각자의 파일에서
 * 각자의 훅을 부른다 — 한 파일에 있을 때는 회장 홈 하나를 테스트하려 해도
 * 나머지 둘의 훅까지 전부 mock해야 했다(판정 R42).
 */
export function HomePage() {
  const user = useAtomValue(authUserAtom)!
  if (user.role === ROLE.SEVENTY) return <SeventyHome />
  if (user.role === ROLE.ADMIN || user.role === ROLE.EXEC_SECRETARY) return <AdminHome />
  return <PresidentHome />
}
