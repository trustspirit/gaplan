import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import clsx from 'clsx'
import { Check } from 'lucide-react'
import { ScheduleDateRangeFilter } from '@/components/domain/ScheduleDateRangeFilter/ScheduleDateRangeFilter'
import type { DateRange, ScheduleDateRangeSetting } from '@/hooks/useScheduleDateRange'
import {
  activeFilterCount,
  SCHEDULE_KINDS,
  toggleScheduleKind,
  type ScheduleKind,
  type ScheduleStatusFilter,
} from './scheduleFilters'
import { ScheduleFilterSheet, type RegionOption } from './ScheduleFilterSheet'
import styles from './ScheduleFilterBar.module.scss'

interface ScheduleFilterBarProps {
  kinds: ScheduleKind[]
  onKindsChange: (next: ScheduleKind[]) => void
  /** 2개 미만이면 고를 것이 없으므로 시트에 지역 섹션을 그리지 않는다. */
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
  const [sheetOpen, setSheetOpen] = useState(false)
  // lazy-mount flag so an unopened sheet doesn't sit in the DOM as a second
  // role="dialog" (BottomSheet stays mounted-but-inert while closed, for its
  // exit transition — see ScheduleItem's kebab-menu sheet for the same trick).
  const [sheetEverOpen, setSheetEverOpen] = useState(false)

  const selected = new Set(kinds)
  // 전부 끄면 빈 화면만 남고 되돌릴 실마리가 없다. 마지막 하나는 잠근다(사용자 affordance).
  const isLastOn = (kind: ScheduleKind) => selected.has(kind) && selected.size === 1

  // 실제 규칙(마지막 하나는 안 꺼진다)은 순수 함수로 옮겨져 있다 — scheduleFilters.test.ts 참고.
  const toggleKind = (kind: ScheduleKind) => onKindsChange(toggleScheduleKind(kinds, kind))

  // 지역·상태는 시트 뒤로 숨었다 — 고를 것이 아예 없으면 시트도 빈 껍데기라 버튼째 감춘다.
  const canFilter = regions.length > 1 || !hideStatus
  const filterCount = activeFilterCount({ regionId, status, hideStatus: !!hideStatus })

  const applyFromSheet = (next: { regionId: string | null; status: ScheduleStatusFilter }) => {
    onRegionChange(next.regionId)
    onStatusChange(next.status)
    setSheetOpen(false)
  }

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
        <ScheduleDateRangeFilter
          setting={rangeSetting}
          currentRange={range}
          onChange={onRangeChange}
        />

        {canFilter && (
          <button
            type="button"
            className={styles.filterButton}
            onClick={() => {
              setSheetEverOpen(true)
              setSheetOpen(true)
            }}
          >
            {t('common.filter')}
            {filterCount > 0 && <span className={styles.filterBadge}>{filterCount}</span>}
          </button>
        )}
      </div>

      {canFilter && sheetEverOpen && (
        <ScheduleFilterSheet
          open={sheetOpen}
          regions={regions}
          regionId={regionId}
          status={status}
          hideStatus={!!hideStatus}
          onApply={applyFromSheet}
          onClose={() => setSheetOpen(false)}
        />
      )}
    </div>
  )
}
