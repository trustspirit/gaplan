import { useState } from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ScheduleType } from '@/types'
import type { ScheduleFormState } from './useScheduleForm'
import { DetailSection } from './DetailSection'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string, opts?: Record<string, unknown>) =>
      opts ? `${k} ${JSON.stringify(opts)}` : k,
    i18n: { language: 'ko' },
  }),
  initReactI18next: { type: '3rdParty', init: vi.fn() },
}))

// 프로젝트 선택은 useProjects()(Firestore 구독)에 의존하므로, 이 조각의 테스트에서는
// 다른 조각 이동 태스크(ScheduleFormModal.test.tsx 등)와 같은 관례로 목을 둔다.
vi.mock('@/components/domain/ProjectPicker/ProjectPicker', () => ({
  ProjectPicker: () => <div data-testid="project-picker" />,
}))

// DetailSection도 TargetSection/WhenSection과 마찬가지로 상태를 갖지 않는 순수 렌더
// 조각이다(Controller ruling). useScheduleForm이 하는 부분 병합을 여기서 얇게 흉내 낸다.
function Harness(props: {
  type?: ScheduleType
  autoTitle?: string
  autoLocation?: string | null
  canPickProject?: boolean
  initialLocation?: string
  initialCustomTitle?: string
  initialZoomLink?: string
  initialNotes?: string
  initialProjectId?: string
  onChange?: (partial: Partial<ScheduleFormState>) => void
}) {
  const [state, setState] = useState<ScheduleFormState>(() => ({
    type: props.type ?? 'interview',
    target: { kind: '', unitId: '', wardName: '', ccRegionId: '', freeText: '' },
    date: '',
    startTime: '',
    endTime: '',
    isSabbath: false,
    presidentAccompanied: false,
    purpose: 'general',
    relatedVisitId: '',
    location: props.initialLocation ?? '',
    customTitle: props.initialCustomTitle ?? '',
    zoomLink: props.initialZoomLink ?? '',
    notes: props.initialNotes ?? '',
    projectId: props.initialProjectId ?? '',
  }))

  const handleChange = (partial: Partial<ScheduleFormState>) => {
    props.onChange?.(partial)
    setState((prev) => ({ ...prev, ...partial }))
  }

  return (
    <DetailSection
      type={state.type}
      state={state}
      onChange={handleChange}
      autoTitle={props.autoTitle ?? ''}
      autoLocation={props.autoLocation ?? null}
      canPickProject={props.canPickProject ?? false}
    />
  )
}

function renderDetail(props: Parameters<typeof Harness>[0]) {
  return render(<Harness {...props} />)
}

describe('DetailSection', () => {
  it('기본은 접혀 있다', () => {
    renderDetail({})
    expect(screen.queryByLabelText('schedule.locationOptional')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /schedule.detailSectionLabel/ })).toHaveAttribute('aria-expanded', 'false')
  })

  it('펼치면 장소·제목·Zoom·메모가 나온다', async () => {
    renderDetail({})
    await userEvent.click(screen.getByRole('button', { name: /schedule.detailSectionLabel/ }))
    expect(screen.getByLabelText('schedule.locationOptional')).toBeInTheDocument()
    expect(screen.getByLabelText('schedule.customTitleOptional')).toBeInTheDocument()
  })

  // 접힌 채로 저장하면 사용자는 자기가 뭘 안 채웠는지 모른다. 자동값을 요약으로 보여준다.
  it('접혀 있어도 자동 생성될 제목과 장소를 요약으로 보여준다', () => {
    renderDetail({ autoTitle: '교문 와드 방문', autoLocation: '교문 와드' })
    expect(screen.getByText(/교문 와드 방문/)).toBeInTheDocument()
  })

  // 이미 값이 들어 있는데 접혀 있으면 사용자가 그 값의 존재를 모른 채 저장한다.
  it('값이 이미 채워져 있으면 처음부터 펼쳐진다', () => {
    renderDetail({ initialLocation: '스테이크 센터 2층' })
    expect(screen.getByLabelText('schedule.locationOptional')).toBeInTheDocument()
  })
})
