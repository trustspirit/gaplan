import { useEffect, useState } from 'react'
import { subscribeToVisitPlans } from '@/services/visitPlanService'
import type { VisitPlan } from '@/types'

export function useVisitPlans() {
  const [plans, setPlans] = useState<VisitPlan[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = subscribeToVisitPlans(
      data => { setPlans(data); setLoading(false) },
      () => setLoading(false),
    )
    return unsub
  }, [])

  return { plans, loading }
}
