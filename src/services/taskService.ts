import {
  collection, query, where, onSnapshot, orderBy,
  doc, updateDoc, addDoc, serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '@/firebase'
import type { Task } from '@/types'

export function subscribeToTasks(assignedTo: string, callback: (tasks: Task[]) => void): Unsubscribe {
  const q = query(
    collection(db, 'tasks'),
    where('assignedTo', '==', assignedTo),
    where('status', '==', 'pending'),
    orderBy('dueDate', 'asc'),
  )
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Task)
    )
  })
}

export async function completeTask(taskId: string): Promise<void> {
  await updateDoc(doc(db, 'tasks', taskId), { status: 'completed' })
}

export async function createTask(params: {
  type: 'select_visit' | 'select_interview'
  assignedTo: string
  regionId: string
  dueDate: string
  createdBy: string
}): Promise<string> {
  const ref = await addDoc(collection(db, 'tasks'), {
    ...params, status: 'pending', notifiedAt: [], createdAt: serverTimestamp(),
  })
  return ref.id
}
