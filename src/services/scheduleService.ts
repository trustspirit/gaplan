import {
  collection, query, where, onSnapshot, orderBy,
  type Unsubscribe,
} from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import dayjs from 'dayjs'
import { db, functions } from '@/firebase'
import type { Schedule, TimeSlot } from '@/types'

export function subscribeToSchedules(
  filters: { presidentUid?: string; seventyUid?: string },
  callback: (schedules: Schedule[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  let q = query(collection(db, 'schedules'), orderBy('date', 'asc'))
  if (filters.presidentUid)
    q = query(q, where('presidentUid', '==', filters.presidentUid))
  else if (filters.seventyUid)
    q = query(q, where('seventyUid', '==', filters.seventyUid))
  else {
    // Admin view: cover full current year + rolling 6 months for past schedules
    const sixMonthsAgo = dayjs().subtract(6, 'month').format('YYYY-MM-DD')
    const startOfYear = dayjs().startOf('year').format('YYYY-MM-DD')
    const queryStart = sixMonthsAgo < startOfYear ? sixMonthsAgo : startOfYear
    q = query(q, where('date', '>=', queryStart))
  }
  return onSnapshot(q,
    snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Schedule)),
    err => { console.error('[schedules] onSnapshot error:', err.code, err.message); onError?.(err) },
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

const adminEditScheduleFn = httpsCallable(functions, 'adminEditSchedule')
const adminDeleteScheduleFn = httpsCallable(functions, 'adminDeleteSchedule')

export async function editScheduleViaCF(scheduleId: string, updates: {
  date?: string
  startTime?: string
  endTime?: string
  notes?: string
}): Promise<void> {
  await adminEditScheduleFn({ scheduleId, updates })
}

export async function deleteScheduleViaCF(scheduleId: string): Promise<void> {
  await adminDeleteScheduleFn({ scheduleId })
}

export interface PublicScheduleItem {
  id: string
  type: string
  unitId: string
  date: string
  startTime: string
  endTime: string
  status: string
  wardName?: string
  zoomLink?: string | null
  customTitle?: string | null
}

export async function fetchPublicSchedules(token: string): Promise<{ schedules: PublicScheduleItem[]; scopeDisplayName: string | null }> {
  const fn = httpsCallable<{ token: string }, { schedules: PublicScheduleItem[]; scopeDisplayName: string | null }>(functions, 'getPublicSchedules')
  const result = await fn({ token })
  return result.data
}

