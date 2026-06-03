import {
  collection, query, where, onSnapshot, orderBy,
  type Unsubscribe,
} from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions } from '@/firebase'
import type { Schedule, TimeSlot } from '@/types'

export function subscribeToSchedules(
  filters: { presidentUid?: string; seventyUid?: string },
  callback: (schedules: Schedule[]) => void,
): Unsubscribe {
  let q = query(collection(db, 'schedules'), orderBy('date', 'asc'))
  if (filters.presidentUid)
    q = query(q, where('presidentUid', '==', filters.presidentUid))
  if (filters.seventyUid)
    q = query(q, where('seventyUid', '==', filters.seventyUid))
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Schedule)
    )
  })
}

interface ConfirmScheduleParams {
  taskId: string
  seventyUid: string
  unitId: string
  slot: TimeSlot
  type: 'ward_visit' | 'interview'
}
interface ConfirmScheduleResult { success: boolean; scheduleId?: string; error?: string }

export async function confirmSchedule(params: ConfirmScheduleParams): Promise<ConfirmScheduleResult> {
  const fn = httpsCallable<ConfirmScheduleParams, ConfirmScheduleResult>(functions, 'confirmSchedule')
  const result = await fn(params)
  return result.data
}
