import { useState } from 'react'
import dayjs from 'dayjs'
import 'dayjs/locale/ko'
dayjs.locale('ko')
import clsx from 'clsx'
import type { WardUnit } from '@/constants/regions'
import { Button } from '@/components/ui'
import styles from './WardAssigner.module.scss'

const DOW_KR = ['일', '월', '화', '수', '목', '금', '토']

interface WardAssignerProps {
  availableDates: string[]
  wards: WardUnit[]
  onSubmit: (assignments: { wardName: string; date: string }[]) => Promise<void>
  submitting: boolean
}

export function WardAssigner({ availableDates, wards, onSubmit, submitting }: WardAssignerProps) {
  // assignments: wardId → date (YYYY-MM-DD) | null
  const [assignments, setAssignments] = useState<Record<string, string | null>>(
    Object.fromEntries(wards.map(w => [w.id, null]))
  )

  const assignedCount = Object.values(assignments).filter(Boolean).length

  function assign(wardId: string, date: string) {
    setAssignments(prev => ({
      ...prev,
      [wardId]: prev[wardId] === date ? null : date,
    }))
  }

  const handleSubmit = async () => {
    const result = wards
      .filter(w => assignments[w.id])
      .map(w => ({ wardName: w.name, date: assignments[w.id]! }))
    await onSubmit(result)
  }

  if (availableDates.length === 0) {
    return <p className={styles.empty}>배정 가능한 일요일이 없습니다.</p>
  }

  return (
    <div className={styles.assigner}>
      <div className={styles.legend}>
        <span className={styles.legendNote}>각 와드/지부에 방문할 일요일을 선택하세요. 다시 클릭하면 취소됩니다.</span>
      </div>

      {/* Date headers */}
      <div className={styles.dateRow}>
        <div className={styles.wardCol} />
        {availableDates.map(d => {
          const dj = dayjs(d)
          return (
            <div key={d} className={styles.dateHeader}>
              <span className={styles.dateHeaderMonth}>{dj.format('M월')}</span>
              <span className={styles.dateHeaderDay}>{dj.date()}</span>
              <span className={styles.dateHeaderDow}>{DOW_KR[dj.day()]}</span>
            </div>
          )
        })}
      </div>

      {/* Ward rows */}
      <div className={styles.wardList}>
        {wards.map(ward => {
          const assigned = assignments[ward.id]
          return (
            <div key={ward.id} className={clsx(styles.wardRow, assigned && styles.wardRowAssigned)}>
              <div className={styles.wardName}>
                <span className={styles.wardNameText}>{ward.name}</span>
                {assigned && (
                  <span className={styles.wardAssignedBadge}>
                    {dayjs(assigned).format('M/D')}
                  </span>
                )}
              </div>
              <div className={styles.dateCells}>
                {availableDates.map(d => {
                  const isSelected = assigned === d
                  const isDateTaken = Object.entries(assignments).some(
                    ([wid, aDate]) => wid !== ward.id && aDate === d
                  )
                  return (
                    <button
                      key={d}
                      type="button"
                      className={clsx(
                        styles.dateCell,
                        isSelected && styles.dateCellSelected,
                        isDateTaken && !isSelected && styles.dateCellTaken,
                      )}
                      onClick={() => assign(ward.id, d)}
                      title={isDateTaken ? '이 날짜에 다른 와드가 배정됨' : dayjs(d).format('M월 D일')}
                    >
                      {isSelected ? '✓' : isDateTaken ? '·' : ''}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      <div className={styles.footer}>
        <span className={styles.footerCount}>
          {assignedCount > 0
            ? `${assignedCount}개 와드/지부 배정됨`
            : '배정된 와드/지부가 없습니다'}
        </span>
        <Button
          onClick={handleSubmit}
          loading={submitting}
          disabled={assignedCount === 0}
        >
          배정 제출
        </Button>
      </div>
    </div>
  )
}
