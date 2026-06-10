import {
  collection, query, where, orderBy,
  onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, getDocs, serverTimestamp, writeBatch,
  type Unsubscribe,
} from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import dayjs from 'dayjs'
import { db, functions } from '@/firebase'
import type { GeneralSchedule } from '@/types'

export function subscribeToGeneralSchedules(
  callback: (schedules: GeneralSchedule[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const sixMonthsAgo = dayjs().subtract(12, 'month').format('YYYY-MM-DD')
  const q = query(
    collection(db, 'generalSchedules'),
    where('date', '>=', sixMonthsAgo),
    orderBy('date', 'asc'),
  )
  return onSnapshot(
    q,
    snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }) as GeneralSchedule)),
    err => { console.error('[generalSchedules] onSnapshot error:', err.code, err.message); onError?.(err) },
  )
}

type CreateInput = Omit<GeneralSchedule, 'id' | 'createdAt'>

export async function createGeneralSchedule(data: CreateInput): Promise<string> {
  const ref = await addDoc(collection(db, 'generalSchedules'), {
    ...data,
    createdAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateGeneralSchedule(
  id: string,
  updates: Partial<Omit<GeneralSchedule, 'id' | 'createdBy' | 'createdAt'>>,
): Promise<void> {
  await updateDoc(doc(db, 'generalSchedules', id), updates)
}

export async function deleteGeneralSchedule(id: string): Promise<void> {
  const attendanceSnap = await getDocs(
    query(
      collection(db, 'schedules'),
      where('generalScheduleId', '==', id),
      where('type', '==', 'general_attendance'),
    ),
  )
  const batch = writeBatch(db)
  attendanceSnap.docs.forEach(d => batch.delete(d.ref))
  batch.delete(doc(db, 'generalSchedules', id))
  await batch.commit()
}

export async function fetchPublicGeneralSchedules(): Promise<GeneralSchedule[]> {
  const today = dayjs().format('YYYY-MM-DD')
  const q = query(
    collection(db, 'generalSchedules'),
    where('isPublic', '==', true),
    where('date', '>=', today),
    orderBy('date', 'asc'),
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as GeneralSchedule)
}

export async function registerAttendance(generalScheduleId: string): Promise<void> {
  const fn = httpsCallable<{ generalScheduleId: string }, { success: boolean }>(
    functions,
    'registerGeneralAttendance',
  )
  await fn({ generalScheduleId })
}

export { deleteScheduleViaCF as cancelAttendance } from './scheduleService'
