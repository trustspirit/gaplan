import { useState } from 'react'
import type { ScheduleType } from '@/types/schedule'
import type { TargetKindChoice, TargetSelection } from './scheduleTargetRules'
import { resetForKind } from './scheduleTargetRules'

export interface ScheduleFormState {
  type: ScheduleType
  target: TargetSelection
  date: string
  // 여러 날 모임의 마지막 날. '' = 하루짜리. 모임(meeting)에서만 쓴다.
  endDate: string
  startTime: string
  endTime: string
  isSabbath: boolean
  presidentAccompanied: boolean
  purpose: 'general' | 'pre_visit'
  relatedVisitId: string
  location: string
  customTitle: string
  zoomLink: string
  notes: string
  // 칠십인 전용 메모 — 회장·CC 공개 페이지·캘린더에는 나가지 않는다.
  seventyNotes: string
  projectId: string
  // 칠십인 전용. 대상이 '기타'인 접견/모임에서만 의미가 있다 — 저장할 때 canBeSeventyOnly로 거른다.
  seventyOnly: boolean
}

const EMPTY_TARGET: TargetSelection = {
  kind: '',
  unitId: '',
  wardName: '',
  ccRegionId: '',
  freeText: '',
}

function defaultState(): ScheduleFormState {
  return {
    type: 'ward_visit',
    target: { ...EMPTY_TARGET },
    date: '',
    endDate: '',
    startTime: '',
    endTime: '',
    isSabbath: false,
    presidentAccompanied: false,
    purpose: 'general',
    relatedVisitId: '',
    location: '',
    customTitle: '',
    zoomLink: '',
    notes: '',
    seventyNotes: '',
    projectId: '',
    seventyOnly: false,
  }
}

export function useScheduleForm(initial?: Partial<ScheduleFormState>): {
  state: ScheduleFormState
  set: <K extends keyof ScheduleFormState>(key: K, value: ScheduleFormState[K]) => void
  setTargetKind: (kind: TargetKindChoice | '') => void
  setType: (type: ScheduleType) => void
  isDirty: boolean
} {
  const [initialState] = useState<ScheduleFormState>(() => ({ ...defaultState(), ...initial }))
  const [state, setState] = useState<ScheduleFormState>(initialState)

  const set = <K extends keyof ScheduleFormState>(key: K, value: ScheduleFormState[K]) => {
    // 값이 안 바뀌었으면 새 state 객체를 만들지 않는다. useState의 setter는 원시값이
    // 같아도(Object.is) prev와 다른 객체 참조면 재렌더링을 막지 못한다 — 매번 새 참조로
    // set을 부르는 effect(예: EditScheduleModal의 relatedVisitId 복구 effect)가 그 새
    // 참조를 의존성으로 삼는 값(목 훅이 매 렌더 새 배열을 돌려주는 경우 등)과 만나면
    // 무한 재렌더 루프가 된다.
    setState((prev) => (Object.is(prev[key], value) ? prev : { ...prev, [key]: value }))
  }

  const setTargetKind = (kind: TargetKindChoice | '') => {
    setState((prev) => ({ ...prev, target: resetForKind(prev.target, kind) }))
  }

  const setType = (type: ScheduleType) => {
    setState((prev) => ({
      ...prev,
      type,
      // 여러 날은 모임만 된다 — 유형을 바꾸면 종료일을 버린다.
      endDate: type === 'meeting' ? prev.endDate : '',
      target: resetForKind(prev.target, ''),
      purpose: 'general',
    }))
  }

  const isDirty = (Object.keys(initialState) as Array<keyof ScheduleFormState>).some((key) => {
    if (key === 'target') {
      const a = state.target
      const b = initialState.target
      return (
        a.kind !== b.kind ||
        a.unitId !== b.unitId ||
        a.wardName !== b.wardName ||
        a.ccRegionId !== b.ccRegionId ||
        a.freeText !== b.freeText
      )
    }
    return state[key] !== initialState[key]
  })

  return { state, set, setTargetKind, setType, isDirty }
}
