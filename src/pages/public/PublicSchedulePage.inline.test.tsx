import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

const { fetchSpy } = vi.hoisted(() => ({ fetchSpy: vi.fn() }))

vi.mock('@/services/publicScheduleService', () => ({
  fetchPublicSchedulePageData: fetchSpy,
}))
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: 'ko', changeLanguage: vi.fn() } }),
  initReactI18next: { type: '3rdParty', init: vi.fn() },
}))

import PublicSchedulePage from './PublicSchedulePage'

const INLINE_ID = '__public_data__'

function plantInline(token: string, schedules: unknown[]) {
  const el = document.createElement('script')
  el.type = 'application/json'
  el.id = INLINE_ID
  el.textContent = JSON.stringify({
    token,
    data: { schedules, generalSchedules: [], scopeDisplayName: null },
  })
  document.head.appendChild(el)
}

function renderAt(token: string) {
  return render(
    <MemoryRouter initialEntries={[`/public/schedule/${token}`]}>
      <Routes>
        <Route path="/public/schedule/:token" element={<PublicSchedulePage />} />
      </Routes>
    </MemoryRouter>,
  )
}

const ONE = {
  id: 's1',
  type: 'ward_visit',
  unitId: 'seoul-east-stake',
  date: '2026-09-10',
  startTime: '10:00',
  endTime: '12:00',
  status: 'confirmed',
  wardName: '교문 와드',
}

describe('PublicSchedulePage — 서버가 심어 준 데이터', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.getElementById(INLINE_ID)?.remove()
    sessionStorage.clear()
    fetchSpy.mockResolvedValue({ schedules: [ONE], generalSchedules: [], scopeDisplayName: null })
  })

  it('인라인 데이터가 있으면 스켈레톤 없이 곧바로 일정을 그린다', async () => {
    plantInline('tok', [ONE])
    renderAt('tok')
    // 첫 렌더에 이미 내용이 있다 — await 없이 보인다.
    expect(screen.getByText(/교문 와드/)).toBeInTheDocument()
    await waitFor(() => expect(fetchSpy).toHaveBeenCalled())
  })

  it('인라인 데이터가 있어도 백그라운드 fetch는 한 번 나간다', async () => {
    plantInline('tok', [ONE])
    renderAt('tok')
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1))
    expect(fetchSpy).toHaveBeenCalledWith('tok')
  })

  it('인라인 데이터가 없으면 지금처럼 fetch가 채울 때까지 기다린다', async () => {
    renderAt('tok')
    expect(screen.queryByText(/교문 와드/)).not.toBeInTheDocument()
    await waitFor(() => expect(screen.getByText(/교문 와드/)).toBeInTheDocument())
    await waitFor(() => expect(fetchSpy).toHaveBeenCalled())
  })
})
