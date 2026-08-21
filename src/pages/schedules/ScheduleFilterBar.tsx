import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import clsx from 'clsx'
import { SegmentedControl, type SegmentOption } from '@/components/ui'
import { ScheduleDateRangeFilter } from '@/components/domain/ScheduleDateRangeFilter/ScheduleDateRangeFilter'
import type { DateRange, ScheduleDateRangeSetting } from '@/hooks/useScheduleDateRange'
import {
  SCHEDULE_KINDS,
  toggleScheduleKind,
  type ScheduleKind,
  type ScheduleStatusFilter,
} from './scheduleFilters'
import styles from './ScheduleFilterBar.module.scss'

interface RegionOption {
  id: string
  name: string
}

interface ScheduleFilterBarProps {
  kinds: ScheduleKind[]
  onKindsChange: (next: ScheduleKind[]) => void
  /** 2개 미만이면 고를 것이 없으므로 칩을 아예 그리지 않는다. */
  regions: RegionOption[]
  regionId: string | null
  onRegionChange: (next: string | null) => void
  status: ScheduleStatusFilter
  onStatusChange: (next: ScheduleStatusFilter) => void
  /** 달력 뷰에서 상태 필터를 감춘다(판정 R26). */
  hideStatus?: boolean
  rangeSetting: ScheduleDateRangeSetting
  range: DateRange
  onRangeChange: (next: ScheduleDateRangeSetting) => void
}

const STATUSES: ScheduleStatusFilter[] = ['all', 'upcoming', 'completed']

export function ScheduleFilterBar({
  kinds,
  onKindsChange,
  regions,
  regionId,
  onRegionChange,
  status,
  onStatusChange,
  hideStatus,
  rangeSetting,
  range,
  onRangeChange,
}: ScheduleFilterBarProps) {
  const { t } = useTranslation()
  const kindHeadingId = useId()
  const regionHeadingId = useId()

  const selected = new Set(kinds)
  // 전부 끄면 빈 화면만 남고 되돌릴 실마리가 없다. 마지막 하나는 잠근다(사용자 affordance).
  const isLastOn = (kind: ScheduleKind) => selected.has(kind) && selected.size === 1

  // 실제 규칙(마지막 하나는 안 꺼진다)은 순수 함수로 옮겨져 있다 — scheduleFilters.test.ts 참고.
  const toggleKind = (kind: ScheduleKind) => onKindsChange(toggleScheduleKind(kinds, kind))

  const statusOptions: SegmentOption<ScheduleStatusFilter>[] = STATUSES.map((value) => ({
    value,
    label: t(`schedules.status.${value}`),
  }))

  return (
    <div className={styles.bar}>
      <div className={styles.chipGroup} role="group" aria-labelledby={kindHeadingId}>
        <span id={kindHeadingId} className={styles.srOnly}>
          {t('schedules.kindFilterLabel')}
        </span>
        {SCHEDULE_KINDS.map((kind) => (
          <button
            key={kind}
            type="button"
            className={clsx(styles.chip, selected.has(kind) && styles.chipOn)}
            aria-pressed={selected.has(kind)}
            disabled={isLastOn(kind)}
            onClick={() => toggleKind(kind)}
          >
            {t(`schedules.kind.${kind}`)}
          </button>
        ))}
      </div>

      {regions.length > 1 && (
        <div className={styles.chipGroup} role="group" aria-labelledby={regionHeadingId}>
          <span id={regionHeadingId} className={styles.srOnly}>
            {t('schedules.regionFilterLabel')}
          </span>
          <button
            type="button"
            className={clsx(styles.chip, regionId === null && styles.chipOn)}
            aria-pressed={regionId === null}
            onClick={() => onRegionChange(null)}
          >
            {t('common.all')}
          </button>
          {regions.map((region) => (
            <button
              key={region.id}
              type="button"
              className={clsx(styles.chip, regionId === region.id && styles.chipOn)}
              aria-pressed={regionId === region.id}
              onClick={() => onRegionChange(region.id)}
            >
              {region.name}
            </button>
          ))}
        </div>
      )}

      {!hideStatus && (
        <SegmentedControl
          options={statusOptions}
          value={status}
          onChange={onStatusChange}
          aria-label={t('schedules.statusFilterLabel')}
          className={styles.status}
        />
      )}

      <ScheduleDateRangeFilter
        setting={rangeSetting}
        currentRange={range}
        onChange={onRangeChange}
      />
    </div>
  )
}
