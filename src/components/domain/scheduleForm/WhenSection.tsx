import { useTranslation } from 'react-i18next'
import type { ScheduleType, GeneralSchedule } from '@/types'
import { Input } from '@/components/ui'
import type { ScheduleFormState } from './useScheduleForm'
import { nextEndTime, DEFAULT_DURATION_MINUTES } from './scheduleTimeRules'
import styles from '../ScheduleFormModal/ScheduleFormModal.module.scss'

export interface WhenSectionProps {
  type: ScheduleType
  state: ScheduleFormState
  onChange: (partial: Partial<ScheduleFormState>) => void
  conflictingEvent?: Pick<GeneralSchedule, 'title'>
  /**
   * 편집 모달 전용 — 안식일 방문 토글을 숨긴다. 편집 모달은 이 칸을 가져 본 적이 없고
   * (schedule.isSabbath라는 저장 필드 자체가 없다) adminEditSchedule의 updates 계약에도
   * 없으므로, 그대로 보여주면 시간을 10:00-12:00으로 채워는 주지만 저장은 되지 않는
   * 반쪽짜리 컨트롤이 된다(Controller ruling 1과 같은 이유).
   */
  hideSabbathToggle?: boolean
}

/**
 * 날짜·시간 조각. 안식일 방문 켜기는 시간을 10:00-12:00으로 채우던 예전 동작
 * (ScheduleFormModal의 handleSabbathToggle)을 그대로 옮긴 것 — 끌 때는 시간을 건드리지
 * 않는다. 안식일·회장 동행 체크는 방문(ward_visit)에만 있는 개념이라 그때만 보인다.
 * 충돌 경고는 날짜 바로 아래에 둔다.
 *
 * 체크박스는 폼 값이라 저장 전에는 아무 효과가 없다 — 즉시 반영을 뜻하는 Switch가 아니라
 * ScheduleFormModal의 원래 체크박스 마크업(같은 클래스·같은 accentColor)을 그대로 옮겼다
 * (Controller ruling: 이 계획은 구조만 바꾼다, 겉모습은 그대로).
 */
export function WhenSection({ type, state, onChange, conflictingEvent, hideSabbathToggle }: WhenSectionProps) {
  const { t } = useTranslation()
  const { date, startTime, endTime, isSabbath, presidentAccompanied } = state

  const handleSabbathToggle = (checked: boolean) => {
    onChange(checked ? { isSabbath: checked, startTime: '10:00', endTime: '12:00' } : { isSabbath: checked })
  }

  return (
    <>
      {type === 'ward_visit' && !hideSabbathToggle && (
        <label className={styles.checkRow}>
          <input
            type="checkbox"
            checked={isSabbath}
            onChange={e => handleSabbathToggle(e.target.checked)}
            className={styles.checkbox}
            style={{ accentColor: 'var(--color-primary, #177C9C)' }}
          />
          <span className={styles.checkLabel}>{t('schedule.sabbathVisit')}</span>
        </label>
      )}

      {type === 'ward_visit' && (
        <label className={styles.checkRow}>
          <input
            type="checkbox"
            checked={presidentAccompanied}
            onChange={e => onChange({ presidentAccompanied: e.target.checked })}
            className={styles.checkbox}
            style={{ accentColor: 'var(--color-primary, #177C9C)' }}
          />
          <span className={styles.checkLabel}>{t('schedule.presidentAccompanied')}</span>
        </label>
      )}

      <Input
        type="date"
        label={t('schedule.dateLabel')}
        value={date}
        onChange={(e) => onChange({ date: e.target.value })}
      />

      {conflictingEvent && (
        <div className={styles.conflictWarning}>
          {t('generalSchedule.conflictWarning', { title: conflictingEvent.title })}
        </div>
      )}

      <div className={styles.timeRow}>
        <Input
          type="time"
          label={t('common.startTime')}
          value={startTime}
          onChange={(e) => {
            const v = e.target.value
            onChange({
              startTime: v,
              endTime: nextEndTime({
                nextStart: v,
                previousStart: startTime,
                previousEnd: endTime,
                defaultMinutes: DEFAULT_DURATION_MINUTES[type],
              }),
            })
          }}
        />
        <Input
          type="time"
          label={t('common.endTime')}
          value={endTime}
          onChange={(e) => onChange({ endTime: e.target.value })}
        />
      </div>
    </>
  )
}
