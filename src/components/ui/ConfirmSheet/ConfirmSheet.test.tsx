import { render, screen, fireEvent, within } from '@testing-library/react'
import { ConfirmSheet } from './ConfirmSheet'

vi.mock('@/hooks/useIsMobile', () => ({ useIsMobile: () => false }))
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }))

function renderSheet(over: Partial<React.ComponentProps<typeof ConfirmSheet>> = {}) {
  const onConfirm = vi.fn()
  const onCancel = vi.fn()
  render(
    <ConfirmSheet
      open
      title="이 Task를 만료할까요?"
      confirmLabel="만료"
      onConfirm={onConfirm}
      onCancel={onCancel}
      {...over}
    />,
  )
  return { onConfirm, onCancel }
}

describe('ConfirmSheet', () => {
  it('닫혀 있으면 아무것도 그리지 않는다', () => {
    renderSheet({ open: false })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('묻는 말이 다이얼로그의 이름이 된다', () => {
    renderSheet()
    expect(screen.getByRole('dialog', { name: '이 Task를 만료할까요?' })).toBeInTheDocument()
  })

  it('대상과 설명을 보여준다', () => {
    renderSheet({ subject: '11월 접견', message: '만료하면 되돌릴 수 없습니다.' })
    expect(screen.getByText('11월 접견')).toBeInTheDocument()
    expect(screen.getByText('만료하면 되돌릴 수 없습니다.')).toBeInTheDocument()
  })

  it('확인을 누르면 onConfirm, 취소를 누르면 onCancel을 부른다', () => {
    const { onConfirm, onCancel } = renderSheet()
    const dialog = within(screen.getByRole('dialog'))
    fireEvent.click(dialog.getByRole('button', { name: '만료' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
    fireEvent.click(dialog.getByRole('button', { name: 'common.cancel' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('취소 버튼 문구를 바꿀 수 있다', () => {
    renderSheet({ cancelLabel: '계속 작성' })
    expect(screen.getByRole('button', { name: '계속 작성' })).toBeInTheDocument()
  })

  it('처리 중에는 취소 버튼을 막는다', () => {
    renderSheet({ loading: true })
    expect(screen.getByRole('button', { name: 'common.cancel' })).toBeDisabled()
  })
})
