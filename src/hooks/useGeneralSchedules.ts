import { useEffect, useState } from 'react'
import { useAtomValue } from 'jotai'
import { subscribeToGeneralSchedules } from '@/services/generalScheduleService'
import { isGeneralScheduleRelevant } from '@/types'
import { authUserAtom } from '@/store/authAtom'
import type { GeneralSchedule } from '@/types'

export function useGeneralSchedules() {
  const user = useAtomValue(authUserAtom)
  const [all, setAll] = useState<GeneralSchedule[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = subscribeToGeneralSchedules(
      data => {
        setAll(data)
        setLoading(false)
      },
      () => setLoading(false),   // 권한/쿼리 오류 시에도 로딩 해제 (무한 로딩 방지)
    )
    return unsub
  }, [])

  const generalSchedules = user
    ? all.filter(gs => isGeneralScheduleRelevant(gs, user))
    : []

  return { generalSchedules, allGeneralSchedules: all, loading }
}
