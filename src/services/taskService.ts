import {
  collection, query, where, onSnapshot, orderBy,
  doc, updateDoc, addDoc, serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions } from '@/firebase'
import type { Task, RespondedSlot } from '@/types'

// President: pending + responded tasks (responded = awaiting admin/seventy confirmation)
export function subscribeToTasks(assignedTo: string, callback: (tasks: Task[]) => void): Unsubscribe {
  const q = query(
    collection(db, 'tasks'),
    where('assignedTo', '==', assignedTo),
    where('status', 'in', ['pending', 'responded']),
    orderBy('dueDate', 'asc'),
  )
  return onSnapshot(q,
    snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Task)),
    err => console.error('[tasks] onSnapshot error:', err.code, err.message),
  )
}

// Admin/Seventy: all tasks (seventy filtered by seventyUid via Firestore rules + query)
export function subscribeToAllTasks(
  callback: (tasks: Task[]) => void,
  seventyUid?: string,  // when set, restrict to this seventy's tasks
): Unsubscribe {
  let q = query(collection(db, 'tasks'), orderBy('dueDate', 'asc'))
  if (seventyUid) {
    q = query(q, where('seventyUid', '==', seventyUid))
  }
  return onSnapshot(q,
    snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Task)),
    err => console.error('[tasks] onSnapshot error:', err.code, err.message),
  )
}

export async function completeTask(taskId: string): Promise<void> {
  await updateDoc(doc(db, 'tasks', taskId), { status: 'completed' })
}

export async function expireTask(taskId: string): Promise<void> {
  await updateDoc(doc(db, 'tasks', taskId), { status: 'expired' })
}

export async function updateTaskDetails(
  taskId: string,
  updates: {
    dueDate?: string
    availableDates?: string[]
    availableDateSlots?: { date: string; timeRanges: { startTime: string; endTime: string }[] }[]
    slotDurationMinutes?: number
  },
  resetResponse = false,
): Promise<void> {
  await updateDoc(doc(db, 'tasks', taskId), {
    ...updates,
    ...(resetResponse ? {
      status: 'pending',
      respondedSlots: [],
      wardAssignments: [],
      respondedAt: null,
    } : {}),
  })
}

interface SubmitAvailabilityParams {
  taskId: string
  slots: RespondedSlot[]
}
interface SubmitResult { success: boolean; error?: string }

export async function submitAvailability(params: SubmitAvailabilityParams): Promise<SubmitResult> {
  const fn = httpsCallable<SubmitAvailabilityParams, SubmitResult>(functions, 'submitAvailability')
  const result = await fn(params)
  return result.data
}

interface SubmitWardAssignmentsParams {
  taskId: string
  wardAssignments: { wardName: string; date: string }[]
}

export async function submitWardAssignments(params: SubmitWardAssignmentsParams): Promise<SubmitResult> {
  const fn = httpsCallable<SubmitWardAssignmentsParams, SubmitResult>(functions, 'submitWardAssignments')
  const result = await fn(params)
  return result.data
}

export async function createTask(params: {
  type: 'select_visit' | 'select_interview'
  batchId?: string
  title?: string
  note?: string
  assignedTo: string
  seventyUid: string
  regionId: string
  unitId?: string
  dueDate: string
  createdBy: string
  availableDays: number[]
  availableDates?: string[]
  availableDateSlots?: { date: string; timeRanges: { startTime: string; endTime: string }[] }[]
  slotDurationMinutes?: number
}): Promise<string> {
  const tokenBytes = new Uint8Array(16)
  crypto.getRandomValues(tokenBytes)
  const respondToken = Array.from(tokenBytes).map(b => b.toString(16).padStart(2, '0')).join('')

  const ref = await addDoc(collection(db, 'tasks'), {
    ...params, respondToken, status: 'pending', notifiedAt: [], createdAt: serverTimestamp(),
  })
  return ref.id
}
