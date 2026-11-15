import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import type { AppUser } from '@/types'
import { createVisitRequest, fetchSundayStatus } from '@/services/visitRequestService'
import { VisitRequestPanel } from './VisitRequestPanel'

let me: Partial<AppUser>

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string, o?: Record<string, unknown>) => (o ? `${k}:${JSON.stringify(o)}` : k),
  }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}))
vi.mock('jotai', () => ({ useAtomValue: () => me, useSetAtom: () => vi.fn(), atom: vi.fn() }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/hooks/useUsers', () => ({ useUsers: () => ({ users: [] }) }))
vi.mock('@/hooks/useVisitRequests', () => ({
  useVisitRequests: () => ({ requests: [], loading: false, error: false }),
}))
vi.mock('@/services/visitRequestService', () => ({
  createVisitRequest: vi.fn().mockResolvedValue('new1'),
  fetchSundayStatus: vi.fn().mockResolvedValue({ status: {}, lastVisitRegion: null }),
}))

function regionTags() {
  return screen.queryAllByRole('button', { name: /visitRequest.regionSwitch/ })
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-15T09:00:00+09:00'))
  me = { uid: 's1', role: 'seventy', name: '김칠십', regionIds: ['seoul', 'seoul-south'] }
})
afterEach(() => vi.useRealTimers())

function renderPanel() {
  render(
    <MemoryRouter>
      <VisitRequestPanel />
    </MemoryRouter>,
  )
}

describe('VisitRequestPanel', () => {
  it('preselects the free Sundays of the next quarter and alternates CCs', async () => {
    renderPanel()
    // 2027년 1분기: 일요일 13개 중 금식 주일 3개를 뺀 10개
    await waitFor(() => expect(regionTags()).toHaveLength(10))
    const names = regionTags().map((b) => b.textContent)
    expect(names.slice(0, 4)).toEqual(['서울', '서울남', '서울', '서울남'])
    expect(screen.getByRole('textbox', { name: 'visitRequest.title' })).toHaveValue(
      'visitRequest.quarterTitle:{"year":2027,"q":1}',
    )
  })

  it('starts with the other CC when the last visit before the quarter was to the first one', async () => {
    vi.mocked(fetchSundayStatus).mockResolvedValueOnce({ status: {}, lastVisitRegion: 'seoul' })
    renderPanel()
    await waitFor(() => expect(regionTags()).toHaveLength(10))
    expect(regionTags()[0]).toHaveTextContent('서울남')
    expect(screen.getByText(/visitRequest.regionLast/)).toBeInTheDocument()
  })

  it('warns when two Sundays in a row get the same CC, and can re-alternate', async () => {
    const user = userEvent.setup()
    renderPanel()
    await waitFor(() => expect(regionTags()).toHaveLength(10))
    await user.click(regionTags()[1]) // 서울남 → 서울: 앞 일요일과 같아진다
    expect(screen.getByRole('alert')).toHaveTextContent('visitRequest.regionRepeat')
    await user.click(screen.getByRole('button', { name: 'visitRequest.regionRotate' }))
    expect(screen.queryByText(/visitRequest.regionRepeat/)).not.toBeInTheDocument()
  })

  it('sends the CC of each Sunday with the request', async () => {
    const user = userEvent.setup()
    renderPanel()
    await waitFor(() => expect(regionTags()).toHaveLength(10))
    await user.click(screen.getByRole('button', { name: 'visitRequest.create' }))
    await waitFor(() => expect(createVisitRequest).toHaveBeenCalled())
    const input = vi.mocked(createVisitRequest).mock.calls[0][0]
    expect(Object.keys(input.sundayRegions ?? {})).toEqual(input.sundays)
    expect(input.sundayRegions?.['2027-01-10']).toBe('seoul')
    expect(input.regions).toEqual([
      { id: 'seoul', name: '서울 CC' },
      { id: 'seoul-south', name: '서울남 CC' },
    ])
    expect(input.units.every((u) => u.regionId === 'seoul' || u.regionId === 'seoul-south')).toBe(true)
  })

  it('does not assign CCs to a seventy with a single CC', async () => {
    me = { ...me, regionIds: ['busan'] }
    renderPanel()
    await waitFor(() => expect(screen.getByText(/visitRequest.sundaysHint/)).toHaveTextContent('"count":10'))
    expect(regionTags()).toHaveLength(0)
  })
})
