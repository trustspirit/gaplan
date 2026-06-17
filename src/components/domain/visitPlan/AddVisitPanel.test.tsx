import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AddVisitPanel } from './AddVisitPanel'
import type { LastVisitEntry } from '@/utils/visitStats'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: { count?: number }) =>
      params?.count != null ? `${key}:${params.count}` : key,
  }),
  initReactI18next: { type: '3rdParty', init: vi.fn() },
}))

function entry(index: number): LastVisitEntry {
  return {
    id: `ward-${index}`,
    name: `와드 ${index}`,
    regionId: 'region-a',
    lastVisitDate: '2026-01-01',
    daysSince: index,
    severity: index > 30 ? 'green' : 'red',
  }
}

describe('AddVisitPanel', () => {
  it('우선순위가 낮은 방문 이력 있는 와드도 선택 후보로 보여준다', () => {
    const staleWards = Array.from({ length: 35 }, (_, i) => entry(i + 1))

    render(<AddVisitPanel staleWards={staleWards} onAdd={vi.fn()} />)

    expect(screen.getByRole('button', { name: /와드 35/ })).toBeInTheDocument()
  })

  it('와드 후보를 검색해서 좁힐 수 있다', async () => {
    const user = userEvent.setup()
    const staleWards = Array.from({ length: 35 }, (_, i) => entry(i + 1))

    render(<AddVisitPanel staleWards={staleWards} onAdd={vi.fn()} />)

    await user.type(screen.getByLabelText('visitPlan.searchWard'), '35')

    expect(screen.getByRole('button', { name: /와드 35/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^와드 1 ·/ })).not.toBeInTheDocument()
  })
})
