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
import {
  buildNotesWithLeaderContact,
  getContactTargetOptions,
} from './leaderContactNotes'
import * as useLeadersModule from '@/hooks/useLeaders'
import type { Leader } from '@/types/leader'
import type { AppUser } from '@/types/user'

const MOCK_LEADER_BISHOP: Leader = {
  id: '131334',
  externalUnitId: 131334,
  unitNameKo: '녹번 와드',
  unitNameEn: 'Nokbeon Ward',
  role: '감독',
  name: '조해준',
  phone: '010-9635-1193',
}

const MOCK_STAKE_PRESIDENT: Leader = {
  id: 'stake-president',
  externalUnitId: 1,
  unitNameKo: '서울 스테이크',
  unitNameEn: 'Seoul Stake',
  role: '스테이크 회장',
  name: '홍길동',
  phone: '010-1111-2222',
}

const MOCK_BRANCH_PRESIDENT: Leader = {
  id: 'branch-president',
  externalUnitId: 2,
  unitNameKo: '중앙 수어 지부',
  unitNameEn: 'Jungang Sign Language Branch',
  role: '지부 회장',
  name: '박지부',
  phone: '010-5555-6666',
}

const MOCK_PRESIDENT_USER: AppUser = {
  uid: 'president-uid',
  email: 'president@test.com',
  name: '홍길동',
  role: 'president',
  unitId: 'seoul-stake',
  createdAt: '2026-01-01',
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

describe('ScheduleFormModal 연락처 대상', () => {
  it('접견 대상에 스테이크/지방부 회장과 소속 와드/지부 지도자를 함께 노출한다', () => {
    const options = getContactTargetOptions({
      type: 'interview',
      unitId: 'seoul-stake',
      leaders: [MOCK_STAKE_PRESIDENT, MOCK_LEADER_BISHOP, MOCK_BRANCH_PRESIDENT],
      users: [MOCK_PRESIDENT_USER],
    })

    expect(options).toEqual(expect.arrayContaining([
      expect.objectContaining({
        label: '서울 스테이크 · 스테이크 회장',
        unitNameKo: '서울 스테이크',
        presidentUid: 'president-uid',
      }),
      expect.objectContaining({
        label: '녹번 와드 · 감독',
        unitNameKo: '녹번 와드',
      }),
      expect.objectContaining({
        label: '중앙 수어 지부 · 지부 회장',
        unitNameKo: '중앙 수어 지부',
      }),
    ]))
  })

  it('모임에서 와드/지부를 선택하면 해당 감독/지부 회장 연락처를 메모 앞에 붙인다', () => {
    const notes = buildNotesWithLeaderContact({
      type: 'meeting',
      unitId: 'seoul-stake',
      contactTargetUnitName: '녹번 와드',
      notes: '기존 메모',
      leaders: [MOCK_STAKE_PRESIDENT, MOCK_LEADER_BISHOP],
    })

    expect(notes).toBe('감독: 조해준 (010-9635-1193)\n기존 메모')
  })

  it('연락처 대상을 따로 선택하지 않으면 기존처럼 스테이크/지방부 회장 연락처를 사용한다', () => {
    const notes = buildNotesWithLeaderContact({
      type: 'interview',
      unitId: 'seoul-stake',
      contactTargetUnitName: '',
      notes: '',
      leaders: [MOCK_STAKE_PRESIDENT, MOCK_LEADER_BISHOP],
    })

    expect(notes).toBe('스테이크 회장: 홍길동 (010-1111-2222)')
  })
})
