import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { consumeRedirectResult, subscribeToAuthState } from '@/services/authService'

vi.mock('@/router', () => ({
  AppRouter: () => <div data-testid="router" />,
}))

vi.mock('@/services/authService', () => ({
  consumeRedirectResult: vi.fn(),
  subscribeToAuthState: vi.fn(() => vi.fn()),
}))

describe('App public routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not start auth work on the public schedule route', () => {
    window.history.pushState({}, '', '/public/schedule/token-123')

    render(<App />)

    expect(consumeRedirectResult).not.toHaveBeenCalled()
    expect(subscribeToAuthState).not.toHaveBeenCalled()
  })

  it('does not start auth work on anonymous response routes', () => {
    window.history.pushState({}, '', '/respond/task-123?t=token')

    render(<App />)

    expect(consumeRedirectResult).not.toHaveBeenCalled()
    expect(subscribeToAuthState).not.toHaveBeenCalled()
  })
})
