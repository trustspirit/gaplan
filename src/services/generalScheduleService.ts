import {
  collection, query, where, orderBy,
  onSnapshot, addDoc, updateDoc, deleteField,
  doc, getDocs, serverTimestamp, writeBatch,
  type Unsubscribe,
} from 'firebase/firestore'
import dayjs from 'dayjs'
import { db } from '@/firebase'
import type { GeneralSchedule } from '@/types'
import { mapDocs, snapshotErrHandler, stripUndefined } from './_utils'

/**
 * @param options.includeSeventyOnly 칠십인 전용 행사까지 읽는가. 관리자·칠십인·집행서기만 true로
 *   넘긴다(canSeeSeventyOnlyEvents). 그 밖의 사용자는 false여야 한다 — 보안 규칙이 칠십인 전용
 *   행사를 막고 있어서, seventyOnly == false 조건 없이 조회하면 조회 전체가 거부된다.
 */
export function subscribeToGeneralSchedules(
  callback: (schedules: GeneralSchedule[]) => void,
  onError: ((error: Error) => void) | undefined,
  options: { includeSeventyOnly: boolean },
): Unsubscribe {
  const sixMonthsAgo = dayjs().subtract(12, 'month').format('YYYY-MM-DD')
  const q = query(
    collection(db, 'generalSchedules'),
    ...(options.includeSeventyOnly ? [] : [where('seventyOnly', '==', false)]),
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
    // 항상 boolean으로 쓴다 — 회장 계정은 seventyOnly == false로 조회하므로, 필드가 빠진
    // 행사는 회장에게 보이지 않는다.
    seventyOnly: data.seventyOnly === true,
    createdAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateGeneralSchedule(
  id: string,
  updates: Partial<Omit<GeneralSchedule, 'id' | 'createdBy' | 'createdAt'>>,
): Promise<void> {
  // 폼이 비운 선택 필드는 undefined로 온다. 걷어내기만 하면 updateDoc이 그 필드를 건드리지
  // 않아 예전 값이 남으므로, 이 필드들은 지운다. 언급하지 않은 필드(부분 수정)는 그대로 둔다.
  const cleared = Object.fromEntries(
    CLEARABLE_FIELDS.filter((key) => key in updates && updates[key] === undefined).map(
      (key) => [key, deleteField()],
    ),
  )
  await updateDoc(doc(db, 'generalSchedules', id), { ...stripUndefined(updates), ...cleared })
}

const CLEARABLE_FIELDS = ['endDate', 'startTime', 'endTime', 'description'] as const

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
