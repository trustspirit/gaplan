// M2 (2026-08-22): 사용자가 직접 지적한 결함 — "생성이든 모달이든 둘다 규칙은 같아야해."
// 스테이크 select 라벨(필수/선택)이 생성 모달과 편집 모달에서 서로 다른 기준으로
// 정해졌다: 편집 모달은 일정 종류(schedule.type)로 판단했고, 생성 모달은 판단 자체를
// 하지 않아 늘 필수 라벨만 보여줬다. 같은 대상 유형(targetKind)이면 어느 모달에서
// 열든 같은 라벨이 나와야 한다 — 이 테스트는 실제 두 모달 컴포넌트를 함께 마운트해
// 그 라벨 텍스트를 직접 비교한다(단위 함수 테스트만으로는 두 모달이 실제로 같은
// 값을 넘기는지 못 잡는다).
import { describe, it, expect, vi } from 'vitest'
import { render, within, fireEvent } from '@testing-library/react'
import React from 'react'
import type { AppUser } from '@/types/user'
import type { Schedule } from '@/types'

const mocks = vi.hoisted(() => ({
  currentUser: {
    uid: 'test-uid',
    email: 'test@test.com',
    role: 'seventy',
    name: '테스트',
    unitId: 'seoul-stake',
    createdAt: '2026-01-01',
  } as AppUser,
}))

vi.mock('@/firebase', () => ({ db: {}, functions: {}, auth: {} }))
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  doc: vi.fn(),
  serverTimestamp: vi.fn(() => ({ seconds: 0 })),
  Timestamp: { now: vi.fn() },
}))
vi.mock('firebase/functions', () => ({ httpsCallable: () => vi.fn() }))
vi.mock('jotai', () => ({
  useAtomValue: vi.fn(() => mocks.currentUser),
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
vi.mock('@/hooks/useLeaders', () => ({
  useLeaders: () => ({ leaders: [], loading: false, getLeaderByUnitName: vi.fn() }),
}))
vi.mock('@/hooks/useUpcomingVisits', () => ({
  useUpcomingVisits: () => ({ visits: [], loading: false }),
}))
vi.mock('@/components/domain/ProjectPicker/ProjectPicker', () => ({
  ProjectPicker: () => <div data-testid="project-picker" />,
}))
vi.mock('@/components/domain/scheduleForm/ZoomLinkPicker', () => ({
  ZoomLinkPicker: () => <div data-testid="zoom-link-picker" />,
}))
vi.mock('react-dom', () => ({
  createPortal: (node: React.ReactNode) => node,
}))

import { ScheduleFormModal } from '../ScheduleFormModal/ScheduleFormModal'
import { EditScheduleModal } from '../EditScheduleModal/EditScheduleModal'

const MEETING_SCHEDULE: Schedule = {
  id: 'sched-1',
  type: 'meeting',
  seventyUid: 'seventy-1',
  unitId: 'seoul-east-stake',
  targetKind: 'ward_bishop',
  wardName: '녹번 와드',
  presidentUid: null,
  date: '2026-08-01',
  startTime: '10:00',
  endTime: '11:00',
  status: 'confirmed',
  createdBy: 'admin-uid',
}

describe('스테이크 라벨 규칙 — 생성/편집 모달 일치', () => {
  // 같은 대상 유형(ward_bishop, 필수)인데 예전에는 생성 모달이 필수, 편집 모달(모임)이
  // 선택으로 서로 달랐다. 이 테스트는 그 어긋남을 직접 마운트해서 고정한다.
  it('모임(ward_bishop) 대상의 스테이크 라벨이 생성 모달과 편집 모달에서 같다', () => {
    const created = render(
      <ScheduleFormModal fixedType="meeting" onClose={vi.fn()} onSaved={vi.fn()} />,
    )
    const kindSelect = created.getByLabelText('schedule.targetKindLabel') as HTMLSelectElement
    fireEvent.change(kindSelect, { target: { value: 'ward_bishop' } })

    const edited = render(
      <EditScheduleModal schedule={MEETING_SCHEDULE} onClose={vi.fn()} onSaved={vi.fn()} />,
    )

    const createStakeLabel = within(created.container).getByLabelText('schedule.stakeLabel')
    const editStakeLabel = within(edited.container).getByLabelText('schedule.stakeLabel')
    expect(createStakeLabel).toBeInTheDocument()
    expect(editStakeLabel).toBeInTheDocument()
  })
})
