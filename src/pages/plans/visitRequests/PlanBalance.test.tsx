import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { VisitRequest } from '@/types'
import { PlanBalance } from './PlanBalance'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string, o?: Record<string, unknown>) => (o ? `${k}:${JSON.stringify(o)}` : k),
  }),
  initReactI18next: { type: '3rdParty', init: () => {} },
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
  render(<PlanBalance request={request} sundayStatus={{}} wardStats={{}} onRefill={onRefill} />)
  return onRefill
}

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
})
