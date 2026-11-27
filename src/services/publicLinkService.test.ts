import { setGlobalPublic, setScopePublic, setSeventyPublic } from './publicLinkService'

const mocks = vi.hoisted(() => ({
  batchSet: vi.fn(),
  batchCommit: vi.fn().mockResolvedValue(undefined),
  setDoc: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/firebase', () => ({ db: {} }))
vi.mock('firebase/firestore', () => ({
  doc: (_db: unknown, col: string, id: string) => `${col}/${id}`,
  setDoc: mocks.setDoc,
  writeBatch: () => ({ set: mocks.batchSet, commit: mocks.batchCommit }),
}))
vi.mock('@/utils/publicToken', () => ({ generatePublicToken: () => 'newtok' }))

beforeEach(() => {
  mocks.batchSet.mockClear()
  mocks.batchCommit.mockClear()
  mocks.setDoc.mockClear()
})

describe('setGlobalPublic', () => {
  it('mints a token and registers it when turning on for the first time', async () => {
    const token = await setGlobalPublic(true, null)

    expect(token).toBe('newtok')
    expect(mocks.batchSet).toHaveBeenCalledWith(
      'settings/public',
      { schedulePublic: true, globalToken: 'newtok' },
      { merge: true },
    )
    expect(mocks.batchSet).toHaveBeenCalledWith(
      'settings/publicTokens',
      { newtok: '__all__' },
      { merge: true },
    )
    expect(mocks.batchCommit).toHaveBeenCalled()
  })

  it('reuses the existing token instead of minting a second one', async () => {
    const token = await setGlobalPublic(true, 'oldtok')

    expect(token).toBe('oldtok')
    expect(mocks.setDoc).toHaveBeenCalledWith(
      'settings/public',
      { schedulePublic: true },
      { merge: true },
    )
    expect(mocks.batchSet).not.toHaveBeenCalled()
  })

  // 토큰을 지우면 다시 켔을 때 이미 공유한 링크가 죽는다.
  it('keeps the token when turning off', async () => {
    const token = await setGlobalPublic(false, 'oldtok')

    expect(token).toBe('oldtok')
    expect(mocks.setDoc).toHaveBeenCalledWith(
      'settings/public',
      { schedulePublic: false },
      { merge: true },
    )
  })
})

describe('setScopePublic', () => {
  it('mints a token and registers it when turning a scope on for the first time', async () => {
    const token = await setScopePublic('seoul-stake', true, null)

    expect(token).toBe('newtok')
    expect(mocks.batchSet).toHaveBeenCalledWith(
      'settings/publicUnits',
      { 'seoul-stake': { enabled: true, token: 'newtok' } },
      { merge: true },
    )
    expect(mocks.batchSet).toHaveBeenCalledWith(
      'settings/publicTokens',
      { newtok: 'seoul-stake' },
      { merge: true },
    )
  })

  // 토큰이 이미 있어도 다시 upsert한다 — publicTokens에 항목이 빠진 문서를 복구한다.
  it('re-registers an existing token when turning a scope back on', async () => {
    const token = await setScopePublic('seoul-stake', true, 'oldtok')

    expect(token).toBe('oldtok')
    expect(mocks.batchSet).toHaveBeenCalledWith(
      'settings/publicTokens',
      { oldtok: 'seoul-stake' },
      { merge: true },
    )
  })

  it('leaves the token registered when turning a scope off', async () => {
    const token = await setScopePublic('seoul-stake', false, 'oldtok')

    expect(token).toBe('oldtok')
    expect(mocks.batchSet).toHaveBeenCalledWith(
      'settings/publicUnits',
      { 'seoul-stake': { enabled: false, token: 'oldtok' } },
      { merge: true },
    )
    expect(mocks.batchSet).not.toHaveBeenCalledWith(
      'settings/publicTokens',
      expect.anything(),
      expect.anything(),
    )
  })

  it('writes an empty token when turning off a scope that never had one', async () => {
    const token = await setScopePublic('seoul-stake', false, null)

    expect(token).toBeNull()
    expect(mocks.batchSet).toHaveBeenCalledWith(
      'settings/publicUnits',
      { 'seoul-stake': { enabled: false, token: '' } },
      { merge: true },
    )
  })
})

describe('setGlobalPublic after the shared link moved to a seventy', () => {
  // 넘겨받은 뒤 전역 스위치를 껐다 켜면 전체 링크가 말없이 되살아나면 안 된다.
  it('only flips the switch and never mints a new shared token', async () => {
    const token = await setGlobalPublic(true, null, 'seventy:u1')

    expect(token).toBeNull()
    expect(mocks.setDoc).toHaveBeenCalledWith('settings/public', { schedulePublic: true }, { merge: true })
    expect(mocks.batchSet).not.toHaveBeenCalled()
  })
})

describe('setSeventyPublic', () => {
  it('takes over the shared link the first time a seventy link is turned on', async () => {
    const result = await setSeventyPublic('u1', true, null, 'gtok')

    expect(result).toEqual({ token: 'gtok', tookOverGlobal: true })
    expect(mocks.batchSet).toHaveBeenCalledWith('settings/publicTokens', { gtok: 'seventy:u1' }, { merge: true })
    expect(mocks.batchSet).toHaveBeenCalledWith(
      'settings/publicUnits',
      { 'seventy:u1': { enabled: true, token: 'gtok' } },
      { merge: true },
    )
    expect(mocks.batchSet).toHaveBeenCalledWith(
      'settings/public',
      { globalToken: '', globalTokenMovedTo: 'seventy:u1' },
      { merge: true },
    )
    expect(mocks.batchCommit).toHaveBeenCalledTimes(1)
  })

  it('mints its own token when there is no shared link to take over', async () => {
    const result = await setSeventyPublic('u1', true, null, null)

    expect(result).toEqual({ token: 'newtok', tookOverGlobal: false })
    expect(mocks.batchSet).toHaveBeenCalledWith(
      'settings/publicUnits',
      { 'seventy:u1': { enabled: true, token: 'newtok' } },
      { merge: true },
    )
  })

  it('keeps its own token instead of taking over once it already has one', async () => {
    const result = await setSeventyPublic('u1', true, 'mytok', 'gtok')

    expect(result).toEqual({ token: 'mytok', tookOverGlobal: false })
    expect(mocks.batchSet).not.toHaveBeenCalledWith('settings/publicTokens', { gtok: 'seventy:u1' }, { merge: true })
  })

  it('turns off without dropping the token', async () => {
    const result = await setSeventyPublic('u1', false, 'mytok', null)

    expect(result).toEqual({ token: 'mytok', tookOverGlobal: false })
    expect(mocks.batchSet).toHaveBeenCalledWith(
      'settings/publicUnits',
      { 'seventy:u1': { enabled: false, token: 'mytok' } },
      { merge: true },
    )
  })
})
