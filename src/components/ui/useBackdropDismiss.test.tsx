import { fireEvent, render, screen } from '@testing-library/react'
import { Modal } from './Modal/Modal'
import { BottomSheet } from './BottomSheet/BottomSheet'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}))

describe.each([
  ['Modal', Modal],
  ['BottomSheet', BottomSheet],
] as const)('%s backdrop', (_name, Dialog) => {
  function open() {
    const onClose = vi.fn()
    render(
      <Dialog open onClose={onClose} title="제목">
        <textarea aria-label="글" defaultValue="쓰던 글" />
      </Dialog>,
    )
    const dialog = screen.getByRole('dialog')
    return { onClose, dialog, backdrop: dialog.parentElement! }
  }

  it('closes when the backdrop itself is pressed and released', () => {
    const { onClose, backdrop } = open()
    fireEvent.mouseDown(backdrop)
    fireEvent.click(backdrop)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('stays open when a drag that began inside ends on the backdrop', () => {
    const { onClose, backdrop } = open()
    // 글을 끌어 고르다 바깥에서 뗐다 — 브라우저는 공통 조상인 배경에서 click을 낸다
    fireEvent.mouseDown(screen.getByLabelText('글'))
    fireEvent.click(backdrop)
    expect(onClose).not.toHaveBeenCalled()
  })

  it('does not close on clicks inside the dialog', () => {
    const { onClose } = open()
    const field = screen.getByLabelText('글')
    fireEvent.mouseDown(field)
    fireEvent.click(field)
    expect(onClose).not.toHaveBeenCalled()
  })
})
