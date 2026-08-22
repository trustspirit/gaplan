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
const DEFAULT_WARD_OPTIONS = [
  { value: '녹번 와드', label: '녹번 와드 · 감독' },
  { value: '교문 와드', label: '교문 와드 · 감독' },
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
  wardOptions?: { value: string; label: string }[]
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
      upcomingVisits={props.upcomingVisits ?? []}
      unitOptions={props.unitOptions ?? DEFAULT_UNIT_OPTIONS}
      unitSelectDisabled={props.unitSelectDisabled}
      wardOptions={props.wardOptions ?? DEFAULT_WARD_OPTIONS}
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

  // Controller ruling R5 (2026-08-22): 직접 입력(기타)을 골라도 스테이크는 계속 물어야
  // 한다 — 예전 폼은 대상을 '기타'로 골라도 그때까지 고른 스테이크를 payload에 실었다.
  // M2 (2026-08-22): 직접 입력은 스테이크가 필수가 아니므로 라벨도 선택 문구로 바뀐다
  // (stakeLabelKeyFor).
  it('직접 입력을 고르면 스테이크(선택)와 텍스트 칸을 함께 묻는다', async () => {
    renderSection({ type: 'interview' })
    await userEvent.selectOptions(screen.getByLabelText('schedule.targetKindLabel'), 'other')
    expect(screen.getByLabelText('schedule.stakeLabelOptional')).toBeInTheDocument()
    expect(screen.getByLabelText('schedule.targetFreeTextLabel')).toBeInTheDocument()
  })

  // Controller ruling R6 (2026-08-22): 담당 CC 정보가 아직 로딩 중이거나 없으면(빈 목록)
  // 예전 모달처럼 CC select를 비활성화한다 — 텅 빈 채로 활성화된 select를 보여주지 않는다.
  it('ccRegionOptions가 비어 있으면 CC select가 비활성화된다', async () => {
    renderSection({ type: 'meeting', ccRegionOptions: [] })
    await userEvent.selectOptions(screen.getByLabelText('schedule.targetKindLabel'), 'cc_council')
    expect(screen.getByLabelText('schedule.ccRegionLabel')).toBeDisabled()
  })

  // Controller ruling R6: 담당 CC가 하나뿐이면 예전 모달처럼 자동으로 그 CC를 고른다
  // ("담당 CC가 하나뿐이면 굳이 고르게 하지 않는다").
  it('담당 CC가 하나뿐이면 협의 평의회를 고를 때 자동으로 그 CC가 선택된다', async () => {
    const onChange = vi.fn()
    renderSection({ type: 'meeting', ccRegionOptions: [{ value: 'seoul', label: '서울 CC' }], onChange })
    await userEvent.selectOptions(screen.getByLabelText('schedule.targetKindLabel'), 'cc_council')
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ target: expect.objectContaining({ ccRegionId: 'seoul' }) }),
    )
    expect((screen.getByLabelText('schedule.ccRegionLabel') as HTMLSelectElement).value).toBe('seoul')
  })

  // Controller ruling R7 (2026-08-22): 예전 폼처럼 안내문은 관련 방문 select 바로
  // 아래, 대상 유형 select보다 위에 나온다 — 대상 유형 select 뒤로 옮겨가면 안 된다.
  it('대상 방문을 고르면 안내문이 관련 방문 select 바로 아래, 대상 유형 select보다 위에 나온다', async () => {
    const visits: UpcomingVisit[] = [
      { id: 'v1', date: '2026-08-01', wardName: '녹번 와드', unitId: 'seoul-stake', wardId: 'seoul-nokbeon' },
    ]
    renderSection({ type: 'meeting', purpose: 'pre_visit', upcomingVisits: visits })
    await userEvent.selectOptions(screen.getByLabelText('schedule.relatedVisitLabel'), 'v1')

    const hint = screen.getByText(/relatedVisitRecommendedBy/)
    const relatedVisitSelect = screen.getByLabelText('schedule.relatedVisitLabel')
    const targetKindSelect = screen.getByLabelText('schedule.targetKindLabel')
    // hint comes after the related-visit select...
    expect(
      relatedVisitSelect.compareDocumentPosition(hint) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    // ...and before the target-kind select.
    expect(
      hint.compareDocumentPosition(targetKindSelect) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  // Controller ruling R10 (2026-08-22): visit.wardId를 우선하고, 없으면 이름으로 찾는다
  // (예전 폼: `v.wardId ?? getWardIdByName(v.wardName)`). 와드 id를 알 수 없으면(이름
  // 테이블에 없는 와드) 대상을 채우지 않는다 — relatedVisitId만 반영하고 target은
  // 그대로 둔다. 존재하지 않는 이름을 써서 실제 이름 테이블과 무관하게 실패를 재현한다.
  it('방문의 와드 id를 알 수 없으면 대상 방문만 반영하고 대상은 채우지 않는다', async () => {
    const onChange = vi.fn()
    const visits: UpcomingVisit[] = [
      { id: 'v-unknown', date: '2026-08-01', wardName: '존재하지-않는-와드', unitId: 'seoul-stake' },
    ]
    renderSection({ type: 'meeting', purpose: 'pre_visit', upcomingVisits: visits, onChange })
    await userEvent.selectOptions(screen.getByLabelText('schedule.relatedVisitLabel'), 'v-unknown')

    expect(onChange).toHaveBeenCalledWith({ relatedVisitId: 'v-unknown' })
    expect(onChange).not.toHaveBeenCalledWith(expect.objectContaining({ target: expect.anything() }))
  })

  it('방문에 wardId가 실려 있으면 이름 테이블을 거치지 않고도 대상을 채운다', async () => {
    const onChange = vi.fn()
    const visits: UpcomingVisit[] = [
      { id: 'v-known', date: '2026-08-01', wardName: '녹번 와드', unitId: 'seoul-stake', wardId: 'seoul-nokbeon' },
    ]
    renderSection({ type: 'meeting', purpose: 'pre_visit', upcomingVisits: visits, onChange })
    await userEvent.selectOptions(screen.getByLabelText('schedule.relatedVisitLabel'), 'v-known')

    expect(onChange).toHaveBeenCalledWith({
      relatedVisitId: 'v-known',
      target: { kind: 'ward_bishop', unitId: 'seoul-stake', wardName: '녹번 와드', ccRegionId: '', freeText: '' },
    })
  })

  // 테스트 보강 #6 (2026-08-22): 위 테스트는 onChange에 어떤 인자가 실렸는지만 본다 —
  // Harness가 그 부분 병합을 실제로 반영해 화면에 그 값을 보여주는지는 따로 확인한
  // 적이 없다. 관련 방문을 고르면 화면에 보이는 대상 유형/스테이크/와드 select가
  // 실제로 그 방문의 스테이크·와드로 갱신되는지를 렌더된 값으로 직접 확인한다.
  it('관련 방문을 고르면 화면의 대상 유형·스테이크·와드 select가 그 방문의 값으로 채워진다', async () => {
    const visits: UpcomingVisit[] = [
      { id: 'v-known', date: '2026-08-01', wardName: '녹번 와드', unitId: 'seoul-stake', wardId: 'seoul-nokbeon' },
    ]
    renderSection({ type: 'meeting', purpose: 'pre_visit', upcomingVisits: visits })
    await userEvent.selectOptions(screen.getByLabelText('schedule.relatedVisitLabel'), 'v-known')

    expect((screen.getByLabelText('schedule.targetKindLabel') as HTMLSelectElement).value).toBe('ward_bishop')
    expect((screen.getByLabelText('schedule.stakeLabel') as HTMLSelectElement).value).toBe('seoul-stake')
    expect((screen.getByLabelText('schedule.wardLabel') as HTMLSelectElement).value).toBe('녹번 와드')
  })

  // Task 8: 이 계획이 없앤 결함(아래→위 역방향 쓰기)이 돌아오는 것을 못박는다.
  // 판정 기준은 "렌더된 값"이다 — 핸들러가 불렸는지가 아니라 화면에 보이는 select의
  // value가 그대로인지를 본다. cc_council로 바꿀 때 목적·관련 방문을 지우는 것(R3)은
  // 의미상 예외이므로 이 테스트들에서는 일부러 피한다.
  it('스테이크를 바꿔도 대상 유형 선택은 바뀌지 않는다', async () => {
    renderSection({ type: 'interview' })
    await userEvent.selectOptions(screen.getByLabelText('schedule.targetKindLabel'), 'stake_president')
    await userEvent.selectOptions(screen.getByLabelText('schedule.stakeLabel'), 'seoul-east-stake')

    const kindBefore = (screen.getByLabelText('schedule.targetKindLabel') as HTMLSelectElement).value

    // 아래쪽(스테이크)을 다시 바꾼다
    await userEvent.selectOptions(screen.getByLabelText('schedule.stakeLabel'), 'seoul-stake')

    expect((screen.getByLabelText('schedule.targetKindLabel') as HTMLSelectElement).value).toBe(kindBefore)
  })

  it('와드를 바꿔도 스테이크 선택은 바뀌지 않는다', async () => {
    renderSection({ type: 'interview' })
    await userEvent.selectOptions(screen.getByLabelText('schedule.targetKindLabel'), 'ward_bishop')
    await userEvent.selectOptions(screen.getByLabelText('schedule.stakeLabel'), 'seoul-east-stake')
    await userEvent.selectOptions(screen.getByLabelText('schedule.wardLabel'), '녹번 와드')

    const stakeBefore = (screen.getByLabelText('schedule.stakeLabel') as HTMLSelectElement).value

    // 아래쪽(와드)을 다시 바꾼다
    await userEvent.selectOptions(screen.getByLabelText('schedule.wardLabel'), '교문 와드')

    expect((screen.getByLabelText('schedule.stakeLabel') as HTMLSelectElement).value).toBe(stakeBefore)
  })

  // 대상 유형(target.kind)은 목적·관련 방문보다 아래에 있다. 유형을 바꿔 그 아래 칸이
  // 새로 갈리더라도, 이미 위에서 골라둔 목적·관련 방문은 그대로여야 한다 — 예전 폼의
  // 결함은 정확히 이 방향(협의 평의회를 고르면 위쪽 스테이크가 사라짐)이었다.
  it('대상 유형을 바꿔도 위쪽의 목적·관련 방문 선택은 바뀌지 않는다', async () => {
    const visits: UpcomingVisit[] = [
      { id: 'v1', date: '2026-08-01', wardName: '녹번 와드', unitId: 'seoul-stake', wardId: 'seoul-nokbeon' },
    ]
    renderSection({ type: 'meeting', purpose: 'pre_visit', relatedVisitId: 'v1', upcomingVisits: visits })

    await userEvent.selectOptions(screen.getByLabelText('schedule.targetKindLabel'), 'ward_bishop')
    expect((screen.getByLabelText('schedule.purposeLabel') as HTMLSelectElement).value).toBe('pre_visit')
    expect((screen.getByLabelText('schedule.relatedVisitLabel') as HTMLSelectElement).value).toBe('v1')

    // 유형을 한 번 더 바꾼다 — 여전히 협의 평의회가 아니다
    await userEvent.selectOptions(screen.getByLabelText('schedule.targetKindLabel'), 'other')
    expect((screen.getByLabelText('schedule.purposeLabel') as HTMLSelectElement).value).toBe('pre_visit')
    expect((screen.getByLabelText('schedule.relatedVisitLabel') as HTMLSelectElement).value).toBe('v1')
  })
})
