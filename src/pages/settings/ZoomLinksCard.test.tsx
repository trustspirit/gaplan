import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ZoomLinksCard } from './ZoomLinksCard'

const LINK_A = { id: '1', label: '모임A', url: 'https://zoom.us/j/111' }
const LINK_B = { id: '2', label: '모임B', url: 'https://zoom.us/j/222' }

const zoomLinksMock = vi.hoisted(() => ({
  links: [] as { id: string; label: string; url: string }[],
  loading: false,
  rename: vi.fn(),
  remove: vi.fn(),
}))
const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))

vi.mock('jotai', () => ({ useAtomValue: () => ({ uid: 'u1' }), atom: vi.fn() }))
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: 'ko' } }),
  initReactI18next: { type: '3rdParty', init: vi.fn() },
}))
vi.mock('sonner', () => ({ toast: toastMock }))
// jsdom has no matchMedia — mock the hook directly, per repo convention
// (SeventyHome.test.tsx, ScheduleItem.test.tsx, ...).
vi.mock('@/hooks/useIsMobile', () => ({ useIsMobile: () => false }))
vi.mock('@/hooks/useZoomLinks', () => ({
  useZoomLinks: () => ({
    links: zoomLinksMock.links,
    loading: zoomLinksMock.loading,
    rename: zoomLinksMock.rename,
    remove: zoomLinksMock.remove,
  }),
}))

beforeEach(() => {
  zoomLinksMock.links = []
  zoomLinksMock.loading = false
  zoomLinksMock.rename.mockReset()
  zoomLinksMock.remove.mockReset().mockResolvedValue(undefined)
  toastMock.success.mockClear()
  toastMock.error.mockClear()
})

describe('ZoomLinksCard', () => {
  it('shows an empty message when there are no saved links', () => {
    render(<ZoomLinksCard />)
    expect(screen.getByText('settings.account.zoomLinksEmpty')).toBeInTheDocument()
  })

  it('lists saved links by label and URL', () => {
    zoomLinksMock.links = [LINK_A, LINK_B]
    render(<ZoomLinksCard />)
    expect(screen.getByText('모임A')).toBeInTheDocument()
    expect(screen.getByText('https://zoom.us/j/111')).toBeInTheDocument()
    expect(screen.getByText('모임B')).toBeInTheDocument()
  })

  it('renames a link through the edit action', async () => {
    zoomLinksMock.links = [LINK_A]
    zoomLinksMock.rename.mockResolvedValue({ ok: true })
    render(<ZoomLinksCard />)

    await userEvent.click(screen.getByRole('button', { name: 'common.edit' }))
    const input = screen.getByLabelText('settings.account.zoomLinkLabelField')
    await userEvent.clear(input)
    await userEvent.type(input, '새 이름')
    await userEvent.click(screen.getByRole('button', { name: 'common.save' }))

    await waitFor(() => expect(zoomLinksMock.rename).toHaveBeenCalledWith('1', '새 이름'))
    expect(toastMock.success).toHaveBeenCalled()
  })

  it('shows an error and keeps the dialog open when rename is rejected', async () => {
    zoomLinksMock.links = [LINK_A]
    zoomLinksMock.rename.mockResolvedValue({ ok: false, reason: 'empty_label' })
    render(<ZoomLinksCard />)

    await userEvent.click(screen.getByRole('button', { name: 'common.edit' }))
    await userEvent.clear(screen.getByLabelText('settings.account.zoomLinkLabelField'))
    await userEvent.click(screen.getByRole('button', { name: 'common.save' }))

    await waitFor(() => expect(toastMock.error).toHaveBeenCalled())
    expect(screen.getByLabelText('settings.account.zoomLinkLabelField')).toBeInTheDocument()
  })

  it('deletes a link after confirming', async () => {
    zoomLinksMock.links = [LINK_A]
    render(<ZoomLinksCard />)

    await userEvent.click(screen.getByRole('button', { name: 'common.delete' }))
    await userEvent.click(screen.getByRole('button', { name: '삭제' }))

    await waitFor(() => expect(zoomLinksMock.remove).toHaveBeenCalledWith('1'))
  })
})
