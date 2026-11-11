import {
  collection, query, where, orderBy,
  onSnapshot, updateDoc, deleteField,
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

// seventyNotes는 행사 문서의 필드가 아니다(회장이 행사 문서를 읽는다) — 따로 받아 따로 쓴다.
type CreateInput = Omit<GeneralSchedule, 'id' | 'createdAt' | 'seventyNotes'>

const SEVENTY_NOTES_COLLECTION = 'generalScheduleSeventyNotes'

/** 메모 문서를 배치에 싣는다. 비어 있으면 지우고, 있으면 행사 날짜와 함께 쓴다. */
function writeSeventyNotes(
  batch: ReturnType<typeof writeBatch>,
  scheduleId: string,
  notes: string | null | undefined,
  date: string,
) {
  const ref = doc(db, SEVENTY_NOTES_COLLECTION, scheduleId)
  const trimmed = notes?.trim()
  // date는 공개 페이지가 지난 메모를 통째로 읽지 않도록 범위 조회하는 데 쓴다.
  if (trimmed) batch.set(ref, { date, notes: trimmed, updatedAt: serverTimestamp() })
  else batch.delete(ref)
}

/** @param seventyNotes 칠십인 전용 메모. 행사와 한 배치로 쓴다 — 행사만 생기고 메모가 빠지지 않게. */
export async function createGeneralSchedule(data: CreateInput, seventyNotes?: string): Promise<string> {
  const ref = doc(collection(db, 'generalSchedules'))
  const batch = writeBatch(db)
  batch.set(ref, {
    ...stripUndefined(data),
    // 항상 boolean으로 쓴다 — 회장 계정은 seventyOnly == false로 조회하므로, 필드가 빠진
    // 행사는 회장에게 보이지 않는다.
    seventyOnly: data.seventyOnly === true,
    createdAt: serverTimestamp(),
  })
  if (seventyNotes?.trim()) writeSeventyNotes(batch, ref.id, seventyNotes, data.date)
  await batch.commit()
  return ref.id
}

/**
 * @param seventyNotes 칠십인 전용 메모를 고칠 때만 넘긴다(`notes`가 null·빈 문자열이면 지운다).
 *   `date`는 수정 이후의 행사 날짜다. 넘기지 않으면 메모는 건드리지 않는다 — 목록의 공개
 *   전환처럼 메모와 무관한 부분 수정이 메모를 지우면 안 된다.
 */
export async function updateGeneralSchedule(
  id: string,
  updates: Partial<Omit<GeneralSchedule, 'id' | 'createdBy' | 'createdAt' | 'seventyNotes'>>,
  seventyNotes?: { notes: string | null; date: string },
): Promise<void> {
  // 폼이 비운 선택 필드는 undefined로 온다. 걷어내기만 하면 updateDoc이 그 필드를 건드리지
  // 않아 예전 값이 남으므로, 이 필드들은 지운다. 언급하지 않은 필드(부분 수정)는 그대로 둔다.
  const cleared = Object.fromEntries(
    CLEARABLE_FIELDS.filter((key) => key in updates && updates[key] === undefined).map(
      (key) => [key, deleteField()],
    ),
  )
  const payload = { ...stripUndefined(updates), ...cleared }
  if (!seventyNotes) {
    await updateDoc(doc(db, 'generalSchedules', id), payload)
    return
  }
  const batch = writeBatch(db)
  batch.update(doc(db, 'generalSchedules', id), payload)
  writeSeventyNotes(batch, id, seventyNotes.notes, seventyNotes.date)
  await batch.commit()
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
  // 칠십인 전용 메모도 함께 지운다 — 남겨 두면 주인 없는 메모가 공개 페이지 조회에 계속 걸린다.
  batch.delete(doc(db, SEVENTY_NOTES_COLLECTION, id))
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

/**
 * 행사의 칠십인 전용 메모만 따로 저장한다 — 행사 상세 화면에서 바로 적을 때 쓴다. 행사를 만든
 * 사람이 아니어도 칠십인·집행서기가 쓸 수 있다(firestore.rules). 비우면 메모를 지운다.
 * @param date 행사 날짜. 공개 페이지가 메모를 날짜 범위로 읽는 데 쓴다.
 */
export async function saveGeneralSeventyNotes(id: string, notes: string, date: string): Promise<void> {
  const batch = writeBatch(db)
  writeSeventyNotes(batch, id, notes, date)
  await batch.commit()
}

/**
 * 행사의 칠십인 전용 메모를 구독한다. 관리자·칠십인·집행서기만 읽을 수 있으므로
 * (firestore.rules) 그 역할일 때만 부른다. 콜백은 행사 id → 메모의 Map을 받는다.
 */
export function subscribeToGeneralSeventyNotes(
  callback: (notesByScheduleId: Map<string, string>) => void,
): Unsubscribe {
  return onSnapshot(
    collection(db, SEVENTY_NOTES_COLLECTION),
    snap => {
      const map = new Map<string, string>()
      for (const d of snap.docs) {
        const notes = d.data().notes
        if (typeof notes === 'string' && notes.trim()) map.set(d.id, notes)
      }
      callback(map)
    },
    // 메모를 못 읽어도 행사 목록은 그대로 보여야 한다 — 메모만 비운다.
    snapshotErrHandler('generalScheduleSeventyNotes', () => callback(new Map())),
  )
}
