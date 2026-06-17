import { beforeEach, describe, expect, it, vi } from 'vitest'
import { deleteDoc, doc } from 'firebase/firestore'

const firestoreMocks = vi.hoisted(() => ({
  addDoc: vi.fn(),
  collection: vi.fn((...args: unknown[]) => ({ kind: 'collection', args })),
  deleteDoc: vi.fn(),
  doc: vi.fn((...args: unknown[]) => ({ kind: 'doc', args })),
  onSnapshot: vi.fn(),
  orderBy: vi.fn(),
  query: vi.fn((...args: unknown[]) => ({ kind: 'query', args })),
  serverTimestamp: vi.fn(),
  updateDoc: vi.fn(),
  where: vi.fn(),
}))

vi.mock('firebase/firestore', () => firestoreMocks)
vi.mock('firebase/functions', () => ({ httpsCallable: vi.fn() }))
vi.mock('@/firebase', () => ({ db: 'db', functions: 'functions' }))

import { deleteTask } from './taskService'

describe('deleteTask', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deletes the task document', async () => {
    await deleteTask('task-1')

    expect(doc).toHaveBeenCalledWith('db', 'tasks', 'task-1')
    expect(deleteDoc).toHaveBeenCalledWith({ kind: 'doc', args: ['db', 'tasks', 'task-1'] })
  })
})
