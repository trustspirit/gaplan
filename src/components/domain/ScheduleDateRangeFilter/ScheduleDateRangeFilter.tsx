import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import type { ScheduleDateRangeSetting } from '@/hooks/useScheduleDateRange'
import styles from './ScheduleDateRangeFilter.module.scss'

interface Props {
  setting: ScheduleDateRangeSetting
  onChange: (setting: ScheduleDateRangeSetting) => void
}

export function ScheduleDateRangeFilter({ setting, onChange }: Props) {
  const { t } = useTranslation()
  const [localStart, setLocalStart] = useState(setting.customStart ?? '')
  const [localEnd, setLocalEnd] = useState(setting.customEnd ?? '')

  useEffect(() => {
    setLocalStart(setting.customStart ?? '')
    setLocalEnd(setting.customEnd ?? '')
  }, [setting.customStart, setting.customEnd])

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
    <div className={styles.filter}>
      <div className={styles.presets}>
        <button
          type="button"
          className={styles.presetBtn}
          data-active={setting.preset === 'q1'}
          onClick={() => onChange({ preset: 'q1' })}
        >
          {t('schedule.filterQ1')}
        </button>
        <button
          type="button"
          className={styles.presetBtn}
          data-active={setting.preset === 'q2'}
          onClick={() => onChange({ preset: 'q2' })}
        >
          {t('schedule.filterQ2')}
        </button>
        <button
          type="button"
          className={styles.presetBtn}
          data-active={setting.preset === 'custom'}
          onClick={() => onChange({ preset: 'custom', customStart: localStart, customEnd: localEnd })}
        >
          {t('schedule.filterCustom')}
        </button>
      </div>

      {setting.preset === 'custom' && (
        <div className={styles.customRange}>
          <input
            type="date"
            className={styles.dateInput}
            value={localStart}
            onChange={e => handleStartChange(e.target.value)}
          />
          <span className={styles.rangeSep}>–</span>
          <input
            type="date"
            className={styles.dateInput}
            value={localEnd}
            onChange={e => handleEndChange(e.target.value)}
          />
        </div>
      )}
    </div>
  )
}
