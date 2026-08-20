import { render, screen } from '@testing-library/react'
import { ResponsiveDialog } from './ResponsiveDialog'

const viewport = vi.hoisted(() => ({ mobile: false }))
vi.mock('@/hooks/useIsMobile', () => ({ useIsMobile: () => viewport.mobile }))

function mockViewport(isMobile: boolean) {
  viewport.mobile = isMobile
}

describe('ResponsiveDialog', () => {
  afterEach(() => {
    viewport.mobile = false
  })

  it('renders a dialog with its title on desktop', () => {
    mockViewport(false)
    render(
      <ResponsiveDialog open onClose={() => {}} title="일정 편집">
        <p>본문</p>
      </ResponsiveDialog>,
    )
    expect(screen.getByRole('dialog', { name: '일정 편집' })).toBeInTheDocument()
    expect(screen.getByText('본문')).toBeInTheDocument()
  })

  it('renders a dialog with its title on mobile', () => {
    mockViewport(true)
    render(
      <ResponsiveDialog open onClose={() => {}} title="일정 편집">
        <p>본문</p>
      </ResponsiveDialog>,
    )
    expect(screen.getByRole('dialog', { name: '일정 편집' })).toBeInTheDocument()
  })

  // aria-label은 title이 없는 다이얼로그의 유일한 이름이다 — 모바일에서 조용히
  // 버려지면 role="dialog"에 이름이 하나도 없게 된다
  it('names a titleless dialog with aria-label on mobile', () => {
    mockViewport(true)
    render(
      <ResponsiveDialog open onClose={() => {}} aria-label="일정 상세">
        <p>본문</p>
      </ResponsiveDialog>,
    )
    expect(screen.getByRole('dialog', { name: '일정 상세' })).toBeInTheDocument()
  })

  it('prefers the title over aria-label for the mobile accessible name', () => {
    mockViewport(true)
    render(
      <ResponsiveDialog open onClose={() => {}} title="일정 편집" aria-label="일정 상세">
        <p>본문</p>
      </ResponsiveDialog>,
    )
    expect(screen.getByRole('dialog', { name: '일정 편집' })).toBeInTheDocument()
  })

  it('renders nothing visible when closed on desktop', () => {
    mockViewport(false)
    render(
      <ResponsiveDialog open={false} onClose={() => {}} title="일정 편집">
        <p>본문</p>
      </ResponsiveDialog>,
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  // BottomSheet는 나가는 트랜지션을 위해 닫혀도 마운트를 유지하고 inert로 접근을 막는다.
  // dom-accessibility-api는 inert를 구현하지 않아서 role 질의로는 검사할 수 없다 —
  // 그래서 기제(inert 속성) 자체를 검사한다.
  it('marks the closed sheet inert on mobile instead of unmounting it', () => {
    mockViewport(true)
    render(
      <ResponsiveDialog open={false} onClose={() => {}} title="일정 편집">
        <p>본문</p>
      </ResponsiveDialog>,
    )
    expect(document.body.querySelector('[inert]')).toBeInTheDocument()
  })
})
