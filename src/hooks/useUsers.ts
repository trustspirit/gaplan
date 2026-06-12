import { useFirestoreSubscription } from './useFirestoreSubscription'
import { subscribeToUsers } from '@/services/userService'
import type { AppUser } from '@/types'

export function useUsers() {
  const { data: users, loading } = useFirestoreSubscription<AppUser>(subscribeToUsers)
  return { users, loading }
}
