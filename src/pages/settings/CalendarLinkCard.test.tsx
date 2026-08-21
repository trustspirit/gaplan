import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { setDoc } from 'firebase/firestore'
import { manualCalendarSync } from '@/services/scheduleService'
import { CalendarLinkCard } from './CalendarLinkCard'

let stored: Record<string, string> = {}

beforeEach(() => {
  stored = { seoul: 'seoul@group.calendar.google.com' }
  vi.mocked(setDoc)
    .mockClear()
    .mockResolvedValue(undefined as never)
  vi.mocked(manualCalendarSync)
    .mockClear()
    .mockResolvedValue({ synced: 3 } as never)
})

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}))
vi.mock('@/firebase', () => ({ db: {} }))
vi.mock('firebase/firestore', () => ({
  doc: (_db: unknown, col: string, id: string) => `${col}/${id}`,
  getDoc: vi.fn(() => Promise.resolve({ data: () => ({ calendars: stored }) })),
  setDoc: vi.fn(),
}))
vi.mock('@/services/scheduleService', () => ({ manualCalendarSync: vi.fn() }))
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

describe('CalendarLinkCard', () => {
  it('fills each region input from the stored settings', async () => {
    render(<CalendarLinkCard />)
    await waitFor(() =>
      expect(screen.getByLabelText('서울 CC')).toHaveValue('seoul@group.calendar.google.com'),
    )
  })

  it('saves every region id in one write', async () => {
    render(<CalendarLinkCard />)
    await waitFor(() =>
      expect(screen.getByLabelText('서울 CC')).toHaveValue('seoul@group.calendar.google.com'),
    )
    await userEvent.click(screen.getByRole('button', { name: 'common.save' }))

    await waitFor(() =>
      expect(setDoc).toHaveBeenCalledWith(
        'settings/calendar',
        { calendars: expect.objectContaining({ seoul: 'seoul@group.calendar.google.com' }) },
        { merge: true },
      ),
    )
  })

  // 판정 R50 — 동기화는 설정이 아니라 액션이다. 같은 카드 안에 둔다.
  it('keeps the sync action in the same card as the ids', () => {
    render(<CalendarLinkCard />)
    expect(screen.getByRole('button', { name: 'settings.system.syncTitle' })).toBeInTheDocument()
  })

  it('runs the manual sync when the action is pressed', async () => {
    render(<CalendarLinkCard />)
    await userEvent.click(screen.getByRole('button', { name: 'settings.system.syncTitle' }))
    await waitFor(() => expect(manualCalendarSync).toHaveBeenCalled())
  })

  // 판정 R54 — 지속되는 「마지막 동기화 시각」은 저장할 곳이 없다. 방금 돌린
  // 결과만 남긴다. 버튼을 누른 사람이 무슨 일이 일어났는지는 알아야 한다.
  it('reports what the sync just did', async () => {
    render(<CalendarLinkCard />)
    await userEvent.click(screen.getByRole('button', { name: 'settings.system.syncTitle' }))
    expect(await screen.findByTestId('sync-result')).toHaveTextContent('settings.system.syncResult')
  })

  it('shows no result before the sync has ever run', () => {
    render(<CalendarLinkCard />)
    expect(screen.queryByTestId('sync-result')).not.toBeInTheDocument()
  })
})
