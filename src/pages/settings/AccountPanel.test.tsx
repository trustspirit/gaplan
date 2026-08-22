import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { AppUser } from '@/types'
import { updateUserName } from '@/services/userService'
import { disconnectKakao } from '@/services/kakaoService'
import { AccountPanel } from './AccountPanel'

let currentUser: AppUser

beforeEach(() => {
  // 칠십인 본인에게는 assignedSeventyUid가 없다 — 그 필드는 집행서기가 담당
  // 칠십인을 가리킬 때만 쓰인다(src/types/user.ts). 카카오 카드는 그 필드가 있는
  // 사용자에게만 뜨므로, 기본 픽스처는 의도적으로 없는 상태로 둔다.
  currentUser = {
    uid: 'u1',
    name: '홍길동',
    role: 'seventy',
    kakaoConnected: false,
  } as AppUser
  vi.mocked(updateUserName)
    .mockClear()
    .mockResolvedValue(undefined as never)
  vi.mocked(disconnectKakao)
    .mockClear()
    .mockResolvedValue(undefined as never)
})

vi.mock('jotai', () => ({
  useAtomValue: () => currentUser,
  useAtom: () => [currentUser, vi.fn()],
  useSetAtom: () => vi.fn(),
  atom: vi.fn(),
}))
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: 'ko', changeLanguage: vi.fn() } }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}))
vi.mock('@/services/userService', () => ({ updateUserName: vi.fn() }))
vi.mock('@/services/kakaoService', () => ({
  buildKakaoAuthUrl: vi.fn(() => 'https://kakao.example/auth'),
  disconnectKakao: vi.fn(),
}))
// 구글 캘린더 구독 배너는 홈이 이미 쓰는 컴포넌트다. 여기서는 놓였는지만 본다.
vi.mock('@/pages/home/CalendarBanner', () => ({
  CalendarBanner: () => <div data-testid="calendar-banner" />,
}))
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))
// 저장된 Zoom 링크 카드는 useZoomLinks()(Firestore)에 의존한다 — 그 자체 동작은
// ZoomLinksCard.test.tsx가 고정하므로, 여기서는 자리만 확인한다.
vi.mock('@/hooks/useZoomLinks', () => ({
  useZoomLinks: () => ({ links: [], loading: false, rename: vi.fn(), remove: vi.fn() }),
}))
// jsdom has no matchMedia — ZoomLinksCard's dialogs call useIsMobile() even while closed.
vi.mock('@/hooks/useIsMobile', () => ({ useIsMobile: () => false }))

describe('AccountPanel', () => {
  it('shows the current name in the name field', () => {
    render(<AccountPanel />)
    expect(screen.getByLabelText('settings.account.nameTitle')).toHaveValue('홍길동')
  })

  it('saves a changed name', async () => {
    render(<AccountPanel />)
    const input = screen.getByLabelText('settings.account.nameTitle')
    await userEvent.clear(input)
    await userEvent.type(input, '김철수')
    await userEvent.click(screen.getByRole('button', { name: 'common.save' }))

    await waitFor(() => expect(updateUserName).toHaveBeenCalledWith('u1', '김철수'))
  })

  // 빈 이름으로 저장하면 다른 사람 화면에서 이름이 사라진다.
  it('refuses to save an empty name', async () => {
    render(<AccountPanel />)
    await userEvent.clear(screen.getByLabelText('settings.account.nameTitle'))
    await userEvent.click(screen.getByRole('button', { name: 'common.save' }))

    expect(updateUserName).not.toHaveBeenCalled()
  })

  it('carries the google calendar banner', () => {
    render(<AccountPanel />)
    expect(screen.getByTestId('calendar-banner')).toBeInTheDocument()
  })

  it('offers a language switch', () => {
    render(<AccountPanel />)
    expect(
      screen.getByRole('radiogroup', { name: 'settings.account.languageTitle' }),
    ).toBeInTheDocument()
  })

  it('offers to connect kakao when it is not connected', () => {
    currentUser = { ...currentUser, assignedSeventyUid: 'seventy-1' } as AppUser
    render(<AccountPanel />)
    expect(screen.getByRole('button', { name: 'kakao.connect' })).toBeInTheDocument()
  })

  it('offers to disconnect kakao once it is connected', async () => {
    currentUser = {
      ...currentUser,
      assignedSeventyUid: 'seventy-1',
      kakaoConnected: true,
    } as AppUser
    render(<AccountPanel />)

    await userEvent.click(screen.getByRole('button', { name: 'kakao.disconnect' }))
    await waitFor(() => expect(disconnectKakao).toHaveBeenCalled())
  })

  // functions/src/kakaoCalendarSync.ts가 실제로 동기화하는 대상은
  // assignedSeventyUid가 있는 사용자뿐이다(kakaoTargets.ts). 그 필드가 없으면
  // OAuth를 완료해도 이벤트를 영원히 받지 못하므로, 카드 자체를 감춘다.
  it('shows the kakao card for a user with an assigned seventy', () => {
    currentUser = { ...currentUser, assignedSeventyUid: 'seventy-1' } as AppUser
    render(<AccountPanel />)
    expect(screen.getByText('settings.account.kakaoTitle')).toBeInTheDocument()
  })

  it('hides the kakao card for a user with no assigned seventy', () => {
    render(<AccountPanel />)
    expect(screen.queryByText('settings.account.kakaoTitle')).not.toBeInTheDocument()
  })

  it('carries the saved zoom links card', () => {
    render(<AccountPanel />)
    expect(screen.getByText('settings.account.zoomLinksTitle')).toBeInTheDocument()
  })
})
