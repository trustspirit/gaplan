import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { VisitRequest } from '@/types'
import { StakeLinkList } from './StakeLinkList'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string, o?: Record<string, unknown>) => (o ? `${k}:${JSON.stringify(o)}` : k),
    i18n: { language: 'ko' },
  }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}))
vi.mock('@/hooks/useIsMobile', () => ({ useIsMobile: () => false }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/services/visitRequestService', () => ({ setUnitSundays: vi.fn().mockResolvedValue(undefined) }))

const request: VisitRequest = {
  id: 'r1',
  title: '1월 방문',
  seventyUid: 's1',
  seventyName: '김칠십',
  sundays: ['2027-01-10', '2027-01-17'],
  unitTokens: { u1: '0123456789abcdef' },
  unitSundays: { u1: ['2027-01-10'] },
  status: 'open',
  units: [{ id: 'u1', ko: '서울 스테이크', en: 'Seoul', wards: [{ id: 'w1', ko: '녹번 와드', en: 'N' }] }],
  decisions: {},
  createdBy: 's1',
  createdAt: '2026-11-01',
}

function renderList(props: Partial<Parameters<typeof StakeLinkList>[0]> = {}) {
  const onCopy = vi.fn()
  render(
    <StakeLinkList
      request={request}
      recommendations={[]}
      sundayStatus={{}}
      wardStats={{}}
      ready
      onCopy={onCopy}
      shareTemplate={null}
      {...props}
    />,
  )
  return onCopy
}

describe('StakeLinkList message', () => {
  it('copies the saved message with this stake’s values and its link', async () => {
    const user = userEvent.setup()
    const onCopy = renderList({ shareTemplate: '{스테이크} 회장님, {일요일}에 추천해 주세요.' })
    await user.click(screen.getByRole('button', { name: /visitRequest.matrix.copyMessage/ }))
    expect(onCopy).toHaveBeenCalledWith(
      expect.stringMatching(/^서울 스테이크 회장님, 1\/10에 추천해 주세요\.\n.*\/recommend\/r1\/0123456789abcdef$/),
    )
  })

  it('falls back to the default message', async () => {
    const user = userEvent.setup()
    const onCopy = renderList()
    await user.click(screen.getByRole('button', { name: /visitRequest.matrix.copyMessage/ }))
    expect(onCopy.mock.calls[0][0]).toContain('[와드 방문 추천 요청] 1월 방문 · 서울 스테이크')
    expect(screen.getByText('visitRequest.shareTemplate.default')).toBeInTheDocument()
  })

  it('saves an edited message from the dialog', async () => {
    const user = userEvent.setup()
    const onSaveTemplate = vi.fn().mockResolvedValue(undefined)
    renderList({ onSaveTemplate })
    await user.click(screen.getByRole('button', { name: 'visitRequest.shareTemplate.button' }))
    const box = screen.getByLabelText('visitRequest.shareTemplate.label')
    await user.clear(box)
    await user.type(box, '안녕하세요 ')
    await user.click(screen.getByRole('button', { name: '{스테이크}' }))
    await user.click(screen.getByRole('button', { name: 'visitRequest.shareTemplate.save' }))
    expect(onSaveTemplate).toHaveBeenCalledWith('안녕하세요 {스테이크}')
  })

  it('hides the edit button when the message cannot be saved', () => {
    renderList()
    expect(screen.queryByRole('button', { name: 'visitRequest.shareTemplate.button' })).not.toBeInTheDocument()
  })
})
