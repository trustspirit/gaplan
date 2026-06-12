import { useCallback, useEffect, useState } from 'react'
import { subscribeToLeaders } from '@/services/leaderService'
import type { Leader } from '@/types/leader'

export function useLeaders() {
  const [leaders, setLeaders] = useState<Leader[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = subscribeToLeaders(
      data => { setLeaders(data); setLoading(false) },
      () => setLoading(false),
    )
    return unsub
  }, [])

  const getLeaderByUnitName = useCallback(
    (unitNameKo: string) => leaders.find(l => l.unitNameKo === unitNameKo),
    [leaders],
  )

  return { leaders, loading, getLeaderByUnitName }
}
