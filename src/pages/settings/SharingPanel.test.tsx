import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { setGlobalPublic, setScopePublic } from '@/services/publicLinkService'
import { expectNoAccentStripe } from '@/components/ui/testing/bannedPatterns'
import { SharingPanel } from './SharingPanel'

let publicDoc: Record<string, unknown> = {}
let unitsDoc: Record<string, unknown> = {}

beforeEach(() => {
  publicDoc = { schedulePublic: true, globalToken: 'gtok' }
  unitsDoc = { 'seoul-stake': { enabled: true, token: 'stok' } }
  vi.mocked(setGlobalPublic).mockClear().mockResolvedValue('gtok')
  vi.mocked(setScopePublic).mockClear().mockResolvedValue('stok')
})

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
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
}))
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

const summary = () => screen.getByTestId('sharing-summary')

describe('SharingPanel', () => {
  it('summarises how many links are live', async () => {
    render(<SharingPanel />)
    await waitFor(() => expect(summary()).toHaveTextContent('settings.sharing.summary'))
  })

  it('narrows the list as you search', async () => {
    render(<SharingPanel />)
    await waitFor(() => expect(screen.getByText('경기 스테이크')).toBeInTheDocument())

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
    await waitFor(() => expect(screen.getByText('경기 스테이크')).toBeInTheDocument())

    await userEvent.click(screen.getByRole('radio', { name: 'settings.sharing.filterActive' }))
    expect(screen.getByText('서울 스테이크')).toBeInTheDocument()
    expect(screen.queryByText('경기 스테이크')).not.toBeInTheDocument()
  })

  it('routes a unit toggle through the service', async () => {
    render(<SharingPanel />)
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

    await waitFor(() => expect(setGlobalPublic).toHaveBeenCalledWith(false, 'gtok'))
  })

  // 판정 R49 — 전역 킬스위치가 꺼져 있으면 단위 링크가 전부 죽는다. 그 사실을 적는다.
  it('warns that the unit links are dead while the global switch is off', async () => {
    publicDoc = { schedulePublic: false, globalToken: 'gtok' }
    render(<SharingPanel />)
    expect(await screen.findByText('settings.sharing.globalOffWarning')).toBeInTheDocument()
  })

  it('says nothing about the global switch while it is on', async () => {
    render(<SharingPanel />)
    await waitFor(() => expect(screen.getByText('경기 스테이크')).toBeInTheDocument())
    expect(screen.queryByText('settings.sharing.globalOffWarning')).not.toBeInTheDocument()
  })

  it('never marks an active row with an accent bar', () => {
    expectNoAccentStripe(readFileSync(resolve(__dirname, 'SharingPanel.module.scss'), 'utf8'))
  })
})
