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
    const unsub = subscribeToGeneralSchedules(data => {
      setAll(data)
      setLoading(false)
    })
    return unsub
  }, [])

  const generalSchedules = user
    ? all.filter(gs => isGeneralScheduleRelevant(gs, user))
    : []

  return { generalSchedules, allGeneralSchedules: all, loading }
}
