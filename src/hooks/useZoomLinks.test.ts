import { renderHook, waitFor, act } from '@testing-library/react'
import { useZoomLinks } from './useZoomLinks'

vi.mock('@/services/userSettingsService', () => ({
  getZoomLinks: vi.fn(),
  addZoomLink: vi.fn(),
  renameZoomLink: vi.fn(),
  deleteZoomLink: vi.fn(),
}))

import { getZoomLinks, addZoomLink, renameZoomLink, deleteZoomLink } from '@/services/userSettingsService'

const LINK_A = { id: '1', label: 'A', url: 'https://zoom.us/j/1' }
const LINK_B = { id: '2', label: 'B', url: 'https://zoom.us/j/2' }

beforeEach(() => {
  vi.mocked(getZoomLinks).mockReset().mockResolvedValue([LINK_A])
  vi.mocked(addZoomLink).mockReset()
  vi.mocked(renameZoomLink).mockReset()
  vi.mocked(deleteZoomLink).mockReset().mockResolvedValue(undefined)
})

describe('useZoomLinks', () => {
  it('loads the saved links for the given uid', async () => {
    const { result } = renderHook(() => useZoomLinks('u1'))
    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.links).toEqual([LINK_A])
    expect(getZoomLinks).toHaveBeenCalledWith('u1')
  })

  it('does not fetch and returns an empty list when there is no uid', async () => {
    const { result } = renderHook(() => useZoomLinks(undefined))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.links).toEqual([])
    expect(getZoomLinks).not.toHaveBeenCalled()
  })

  it('appends the newly added link to local state on success', async () => {
    vi.mocked(addZoomLink).mockResolvedValue({ ok: true, link: LINK_B })
    const { result } = renderHook(() => useZoomLinks('u1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      const outcome = await result.current.add({ label: 'B', url: 'https://zoom.us/j/2' })
      expect(outcome).toEqual({ ok: true, link: LINK_B })
    })

    expect(result.current.links).toEqual([LINK_A, LINK_B])
  })

  it('leaves local state untouched when add is rejected', async () => {
    vi.mocked(addZoomLink).mockResolvedValue({ ok: false, reason: 'duplicate' })
    const { result } = renderHook(() => useZoomLinks('u1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.add({ label: 'B', url: 'https://zoom.us/j/1' })
    })

    expect(result.current.links).toEqual([LINK_A])
  })

  it('updates the label locally after a successful rename', async () => {
    vi.mocked(renameZoomLink).mockResolvedValue({ ok: true })
    const { result } = renderHook(() => useZoomLinks('u1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.rename('1', 'New label')
    })

    expect(result.current.links).toEqual([{ ...LINK_A, label: 'New label' }])
  })

  it('removes the link locally after deleting', async () => {
    const { result } = renderHook(() => useZoomLinks('u1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.remove('1')
    })

    expect(result.current.links).toEqual([])
    expect(deleteZoomLink).toHaveBeenCalledWith('u1', '1')
  })
})
