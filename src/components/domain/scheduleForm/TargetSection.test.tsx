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
const DEFAULT_UNIT_OPTIONS = [
  { value: 'seoul-stake', label: '서울 스테이크' },
  { value: 'seoul-east-stake', label: '서울동 스테이크' },
]
const DEFAULT_CC_REGION_OPTIONS = [
  { value: 'seoul', label: '서울 CC' },
  { value: 'busan', label: '부산 CC' },
]

function Harness(props: {
  type: ScheduleType
  target?: Partial<TargetSelection>
  purpose?: 'general' | 'pre_visit'
  relatedVisitId?: string
  upcomingVisits?: UpcomingVisit[]
  unitOptions?: { value: string; label: string }[]
  unitSelectDisabled?: boolean
  ccRegionOptions?: { value: string; label: string }[]
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
      unitOptions={props.unitOptions ?? DEFAULT_UNIT_OPTIONS}
      unitSelectDisabled={props.unitSelectDisabled}
      ccRegionOptions={props.ccRegionOptions ?? DEFAULT_CC_REGION_OPTIONS}
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

  // Controller ruling R2 (2026-08-22): 스테이크 목록은 이 조각이 스스로 거르지 않는다 —
  // 모달이 담당 칠십인 범위로 거른 unitOptions/unitSelectDisabled를 그대로 받아 그린다.
  it('unitOptions로 받은 목록만 스테이크 select에 나타나고, unitSelectDisabled면 비활성화된다', async () => {
    renderSection({
      type: 'ward_visit',
      unitOptions: [{ value: 'busan-stake', label: '부산 스테이크' }],
      unitSelectDisabled: true,
    })
    const stakeSelect = screen.getByLabelText('schedule.stakeLabel') as HTMLSelectElement
    expect(Array.from(stakeSelect.options).map((o) => o.value)).toEqual(['', 'busan-stake'])
    expect(stakeSelect).toBeDisabled()
  })

  it('ccRegionOptions로 받은 목록만 CC select에 나타난다', async () => {
    renderSection({ type: 'meeting', ccRegionOptions: [{ value: 'seoul', label: '서울 CC' }] })
    await userEvent.selectOptions(screen.getByLabelText('schedule.targetKindLabel'), 'cc_council')
    const ccSelect = screen.getByLabelText('schedule.ccRegionLabel') as HTMLSelectElement
    expect(Array.from(ccSelect.options).map((o) => o.value)).toEqual(['', 'seoul'])
  })

  // Controller ruling R3 (2026-08-22): 협의 평의회는 CC 전체가 대상이라 특정 방문에 딸린
  // 사전 모임이라는 개념이 성립하지 않는다 — 예전 모달이 그랬듯 목적/관련 방문 칸을 숨기고,
  // 이미 골라둔 값이 있었다면 지운다.
  it('협의 평의회를 고르면 목적·관련 방문 칸이 사라지고, 값도 지워진다', async () => {
    const onChange = vi.fn()
    renderSection({ type: 'meeting', purpose: 'pre_visit', relatedVisitId: 'v1', onChange })
    expect(screen.getByLabelText('schedule.purposeLabel')).toBeInTheDocument()

    await userEvent.selectOptions(screen.getByLabelText('schedule.targetKindLabel'), 'cc_council')

    expect(screen.queryByLabelText('schedule.purposeLabel')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('schedule.relatedVisitLabel')).not.toBeInTheDocument()
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ purpose: 'general', relatedVisitId: '' }),
    )
  })

  // Controller ruling R4 (2026-08-22): 스테이크/지방부 회장 대상은 접견에만 있다 — CF가
  // 지금까지 한 번도 받아본 적 없는 `type: 'meeting'` + `targetKind: 'stake_president'`
  // 조합을 이 리팩터가 새로 열면 안 된다.
  it('모임에는 스테이크/지방부 회장 대상을 제공하지 않는다', () => {
    renderSection({ type: 'meeting' })
    const kindSelect = screen.getByLabelText('schedule.targetKindLabel') as HTMLSelectElement
    expect(Array.from(kindSelect.options).map((o) => o.value)).not.toContain('stake_president')
  })

  it('접견에는 스테이크/지방부 회장 대상을 제공한다', () => {
    renderSection({ type: 'interview' })
    const kindSelect = screen.getByLabelText('schedule.targetKindLabel') as HTMLSelectElement
    expect(Array.from(kindSelect.options).map((o) => o.value)).toContain('stake_president')
  })
})
