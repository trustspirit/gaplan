import { useState } from 'react'
import type { ScheduleType } from '@/types/schedule'
import type { TargetKindChoice, TargetSelection } from './scheduleTargetRules'
import { resetForKind } from './scheduleTargetRules'

export interface ScheduleFormState {
  type: ScheduleType
  target: TargetSelection
  date: string
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
  projectId: string
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
    projectId: '',
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
    setState((prev) => ({ ...prev, [key]: value }))
  }

  const setTargetKind = (kind: TargetKindChoice | '') => {
    setState((prev) => ({ ...prev, target: resetForKind(prev.target, kind) }))
  }

  const setType = (type: ScheduleType) => {
    setState((prev) => ({
      ...prev,
      type,
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
