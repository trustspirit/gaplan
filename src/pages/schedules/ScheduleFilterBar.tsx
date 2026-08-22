import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import clsx from 'clsx'
import { Check } from 'lucide-react'
import { Select } from '@/components/ui'
import { ScheduleDateRangeFilter } from '@/components/domain/ScheduleDateRangeFilter/ScheduleDateRangeFilter'
import type { DateRange, ScheduleDateRangeSetting } from '@/hooks/useScheduleDateRange'
import {
  SCHEDULE_KINDS,
  toggleScheduleKind,
  type ScheduleKind,
  type ScheduleStatusFilter,
} from './scheduleFilters'
import styles from './ScheduleFilterBar.module.scss'

export interface RegionOption {
  id: string
  name: string
}

interface ScheduleFilterBarProps {
  kinds: ScheduleKind[]
  onKindsChange: (next: ScheduleKind[]) => void
  /** 2개 미만이면 고를 것이 없으므로 지역 셀렉트를 그리지 않는다. */
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

  const selected = new Set(kinds)
  // 전부 끄면 빈 화면만 남고 되돌릴 실마리가 없다. 마지막 하나는 잠근다(사용자 affordance).
  const isLastOn = (kind: ScheduleKind) => selected.has(kind) && selected.size === 1

  // 실제 규칙(마지막 하나는 안 꺼진다)은 순수 함수로 옮겨져 있다 — scheduleFilters.test.ts 참고.
  const toggleKind = (kind: ScheduleKind) => onKindsChange(toggleScheduleKind(kinds, kind))

  return (
    <div className={styles.bar}>
      <div className={styles.chipGroup} role="group" aria-labelledby={kindHeadingId}>
        <span id={kindHeadingId} className={styles.groupLabel}>
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
            {selected.has(kind) && <Check size={14} aria-hidden="true" />}
            {t(`schedules.kind.${kind}`)}
          </button>
        ))}
      </div>

      <div className={styles.trailing}>
        {regions.length > 1 && (
          // "전체"는 유효한 선택이지 미선택 상태가 아니므로, Select의 placeholder가 아니라
          // 실제 옵션(value: '')으로 넣는다.
          <Select
            label={t('schedules.regionFilterLabel')}
            options={[
              { value: '', label: t('common.all') },
              ...regions.map((region) => ({ value: region.id, label: region.name })),
            ]}
            value={regionId ?? ''}
            onChange={(e) => onRegionChange(e.target.value || null)}
          />
        )}

        {!hideStatus && (
          <Select
            label={t('schedules.statusFilterLabel')}
            options={STATUSES.map((value) => ({ value, label: t(`schedules.status.${value}`) }))}
            value={status}
            onChange={(e) => onStatusChange(e.target.value as ScheduleStatusFilter)}
          />
        )}

        <ScheduleDateRangeFilter
          setting={rangeSetting}
          currentRange={range}
          onChange={onRangeChange}
        />
      </div>
    </div>
  )
}
