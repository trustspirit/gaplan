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
            {selected.has(kind) && <Check size={12} aria-hidden="true" />}
            {t(`schedules.kind.${kind}`)}
          </button>
        ))}
      </div>

      <div className={styles.trailing}>
        {regions.length > 1 && (
          // Select는 placeholder를 넘겼든 아니든 value=""인 옵션을 항상 하나 렌더한다.
          // 그러니 "전체"를 별도 옵션으로 또 넣으면 빈 항목이 두 개가 된다 — 빈 값 자리를
          // placeholder에게 넘기고 그 라벨을 "전체"로 준다.
          <Select
            label={t('schedules.regionFilterLabel')}
            placeholder={t('common.all')}
            options={regions.map((region) => ({ value: region.id, label: region.name }))}
            value={regionId ?? ''}
            onChange={(e) => onRegionChange(e.target.value || null)}
            wrapperClassName={styles.selectWrapper}
            className={styles.select}
          />
        )}

        {!hideStatus && (
          // 같은 이유로 'all'을 옵션 목록에 넣지 않는다 — 빈 값이 곧 '전체'다.
          // 이렇게 두지 않으면 사용자가 항상 렌더되는 빈 옵션을 골라 ''를 흘려보낼 수 있고,
          // ''는 ScheduleStatusFilter가 아니다.
          <Select
            label={t('schedules.statusFilterLabel')}
            placeholder={t('schedules.status.all')}
            options={STATUSES.filter((v) => v !== 'all').map((value) => ({
              value,
              label: t(`schedules.status.${value}`),
            }))}
            value={status === 'all' ? '' : status}
            onChange={(e) => onStatusChange((e.target.value || 'all') as ScheduleStatusFilter)}
            wrapperClassName={styles.selectWrapper}
            className={styles.select}
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
