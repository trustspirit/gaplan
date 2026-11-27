import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { getDoc } from 'firebase/firestore'
import { setGlobalPublic, setScopePublic, setSeventyPublic } from '@/services/publicLinkService'
import { expectNoAccentStripe } from '@/components/ui/testing/bannedPatterns'
import { toast } from 'sonner'
import { SharingPanel } from './SharingPanel'

let publicDoc: Record<string, unknown> = {}
let unitsDoc: Record<string, unknown> = {}
let mockUsers: Array<Record<string, unknown>> = []

vi.mock('jotai', () => ({
  useAtomValue: () => ({ uid: 'adm', role: 'admin', name: '관리자', email: 'adm@x', createdAt: '' }),
  atom: vi.fn(),
}))
vi.mock('@/hooks/useUsers', () => ({ useUsers: () => ({ users: mockUsers, loading: false }) }))

beforeEach(() => {
  publicDoc = { schedulePublic: true, globalToken: 'gtok' }
  unitsDoc = { 'seoul-stake': { enabled: true, token: 'stok' } }
  vi.mocked(setGlobalPublic).mockClear().mockResolvedValue('gtok')
  vi.mocked(setScopePublic).mockClear().mockResolvedValue('stok')
  vi.mocked(setSeventyPublic).mockClear().mockResolvedValue({ token: 'gtok', tookOverGlobal: true })
  mockUsers = [
    { uid: 'u1', role: 'seventy', name: '김칠십', email: 'a@x', createdAt: '' },
    { uid: 'u2', role: 'seventy', name: '나칠십', email: 'b@x', createdAt: '', preRegistered: true },
  ]
  // 개별 테스트가 getDoc을 지연·거부로 덮어쓰므로(fetching/에러 테스트), 매번
  // 기본 구현으로 되돌려 다음 테스트로 새지 않게 한다.
  vi.mocked(getDoc)
    .mockReset()
    .mockImplementation(
      ((ref: string) =>
        Promise.resolve({
          data: () => (ref === 'settings/public' ? publicDoc : unitsDoc),
        })) as never,
    )
})

// 실제 i18next의 t는 렌더마다 같은 함수다. 매번 새로 만들면 화면의 읽기 effect(deps에 t)가 렌더마다
// 다시 돌아 방금 바꾼 상태를 덮어쓴다.
const stableT = (k: string) => k
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: stableT }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}))
vi.mock('@/firebase', () => ({ db: {} }))
vi.mock('firebase/firestore', () => ({
  doc: (_db: unknown, col: string, id: string) => `${col}/${id}`,
  getDoc: vi.fn((ref: string) =>
    Promise.resolve({ data: () => (ref === 'settings/public' ? publicDoc : unitsDoc) }),
  ),
}))
vi.mock('@/services/publicLinkService', () => ({
  setGlobalPublic: vi.fn(),
  setScopePublic: vi.fn(),
  setSeventyPublic: vi.fn(),
}))
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

const summary = () => screen.getByTestId('sharing-summary')

describe('SharingPanel', () => {
  it('summarises how many links are live', async () => {
    render(<SharingPanel />)
    await waitFor(() => expect(summary()).toHaveTextContent('settings.sharing.summary'))
  })

  // 검색이 목록을 좁히는 사이, 지역 접기(FIX 6)가 기본으로 접혀 있던 지역도
  // 강제로 펼친다 — 안 그러면 검색으로 찾은 결과가 접힌 지역 안에 숨는다.
  it('narrows the list as you search', async () => {
    render(<SharingPanel />)
    await waitFor(() => expect(summary()).toHaveTextContent('settings.sharing.summary'))

    await userEvent.type(screen.getByPlaceholderText('settings.sharing.searchPlaceholder'), '경기')
    expect(screen.getByText('경기 스테이크')).toBeInTheDocument()
    expect(screen.queryByText('부산 스테이크')).not.toBeInTheDocument()
  })

  it('says so plainly when a search matches nothing', async () => {
    render(<SharingPanel />)
    await userEvent.type(screen.getByPlaceholderText('settings.sharing.searchPlaceholder'), 'zzzz')
    expect(await screen.findByText('settings.sharing.noMatch')).toBeInTheDocument()
  })

  it('shows only the live links when the active filter is chosen', async () => {
    render(<SharingPanel />)
    await waitFor(() => expect(summary()).toHaveTextContent('settings.sharing.summary'))

    await userEvent.click(screen.getByRole('radio', { name: 'settings.sharing.filterActive' }))
    expect(screen.getByText('서울 스테이크')).toBeInTheDocument()
    expect(screen.queryByText('경기 스테이크')).not.toBeInTheDocument()
  })

  it('routes a unit toggle through the service', async () => {
    render(<SharingPanel />)
    // 기본은 접힘이므로 검색으로 좁혀서 대상 지역을 강제로 편다.
    await userEvent.type(screen.getByPlaceholderText('settings.sharing.searchPlaceholder'), '경기')
    await waitFor(() => expect(screen.getByText('경기 스테이크')).toBeInTheDocument())

    const row = screen.getByText('경기 스테이크').closest('[data-scope-row]') as HTMLElement
    await userEvent.click(within(row).getByRole('checkbox'))

    await waitFor(() => expect(setScopePublic).toHaveBeenCalledWith('gyeonggi-stake', true, null))
  })

  it('routes the global toggle through the service', async () => {
    render(<SharingPanel />)
    await waitFor(() =>
      expect(screen.getByText('settings.sharing.globalTitle')).toBeInTheDocument(),
    )

    const row = screen.getByTestId('global-toggle')
    await userEvent.click(within(row).getByRole('checkbox'))

    await waitFor(() => expect(setGlobalPublic).toHaveBeenCalledWith(false, 'gtok', null))
  })

  // 판정 R49 — 전역 킬스위치가 꺼져 있으면 단위 링크가 전부 죽는다. 그 사실을 적는다.
  it('warns that the unit links are dead while the global switch is off', async () => {
    publicDoc = { schedulePublic: false, globalToken: 'gtok' }
    render(<SharingPanel />)
    expect(await screen.findByText('settings.sharing.globalOffWarning')).toBeInTheDocument()
  })

  it('says nothing about the global switch while it is on', async () => {
    render(<SharingPanel />)
    await waitFor(() => expect(summary()).toHaveTextContent('settings.sharing.summary'))
    expect(screen.queryByText('settings.sharing.globalOffWarning')).not.toBeInTheDocument()
  })

  it('never marks an active row with an accent bar', () => {
    expectNoAccentStripe(readFileSync(resolve(__dirname, 'SharingPanel.module.scss'), 'utf8'))
  })

  // FIX 4 — 전역 스위치는 fetching 동안 잠겨 있었지만 단위 스위치는 아니었다.
  // getDoc이 끝나기 전에 하나를 켜면 setScopePublic이 토큰을 하나 더 발급하고,
  // 뒤늦게 도착한 .then이 unitStates를 통째로 덮어써 스위치를 조용히 되돌렸다.
  it('disables every scope switch while the initial read is in flight', async () => {
    vi.mocked(getDoc).mockImplementation(() => new Promise(() => {}))
    render(<SharingPanel />)

    // 접힌 지역이라도 펼쳐서 단위 스위치까지 확인한다 — 접기 토글은 fetching과
    // 무관하게 항상 눌리므로 읽기가 끝나지 않아도 펼칠 수 있다.
    await userEvent.click(
      screen.getAllByRole('button', { name: 'settings.sharing.expandRegion' })[0],
    )

    const switches = screen.getAllByRole('checkbox')
    expect(switches.length).toBeGreaterThan(1)
    for (const el of switches) expect(el).toBeDisabled()
  })

  it('reports when the initial read fails instead of rendering everything off silently', async () => {
    vi.mocked(getDoc).mockRejectedValue(new Error('offline'))
    render(<SharingPanel />)
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('common.loadFailed'))
  })

  it('keeps every switch locked after a failed read, and offers a retry', async () => {
    // 못 읽은 화면은 전부 꺼짐으로 보인다 — 거기서 켜면 이미 나눠 준 링크의 토큰을 새로 써 버린다
    vi.mocked(getDoc).mockRejectedValue(new Error('offline'))
    render(<SharingPanel />)
    await waitFor(() => expect(toast.error).toHaveBeenCalled())
    for (const el of screen.getAllByRole('checkbox')) expect(el).toBeDisabled()
    expect(screen.getByRole('button', { name: 'common.retry' })).toBeInTheDocument()
  })

  // FIX 6 — 지역 접기. 검색·필터로 좁혀지지 않은 기본 화면에서는 지역이 접혀
  // 있어야 한다("전부 펼친 수십 행" 문제, 스펙 §4.3).
  describe('region collapse', () => {
    it('starts every region collapsed when nothing narrows the list', async () => {
      render(<SharingPanel />)
      await waitFor(() => expect(summary()).toHaveTextContent('settings.sharing.summary'))

      expect(screen.queryByText('서울 스테이크')).not.toBeInTheDocument()
      expect(screen.queryByText('경기 스테이크')).not.toBeInTheDocument()
    })

    it('expands only the region whose toggle was clicked', async () => {
      render(<SharingPanel />)
      await waitFor(() => expect(summary()).toHaveTextContent('settings.sharing.summary'))

      const seoulGroup = document.querySelector('[data-region="seoul"]') as HTMLElement
      await userEvent.click(within(seoulGroup).getByRole('button'))

      expect(within(seoulGroup).getByText('서울 스테이크')).toBeInTheDocument()
      expect(screen.queryByText('경기 스테이크')).not.toBeInTheDocument()
    })

    it('collapses a region again on a second click', async () => {
      render(<SharingPanel />)
      await waitFor(() => expect(summary()).toHaveTextContent('settings.sharing.summary'))

      const seoulGroup = document.querySelector('[data-region="seoul"]') as HTMLElement
      const toggle = within(seoulGroup).getByRole('button')
      await userEvent.click(toggle)
      expect(within(seoulGroup).getByText('서울 스테이크')).toBeInTheDocument()

      await userEvent.click(toggle)
      expect(within(seoulGroup).queryByText('서울 스테이크')).not.toBeInTheDocument()
    })
  })

  describe('칠십인 개인 링크', () => {
    const seventyRow = (name: string) => screen.getByText(name).closest('[data-seventy-row]') as HTMLElement

    it('처음 켜면 전체 링크 토큰을 넘겨 서비스로 보내고, 넘겨받으면 전체 링크 복사를 감추고 안내한다', async () => {
      render(<SharingPanel />)
      await waitFor(() => expect(screen.getByText('김칠십')).toBeInTheDocument())
      expect(within(screen.getByTestId('global-toggle')).getByTitle('common.copyLink')).toBeInTheDocument()

      await userEvent.click(within(seventyRow('김칠십')).getByRole('checkbox'))

      await waitFor(() => expect(setSeventyPublic).toHaveBeenCalledWith('u1', true, null, 'gtok'))
      expect(await screen.findByText('settings.sharing.globalMovedTo')).toBeInTheDocument()
      expect(within(screen.getByTestId('global-toggle')).queryByTitle('common.copyLink')).toBeNull()
    })

    it('이미 넘겨받았으면 처음부터 안내하고, 전역 스위치는 옮긴 곳을 서비스에 알린다', async () => {
      publicDoc = { schedulePublic: true, globalToken: '', globalTokenMovedTo: 'seventy:u1' }
      render(<SharingPanel />)

      expect(await screen.findByText('settings.sharing.globalMovedTo')).toBeInTheDocument()
      await userEvent.click(within(screen.getByTestId('global-toggle')).getByRole('checkbox'))
      await waitFor(() => expect(setGlobalPublic).toHaveBeenCalledWith(false, null, 'seventy:u1'))
    })

    // 첫 로그인 때 링크가 진짜 uid로 옮겨 가므로(mergePreRegisteredUser) 잠그지 않는다.
    it('미리 등록만 된 칠십인 줄도 켤 수 있다', async () => {
      render(<SharingPanel />)
      await waitFor(() => expect(screen.getByText('나칠십')).toBeInTheDocument())

      expect(within(seventyRow('나칠십')).getByRole('checkbox')).toBeEnabled()
    })
  })
})
