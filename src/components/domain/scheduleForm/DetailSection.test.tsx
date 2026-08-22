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

// ZoomLinkPicker는 useZoomLinks()(Firestore)·jotai 사용자 atom에 의존한다 — 자기
// 계약(value/onChange)만 확인하고, 그 내부 동작은 ZoomLinkPicker.test.tsx가 고정한다.
vi.mock('./ZoomLinkPicker', () => ({
  ZoomLinkPicker: ({ value, onChange }: { value: string; onChange: (url: string) => void }) => (
    <button type="button" data-testid="zoom-link-picker" data-value={value} onClick={() => onChange('https://zoom.us/j/picked')}>
      zoom-link-picker
    </button>
  ),
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
  // Task 2 (스케줄 폼 레이아웃 개선, 2026-08-22): 접기를 완전히 없앤다. 온라인 모임에서
  // Zoom 링크가 "상세 정보"라는 선택적으로 들리는 라벨 뒤 두 번의 클릭 거리에 있었고,
  // 장소도 사용자가 직접 표시해 달라던 값이었다 — 열자마자(클릭 없이) 다섯 칸이 모두 보인다.
  it('열자마자 장소·제목·Zoom·메모가 클릭 없이 보인다', () => {
    renderDetail({ type: 'meeting' })
    expect(screen.getByLabelText('schedule.locationOptional')).toBeInTheDocument()
    expect(screen.getByLabelText('schedule.customTitleOptional')).toBeInTheDocument()
    expect(screen.getByLabelText('schedule.zoomLinkOptional')).toBeInTheDocument()
    expect(screen.getByLabelText('schedule.notesLabelOptional')).toBeInTheDocument()
  })

  // 접기와 함께 요약 줄도 없어졌다 — 대신 각 입력칸의 placeholder가 자동값을 보여준다
  // (locationOptional은 autoLocation, customTitleOptional은 autoTitle).
  it('자동 생성될 제목·장소는 각 입력칸의 placeholder로 보여준다', () => {
    renderDetail({ autoTitle: '교문 와드 방문', autoLocation: '교문 와드' })
    expect(screen.getByLabelText('schedule.locationOptional')).toHaveAttribute('placeholder', '교문 와드')
    expect(screen.getByLabelText('schedule.customTitleOptional')).toHaveAttribute('placeholder', '교문 와드 방문')
  })

  // ward_visit은 제목 입력칸 자체가 렌더되지 않는다 — placeholder로 자동 제목을 볼 방법이
  // 없으므로, 그때만 한 줄 힌트로 알려준다.
  it('ward_visit일 때는 제목 칸이 없는 대신 자동 제목 힌트가 뜬다', () => {
    renderDetail({ type: 'ward_visit', autoTitle: '교문 와드 방문' })
    expect(screen.queryByLabelText('schedule.customTitleOptional')).not.toBeInTheDocument()
    expect(screen.getByText(/교문 와드 방문/)).toBeInTheDocument()
  })

  // ward_visit이 아닌 유형은 제목 입력칸의 placeholder가 이미 그 값을 보여주므로 힌트가
  // 따로 필요 없다 — 중복해서 보여주지 않는다.
  it('ward_visit이 아니면 자동 제목 힌트를 따로 보여주지 않는다', () => {
    renderDetail({ type: 'meeting', autoTitle: '교문 와드 모임' })
    expect(screen.queryByText('schedule.autoTitleHint {"title":"교문 와드 모임"}')).not.toBeInTheDocument()
  })

  // Zoom 링크 칸이 있는 유형(ward_visit 제외)에서는 그 입력칸 위에 저장된 링크
  // picker가 함께 뜬다.
  it('Zoom 링크 칸이 있는 유형에서는 picker도 함께 뜬다', () => {
    renderDetail({ type: 'meeting' })
    expect(screen.getByTestId('zoom-link-picker')).toBeInTheDocument()
  })

  // ward_visit은 애초에 Zoom 링크 입력칸 자체가 없다 — picker도 함께 없어야 한다.
  it('ward_visit 유형에서는 picker가 뜨지 않는다', () => {
    renderDetail({ type: 'ward_visit' })
    expect(screen.queryByTestId('zoom-link-picker')).not.toBeInTheDocument()
  })

  // picker에서 고른 링크는 그대로 zoomLink onChange로 전달돼야 한다 — URL 입력칸을
  // 직접 타이핑하는 것과 같은 경로를 탄다.
  it('picker에서 고르면 zoomLink onChange가 그 URL로 불린다', async () => {
    const onChange = vi.fn()
    renderDetail({ type: 'meeting', onChange })
    await userEvent.click(screen.getByTestId('zoom-link-picker'))
    expect(onChange).toHaveBeenCalledWith({ zoomLink: 'https://zoom.us/j/picked' })
  })

  // 타이핑으로 직접 입력하는 경로는 picker가 있든 없든 그대로 살아 있어야 한다 —
  // picker는 편의 기능일 뿐 입력을 가리는 문(gate)이 아니다.
  it('picker가 있어도 URL 입력칸에 직접 타이핑할 수 있다', async () => {
    const onChange = vi.fn()
    renderDetail({ type: 'meeting', onChange })
    await userEvent.type(screen.getByLabelText('schedule.zoomLinkOptional'), 'x')
    expect(onChange).toHaveBeenCalledWith({ zoomLink: 'x' })
  })
})
