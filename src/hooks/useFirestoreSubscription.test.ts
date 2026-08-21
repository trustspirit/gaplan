import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useFirestoreSubscription } from './useFirestoreSubscription'

describe('useFirestoreSubscription', () => {
  it('구독 오류를 호출자가 표시할 수 있도록 보존한다', async () => {
    const error = new Error('permission denied')
    const unsubscribe = vi.fn()
    const subscribe = vi.fn((_onData: (data: string[]) => void, onError?: (e: Error) => void) => {
      onError?.(error)
      return unsubscribe
    })

    const { result } = renderHook(() => useFirestoreSubscription(subscribe))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe(error)
  })

  // FIX 5 (최종 리뷰) — 같은 subscribeFn을 여러 컴포넌트가 동시에 부르던 화면(설정 ›
  // 시스템)에서 컴포넌트 수만큼 onSnapshot이 열렸다. 하나로 합친다.
  it('shares one subscription across every hook instance using the same subscribeFn', () => {
    const unsubscribe = vi.fn()
    const subscribe = vi.fn((onData: (data: string[]) => void) => {
      onData(['a'])
      return unsubscribe
    })

    const { result: r1, unmount: unmount1 } = renderHook(() => useFirestoreSubscription(subscribe))
    const { result: r2, unmount: unmount2 } = renderHook(() => useFirestoreSubscription(subscribe))

    expect(subscribe).toHaveBeenCalledTimes(1)
    expect(r1.current.data).toEqual(['a'])
    expect(r2.current.data).toEqual(['a'])

    // 아직 리스너가 하나 남아 있는 동안은 실제 구독을 끊지 않는다.
    unmount1()
    expect(unsubscribe).not.toHaveBeenCalled()

    unmount2()
    expect(unsubscribe).toHaveBeenCalledTimes(1)
  })

  it('propagates a later update to every sharer of the subscription', () => {
    let handler: (data: string[]) => void = () => {}
    const subscribe = vi.fn((onData: (data: string[]) => void) => {
      handler = onData
      onData(['a'])
      return () => {}
    })

    const { result: r1 } = renderHook(() => useFirestoreSubscription(subscribe))
    const { result: r2 } = renderHook(() => useFirestoreSubscription(subscribe))

    act(() => handler(['a', 'b']))

    expect(r1.current.data).toEqual(['a', 'b'])
    expect(r2.current.data).toEqual(['a', 'b'])
  })

  // 서로 다른 subscribeFn 참조는 절대 같은 구독으로 묶이지 않는다.
  it('keeps unrelated subscribeFns on separate subscriptions', () => {
    const subscribeA = vi.fn((onData: (data: string[]) => void) => {
      onData(['a'])
      return () => {}
    })
    const subscribeB = vi.fn((onData: (data: string[]) => void) => {
      onData(['b'])
      return () => {}
    })

    const { result: r1 } = renderHook(() => useFirestoreSubscription(subscribeA))
    const { result: r2 } = renderHook(() => useFirestoreSubscription(subscribeB))

    expect(subscribeA).toHaveBeenCalledTimes(1)
    expect(subscribeB).toHaveBeenCalledTimes(1)
    expect(r1.current.data).toEqual(['a'])
    expect(r2.current.data).toEqual(['b'])
  })
})
