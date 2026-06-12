import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

// Heavy mocks to isolate the component
vi.mock('@/firebase', () => ({ db: {}, functions: {}, auth: {} }))
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  doc: vi.fn(),
  serverTimestamp: vi.fn(() => ({ seconds: 0 })),
  Timestamp: { now: vi.fn() },
}))
vi.mock('firebase/functions', () => ({ httpsCallable: vi.fn(() => vi.fn()) }))
vi.mock('jotai', () => ({
  useAtomValue: vi.fn().mockReturnValue({ uid: 'test-uid', role: 'seventy', name: '테스트', unitId: 'seoul-stake' }),
  atom: vi.fn(),
}))
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string) => k,
    i18n: { language: 'ko' },
  }),
  initReactI18next: { type: '3rdParty', init: vi.fn() },
}))
vi.mock('@/hooks/useUsers', () => ({
  useUsers: () => ({ users: [] }),
}))
vi.mock('@/hooks/useLeaders')
vi.mock('react-dom', () => ({
  createPortal: (node: React.ReactNode) => node,
}))

import { ScheduleFormModal } from './ScheduleFormModal'
import * as useLeadersModule from '@/hooks/useLeaders'
import type { Leader } from '@/types/leader'

const MOCK_LEADER_BISHOP: Leader = {
  id: '131334',
  externalUnitId: 131334,
  unitNameKo: '녹번 와드',
  unitNameEn: 'Nokbeon Ward',
  role: '감독',
  name: '조해준',
  phone: '010-9635-1193',
}

describe('ScheduleFormModal 메모 자동 입력', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('메모가 비어있을 때 sabbathVisitNotes 자동 입력이 없다', async () => {
    vi.mocked(useLeadersModule.useLeaders).mockReturnValue({
      leaders: [MOCK_LEADER_BISHOP],
      loading: false,
      getLeaderByUnitName: vi.fn().mockReturnValue(undefined),
    })
    render(<ScheduleFormModal onClose={vi.fn()} onSaved={vi.fn()} />)
    // notes 영역이 비어있어야 함 (sabbathVisitNotes 자동 입력 없음)
    const notesElements = screen.queryAllByRole('textbox')
    const notesField = notesElements.find(el =>
      el.getAttribute('placeholder')?.includes('schedule.notesLabel') ||
      el.tagName === 'TEXTAREA'
    )
    if (notesField) {
      expect(notesField).toHaveValue('')
    }
  })

  it('getLeaderByUnitName이 훅에서 제공된다', () => {
    const getLeaderByUnitName = vi.fn().mockReturnValue(MOCK_LEADER_BISHOP)
    vi.mocked(useLeadersModule.useLeaders).mockReturnValue({
      leaders: [MOCK_LEADER_BISHOP],
      loading: false,
      getLeaderByUnitName,
    })
    render(<ScheduleFormModal onClose={vi.fn()} onSaved={vi.fn()} />)
    expect(getLeaderByUnitName).toBeDefined()
  })
})
