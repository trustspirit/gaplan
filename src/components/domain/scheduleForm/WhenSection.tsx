import { useTranslation } from 'react-i18next'
import type { ScheduleType, GeneralSchedule } from '@/types'
import { Input, Switch } from '@/components/ui'
import type { ScheduleFormState } from './useScheduleForm'

export interface WhenSectionProps {
  type: ScheduleType
  state: ScheduleFormState
  onChange: (partial: Partial<ScheduleFormState>) => void
  conflictingEvent?: Pick<GeneralSchedule, 'title'>
}

/**
 * 날짜·시간 조각. 안식일 방문 켜기는 시간을 10:00-12:00으로 채우던 예전 동작
 * (ScheduleFormModal의 handleSabbathToggle)을 그대로 옮긴 것 — 끌 때는 시간을 건드리지
 * 않는다. 안식일·회장 동행 체크는 방문(ward_visit)에만 있는 개념이라 그때만 보인다.
 * 충돌 경고는 날짜 바로 아래에 둔다.
 */
export function WhenSection({ type, state, onChange, conflictingEvent }: WhenSectionProps) {
  const { t } = useTranslation()
  const { date, startTime, endTime, isSabbath, presidentAccompanied } = state

  const handleSabbathToggle = (checked: boolean) => {
    onChange(checked ? { isSabbath: checked, startTime: '10:00', endTime: '12:00' } : { isSabbath: checked })
  }

  return (
    <>
      {type === 'ward_visit' && (
        <Switch
          checked={isSabbath}
          onChange={handleSabbathToggle}
          label={t('schedule.sabbathVisit')}
        />
      )}

      {type === 'ward_visit' && (
        <Switch
          checked={presidentAccompanied}
          onChange={(checked) => onChange({ presidentAccompanied: checked })}
          label={t('schedule.presidentAccompanied')}
        />
      )}

      <Input
        type="date"
        label={t('schedule.dateLabel')}
        value={date}
        onChange={(e) => onChange({ date: e.target.value })}
      />

      {conflictingEvent && (
        <p>{t('generalSchedule.conflictWarning', { title: conflictingEvent.title })}</p>
      )}

      <Input
        type="time"
        label={t('common.startTime')}
        value={startTime}
        onChange={(e) => onChange({ startTime: e.target.value })}
      />
      <Input
        type="time"
        label={t('common.endTime')}
        value={endTime}
        onChange={(e) => onChange({ endTime: e.target.value })}
      />
    </>
  )
}
