import { render, screen, fireEvent } from '@testing-library/react'
import { useDiscardGuard } from './useDiscardGuard'

vi.mock('@/hooks/useIsMobile', () => ({ useIsMobile: () => false }))
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }))

function Harness({ isDirty, onLeave }: { isDirty: boolean; onLeave: () => void }) {
  const { guard, sheet } = useDiscardGuard(isDirty)
  return (
    <>
      <button onClick={() => guard(onLeave)}>나가기</button>
      {sheet}
    </>
  )
}

describe('useDiscardGuard', () => {
  it('고친 것이 없으면 묻지 않고 바로 실행한다', () => {
    const onLeave = vi.fn()
    render(<Harness isDirty={false} onLeave={onLeave} />)
    fireEvent.click(screen.getByText('나가기'))
    expect(onLeave).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('고친 것이 있으면 먼저 묻고, 버리기를 눌러야 실행한다', () => {
    const onLeave = vi.fn()
    render(<Harness isDirty onLeave={onLeave} />)
    fireEvent.click(screen.getByText('나가기'))
    expect(screen.getByRole('dialog', { name: 'confirm.discardTitle' })).toBeInTheDocument()
    expect(onLeave).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'confirm.discardBtn' }))
    expect(onLeave).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('계속 작성을 누르면 실행하지 않고 확인창만 닫는다', () => {
    const onLeave = vi.fn()
    render(<Harness isDirty onLeave={onLeave} />)
    fireEvent.click(screen.getByText('나가기'))
    fireEvent.click(screen.getByRole('button', { name: 'confirm.keepEditing' }))
    expect(onLeave).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
