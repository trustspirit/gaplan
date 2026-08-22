const mocks = vi.hoisted(() => ({
  getDoc: vi.fn(),
  setDoc: vi.fn().mockResolvedValue(undefined),
  randomUUID: vi.fn(() => 'new-id'),
}))

vi.mock('@/firebase', () => ({ db: {} }))
vi.mock('firebase/firestore', () => ({
  doc: (_db: unknown, col: string, id: string) => `${col}/${id}`,
  getDoc: mocks.getDoc,
  setDoc: mocks.setDoc,
  arrayUnion: (v: unknown) => ({ __arrayUnion: v }),
}))

import { getZoomLinks, addZoomLink, renameZoomLink, deleteZoomLink } from './userSettingsService'

function snapshotWith(data: Record<string, unknown> | undefined) {
  return { data: () => data }
}

beforeEach(() => {
  mocks.getDoc.mockReset()
  mocks.setDoc.mockClear()
  vi.stubGlobal('crypto', { ...globalThis.crypto, randomUUID: mocks.randomUUID })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('getZoomLinks', () => {
  it('returns the saved list', async () => {
    mocks.getDoc.mockResolvedValue(snapshotWith({ zoomLinks: [{ id: '1', label: 'A', url: 'https://zoom.us/j/1' }] }))
    const links = await getZoomLinks('u1')
    expect(links).toEqual([{ id: '1', label: 'A', url: 'https://zoom.us/j/1' }])
  })

  it('returns an empty list when the document has none', async () => {
    mocks.getDoc.mockResolvedValue(snapshotWith(undefined))
    expect(await getZoomLinks('u1')).toEqual([])
  })
})

describe('addZoomLink', () => {
  it('saves a new link and returns it', async () => {
    mocks.getDoc.mockResolvedValue(snapshotWith({ zoomLinks: [] }))
    const result = await addZoomLink('u1', { label: '서울동 스테이크 정기 모임', url: 'https://zoom.us/j/111' })
    expect(result).toEqual({
      ok: true,
      link: { id: 'new-id', label: '서울동 스테이크 정기 모임', url: 'https://zoom.us/j/111' },
    })
    expect(mocks.setDoc).toHaveBeenCalledWith(
      'userSettings/u1',
      { zoomLinks: [{ id: 'new-id', label: '서울동 스테이크 정기 모임', url: 'https://zoom.us/j/111' }] },
      { merge: true },
    )
  })

  it('rejects and does not write when the URL is invalid', async () => {
    mocks.getDoc.mockResolvedValue(snapshotWith({ zoomLinks: [] }))
    const result = await addZoomLink('u1', { label: '라벨', url: 'not-a-url' })
    expect(result).toEqual({ ok: false, reason: 'invalid_url' })
    expect(mocks.setDoc).not.toHaveBeenCalled()
  })

  it('rejects a duplicate URL without writing', async () => {
    mocks.getDoc.mockResolvedValue(
      snapshotWith({ zoomLinks: [{ id: '1', label: 'A', url: 'https://zoom.us/j/111' }] }),
    )
    const result = await addZoomLink('u1', { label: 'B', url: 'https://zoom.us/j/111' })
    expect(result).toEqual({ ok: false, reason: 'duplicate' })
    expect(mocks.setDoc).not.toHaveBeenCalled()
  })
})

describe('renameZoomLink', () => {
  it('trims and saves the new label', async () => {
    mocks.getDoc.mockResolvedValue(
      snapshotWith({ zoomLinks: [{ id: '1', label: 'old', url: 'https://zoom.us/j/1' }] }),
    )
    const result = await renameZoomLink('u1', '1', '  new label  ')
    expect(result).toEqual({ ok: true })
    expect(mocks.setDoc).toHaveBeenCalledWith(
      'userSettings/u1',
      { zoomLinks: [{ id: '1', label: 'new label', url: 'https://zoom.us/j/1' }] },
      { merge: true },
    )
  })

  it('rejects an empty label without writing', async () => {
    mocks.getDoc.mockResolvedValue(
      snapshotWith({ zoomLinks: [{ id: '1', label: 'old', url: 'https://zoom.us/j/1' }] }),
    )
    const result = await renameZoomLink('u1', '1', '   ')
    expect(result).toEqual({ ok: false, reason: 'empty_label' })
    expect(mocks.setDoc).not.toHaveBeenCalled()
  })
})

describe('deleteZoomLink', () => {
  it('removes the link with the given id', async () => {
    mocks.getDoc.mockResolvedValue(
      snapshotWith({
        zoomLinks: [
          { id: '1', label: 'A', url: 'https://zoom.us/j/1' },
          { id: '2', label: 'B', url: 'https://zoom.us/j/2' },
        ],
      }),
    )
    await deleteZoomLink('u1', '1')
    expect(mocks.setDoc).toHaveBeenCalledWith(
      'userSettings/u1',
      { zoomLinks: [{ id: '2', label: 'B', url: 'https://zoom.us/j/2' }] },
      { merge: true },
    )
  })
})
