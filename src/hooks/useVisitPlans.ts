import { useFirestoreSubscription } from './useFirestoreSubscription'
import { subscribeToVisitPlans } from '@/services/visitPlanService'
import type { VisitPlan } from '@/types'

export function useVisitPlans() {
  const { data: plans, loading } = useFirestoreSubscription<VisitPlan>(subscribeToVisitPlans)
  return { plans, loading }
}
