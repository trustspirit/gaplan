import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { toast } from 'sonner'
import type { VisitRecommendation, VisitRequest } from '@/types'
import { decideVisitRequestDate, ensureUnitTokens, fetchSundayStatus, setUnitSundayPlan, setUnitSundays } from '@/services/visitRequestService'
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
    ensureUnitTokens: vi.fn().mockResolvedValue(undefined),
    setUnitSundays: vi.fn().mockResolvedValue(undefined),
    setUnitSundayPlan: vi.fn().mockResolvedValue(undefined),
    fetchSundayStatus: vi.fn().mockResolvedValue({ status: {}, lastVisitRegion: null }),
    updateVisitRequestText: vi.fn(),
  }
})

beforeEach(() => {
  vi.mocked(decideVisitRequestDate).mockReset()
  vi.mocked(decideVisitRequestDate).mockResolvedValue()
  vi.mocked(toast.error).mockClear()
  vi.mocked(setUnitSundayPlan).mockClear()
  request = {
    id: 'r1',
    title: '1월 방문',
    seventyUid: 's1',
    seventyName: '김칠십',
    sundays: ['2027-01-10', '2027-01-17'],
    unitTokens: { u1: '0123456789abcdef', u2: 'fedcba9876543210' },
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
  it('gives each stake its own link', () => {
    renderPage()
    const hrefs = screen.getAllByRole('link', { name: /visitRequest.open/ }).map((a) => a.getAttribute('href'))
    expect(hrefs).toEqual([
      expect.stringMatching(/\/recommend\/r1\/0123456789abcdef$/),
      expect.stringMatching(/\/recommend\/r1\/fedcba9876543210$/),
    ])
  })

  it('lets the seventy choose the Sundays for one stake, not ones decided elsewhere', async () => {
    const user = userEvent.setup()
    renderPage()
    // 서울 스테이크(u1): 1/10은 고를 수 있고, 1/17은 서울동으로 확정돼 고를 수 없다
    const u1Row = screen.getAllByRole('link', { name: /visitRequest.open/ })[0].closest('li')!
    const [jan10, jan17] = within(u1Row)
      .getAllByRole('button')
      .filter((b) => b.hasAttribute('aria-pressed'))
    expect(jan10).toHaveAttribute('aria-pressed', 'true')
    expect(jan17).toBeDisabled()
    await user.click(jan10)
    await waitFor(() => expect(setUnitSundays).toHaveBeenCalledWith('r1', 'u1', []))
    expect(within(u1Row).getByText(/visitRequest.decidedElsewhere/)).toHaveTextContent('교문 와드')
  })

  it('fills per-stake tokens on a request made before per-stake links', () => {
    request = { ...request, unitTokens: undefined }
    renderPage()
    expect(ensureUnitTokens).toHaveBeenCalled()
    expect(screen.getAllByText('visitRequest.linkPreparing')).toHaveLength(2)
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

  it('refills the recommended Sundays right away when no stake has answered', async () => {
    recommendations = []
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'visitRequest.balance.fill' }))
    await waitFor(() => expect(setUnitSundayPlan).toHaveBeenCalled())
    const [id, plan] = vi.mocked(setUnitSundayPlan).mock.calls[0]
    expect(id).toBe('r1')
    // 1/17은 서울동(u2)으로 확정 — 그 스테이크 링크에 남는다
    expect(plan.unitSundays.u2).toContain('2027-01-17')
    expect(plan.unitSundays.u1).not.toContain('2027-01-17')
    expect(plan.roles['2027-01-10'].primary).toBeDefined()
  })

  it('asks before refilling when a stake has already answered', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'visitRequest.balance.fill' }))
    expect(setUnitSundayPlan).not.toHaveBeenCalled()
    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveTextContent('visitRequest.refillConfirmMessage')
    await user.click(within(dialog).getByRole('button', { name: 'visitRequest.balance.refill' }))
    await waitFor(() => expect(setUnitSundayPlan).toHaveBeenCalled())
  })

  it('marks the primary and backup stake on the Sunday chips', () => {
    request = {
      ...request,
      unitSundays: { u1: ['2027-01-10'], u2: ['2027-01-10', '2027-01-17'] },
      unitSundayRoles: { '2027-01-10': { primary: 'u1', backup: 'u2' } },
    }
    const { container } = renderPage()
    const rows = screen.getAllByRole('link', { name: /visitRequest.open/ }).map((a) => a.closest('li')!)
    expect(rows[0].querySelector('[data-role="primary"]')).not.toBeNull()
    expect(rows[1].querySelector('[data-role="backup"]')).not.toBeNull()
    expect(container.querySelectorAll('[data-role]')).toHaveLength(2)
    expect(screen.getByText('visitRequest.roleLegend')).toBeInTheDocument()
  })

  it('says which stakes were asked about a Sunday that has no recommendation yet', () => {
    recommendations = []
    request = { ...request, unitSundays: { u1: ['2027-01-10'], u2: ['2027-01-10', '2027-01-17'] } }
    renderPage()
    expect(screen.getByText(/visitRequest.noCandidatesAsked/)).toHaveTextContent('서울 스테이크, 서울동 스테이크')
  })

  it('keeps refill off until the Sunday status and visit history arrive', () => {
    vi.mocked(fetchSundayStatus).mockReturnValueOnce(new Promise(() => {}))
    renderPage()
    expect(screen.getByRole('button', { name: 'visitRequest.balance.fill' })).toBeDisabled()
  })
})

