import { useState } from 'react'
import type { AppUser, GeneralSchedule } from '@/types'
import { ScheduleFormModal } from '@/components/domain/ScheduleFormModal/ScheduleFormModal'
import { GeneralScheduleFormModal } from '@/components/domain/GeneralScheduleFormModal/GeneralScheduleFormModal'
import { addScheduleChoicesFor, type AddScheduleChoice } from './addScheduleChoices'
import { ScheduleTypeChooser } from './ScheduleTypeChooser'

interface AddScheduleFlowProps {
  user: AppUser
  initialDate?: string
  generalSchedules?: GeneralSchedule[]
  onClose: () => void
  onSaved: () => void
}

/**
 * 「+ 추가」버튼 하나가 여는 상태 기계.
 *
 *   choices.length === 0  → 아무것도 렌더하지 않는다 (호출부가 버튼도 숨긴다)
 *   choices.length === 1  → chooser를 건너뛰고 그 폼을 바로 연다. 뒤로 버튼 없음.
 *   choices.length >= 2   → chooser 먼저. 고르면 그 폼 + 뒤로 버튼.
 */
export function AddScheduleFlow({
  user,
  initialDate,
  generalSchedules,
  onClose,
  onSaved,
}: AddScheduleFlowProps) {
  const choices = addScheduleChoicesFor(user)
  const [picked, setPicked] = useState<AddScheduleChoice | null>(
    choices.length === 1 ? choices[0] : null,
  )

  if (choices.length === 0) return null

  if (!picked) {
    return <ScheduleTypeChooser choices={choices} onPick={setPicked} onClose={onClose} />
  }

  const onBack = choices.length >= 2 ? () => setPicked(null) : undefined

  if (picked === 'general_schedule') {
    return (
      <GeneralScheduleFormModal
        initialDate={initialDate}
        onBack={onBack}
        onClose={onClose}
        onSaved={onSaved}
      />
    )
  }

  return (
    <ScheduleFormModal
      fixedType={picked}
      initialDate={initialDate}
      generalSchedules={generalSchedules}
      currentUser={user}
      onBack={onBack}
      onClose={onClose}
      onSaved={onSaved}
    />
  )
}
