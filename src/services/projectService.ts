import {
  collection, query, orderBy, onSnapshot,
  addDoc, updateDoc, deleteDoc, doc, getDoc, serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '@/firebase'
import type { Project, ProjectStatus } from '@/types'

export function subscribeToProjects(
  callback: (projects: Project[]) => void,
  onError?: (e: Error) => void,
): Unsubscribe {
  const q = query(collection(db, 'projects'), orderBy('createdAt', 'desc'))
  return onSnapshot(
    q,
    snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Project)),
    err => { console.error('[projects] onSnapshot error:', err.code, err.message); onError?.(err) },
  )
}

export async function getProject(id: string): Promise<Project | null> {
  const snap = await getDoc(doc(db, 'projects', id))
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Project) : null
}

export async function createProject(title: string, notes: string, createdBy: string): Promise<string> {
  const ref = await addDoc(collection(db, 'projects'), {
    title,
    notes: notes || '',
    status: 'active' as ProjectStatus,
    createdBy,
    createdAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateProject(
  id: string,
  updates: { title?: string; notes?: string; status?: ProjectStatus },
): Promise<void> {
  await updateDoc(doc(db, 'projects', id), updates)
}

export async function deleteProject(id: string): Promise<void> {
  await deleteDoc(doc(db, 'projects', id))
}
