import { renderHook, waitFor } from '@testing-library/react'
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
})
