import { useEffect, useState } from 'react'
import { useAtomValue } from 'jotai'
import { subscribeToGeneralSchedules } from '@/services/generalScheduleService'
import { isGeneralScheduleRelevant } from '@/types'
import { authUserAtom } from '@/store/authAtom'
import type { GeneralSchedule } from '@/types'
import { canSeeSeventyOnlyEvents } from '@/utils/permissions'

export function useGeneralSchedules() {
  const user = useAtomValue(authUserAtom)
  const [all, setAll] = useState<GeneralSchedule[]>([])
  const [loading, setLoading] = useState(true)

  // 회장 등은 칠십인 전용 행사를 뺀 조회만 규칙을 통과한다 — 역할이 정해지면 그에 맞춰 다시 구독한다.
  const includeSeventyOnly = canSeeSeventyOnlyEvents(user)

  useEffect(() => {
    const unsub = subscribeToGeneralSchedules(
      data => {
        setAll(data)
        setLoading(false)
      },
      () => setLoading(false),   // 권한/쿼리 오류 시에도 로딩 해제 (무한 로딩 방지)
      { includeSeventyOnly },
    )
    return unsub
  }, [includeSeventyOnly])

  const generalSchedules = user
    ? all.filter(gs => isGeneralScheduleRelevant(gs, user))
    : []

  return { generalSchedules, allGeneralSchedules: all, loading }
}
