import { render, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { connectKakao, consumeKakaoState } from '@/services/kakaoService'
import { KakaoCallback } from './KakaoCallback'

const navigateMock = vi.fn()

beforeEach(() => {
  navigateMock.mockClear()
  vi.mocked(connectKakao)
    .mockClear()
    .mockResolvedValue(undefined as never)
  vi.mocked(consumeKakaoState).mockClear().mockReturnValue('state123')
})

vi.mock('jotai', () => ({
  useSetAtom: () => vi.fn(),
  atom: vi.fn(),
}))
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}))
vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useNavigate: () => navigateMock,
}))
vi.mock('@/services/kakaoService', () => ({
  connectKakao: vi.fn(),
  consumeKakaoState: vi.fn(),
}))

describe('KakaoCallback', () => {
  // 이 화면에 카카오 카드가 있던 것도 옛 /admin/calendar였다 — 계획이 카드를
  // 설정 › 내 계정으로 옮겼으니, 연동을 마치면 그리로 돌아가야 왕복이 맞다.
  it('returns to the account settings screen after a successful connect', async () => {
    render(
      <MemoryRouter initialEntries={['/kakao/callback?code=abc123&state=state123']}>
        <Routes>
          <Route path="/kakao/callback" element={<KakaoCallback />} />
        </Routes>
      </MemoryRouter>,
    )

    await waitFor(() =>
      expect(navigateMock).toHaveBeenCalledWith('/settings/account', { replace: true }),
    )
  })
})
