import { useRef } from 'react'
import { createPortal } from 'react-dom'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { useFocusTrap } from './useFocusTrap'

function Dialog({
  name,
  onEscape,
  children,
}: {
  name: string
  onEscape: () => void
  children?: React.ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  useFocusTrap(ref, true, onEscape)
  return (
    <div ref={ref} tabIndex={-1} role="dialog" aria-label={name}>
      <button type="button">{name} first</button>
      <button type="button">{name} last</button>
      {children}
    </div>
  )
}

// 상세 시트 위에 삭제 확인을 띄우는 모양 — 두 트랩이 동시에 켜져 있고, 위의 것은
// 실제 시트들처럼 portal로 body에 붙어 아래 것의 DOM 바깥에 있다.
function Nested({
  onOuter,
  onInner,
  showInner,
}: {
  onOuter: () => void
  onInner: () => void
  showInner: boolean
}) {
  return (
    <Dialog name="outer" onEscape={onOuter}>
      {showInner && createPortal(<Dialog name="inner" onEscape={onInner} />, document.body)}
    </Dialog>
  )
}

/** 아래 창을 먼저 띄우고, 그 위에 확인 창을 나중에 연다 — 실제 순서 그대로. */
function openNested(onOuter = vi.fn(), onInner = vi.fn()) {
  const utils = render(<Nested onOuter={onOuter} onInner={onInner} showInner={false} />)
  utils.rerender(<Nested onOuter={onOuter} onInner={onInner} showInner />)
  return utils
}

describe('useFocusTrap with a dialog on top of another', () => {
  it('closes only the top dialog on Escape', async () => {
    const onOuter = vi.fn()
    const onInner = vi.fn()
    openNested(onOuter, onInner)

    await userEvent.keyboard('{Escape}')

    expect(onInner).toHaveBeenCalledTimes(1)
    expect(onOuter).not.toHaveBeenCalled()
  })

  it('lets Tab move through the top dialog instead of pinning the first control', async () => {
    openNested()
    screen.getByRole('button', { name: 'inner first' }).focus()

    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'inner last' })).toHaveFocus()

    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'inner first' })).toHaveFocus()
  })

  it('hands Escape back to the lower dialog once the top one closes', async () => {
    const onOuter = vi.fn()
    const onInner = vi.fn()
    const { rerender } = openNested(onOuter, onInner)
    rerender(<Nested onOuter={onOuter} onInner={onInner} showInner={false} />)

    await userEvent.keyboard('{Escape}')

    expect(onOuter).toHaveBeenCalledTimes(1)
  })
})
