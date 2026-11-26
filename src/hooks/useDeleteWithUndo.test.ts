import { act, renderHook } from '@testing-library/react'
import { toast } from 'sonner'
import { useDeleteWithUndo } from './useDeleteWithUndo'

vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(() => 'toast-1'), { error: vi.fn(), dismiss: vi.fn() }),
}))
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}))

function setVisibility(state: 'hidden' | 'visible') {
  Object.defineProperty(document, 'visibilityState', { value: state, configurable: true })
  document.dispatchEvent(new Event('visibilitychange'))
}

describe('useDeleteWithUndo', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.mocked(toast).mockClear()
  })
  afterEach(() => {
    vi.useRealTimers()
    setVisibility('visible')
  })

  it('deletes once the undo window closes', async () => {
    const doDelete = vi.fn().mockResolvedValue(undefined)
    const { result } = renderHook(() => useDeleteWithUndo())
    act(() => result.current.scheduleDelete('a', doDelete))
    expect(result.current.pendingIds.has('a')).toBe(true)
    expect(doDelete).not.toHaveBeenCalled()
    await act(() => vi.advanceTimersByTimeAsync(5000))
    expect(doDelete).toHaveBeenCalledTimes(1)
  })

  it('does not delete after undo', async () => {
    const doDelete = vi.fn().mockResolvedValue(undefined)
    const { result } = renderHook(() => useDeleteWithUndo())
    act(() => result.current.scheduleDelete('a', doDelete))
    const options = vi.mocked(toast).mock.calls[0][1] as unknown as { action: { onClick: () => void } }
    act(() => options.action.onClick())
    await act(() => vi.advanceTimersByTimeAsync(5000))
    expect(doDelete).not.toHaveBeenCalled()
    expect(result.current.pendingIds.has('a')).toBe(false)
  })

  it('deletes at once when the app is hidden, and only once', async () => {
    // 휴대폰에서 지우고 바로 앱을 닫으면 타이머는 돌지 않는다
    const doDelete = vi.fn().mockResolvedValue(undefined)
    const { result } = renderHook(() => useDeleteWithUndo())
    act(() => result.current.scheduleDelete('a', doDelete))
    await act(async () => setVisibility('hidden'))
    expect(doDelete).toHaveBeenCalledTimes(1)
    expect(toast.dismiss).toHaveBeenCalledWith('toast-1')
    await act(() => vi.advanceTimersByTimeAsync(5000))
    expect(doDelete).toHaveBeenCalledTimes(1)
  })
})
