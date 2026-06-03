import { useEffect, useState } from 'react'
import { subscribeToSchedules } from '@/services/scheduleService'
import type { Schedule } from '@/types'

interface UseSchedulesOptions { presidentUid?: string; seventyUid?: string }

export function useSchedules(options: UseSchedulesOptions) {
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const unsub = subscribeToSchedules(options, data => {
      setSchedules(data)
      setLoading(false)
    })
    return unsub
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.presidentUid, options.seventyUid])

  return { schedules, loading }
}
