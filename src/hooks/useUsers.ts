import { useEffect, useState } from 'react'
import { subscribeToUsers } from '@/services/userService'
import type { AppUser } from '@/types'

export function useUsers() {
  const [users, setUsers] = useState<AppUser[]>([])
  useEffect(() => subscribeToUsers(setUsers), [])
  return { users }
}
