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

import { createTask, deleteTask } from './taskService'

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

describe('createTask', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    firestoreMocks.addDoc.mockResolvedValue({ id: 'new-task' })
    firestoreMocks.serverTimestamp.mockReturnValue('server-time')
  })

  it('leaves out fields left empty — Firestore rejects a document holding undefined', async () => {
    await createTask({
      type: 'select_visit',
      assignedTo: 'p1',
      seventyUid: 's1',
      regionId: 'r1',
      dueDate: '2026-12-01',
      createdBy: 'a1',
      availableDays: [0],
      availableDates: ['2026-12-06'],
      note: undefined,
      projectId: undefined,
    })

    const written = firestoreMocks.addDoc.mock.calls[0][1] as Record<string, unknown>
    expect(Object.values(written)).not.toContain(undefined)
    expect(written).not.toHaveProperty('note')
    expect(written).toMatchObject({ assignedTo: 'p1', status: 'pending', availableDates: ['2026-12-06'] })
  })
})
