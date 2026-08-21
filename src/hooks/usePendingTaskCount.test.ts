import { renderHook } from '@testing-library/react'
import { Provider, createStore } from 'jotai'
import { createElement, type ReactNode } from 'react'
import { usePendingTaskCount } from './usePendingTaskCount'
import { authUserAtom } from '@/store/authAtom'
import { ROLE } from '@/constants/roles'
import type { AppUser } from '@/types'

const useTasksSpy = vi.hoisted(() =>
  vi.fn((): { tasks: Array<{ id: string; status: string }>; loading: boolean } => ({
    tasks: [],
    loading: false,
  })),
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
  return ({ children }: { children: ReactNode }) => createElement(Provider, { store }, children)
}

describe('usePendingTaskCount', () => {
  beforeEach(() => {
    useTasksSpy.mockClear()
    useTasksSpy.mockReturnValue({ tasks: [], loading: false })
  })

  // subscribeToTasks는 pending + responded를 함께 실어 온다. 배지가 말하는
  // "처리 필요"는 아직 회장이 답하지 않은 것뿐이다 — 회장 홈 화면의 「처리 필요」
  // 카드와 같은 화면에서 다른 숫자가 나오면 안 된다.
  it('counts only the tasks still waiting on the president', () => {
    useTasksSpy.mockReturnValue({
      tasks: [
        { id: 'a', status: 'pending' },
        { id: 'b', status: 'responded' },
        { id: 'c', status: 'pending' },
      ],
      loading: false,
    })
    const { result } = renderHook(() => usePendingTaskCount(), {
      wrapper: wrapperFor(makeUser({ role: ROLE.PRESIDENT })),
    })
    expect(result.current).toBe(2)
  })

  // 어떤 역할이 배지를 받는지는 navItems가 badge: 'pendingTasks'로 이미 말한다.
  // 훅이 역할을 다시 하드코딩하면 계획 3에서 항목이 옮겨갈 때 조용히 어긋난다.
  it('subscribes for a role whose nav has a badged item', () => {
    renderHook(() => usePendingTaskCount(), {
      wrapper: wrapperFor(makeUser({ role: ROLE.PRESIDENT, uid: 'u9' })),
    })
    expect(useTasksSpy).toHaveBeenCalledWith('u9')
  })

  // 셸은 모든 화면에서 마운트되어 있다 — 배지가 없는 역할에서 구독을 열면 낭비다.
  it('does not subscribe for a role that has no badged item', () => {
    renderHook(() => usePendingTaskCount(), {
      wrapper: wrapperFor(makeUser({ role: ROLE.ADMIN })),
    })
    expect(useTasksSpy).toHaveBeenCalledWith('')
  })

  it('returns zero for a role that has no badged item', () => {
    useTasksSpy.mockReturnValue({ tasks: [{ id: 'a', status: 'pending' }], loading: false })
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
