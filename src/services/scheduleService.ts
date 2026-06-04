import {
  collection, query, where, onSnapshot, orderBy,
  doc, setDoc, updateDoc, deleteDoc, serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import dayjs from 'dayjs'
import { db, functions, auth } from '@/firebase'
import type { Schedule, TimeSlot } from '@/types'

export function subscribeToSchedules(
  filters: { presidentUid?: string; seventyUid?: string },
  callback: (schedules: Schedule[]) => void,
): Unsubscribe {
  let q = query(collection(db, 'schedules'), orderBy('date', 'asc'))
  if (filters.presidentUid)
    q = query(q, where('presidentUid', '==', filters.presidentUid))
  else if (filters.seventyUid)
    q = query(q, where('seventyUid', '==', filters.seventyUid))
  else {
    // Admin view: limit to ±6 months to avoid unbounded collection scan
    const sixMonthsAgo = dayjs().subtract(6, 'month').format('YYYY-MM-DD')
    q = query(q, where('date', '>=', sixMonthsAgo))
  }
  return onSnapshot(q,
    snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Schedule)),
    err => console.error('[schedules] onSnapshot error:', err.code, err.message),
  )
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

interface AdminConfirmParams {
  taskId: string
  slot: { date: string; startTime: string; endTime: string }
}

export async function adminConfirmSchedule(params: AdminConfirmParams): Promise<ConfirmScheduleResult> {
  const fn = httpsCallable<AdminConfirmParams, ConfirmScheduleResult>(functions, 'adminConfirmSchedule')
  const result = await fn(params)
  return result.data
}

interface AdminConfirmWardVisitResult { success: boolean; scheduleCount?: number; error?: string }

interface ManualSyncResult { success: boolean; synced: number; failed: number; message: string }

export async function manualCalendarSync(): Promise<ManualSyncResult> {
  const fn = httpsCallable<void, ManualSyncResult>(functions, 'manualCalendarSync')
  const result = await fn()
  return result.data
}

export async function adminConfirmWardVisit(taskId: string): Promise<AdminConfirmWardVisitResult> {
  const fn = httpsCallable<{ taskId: string }, AdminConfirmWardVisitResult>(functions, 'adminConfirmWardVisit')
  const result = await fn({ taskId })
  return result.data
}

export async function updateSchedule(
  scheduleId: string,
  updates: { date?: string; startTime?: string; endTime?: string; status?: string; notes?: string },
): Promise<void> {
  await updateDoc(doc(db, 'schedules', scheduleId), updates)
}

export async function deleteSchedule(scheduleId: string): Promise<void> {
  await deleteDoc(doc(db, 'schedules', scheduleId))
}

export interface VisitScheduleEntry {
  unitId: string
  presidentUid: string | null
  date: string  // YYYY-MM-DD
}

export async function createVisitSchedules(
  seventyUid: string,
  entries: VisitScheduleEntry[],
): Promise<void> {
  const currentUser = auth.currentUser
  if (!currentUser) throw new Error('인증이 필요합니다.')

  await Promise.all(
    entries.map(entry => {
      const scheduleId = `${seventyUid}_${entry.unitId}_${entry.date}`
      const ref = doc(db, 'schedules', scheduleId)
      return setDoc(ref, {
        type: 'ward_visit',
        seventyUid,
        unitId: entry.unitId,
        presidentUid: entry.presidentUid,
        date: entry.date,
        startTime: '10:00',
        endTime: '13:00',
        status: 'confirmed',
        createdBy: currentUser.uid,
        confirmedAt: serverTimestamp(),
      })
    })
  )
}
