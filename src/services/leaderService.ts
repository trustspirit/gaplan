import { collection, onSnapshot, type Unsubscribe } from 'firebase/firestore'
import { db } from '@/firebase'
import type { Leader } from '@/types/leader'
import { mapDocs, snapshotErrHandler } from './_utils'

export function subscribeToLeaders(
  onData: (leaders: Leader[]) => void,
  onError?: (e: Error) => void,
): Unsubscribe {
  return onSnapshot(
    collection(db, 'leaders'),
    snap => onData(mapDocs<Leader>(snap)),
    snapshotErrHandler('leaders', onError),
  )
}
