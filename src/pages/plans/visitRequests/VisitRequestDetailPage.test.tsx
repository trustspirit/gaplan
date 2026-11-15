import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { toast } from 'sonner'
import type { VisitRecommendation, VisitRequest } from '@/types'
import { decideVisitRequestDate } from '@/services/visitRequestService'
import { VisitRequestDetailPage } from './VisitRequestDetailPage'

let request: VisitRequest
let recommendations: VisitRecommendation[]

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string, o?: Record<string, unknown>) => (o ? `${k}:${JSON.stringify(o)}` : k),
  }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}))
vi.mock('jotai', () => ({ useAtomValue: () => null, useSetAtom: () => vi.fn(), atom: vi.fn() }))
vi.mock('@/hooks/useTopBar', () => ({ useTopBar: vi.fn() }))
vi.mock('@/hooks/useIsMobile', () => ({ useIsMobile: () => false }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/hooks/useVisitRequests', () => ({
  useVisitRequest: () => ({ request, recommendations, loading: false, error: false }),
}))
vi.mock('@/services/visitRequestService', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/services/visitRequestService')>()
  return {
    alreadyVisitingWard: real.alreadyVisitingWard,
    decideVisitRequestDate: vi.fn(),
    deleteVisitRequest: vi.fn(),
    setVisitRequestStatus: vi.fn(),
    fetchWardStats: vi.fn().mockResolvedValue({}),
    fetchSundayStatus: vi.fn().mockResolvedValue({ status: {}, lastVisitRegion: null }),
    updateVisitRequestText: vi.fn(),
  }
})

beforeEach(() => {
  vi.mocked(decideVisitRequestDate).mockReset()
  vi.mocked(decideVisitRequestDate).mockResolvedValue()
  vi.mocked(toast.error).mockClear()
  request = {
    id: 'r1',
    title: '1월 방문',
    seventyUid: 's1',
    seventyName: '김칠십',
    sundays: ['2027-01-10', '2027-01-17'],
    token: '0123456789abcdef',
    status: 'open',
    units: [
      { id: 'u1', ko: '서울 스테이크', en: 'Seoul', wards: [{ id: 'w1', ko: '녹번 와드', en: 'N' }] },
      { id: 'u2', ko: '서울동 스테이크', en: 'Seoul E', wards: [{ id: 'w2', ko: '교문 와드', en: 'G' }] },
    ],
    decisions: {
      '2027-01-17': { unitId: 'u2', wardId: 'w2', wardName: '교문 와드', scheduleId: 'vr_r1_2027-01-17' },
    },
    createdBy: 's1',
    createdAt: '2026-11-01',
  }
  recommendations = [
    { unitId: 'u1', submitterName: '홍회장', submittedAt: '2026-11-02', picks: [{ date: '2027-01-10', wardId: 'w1', wardName: '녹번 와드' }] },
  ]
})

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/plans/recommendations/r1']}>
      <Routes>
        <Route path="/plans/recommendations/:requestId" element={<VisitRequestDetailPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('VisitRequestDetailPage', () => {
  it('shows the public link to share', () => {
    renderPage()
    expect(screen.getByText(/\/recommend\/r1\/0123456789abcdef$/)).toBeInTheDocument()
  })

  it('confirms a candidate only after the confirm sheet', async () => {
    const user = userEvent.setup()
    renderPage()
    const row = screen.getByText(/녹번 와드/).closest('li')!
    await user.click(within(row).getByRole('button', { name: 'visitRequest.decide' }))
    expect(decideVisitRequestDate).not.toHaveBeenCalled()
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'visitRequest.decide' }))
    await waitFor(() =>
      expect(decideVisitRequestDate).toHaveBeenCalledWith('r1', '2027-01-10', { unitId: 'u1', wardId: 'w1' }),
    )
  })

  it('undoes a decided Sunday', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'visitRequest.undecide' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'visitRequest.undecide' }))
    await waitFor(() => expect(decideVisitRequestDate).toHaveBeenCalledWith('r1', '2027-01-17', null))
  })

  it('names the ward already booked when the seventy is visiting elsewhere that Sunday', async () => {
    vi.mocked(decideVisitRequestDate).mockRejectedValue(new Error('already-visiting:신촌 와드'))
    const user = userEvent.setup()
    renderPage()
    const row = screen.getByText(/녹번 와드/).closest('li')!
    await user.click(within(row).getByRole('button', { name: 'visitRequest.decide' }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'visitRequest.decide' }))
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('visitRequest.alreadyVisiting:{"ward":"신촌 와드"}'),
    )
  })
})
