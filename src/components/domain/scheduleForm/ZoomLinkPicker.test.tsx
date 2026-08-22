import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { AppUser } from '@/types'
import { ZoomLinkPicker } from './ZoomLinkPicker'

const LINK_A = { id: '1', label: '모임A', url: 'https://zoom.us/j/111' }

const zoomLinksMock = vi.hoisted(() => ({
  links: [] as { id: string; label: string; url: string }[],
  add: vi.fn(),
}))

const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: 'ko' } }),
  initReactI18next: { type: '3rdParty', init: vi.fn() },
}))
vi.mock('jotai', () => ({ useAtomValue: () => ({ uid: 'u1' }) as AppUser, atom: vi.fn() }))
vi.mock('sonner', () => ({ toast: toastMock }))
vi.mock('@/hooks/useZoomLinks', () => ({
  useZoomLinks: () => ({ links: zoomLinksMock.links, loading: false, add: zoomLinksMock.add }),
}))

beforeEach(() => {
  zoomLinksMock.links = []
  zoomLinksMock.add.mockReset()
  toastMock.success.mockClear()
  toastMock.error.mockClear()
})

describe('ZoomLinkPicker', () => {
  it('renders nothing pickable when there are no saved links', () => {
    render(<ZoomLinkPicker value="" onChange={vi.fn()} />)
    expect(screen.queryByLabelText('schedule.zoomLinkPickerLabel')).not.toBeInTheDocument()
  })

  it('shows a picker of saved links and fills the URL on selection', async () => {
    zoomLinksMock.links = [LINK_A]
    const onChange = vi.fn()
    render(<ZoomLinkPicker value="" onChange={onChange} />)

    await userEvent.selectOptions(screen.getByLabelText('schedule.zoomLinkPickerLabel'), '모임A')
    expect(onChange).toHaveBeenCalledWith('https://zoom.us/j/111')
  })

  it('does not offer to save when the typed URL is already a saved link', () => {
    zoomLinksMock.links = [LINK_A]
    render(<ZoomLinkPicker value="https://zoom.us/j/111" onChange={vi.fn()} />)
    expect(screen.queryByRole('button', { name: 'schedule.zoomLinkSaveBtn' })).not.toBeInTheDocument()
  })

  it('offers to save a new, valid URL even with no saved links yet', () => {
    render(<ZoomLinkPicker value="https://zoom.us/j/999" onChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'schedule.zoomLinkSaveBtn' })).toBeInTheDocument()
  })

  it('does not offer to save an invalid URL', () => {
    render(<ZoomLinkPicker value="not-a-url" onChange={vi.fn()} />)
    expect(screen.queryByRole('button', { name: 'schedule.zoomLinkSaveBtn' })).not.toBeInTheDocument()
  })

  it('does not offer to save an empty value', () => {
    render(<ZoomLinkPicker value="" onChange={vi.fn()} />)
    expect(screen.queryByRole('button', { name: 'schedule.zoomLinkSaveBtn' })).not.toBeInTheDocument()
  })

  it('asks for a label, then saves the typed URL under it', async () => {
    zoomLinksMock.add.mockResolvedValue({ ok: true, link: { id: '2', label: '모임B', url: 'https://zoom.us/j/999' } })
    render(<ZoomLinkPicker value="https://zoom.us/j/999" onChange={vi.fn()} />)

    await userEvent.click(screen.getByRole('button', { name: 'schedule.zoomLinkSaveBtn' }))
    await userEvent.type(screen.getByLabelText('schedule.zoomLinkLabelPrompt'), '모임B')
    await userEvent.click(screen.getByRole('button', { name: 'common.save' }))

    expect(zoomLinksMock.add).toHaveBeenCalledWith({ label: '모임B', url: 'https://zoom.us/j/999' })
  })

  it('shows an error toast and keeps the form open when saving is rejected', async () => {
    zoomLinksMock.add.mockResolvedValue({ ok: false, reason: 'duplicate' })
    render(<ZoomLinkPicker value="https://zoom.us/j/999" onChange={vi.fn()} />)

    await userEvent.click(screen.getByRole('button', { name: 'schedule.zoomLinkSaveBtn' }))
    await userEvent.type(screen.getByLabelText('schedule.zoomLinkLabelPrompt'), '모임B')
    await userEvent.click(screen.getByRole('button', { name: 'common.save' }))

    expect(toastMock.error).toHaveBeenCalled()
    expect(screen.getByLabelText('schedule.zoomLinkLabelPrompt')).toBeInTheDocument()
  })

  it('typing a URL directly is unaffected by the picker — plain onChange still works', () => {
    // The picker never gates the underlying Input; this is a documentation-style
    // assertion that ZoomLinkPicker itself has no hidden input of its own it must sync.
    render(<ZoomLinkPicker value="https://zoom.us/j/999" onChange={vi.fn()} />)
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })
})
