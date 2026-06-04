import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import dayjs from 'dayjs'
import 'dayjs/locale/ko'
dayjs.locale('ko')
import clsx from 'clsx'
import type { WardUnit } from '@/constants/regions'
import { Button } from '@/components/ui'
import styles from './WardAssigner.module.scss'

interface WardRow {
  wardId: string
  date: string
}

interface WardAssignerProps {
  availableDates: string[]   // task.availableDates (Sundays)
  wards: WardUnit[]          // wards for this stake/district
  onSubmit: (assignments: { wardName: string; date: string }[]) => Promise<void>
  submitting: boolean
}

export function WardAssigner({ availableDates, wards, onSubmit, submitting }: WardAssignerProps) {
  const [rows, setRows] = useState<WardRow[]>([
    { wardId: '', date: availableDates[0] ?? '' },
  ])

  function addRow() {
    setRows(prev => [...prev, { wardId: '', date: availableDates[0] ?? '' }])
  }

  function removeRow(idx: number) {
    setRows(prev => prev.filter((_, i) => i !== idx))
  }

  function setRowWard(idx: number, wardId: string) {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, wardId } : r))
  }

  function setRowDate(idx: number, date: string) {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, date } : r))
  }

  const isValid = rows.length > 0 && rows.every(r => r.wardId && r.date)

  const handleSubmit = async () => {
    if (!isValid) return
    const assignments = rows.map(r => ({
      wardName: wards.find(w => w.id === r.wardId)?.name ?? r.wardId,
      date: r.date,
    }))
    await onSubmit(assignments)
  }

  return (
    <div className={styles.assigner}>
      <p className={styles.hint}>각 와드/지부에 방문 날짜를 배정하세요.</p>

      {rows.map((row, idx) => (
        <div key={idx} className={styles.row}>
          <select
            className={styles.wardSelect}
            value={row.wardId}
            onChange={e => setRowWard(idx, e.target.value)}
          >
            <option value="">와드/지부 선택</option>
            {wards.map(w => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>

          <div className={styles.dateBtns}>
            {availableDates.map(d => (
              <button
                key={d}
                type="button"
                className={clsx(styles.dateBtn, row.date === d && styles.dateBtnSelected)}
                onClick={() => setRowDate(idx, d)}
              >
                {dayjs(d).format('M/D')}
              </button>
            ))}
          </div>

          {rows.length > 1 && (
            <button type="button" className={styles.removeBtn} onClick={() => removeRow(idx)}>
              <Trash2 size={14} />
            </button>
          )}
        </div>
      ))}

      <button type="button" className={styles.addBtn} onClick={addRow}>
        <Plus size={14} />
        와드/지부 추가
      </button>

      <Button
        fullWidth
        onClick={handleSubmit}
        loading={submitting}
        disabled={!isValid}
        className={styles.submitBtn}
      >
        배정 제출 ({rows.filter(r => r.wardId && r.date).length}개)
      </Button>
    </div>
  )
}
