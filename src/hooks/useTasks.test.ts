import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  subscribeToTasks: vi.fn(),
  subscribeToAllTasks: vi.fn(),
}))
vi.mock('@/services/taskService', () => mocks)

import { useAllTasks, useTasks } from './useTasks'

// 규칙에 막힌 구독은 스냅샷 대신 오류 하나만 보낸다. 그걸 받지 않으면 loading이 영영 true다
// — 담당 seventy가 아직 없는 집행서기가 과제 화면에서 끝없는 스피너를 본다.
describe('task subscriptions that the rules reject', () => {
  it('useAllTasks stops loading on a listener error', async () => {
    mocks.subscribeToAllTasks.mockImplementation(
      (_cb: unknown, _uid: unknown, onError: (e: Error) => void) => {
        onError(new Error('permission-denied'))
        return () => {}
      },
    )
    const { result } = renderHook(() => useAllTasks(undefined))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.tasks).toEqual([])
  })

  it('useTasks stops loading on a listener error', async () => {
    mocks.subscribeToTasks.mockImplementation(
      (_uid: unknown, _cb: unknown, onError: (e: Error) => void) => {
        onError(new Error('permission-denied'))
        return () => {}
      },
    )
    const { result } = renderHook(() => useTasks('p1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
  })
})
