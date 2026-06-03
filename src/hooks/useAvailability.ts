import { useEffect, useState } from 'react'
import { getAvailabilitySlots } from '@/services/availabilityService'
import type { AvailabilitySlot } from '@/types'

export function useAvailability(seventyUid: string) {
  const [slots, setSlots] = useState<AvailabilitySlot[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!seventyUid) return
    getAvailabilitySlots(seventyUid).then(data => {
      setSlots(data)
      setLoading(false)
    })
  }, [seventyUid])

  return { slots, loading, setSlots }
}
