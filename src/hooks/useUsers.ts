import { useEffect, useState } from 'react'
import { subscribeToUsers } from '@/services/userService'
import type { AppUser } from '@/types'

export function useUsers() {
  const [users, setUsers] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => subscribeToUsers(data => {
    setUsers(data)
    setLoading(false)
  }), [])
  return { users, loading }
}
