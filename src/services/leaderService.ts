import { collection, onSnapshot, type Unsubscribe } from 'firebase/firestore'
import { db } from '@/firebase'
import type { Leader } from '@/types/leader'

export function subscribeToLeaders(
  onData: (leaders: Leader[]) => void,
  onError?: (e: Error) => void,
): Unsubscribe {
  return onSnapshot(
    collection(db, 'leaders'),
    snap => onData(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Leader)),
    err => {
      console.error('[leaders] onSnapshot error:', err.code, err.message)
      onError?.(err)
    },
  )
}
