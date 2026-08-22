import {
  collection, query, where, orderBy,
  onSnapshot, addDoc, updateDoc,
  doc, getDocs, serverTimestamp, writeBatch,
  type Unsubscribe,
} from 'firebase/firestore'
import dayjs from 'dayjs'
import { db } from '@/firebase'
import type { GeneralSchedule } from '@/types'
import { mapDocs, snapshotErrHandler, stripUndefined } from './_utils'

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
    snap => callback(mapDocs<GeneralSchedule>(snap)),
    snapshotErrHandler('generalSchedules', onError),
  )
}

type CreateInput = Omit<GeneralSchedule, 'id' | 'createdAt'>

export async function createGeneralSchedule(data: CreateInput): Promise<string> {
  const ref = await addDoc(collection(db, 'generalSchedules'), {
    ...stripUndefined(data),
    createdAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateGeneralSchedule(
  id: string,
  updates: Partial<Omit<GeneralSchedule, 'id' | 'createdBy' | 'createdAt'>>,
): Promise<void> {
  await updateDoc(doc(db, 'generalSchedules', id), stripUndefined(updates))
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
  return mapDocs<GeneralSchedule>(snap)
}
