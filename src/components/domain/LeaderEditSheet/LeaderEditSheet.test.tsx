import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { LeaderEditSheet } from './LeaderEditSheet'
import type { Leader } from '@/types/leader'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: 'ko' } }),
  initReactI18next: { type: '3rdParty', init: vi.fn() },
}))
vi.mock('@/hooks/useIsMobile', () => ({ useIsMobile: () => true }))

const LEADER: Leader = {
  id: '301957',
  externalUnitId: 301957,
  unitNameKo: '교문 와드',
  unitNameEn: 'Gyomun Ward',
  role: '감독',
  name: '이윤학',
  phone: '010-4149-7611',
  email: 'a@b.com',
}

describe('LeaderEditSheet', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('leader가 null이면 아무것도 렌더하지 않는다', () => {
    const { container } = render(
      <LeaderEditSheet leader={null} onClose={vi.fn()} onSave={vi.fn()} />,
    )
    expect(container).toBeEmptyDOMElement()
    expect(document.body.querySelector('[role="dialog"]')).toBeNull()
  })

  it('기존 값이 입력란에 채워진다', () => {
    render(<LeaderEditSheet leader={LEADER} onClose={vi.fn()} onSave={vi.fn()} />)

    expect(screen.getByLabelText('leaders.name')).toHaveValue('이윤학')
    expect(screen.getByLabelText('leaders.phone')).toHaveValue('010-4149-7611')
    expect(screen.getByLabelText('leaders.email')).toHaveValue('a@b.com')
  })

  it('읽기 전용 정보로 역할과 단위명을 보여준다', () => {
    render(<LeaderEditSheet leader={LEADER} onClose={vi.fn()} onSave={vi.fn()} />)

    expect(screen.getByText('감독')).toBeInTheDocument()
    expect(screen.getByText('교문 와드')).toBeInTheDocument()
  })

  it('선택 필드가 없으면 빈 문자열로 채운다', () => {
    render(
      <LeaderEditSheet
        leader={{ ...LEADER, phone: undefined, email: undefined }}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />,
    )

    expect(screen.getByLabelText('leaders.phone')).toHaveValue('')
    expect(screen.getByLabelText('leaders.email')).toHaveValue('')
  })

  it('저장 시 입력값을 patch로 넘기고 시트를 닫는다', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    const onClose = vi.fn()
    render(<LeaderEditSheet leader={LEADER} onClose={onClose} onSave={onSave} />)

    fireEvent.change(screen.getByLabelText('leaders.phone'), {
      target: { value: '010-0000-1111' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'leaders.save' }))

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith({
        name: '이윤학',
        phone: '010-0000-1111',
        email: 'a@b.com',
      }),
    )
    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })

  it('이름을 비우고 저장하면 에러를 표시하고 onSave를 부르지 않는다', async () => {
    const onSave = vi.fn()
    render(<LeaderEditSheet leader={LEADER} onClose={vi.fn()} onSave={onSave} />)

    fireEvent.change(screen.getByLabelText('leaders.name'), { target: { value: '  ' } })
    fireEvent.click(screen.getByRole('button', { name: 'leaders.save' }))

    expect(await screen.findByText('leaders.nameRequired')).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
  })

  it('저장이 실패하면 시트를 닫지 않고 에러를 보여준다', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('permission-denied'))
    const onClose = vi.fn()
    render(<LeaderEditSheet leader={LEADER} onClose={onClose} onSave={onSave} />)

    fireEvent.click(screen.getByRole('button', { name: 'leaders.save' }))

    expect(await screen.findByText('leaders.saveFailed')).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
    // 입력값이 남아 있어야 재시도할 수 있다
    expect(screen.getByLabelText('leaders.name')).toHaveValue('이윤학')
  })

  it('취소하면 저장 없이 닫는다', () => {
    const onSave = vi.fn()
    const onClose = vi.fn()
    render(<LeaderEditSheet leader={LEADER} onClose={onClose} onSave={onSave} />)

    fireEvent.click(screen.getByRole('button', { name: 'leaders.cancel' }))

    expect(onClose).toHaveBeenCalled()
    expect(onSave).not.toHaveBeenCalled()
  })
})
