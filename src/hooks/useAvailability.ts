import { useEffect, useState } from 'react'
import { getAvailabilitySlots } from '@/services/availabilityService'
import type { AvailabilitySlot } from '@/types'

export function useAvailability(seventyUid: string) {
  const [slots, setSlots] = useState<AvailabilitySlot[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!seventyUid) {
      setSlots([])
      setLoading(false)
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    getAvailabilitySlots(seventyUid)
      .then(data => { setSlots(data); setLoading(false) })
      .catch(e => { setError(e); setLoading(false) })
  }, [seventyUid])

  return { slots, loading, error, setSlots }
}
