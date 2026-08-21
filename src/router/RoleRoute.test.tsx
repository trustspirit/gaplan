import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { Provider, createStore } from 'jotai'
import { RoleRoute } from './RoleRoute'
import { authUserAtom } from '@/store/authAtom'
import { ROLE } from '@/constants/roles'
import type { AppUser, UserRole } from '@/types'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}))

function renderGuarded(role: UserRole | null) {
  const store = createStore()
  const user: AppUser | null = role
    ? { uid: 'u1', email: 'a@b.com', name: '홍길동', role, createdAt: '2026-01-01' }
    : null
  store.set(authUserAtom, user)
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/guarded']}>
        <Routes>
          <Route element={<RoleRoute allow={[ROLE.ADMIN]} />}>
            <Route path="/guarded" element={<p>guarded screen</p>} />
          </Route>
          <Route path="/login" element={<p>login screen</p>} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  )
}

describe('RoleRoute', () => {
  // 계획 2의 요점: 권한이 없는 화면은 말없이 다른 곳으로 튕기는 대신
  // 왜 못 보는지 설명하고 갈 곳을 준다.
  it('explains the refusal in place instead of redirecting', () => {
    renderGuarded(ROLE.PRESIDENT)
    expect(screen.getByText('state.forbiddenTitle')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'state.goHome' })).toHaveAttribute('href', '/home')
    expect(screen.queryByText('guarded screen')).not.toBeInTheDocument()
  })

  it('renders the guarded screen for a role that is allowed', () => {
    renderGuarded(ROLE.ADMIN)
    expect(screen.getByText('guarded screen')).toBeInTheDocument()
    expect(screen.queryByText('state.forbiddenTitle')).not.toBeInTheDocument()
  })

  // 로그인 자체가 안 된 경우는 권한 문제가 아니라 인증 문제 — 여전히 리다이렉트다.
  it('still redirects to login when there is no user at all', () => {
    renderGuarded(null)
    expect(screen.getByText('login screen')).toBeInTheDocument()
    expect(screen.queryByText('state.forbiddenTitle')).not.toBeInTheDocument()
  })
})
