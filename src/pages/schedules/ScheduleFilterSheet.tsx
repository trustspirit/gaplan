import { useEffect, useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ResponsiveDialog } from '@/components/ui/ResponsiveDialog/ResponsiveDialog'
import { Button } from '@/components/ui/Button/Button'
import type { ScheduleStatusFilter } from './scheduleFilters'
import styles from './ScheduleFilterSheet.module.scss'

export interface RegionOption {
  id: string
  name: string
}

interface PendingFilters {
  regionId: string | null
  status: ScheduleStatusFilter
}

interface ScheduleFilterSheetProps {
  open: boolean
  regions: RegionOption[]
  regionId: string | null
  status: ScheduleStatusFilter
  hideStatus: boolean
  onApply: (next: PendingFilters) => void
  onClose: () => void
}

const STATUSES: ScheduleStatusFilter[] = ['all', 'upcoming', 'completed']

export function ScheduleFilterSheet({
  open,
  regions,
  regionId,
  status,
  hideStatus,
  onApply,
  onClose,
}: ScheduleFilterSheetProps) {
  const { t } = useTranslation()
  const regionHeadingId = useId()
  const statusHeadingId = useId()
  const regionGroupName = useId()
  const statusGroupName = useId()
  const [pending, setPending] = useState<PendingFilters>({ regionId, status })

  // 시트가 목록을 가리고 있어 즉시 반영해도 효과를 볼 수 없다 — 열릴 때마다 현재 값으로
  // 되감아, 지난번에 적용하지 않고 버린 선택이 다음 오픈에 새어 나오지 않게 한다.
  useEffect(() => {
    if (open) setPending({ regionId, status })
  }, [open, regionId, status])

  const showRegions = regions.length > 1
  const showStatus = !hideStatus

  return (
    <ResponsiveDialog open={open} onClose={onClose} title={t('common.filter')}>
      {showRegions && (
        <div className={styles.section}>
          <h3 id={regionHeadingId} className={styles.sectionTitle}>
            {t('schedules.regionFilterLabel')}
          </h3>
          <div className={styles.options} role="radiogroup" aria-labelledby={regionHeadingId}>
            <label className={styles.option}>
              <input
                type="radio"
                name={regionGroupName}
                className={styles.input}
                checked={pending.regionId === null}
                onChange={() => setPending((p) => ({ ...p, regionId: null }))}
              />
              {t('common.all')}
            </label>
            {regions.map((region) => (
              <label key={region.id} className={styles.option}>
                <input
                  type="radio"
                  name={regionGroupName}
                  className={styles.input}
                  checked={pending.regionId === region.id}
                  onChange={() => setPending((p) => ({ ...p, regionId: region.id }))}
                />
                {region.name}
              </label>
            ))}
          </div>
        </div>
      )}

      {showStatus && (
        <div className={styles.section}>
          <h3 id={statusHeadingId} className={styles.sectionTitle}>
            {t('schedules.statusFilterLabel')}
          </h3>
          <div className={styles.options} role="radiogroup" aria-labelledby={statusHeadingId}>
            {STATUSES.map((value) => (
              <label key={value} className={styles.option}>
                <input
                  type="radio"
                  name={statusGroupName}
                  className={styles.input}
                  checked={pending.status === value}
                  onChange={() => setPending((p) => ({ ...p, status: value }))}
                />
                {t(`schedules.status.${value}`)}
              </label>
            ))}
          </div>
        </div>
      )}

      <div className={styles.actions}>
        <Button
          type="button"
          variant="ghost"
          fullWidth
          onClick={() => setPending({ regionId: null, status: 'all' })}
        >
          {t('common.reset')}
        </Button>
        <Button type="button" variant="primary" fullWidth onClick={() => onApply(pending)}>
          {t('common.apply')}
        </Button>
      </div>
    </ResponsiveDialog>
  )
}
