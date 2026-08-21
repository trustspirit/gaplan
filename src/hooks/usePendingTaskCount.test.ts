import { renderHook } from '@testing-library/react'
import { Provider, createStore } from 'jotai'
import { createElement, type ReactNode } from 'react'
import { usePendingTaskCount } from './usePendingTaskCount'
import { authUserAtom } from '@/store/authAtom'
import { ROLE } from '@/constants/roles'
import type { AppUser } from '@/types'

const useTasksSpy = vi.hoisted(() =>
  vi.fn((): { tasks: Array<{ id: string }>; loading: boolean } => ({ tasks: [], loading: false })),
)
vi.mock('@/hooks/useTasks', () => ({ useTasks: useTasksSpy }))

function makeUser(over: Partial<AppUser>): AppUser {
  return {
    uid: 'u1',
    email: 'a@b.com',
    name: '홍길동',
    role: ROLE.PRESIDENT,
    createdAt: '2026-01-01',
    ...over,
  }
}

function wrapperFor(user: AppUser | null) {
  const store = createStore()
  store.set(authUserAtom, user)
  return ({ children }: { children: ReactNode }) =>
    createElement(Provider, { store }, children)
}

describe('usePendingTaskCount', () => {
  beforeEach(() => {
    useTasksSpy.mockClear()
    useTasksSpy.mockReturnValue({ tasks: [], loading: false })
  })

  it('counts the tasks assigned to a president', () => {
    useTasksSpy.mockReturnValue({ tasks: [{ id: 'a' }, { id: 'b' }], loading: false })
    const { result } = renderHook(() => usePendingTaskCount(), {
      wrapper: wrapperFor(makeUser({ role: ROLE.PRESIDENT })),
    })
    expect(result.current).toBe(2)
  })

  // 셸은 모든 화면에서 마운트되어 있다 — 배지가 없는 역할에서 구독을 열면 낭비다.
  it('does not subscribe for a role that has no badged item', () => {
    renderHook(() => usePendingTaskCount(), {
      wrapper: wrapperFor(makeUser({ role: ROLE.ADMIN })),
    })
    expect(useTasksSpy).toHaveBeenCalledWith('')
  })

  it('returns zero for a role that has no badged item', () => {
    useTasksSpy.mockReturnValue({ tasks: [{ id: 'a' }], loading: false })
    const { result } = renderHook(() => usePendingTaskCount(), {
      wrapper: wrapperFor(makeUser({ role: ROLE.SEVENTY })),
    })
    expect(result.current).toBe(0)
  })

  it('returns zero when there is no user', () => {
    const { result } = renderHook(() => usePendingTaskCount(), { wrapper: wrapperFor(null) })
    expect(result.current).toBe(0)
  })
})
