import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import clsx from 'clsx'
import { WARDS } from '@/constants/regions'
import { Button, Input } from '@/components/ui'
import type { LastVisitEntry } from '@/utils/visitStats'
import type { VisitPlanItem } from '@/types'
import styles from './AddVisitPanel.module.scss'

interface Props {
  staleWards: LastVisitEntry[]   // 밀린 순 정렬됨, name = wardName
  onAdd: (item: Omit<VisitPlanItem, 'itemId' | 'scheduleId'>) => void
}

export function AddVisitPanel({ staleWards, onAdd }: Props) {
  const { t } = useTranslation()
  const [wardName, setWardName] = useState('')
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('10:00')
  const [endTime, setEndTime] = useState('13:00')

  const selectedWard = WARDS.find(w => w.name === wardName)
  const canAdd = !!selectedWard && !!date && startTime < endTime

  const handleAdd = () => {
    if (!selectedWard || !date) return
    onAdd({ unitId: selectedWard.unitId, wardName: selectedWard.name, date, startTime, endTime })
    setWardName('')
    setDate('')
  }

  return (
    <div className={styles.panel}>
      <h3 className={styles.title}>{t('visitPlan.addVisit')}</h3>

      <label className={styles.label}>{t('visitPlan.wardStaleFirst')}</label>
      <div className={styles.wardChips}>
        {staleWards.slice(0, 30).map(w => (
          <button
            key={w.id}
            type="button"
            className={clsx(styles.chip, styles[w.severity], wardName === w.name && styles.chipActive)}
            onClick={() => setWardName(w.name)}
          >
            {w.name} · {w.daysSince === null ? t('stats.neverVisited') : t('stats.daysAgo', { count: w.daysSince })}
          </button>
        ))}
      </div>

      <Input label={t('visitPlan.date')} type="date" value={date} onChange={e => setDate(e.target.value)} />
      <div className={styles.timeRow}>
        <Input label={t('visitPlan.startTime')} type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
        <Input label={t('visitPlan.endTime')} type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
      </div>

      <Button onClick={handleAdd} disabled={!canAdd}>{t('visitPlan.addToPlan')}</Button>
    </div>
  )
}
