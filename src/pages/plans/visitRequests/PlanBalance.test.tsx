import { render, screen, waitFor } from '@testing-library/react'
import { toast } from 'sonner'
import { reviewVisitPlan } from '@/services/visitRequestService'
import userEvent from '@testing-library/user-event'
import type { VisitRequest } from '@/types'
import { PlanBalance } from './PlanBalance'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string, o?: Record<string, unknown>) => (o ? `${k}:${JSON.stringify(o)}` : k),
  }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}))

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/services/visitRequestService', () => ({
  reviewVisitPlan: vi.fn(),
  aiUnavailable: (e: unknown) => (e as { code?: string })?.code === 'functions/failed-precondition',
}))

const D1 = '2027-01-10'
const D2 = '2027-01-17'

function makeRequest(unitSundays: VisitRequest['unitSundays']): VisitRequest {
  return {
    id: 'r1', title: 't', seventyUid: 's1', seventyName: '김칠십',
    sundays: [D1, D2], status: 'open', decisions: {}, createdBy: 's1', createdAt: '2026-11-01',
    units: [
      { id: 'u1', ko: '서울 스테이크', en: '', wards: [{ id: 'w1', ko: '녹번 와드', en: '' }] },
      { id: 'u2', ko: '서울동 스테이크', en: '', wards: [{ id: 'w2', ko: '교문 와드', en: '' }] },
    ],
    unitSundays,
  }
}

function renderBalance(request: VisitRequest, onRefill = vi.fn()) {
  const view = render(<PlanBalance request={request} sundayStatus={{}} wardStats={{}} onRefill={onRefill} />)
  return Object.assign(onRefill, { rerender: (r: VisitRequest) => view.rerender(
    <PlanBalance request={r} sundayStatus={{}} wardStats={{}} onRefill={onRefill} />,
  ) })
}

beforeEach(() => {
  vi.mocked(reviewVisitPlan).mockReset()
  vi.mocked(toast.error).mockClear()
})

describe('PlanBalance', () => {
  it('lists warnings before notes, naming the stake and the day', () => {
    renderBalance(makeRequest({ u1: [D1], u2: [] }))
    const items = screen.getAllByRole('listitem').map((li) => li.textContent ?? '')
    expect(items[0]).toContain('visitRequest.balance.sundayEmpty')
    expect(items.some((x) => x.includes('visitRequest.balance.unitUrgentMissing') && x.includes('서울동 스테이크'))).toBe(true)
    expect(items.at(-1)).toContain('visitRequest.balance.sundayNoBackup')
  })

  it('says the plan is even when nothing is off', () => {
    renderBalance(makeRequest({ u1: [D1, D2], u2: [D1, D2] }))
    expect(screen.getByText('visitRequest.balance.allGood')).toBeInTheDocument()
    expect(screen.queryAllByRole('listitem')).toHaveLength(0)
  })

  it('asks to fill an older request instead of listing every overlap', async () => {
    const user = userEvent.setup()
    const onRefill = renderBalance(makeRequest(undefined))
    expect(screen.getByText('visitRequest.balance.legacy')).toBeInTheDocument()
    expect(screen.queryAllByRole('listitem')).toHaveLength(0)
    await user.click(screen.getByRole('button', { name: 'visitRequest.balance.fill' }))
    expect(onRefill).toHaveBeenCalled()
  })

  it('can refill a filled request from the recommendation', async () => {
    const user = userEvent.setup()
    const onRefill = renderBalance(makeRequest({ u1: [D1], u2: [D2] }))
    await user.click(screen.getByRole('button', { name: 'visitRequest.balance.refill' }))
    expect(onRefill).toHaveBeenCalled()
  })

  it('shows Claude’s suggestions after asking for a review', async () => {
    vi.mocked(reviewVisitPlan).mockResolvedValue([{ level: 'warn', text: '녹번 와드가 18개월째 빠져 있어요' }])
    const user = userEvent.setup()
    renderBalance(makeRequest({ u1: [D1, D2], u2: [D1, D2] }))
    await user.click(screen.getByRole('button', { name: 'visitRequest.ai.button' }))
    expect(reviewVisitPlan).toHaveBeenCalledWith('r1')
    expect(await screen.findByText('녹번 와드가 18개월째 빠져 있어요')).toBeInTheDocument()
    expect(screen.getByText('visitRequest.ai.title')).toBeInTheDocument()
  })

  it('marks the review as out of date once the assignment changes, without asking again', async () => {
    vi.mocked(reviewVisitPlan).mockResolvedValue([{ level: 'tip', text: '괜찮아요' }])
    const user = userEvent.setup()
    const r = renderBalance(makeRequest({ u1: [D1, D2], u2: [D1, D2] }))
    await user.click(screen.getByRole('button', { name: 'visitRequest.ai.button' }))
    await screen.findByText('괜찮아요')
    r.rerender(makeRequest({ u1: [D1], u2: [D1, D2] }))
    expect(screen.getByText('visitRequest.ai.stale')).toBeInTheDocument()
    expect(reviewVisitPlan).toHaveBeenCalledTimes(1)
  })

  it('says when AI review is not set up, and keeps the checks', async () => {
    vi.mocked(reviewVisitPlan).mockRejectedValue({ code: 'functions/failed-precondition' })
    const user = userEvent.setup()
    renderBalance(makeRequest({ u1: [D1], u2: [] }))
    await user.click(screen.getByRole('button', { name: 'visitRequest.ai.button' }))
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('visitRequest.ai.unavailable'))
    expect(screen.getAllByRole('listitem')[0]).toHaveTextContent('visitRequest.balance.sundayEmpty')
  })

  it('reports other failures plainly', async () => {
    vi.mocked(reviewVisitPlan).mockRejectedValue(new Error('boom'))
    const user = userEvent.setup()
    renderBalance(makeRequest({ u1: [D1, D2], u2: [D1, D2] }))
    await user.click(screen.getByRole('button', { name: 'visitRequest.ai.button' }))
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('visitRequest.ai.failed'))
  })

  it('does not offer a review before the plan is filled', () => {
    renderBalance(makeRequest(undefined))
    expect(screen.queryByRole('button', { name: 'visitRequest.ai.button' })).not.toBeInTheDocument()
  })
})
