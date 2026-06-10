import { useEffect, useState } from 'react'
import { subscribeToGeneralSchedules } from '@/services/generalScheduleService'
import type { GeneralSchedule } from '@/types'

export function useGeneralSchedules() {
  const [generalSchedules, setGeneralSchedules] = useState<GeneralSchedule[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = subscribeToGeneralSchedules(data => {
      setGeneralSchedules(data)
      setLoading(false)
    })
    return unsub
  }, [])

  return { generalSchedules, loading }
}
