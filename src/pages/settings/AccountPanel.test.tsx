import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { AppUser } from '@/types'
import { updateUserName } from '@/services/userService'
import { disconnectKakao } from '@/services/kakaoService'
import { AccountPanel } from './AccountPanel'

let currentUser: AppUser

beforeEach(() => {
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
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: 'ko' } }),
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

  it('offers to connect kakao when it is not connected', () => {
    render(<AccountPanel />)
    expect(screen.getByRole('button', { name: 'kakao.connect' })).toBeInTheDocument()
  })

  it('offers to disconnect kakao once it is connected', async () => {
    currentUser = { ...currentUser, kakaoConnected: true } as AppUser
    render(<AccountPanel />)

    await userEvent.click(screen.getByRole('button', { name: 'kakao.disconnect' }))
    await waitFor(() => expect(disconnectKakao).toHaveBeenCalled())
  })
})
