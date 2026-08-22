import { useState } from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ScheduleType } from '@/types'
import type { UpcomingVisit } from '@/hooks/useUpcomingVisits'
import type { ScheduleFormState } from './useScheduleForm'
import type { TargetSelection } from './scheduleTargetRules'
import { TargetSection } from './TargetSection'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string) => k,
    i18n: { language: 'ko' },
  }),
  initReactI18next: { type: '3rdParty', init: vi.fn() },
}))

// TargetSection은 상태를 갖지 않는 순수 렌더 조각이므로(Controller ruling), 실제 앱에서
// useScheduleForm 훅이 하는 일(onChange의 부분 병합을 받아 state를 갱신)을 여기서
// 얇게 흉내 낸다 — ScheduleFormModal.test.tsx처럼 새 모킹 프레임워크를 들이지 않는다.
function Harness(props: {
  type: ScheduleType
  target?: Partial<TargetSelection>
  purpose?: 'general' | 'pre_visit'
  relatedVisitId?: string
  upcomingVisits?: UpcomingVisit[]
  onChange?: (partial: Partial<ScheduleFormState>) => void
}) {
  const [state, setState] = useState<ScheduleFormState>(() => ({
    type: props.type,
    target: {
      kind: '',
      unitId: '',
      wardName: '',
      ccRegionId: '',
      freeText: '',
      ...props.target,
    },
    date: '',
    startTime: '',
    endTime: '',
    isSabbath: false,
    presidentAccompanied: false,
    purpose: props.purpose ?? 'general',
    relatedVisitId: props.relatedVisitId ?? '',
    location: '',
    customTitle: '',
    zoomLink: '',
    notes: '',
    projectId: '',
  }))

  const handleChange = (partial: Partial<ScheduleFormState>) => {
    props.onChange?.(partial)
    setState((prev) => ({ ...prev, ...partial }))
  }

  return (
    <TargetSection
      type={props.type}
      state={state}
      onChange={handleChange}
      leaders={[]}
      users={[]}
      upcomingVisits={props.upcomingVisits ?? []}
    />
  )
}

function renderSection(props: Parameters<typeof Harness>[0]) {
  return render(<Harness {...props} />)
}

describe('TargetSection', () => {
  it('대상 유형을 고르기 전에는 스테이크를 묻지 않는다', () => {
    renderSection({ type: 'interview' })
    expect(screen.queryByLabelText('schedule.stakeLabel')).not.toBeInTheDocument()
  })

  it('와드 감독을 고르면 스테이크와 와드를 순서대로 묻는다', async () => {
    renderSection({ type: 'interview' })
    await userEvent.selectOptions(screen.getByLabelText('schedule.targetKindLabel'), 'ward_bishop')
    expect(screen.getByLabelText('schedule.stakeLabel')).toBeInTheDocument()
    expect(screen.getByLabelText('schedule.wardLabel')).toBeInTheDocument()
  })

  // 이 테스트가 이 계획의 존재 이유다. 예전 폼은 대상에서 CC를 고르면 위쪽 스테이크가 사라졌다.
  it('협의 평의회를 골라도 위쪽 필드가 바뀌지 않는다 — 스테이크를 애초에 묻지 않는다', async () => {
    renderSection({ type: 'meeting' })
    await userEvent.selectOptions(screen.getByLabelText('schedule.targetKindLabel'), 'cc_council')
    expect(screen.queryByLabelText('schedule.stakeLabel')).not.toBeInTheDocument()
    expect(screen.getByLabelText('schedule.ccRegionLabel')).toBeInTheDocument()
  })

  it('와드 방문에는 대상 유형을 묻지 않고 스테이크와 와드만 묻는다', () => {
    renderSection({ type: 'ward_visit' })
    expect(screen.queryByLabelText('schedule.targetKindLabel')).not.toBeInTheDocument()
    expect(screen.getByLabelText('schedule.stakeLabel')).toBeInTheDocument()
  })

  it('직접 입력을 고르면 텍스트 칸이 나온다', async () => {
    renderSection({ type: 'meeting' })
    await userEvent.selectOptions(screen.getByLabelText('schedule.targetKindLabel'), 'other')
    expect(screen.getByLabelText('schedule.targetFreeTextLabel')).toBeInTheDocument()
  })
})
