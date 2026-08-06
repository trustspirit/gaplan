import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

const LEADER_B: Leader = {
  id: '301958',
  externalUnitId: 301958,
  unitNameKo: '수유 와드',
  unitNameEn: 'Suyu Ward',
  role: '감독',
  name: '김성일',
  phone: '010-1234-5678',
  email: 'c@d.com',
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

  it('텍스트 입력에서 Enter를 누르면 저장된다', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn().mockResolvedValue(undefined)
    const onClose = vi.fn()
    render(<LeaderEditSheet leader={LEADER} onClose={onClose} onSave={onSave} />)

    const phoneInput = screen.getByLabelText('leaders.phone')
    await user.clear(phoneInput)
    await user.type(phoneInput, '010-0000-1111{Enter}')

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith({
        name: '이윤학',
        phone: '010-0000-1111',
        email: 'a@b.com',
      }),
    )
    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })

  it('저장 중에는 X 버튼으로 닫히지 않는다', async () => {
    let resolveSave!: () => void
    const onSave = vi.fn(
      () => new Promise<void>(resolve => { resolveSave = resolve }),
    )
    const onClose = vi.fn()
    render(<LeaderEditSheet leader={LEADER} onClose={onClose} onSave={onSave} />)

    fireEvent.click(screen.getByRole('button', { name: 'leaders.save' }))
    await waitFor(() => expect(onSave).toHaveBeenCalled())

    fireEvent.click(screen.getByRole('button', { name: 'common.close' }))
    expect(onClose).not.toHaveBeenCalled()

    resolveSave()
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

  it('다른 지도자(id 변경)로 바뀌면 폼을 그 사람 값으로 리셋한다', () => {
    const { rerender } = render(
      <LeaderEditSheet leader={LEADER} onClose={vi.fn()} onSave={vi.fn()} />,
    )

    fireEvent.change(screen.getByLabelText('leaders.name'), { target: { value: '수정 중' } })
    expect(screen.getByLabelText('leaders.name')).toHaveValue('수정 중')

    rerender(<LeaderEditSheet leader={LEADER_B} onClose={vi.fn()} onSave={vi.fn()} />)

    expect(screen.getByLabelText('leaders.name')).toHaveValue('김성일')
    expect(screen.getByLabelText('leaders.phone')).toHaveValue('010-1234-5678')
    expect(screen.getByLabelText('leaders.email')).toHaveValue('c@d.com')
  })

  it('같은 id의 새 객체로 리렌더되어도 입력 중이던 값을 유지한다', () => {
    const { rerender } = render(
      <LeaderEditSheet leader={LEADER} onClose={vi.fn()} onSave={vi.fn()} />,
    )

    fireEvent.change(screen.getByLabelText('leaders.name'), { target: { value: '수정 중' } })

    // 값은 동일하지만 참조가 다른 새 leader 객체 (예: firestore 재구독으로 인한 리렌더)
    rerender(<LeaderEditSheet leader={{ ...LEADER }} onClose={vi.fn()} onSave={vi.fn()} />)

    expect(screen.getByLabelText('leaders.name')).toHaveValue('수정 중')
  })

  it('닫았다가 같은 지도자를 다시 열면 원래 값으로 리셋한다', () => {
    const { rerender } = render(
      <LeaderEditSheet leader={LEADER} onClose={vi.fn()} onSave={vi.fn()} />,
    )

    fireEvent.change(screen.getByLabelText('leaders.name'), { target: { value: '수정 중' } })
    expect(screen.getByLabelText('leaders.name')).toHaveValue('수정 중')

    // 시트를 닫는다 (부모가 leader를 null로)
    rerender(<LeaderEditSheet leader={null} onClose={vi.fn()} onSave={vi.fn()} />)
    // 같은 지도자를 다시 연다
    rerender(<LeaderEditSheet leader={LEADER} onClose={vi.fn()} onSave={vi.fn()} />)

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
