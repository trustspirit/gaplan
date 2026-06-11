import {
  collection, query, where, onSnapshot, orderBy, getDocs,
  type Unsubscribe,
} from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import dayjs from 'dayjs'
import { db, functions } from '@/firebase'
import type { Schedule, TimeSlot } from '@/types'

export function subscribeToSchedules(
  filters: { presidentUid?: string; seventyUid?: string },
  callback: (schedules: Schedule[], fromCache: boolean) => void,
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
  return onSnapshot(
    q,
    { includeMetadataChanges: true },
    snap => callback(
      snap.docs.map(d => ({ id: d.id, ...d.data() }) as Schedule),
      snap.metadata.fromCache,
    ),
    err => { console.error('[schedules] onSnapshot error:', err.code, err.message); onError?.(err) },
  )
}

// 통계용 1회 조회 — 날짜 범위 단일 쿼리 (date 단일 필드 인덱스, 새 인덱스 불필요)
export async function fetchSchedulesInRange(
  startDate: string,   // YYYY-MM-DD
  endDate: string,     // YYYY-MM-DD
): Promise<Schedule[]> {
  const q = query(
    collection(db, 'schedules'),
    where('date', '>=', startDate),
    where('date', '<=', endDate),
    orderBy('date', 'asc'),
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Schedule)
}

// 역할 스코프 1회 조회 — seventy/exec_secretary는 담당 지역 unit ∪ 담당 일정만 (CF가 서버에서 필터).
// admin이 viewSeventyUid를 주면 그 칠십인 시점으로 스코프 (CF가 admin에 한해 적용).
export async function fetchScopedSchedulesInRange(
  startDate: string,
  endDate: string,
  viewSeventyUid?: string | null,
): Promise<Schedule[]> {
  const fn = httpsCallable<
    { startDate: string; endDate: string; viewSeventyUid?: string },
    { schedules: Schedule[] }
  >(functions, 'getSchedulesInRange')
  const res = await fn({
    startDate,
    endDate,
    ...(viewSeventyUid ? { viewSeventyUid } : {}),
  })
  return res.data.schedules
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
  notes?: string | null
}

export async function fetchPublicSchedules(token: string): Promise<{ schedules: PublicScheduleItem[]; scopeDisplayName: string | null }> {
  const fn = httpsCallable<{ token: string }, { schedules: PublicScheduleItem[]; scopeDisplayName: string | null }>(functions, 'getPublicSchedules')
  const result = await fn({ token })
  return result.data
}

