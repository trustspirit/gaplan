import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider, createStore } from 'jotai'
import { TopBar } from './TopBar'
import { authUserAtom } from '@/store/authAtom'
import { seventyViewAtom } from '@/store/seventyViewAtom'
import { SCOPE_ALL } from '@/utils/scope'
import type { AppUser } from '@/types'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: 'ko', changeLanguage: vi.fn() } }),
  initReactI18next: { type: '3rdParty', init: vi.fn() },
}))
vi.mock('@/hooks/useIsMobile', () => ({ useIsMobile: () => false }))
vi.mock('@/components/domain/Reminders/RemindersBell', () => ({ RemindersBell: () => null }))

function makeUser(overrides: Partial<AppUser>): AppUser {
  return {
    uid: 'u1',
    email: 'a@b.com',
    name: '홍길동',
    role: 'admin',
    createdAt: '2026-01-01',
    ...overrides,
  }
}

function renderTopBar(user: AppUser, viewSeventyUid: string | null = null) {
  const store = createStore()
  store.set(authUserAtom, user)
  store.set(seventyViewAtom, viewSeventyUid)
  render(
    <Provider store={store}>
      <TopBar name={user.name} />
    </Provider>,
  )
  return store
}

describe('TopBar 스코프 스위치', () => {
  it('두 선택지를 모두 보여 주고 현재 스코프만 checked로 표시한다', () => {
    renderTopBar(makeUser({ secondaryRole: 'seventy' }))

    const own = screen.getByRole('radio', { name: /scope.myAssigned/ })
    const all = screen.getByRole('radio', { name: /scope.all/ })
    expect(own).toHaveAttribute('aria-checked', 'true')
    expect(all).toHaveAttribute('aria-checked', 'false')
  })

  it('전체가 선택된 상태를 정확히 반영한다', () => {
    renderTopBar(makeUser({ secondaryRole: 'seventy' }), SCOPE_ALL)

    expect(screen.getByRole('radio', { name: /scope.myAssigned/ })).toHaveAttribute(
      'aria-checked',
      'false',
    )
    expect(screen.getByRole('radio', { name: /scope.all/ })).toHaveAttribute('aria-checked', 'true')
  })

  it('각 선택지는 토글이 아니라 해당 스코프를 직접 지정한다', async () => {
    const store = renderTopBar(makeUser({ secondaryRole: 'seventy' }))

    await userEvent.click(screen.getByRole('radio', { name: /scope.all/ }))
    expect(store.get(seventyViewAtom)).toBe(SCOPE_ALL)

    // 이미 선택된 쪽을 다시 눌러도 반대편으로 넘어가지 않는다
    await userEvent.click(screen.getByRole('radio', { name: /scope.all/ }))
    expect(store.get(seventyViewAtom)).toBe(SCOPE_ALL)

    await userEvent.click(screen.getByRole('radio', { name: /scope.myAssigned/ }))
    expect(store.get(seventyViewAtom)).toBeNull()
  })

  it('담당 칠십인이 없는 admin+집행서기에게는 스위치를 감춘다', () => {
    renderTopBar(makeUser({ secondaryRole: 'exec_secretary' }))
    expect(screen.queryByRole('radiogroup')).toBeNull()
  })

  it('담당 칠십인이 있으면 admin+집행서기에게도 스위치를 보여 준다', () => {
    renderTopBar(makeUser({ secondaryRole: 'exec_secretary', assignedSeventyUid: 's1' }))
    expect(screen.getByRole('radiogroup')).toBeInTheDocument()
  })

  it('스코프 선택 권한이 없는 역할에게는 스위치를 감춘다', () => {
    renderTopBar(makeUser({ role: 'seventy' }))
    expect(screen.queryByRole('radiogroup')).toBeNull()
  })
})
