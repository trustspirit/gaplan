import { beforeEach, describe, expect, it, vi } from 'vitest'
import { doc, updateDoc } from 'firebase/firestore'

const firestoreMocks = vi.hoisted(() => ({
  collection: vi.fn((...args: unknown[]) => ({ kind: 'collection', args })),
  doc: vi.fn((...args: unknown[]) => ({ kind: 'doc', args })),
  onSnapshot: vi.fn(),
  updateDoc: vi.fn(),
  deleteField: vi.fn(() => ({ kind: 'deleteField' })),
}))

vi.mock('firebase/firestore', () => firestoreMocks)
vi.mock('@/firebase', () => ({ db: 'db' }))

import { updateLeader } from './leaderService'

const DOC_REF = { kind: 'doc', args: ['db', 'leaders', '301957'] }

describe('updateLeader', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('이름과 전화번호를 그대로 저장한다', async () => {
    await updateLeader('301957', { name: '이윤학', phone: '010-4149-7611' })

    expect(doc).toHaveBeenCalledWith('db', 'leaders', '301957')
    expect(updateDoc).toHaveBeenCalledWith(DOC_REF, {
      name: '이윤학',
      phone: '010-4149-7611',
    })
  })

  it('앞뒤 공백을 잘라낸다', async () => {
    await updateLeader('301957', { name: '  이윤학  ', phone: ' 010-4149-7611 ', email: ' a@b.com ' })

    expect(updateDoc).toHaveBeenCalledWith(DOC_REF, {
      name: '이윤학',
      phone: '010-4149-7611',
      email: 'a@b.com',
    })
  })

  it('빈 이메일은 deleteField 센티널로 바꾼다', async () => {
    await updateLeader('301957', { name: '이윤학', email: '' })

    expect(updateDoc).toHaveBeenCalledWith(DOC_REF, {
      name: '이윤학',
      email: { kind: 'deleteField' },
    })
  })

  it('빈 전화번호도 deleteField 센티널로 바꾼다', async () => {
    await updateLeader('301957', { name: '이윤학', phone: '   ' })

    expect(updateDoc).toHaveBeenCalledWith(DOC_REF, {
      name: '이윤학',
      phone: { kind: 'deleteField' },
    })
  })

  it('patch에 없는 선택 필드는 건드리지 않는다', async () => {
    await updateLeader('301957', { name: '이윤학' })

    expect(updateDoc).toHaveBeenCalledWith(DOC_REF, { name: '이윤학' })
    // toHaveBeenCalledWith는 toEqual 의미론이라 { phone: undefined }도
    // {}와 동일하게 통과한다. continue가 undefined 키를 쓰는 방식으로
    // 회귀해도 위 assertion만으로는 못 잡으므로 실제 키 집합을 확인한다.
    const payload = firestoreMocks.updateDoc.mock.calls[0][1] as Record<string, unknown>
    expect(Object.keys(payload)).toEqual(['name'])
  })

  it('이름이 공백뿐이면 Error를 던지고 저장하지 않는다', async () => {
    await expect(updateLeader('301957', { name: '   ' })).rejects.toThrow('Leader name is required')

    expect(updateDoc).not.toHaveBeenCalled()
  })
})
