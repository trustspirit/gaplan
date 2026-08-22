import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { RotateCcw } from 'lucide-react'
import { Input } from '@/components/ui'
import type { ScheduleDateRangeSetting, DateRange } from '@/hooks/useScheduleDateRange'
import styles from './ScheduleDateRangeFilter.module.scss'

interface Props {
  setting: ScheduleDateRangeSetting
  currentRange: DateRange
  onChange: (setting: ScheduleDateRangeSetting) => void
}

/**
 * 일정 기간 필터. 날짜 두 칸을 상시 노출하고, 지금 적용 중인 범위를 그 칸에 그대로 채운다 —
 * 예전에는 「직접 입력」을 먼저 눌러야 칸이 나타나서 기간을 바꾸려면 두 번 눌러야 했고,
 * 기본 기간이 실제로 어디부터 어디까지인지도 화면에 없었다.
 * 칸을 고치는 것 자체가 직접 입력이므로, 되돌리기 버튼은 직접 입력 중일 때만 의미가 있다.
 */
export function ScheduleDateRangeFilter({ setting, currentRange, onChange }: Props) {
  const { t } = useTranslation()
  const isCustom = setting.preset === 'custom'
  const [localStart, setLocalStart] = useState(currentRange.start)
  const [localEnd, setLocalEnd] = useState(currentRange.end)

  useEffect(() => {
    setLocalStart(currentRange.start)
    setLocalEnd(currentRange.end)
  }, [currentRange.start, currentRange.end])

  const handleStartChange = (val: string) => {
    setLocalStart(val)
    if (val && localEnd && val <= localEnd)
      onChange({ preset: 'custom', customStart: val, customEnd: localEnd })
  }

  const handleEndChange = (val: string) => {
    setLocalEnd(val)
    if (localStart && val && localStart <= val)
      onChange({ preset: 'custom', customStart: localStart, customEnd: val })
  }

  return (
    <div className={styles.customRange}>
      <Input
        type="date"
        className={styles.dateInput}
        wrapperClassName={styles.dateField}
        aria-label={t('schedule.filterStartDate')}
        value={localStart}
        onChange={e => handleStartChange(e.target.value)}
      />
      <span className={styles.rangeSep}>–</span>
      <Input
        type="date"
        className={styles.dateInput}
        wrapperClassName={styles.dateField}
        aria-label={t('schedule.filterEndDate')}
        value={localEnd}
        onChange={e => handleEndChange(e.target.value)}
      />
      {isCustom && (
        <button
          type="button"
          className={styles.resetBtn}
          aria-label={t('schedule.filterReset')}
          title={t('schedule.filterReset')}
          onClick={() => onChange({ preset: 'rolling' })}
        >
          <RotateCcw size={14} aria-hidden="true" />
        </button>
      )}
    </div>
  )
}
