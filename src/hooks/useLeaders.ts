import { useCallback } from 'react'
import { useFirestoreSubscription } from './useFirestoreSubscription'
import { subscribeToLeaders } from '@/services/leaderService'
import type { Leader } from '@/types/leader'

export function useLeaders() {
  const { data: leaders, loading } = useFirestoreSubscription<Leader>(subscribeToLeaders)

  const getLeaderByUnitName = useCallback(
    (unitNameKo: string) => leaders.find(l => l.unitNameKo === unitNameKo),
    [leaders],
  )

  return { leaders, loading, getLeaderByUnitName }
}
