import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
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
const translate = vi.hoisted(() => vi.fn())
vi.mock('@/services/visitRequestService', () => ({
  setUnitSundays: vi.fn().mockResolvedValue(undefined),
  translateShareTemplate: translate,
}))

const request: VisitRequest = {
  id: 'r1',
  title: '1월 방문',
  seventyUid: 's1',
  seventyName: '김칠십',
  sundays: ['2027-01-10', '2027-01-17'],
  unitTokens: { u1: '0123456789abcdef' },
  unitSundays: { u1: ['2027-01-10'] },
  status: 'open',
  units: [{ id: 'u1', ko: '서울 스테이크', en: 'Seoul Stake', wards: [{ id: 'w1', ko: '녹번 와드', en: 'N' }] }],
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
      shareTemplates={{ ko: null, en: null }}
      shareLangs={{}}
      presidents={{ u1: '홍길동' }}
      {...props}
    />,
  )
  return onCopy
}

describe('StakeLinkList message', () => {
  beforeEach(() => translate.mockReset())

  it('copies the saved message with this stake’s values and its link', async () => {
    const user = userEvent.setup()
    const onCopy = renderList({ shareTemplates: { ko: '{회장}, {스테이크}에서 {일요일}에 추천해 주세요.', en: null } })
    await user.click(screen.getByRole('button', { name: /visitRequest.matrix.copyMessage/ }))
    expect(onCopy).toHaveBeenCalledWith(
      expect.stringMatching(/^홍길동 회장님, 서울 스테이크에서 1\/10에 추천해 주세요\.\n.*\/recommend\/r1\/0123456789abcdef$/),
    )
  })

  it('falls back to the default message', async () => {
    const user = userEvent.setup()
    const onCopy = renderList()
    await user.click(screen.getByRole('button', { name: /visitRequest.matrix.copyMessage/ }))
    expect(onCopy.mock.calls[0][0]).toContain('[와드 방문 추천 요청] 1월 방문\n홍길동 회장님, 안녕하세요.')
    expect(screen.getByText('visitRequest.shareTemplate.default')).toBeInTheDocument()
  })

  it('saves an edited message from the dialog', async () => {
    const user = userEvent.setup()
    const onSaveTemplates = vi.fn().mockResolvedValue(undefined)
    renderList({ onSaveTemplates })
    await user.click(screen.getByRole('button', { name: 'visitRequest.shareTemplate.button' }))
    const box = screen.getByLabelText('visitRequest.shareTemplate.label')
    await user.clear(box)
    await user.type(box, '안녕하세요 ')
    await user.click(screen.getByRole('button', { name: '{스테이크}' }))
    translate.mockResolvedValueOnce('Hello {unit}')
    await user.click(screen.getByRole('button', { name: 'visitRequest.shareTemplate.save' }))
    expect(translate).toHaveBeenCalledWith('안녕하세요 {스테이크}')
    await waitFor(() => expect(onSaveTemplates).toHaveBeenCalledWith({ ko: '안녕하세요 {스테이크}', en: 'Hello {unit}' }))
  })

  it('keeps the English as it was when the translation fails, and saves the Korean', async () => {
    const user = userEvent.setup()
    const onSaveTemplates = vi.fn().mockResolvedValue(undefined)
    renderList({ onSaveTemplates, shareTemplates: { ko: null, en: 'Dear {president}, {link}' } })
    await user.click(screen.getByRole('button', { name: 'visitRequest.shareTemplate.button' }))
    await user.type(screen.getByLabelText('visitRequest.shareTemplate.label'), '!')
    translate.mockRejectedValueOnce(new Error('ai-failed'))
    await user.click(screen.getByRole('button', { name: 'visitRequest.shareTemplate.save' }))
    await waitFor(() => expect(onSaveTemplates).toHaveBeenCalled())
    expect(onSaveTemplates.mock.calls[0][0].en).toBe('Dear {president}, {link}')
    expect(onSaveTemplates.mock.calls[0][0].ko).toMatch(/!$/)
  })

  it('does not overwrite English edited by hand, and does not translate an unchanged Korean', async () => {
    const user = userEvent.setup()
    const onSaveTemplates = vi.fn().mockResolvedValue(undefined)
    renderList({ onSaveTemplates })
    await user.click(screen.getByRole('button', { name: 'visitRequest.shareTemplate.button' }))
    await user.click(screen.getByRole('tab', { name: 'visitRequest.shareTemplate.lang.en' }))
    const box = screen.getByLabelText('visitRequest.shareTemplate.label')
    await user.clear(box)
    await user.type(box, 'My own {{link}')
    await user.click(screen.getByRole('button', { name: 'visitRequest.shareTemplate.save' }))
    await waitFor(() => expect(onSaveTemplates).toHaveBeenCalledWith({ ko: null, en: 'My own {link}' }))
    expect(translate).not.toHaveBeenCalled()
  })

  it('hides the edit button when the message cannot be saved', () => {
    renderList()
    expect(screen.queryByRole('button', { name: 'visitRequest.shareTemplate.button' })).not.toBeInTheDocument()
  })
  it('sends an English stake the English message and an English link', async () => {
    const user = userEvent.setup()
    const onCopy = renderList({ shareLangs: { u1: 'en' } })
    await user.click(screen.getByRole('button', { name: /visitRequest.matrix.copyMessage/ }))
    const msg = onCopy.mock.calls[0][0] as string
    expect(msg).toContain('Dear President 홍길동,')
    expect(msg).toContain('a ward in Seoul Stake')
    expect(msg).toMatch(/\/recommend\/r1\/0123456789abcdef\?lang=en$/)
    await user.click(screen.getByRole('button', { name: /visitRequest.matrix.copyLink/ }))
    expect(onCopy.mock.calls[1][0]).toMatch(/\?lang=en$/)
  })

  it('fills an English message with the translated title, names and guidance', async () => {
    const user = userEvent.setup()
    const onCopy = renderList({
      shareLangs: { u1: 'en' },
      english: { title: 'Ward Visits, January', guidance: 'Please put first…', note: 'Thank you.', seventy: 'Park Kyungryeol', presidents: { u1: 'Ha Taewan' } },
    })
    await user.click(screen.getByRole('button', { name: /visitRequest.matrix.copyMessage/ }))
    const msg = onCopy.mock.calls[0][0] as string
    expect(msg).toContain('[Ward visit recommendations] Ward Visits, January')
    expect(msg).toContain('Dear President Ha Taewan,')
    expect(msg).toContain('Area Seventy Park Kyungryeol')
    expect(msg).toContain('\nThank you.\n')
    expect(msg).not.toMatch(/[가-힣]/)
  })

  it('says it is translating', () => {
    renderList({ englishPending: true })
    expect(screen.getByRole('status')).toHaveTextContent('visitRequest.englishPending')
  })

  it('switches a stake to English', async () => {
    const user = userEvent.setup()
    const onSetLang = vi.fn()
    renderList({ onSetLang })
    await user.click(screen.getByRole('radio', { name: 'EN' }))
    expect(onSetLang).toHaveBeenCalledWith('u1', 'en')
  })

  it('greets with the title alone when the president is not on the list', async () => {
    const user = userEvent.setup()
    const onCopy = renderList({ presidents: {} })
    await user.click(screen.getByRole('button', { name: /visitRequest.matrix.copyMessage/ }))
    expect(onCopy.mock.calls[0][0]).toContain('\n회장님, 안녕하세요.')
  })
})
