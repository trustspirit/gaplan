import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import dayjs from 'dayjs'
import clsx from 'clsx'
import { AlertTriangle } from 'lucide-react'
import type { WardUnit } from '@/constants/regions'
import { Button } from '@/components/ui'
import styles from './WardAssigner.module.scss'

const DOW_KR = ['일', '월', '화', '수', '목', '금', '토']

interface WardAssignerProps {
  availableDates: string[]
  wards: WardUnit[]
  note?: string
  /** Pre-fill with previously submitted ward assignments (for editing responded tasks) */
  initialAssignments?: { wardName: string; date: string }[]
  onSubmit: (assignments: { wardName: string; date: string }[]) => Promise<void>
  submitting: boolean
}

interface Warning {
  type: 'conflict' | 'missing'
  label: string
  detail: string
}

export function WardAssigner({ availableDates, wards, note, initialAssignments, onSubmit, submitting }: WardAssignerProps) {
  const { t } = useTranslation()
  const [assignments, setAssignments] = useState<Record<string, string | null>>(() => {
    // Pre-fill from previously submitted assignments if editing a responded task
    const base = Object.fromEntries(wards.map(w => [w.id, null as string | null]))
    if (initialAssignments) {
      for (const { wardName, date } of initialAssignments) {
        const ward = wards.find(w => w.name.ko === wardName)
        if (ward) base[ward.id] = date
      }
    }
    return base
  })
  const [warnings, setWarnings] = useState<Warning[]>([])
  const [pendingAssignments, setPendingAssignments] = useState<{ wardName: string; date: string }[] | null>(null)

  const assignedCount = Object.values(assignments).filter(Boolean).length

  function assign(wardId: string, date: string) {
    setAssignments(prev => ({
      ...prev,
      [wardId]: prev[wardId] === date ? null : date,
    }))
    // Clear any pending warning state when user changes assignments
    setWarnings([])
    setPendingAssignments(null)
  }

  function buildResult(): { wardName: string; date: string }[] {
    return wards
      .filter(w => assignments[w.id])
      .map(w => ({ wardName: w.name.ko, date: assignments[w.id]! }))
  }

  function detectWarnings(result: { wardName: string; date: string }[]): Warning[] {
    const found: Warning[] = []

    // 1. Same-date conflicts
    const dateToWards: Record<string, string[]> = {}
    for (const { wardName, date } of result) {
      if (!dateToWards[date]) dateToWards[date] = []
      dateToWards[date].push(wardName)
    }
    for (const [date, names] of Object.entries(dateToWards)) {
      if (names.length > 1) {
        found.push({
          type: 'conflict',
          label: `${dayjs(date).format('M/D (ddd)')} — 날짜 중복`,
          detail: names.join(', '),
        })
      }
    }

    // 2. Unassigned wards
    const unassigned = wards.filter(w => !assignments[w.id]).map(w => w.name.ko)
    if (unassigned.length > 0) {
      found.push({
        type: 'missing',
        label: `${unassigned.length}개 와드/지부 미배정`,
        detail: unassigned.join(', '),
      })
    }

    return found
  }

  async function handleSubmit() {
    const result = buildResult()
    const found = detectWarnings(result)

    if (found.length > 0 && !pendingAssignments) {
      setWarnings(found)
      setPendingAssignments(result)
      return
    }

    await onSubmit(pendingAssignments ?? result)
    setWarnings([])
    setPendingAssignments(null)
  }

  function handleCancelWarning() {
    setWarnings([])
    setPendingAssignments(null)
  }

  if (availableDates.length === 0) {
    return <p className={styles.empty}>{t('ward.noSundaysAvailable')}</p>
  }

  return (
    <div className={styles.assigner}>
      {/* Admin note */}
      {note && (
        <div className={styles.note}>
          <span className={styles.noteLabel}>{t('task.noteLabel', { defaultValue: '관리자 메모' })}</span>
          <p className={styles.noteText}>{note}</p>
        </div>
      )}

      <div className={styles.legend}>
        <span className={styles.legendNote}>{t('ward.assignHint')}</span>
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
        {wards.length === 0 ? (
          <p className={styles.emptyWards}>{t('ward.noWards', { defaultValue: '소속 와드/지부 정보가 없습니다.' })}</p>
        ) : (
          wards.map(ward => {
            const assigned = assignments[ward.id]
            return (
              <div key={ward.id} className={clsx(styles.wardRow, assigned && styles.wardRowAssigned)}>
                <div className={styles.wardName}>
                  <span className={styles.wardNameText}>{ward.name.ko}</span>
                  {assigned && (
                    <span className={styles.wardAssignedBadge}>
                      {dayjs(assigned).format('M/D')}
                    </span>
                  )}
                </div>
                <div className={styles.dateCells}>
                  {availableDates.map(d => {
                    const isSelected = assigned === d
                    const otherWardOnDate = wards.find(
                      w => w.id !== ward.id && assignments[w.id] === d
                    )
                    return (
                      <button
                        key={d}
                        type="button"
                        className={clsx(
                          styles.dateCell,
                          isSelected && styles.dateCellSelected,
                          otherWardOnDate && !isSelected && styles.dateCellShared,
                        )}
                        onClick={() => assign(ward.id, d)}
                        title={
                          otherWardOnDate
                            ? `${otherWardOnDate.name.ko} — ${t('ward.takenDateHint')}`
                            : dayjs(d).format('M월 D일')
                        }
                      >
                        {isSelected ? '✓' : otherWardOnDate ? '!' : ''}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Warning box (conflicts + missing) */}
      {warnings.length > 0 && (
        <div className={styles.conflictBox}>
          <div className={styles.conflictHeader}>
            <AlertTriangle size={16} className={styles.conflictIcon} />
            <span className={styles.conflictTitle}>{t('ward.warningTitle', { defaultValue: '제출 전 확인하세요' })}</span>
          </div>
          <ul className={styles.conflictList}>
            {warnings.map((w, i) => (
              <li key={i} className={styles.conflictItem}>
                <span className={clsx(
                  styles.conflictDate,
                  w.type === 'missing' && styles.conflictDateMissing,
                )}>{w.label}</span>
                <span className={styles.conflictWards}>{w.detail}</span>
              </li>
            ))}
          </ul>
          <p className={styles.conflictQuestion}>{t('ward.confirmAnyway', { defaultValue: '그래도 이 배정으로 제출하시겠습니까?' })}</p>
          <div className={styles.conflictActions}>
            <Button variant="secondary" onClick={handleCancelWarning}>← {t('common.cancel')} ({t('ward.backToEdit', { defaultValue: '다시 수정' })})</Button>
            <Button onClick={handleSubmit} loading={submitting}>{t('ward.confirmAndSubmit', { defaultValue: '확인 후 제출' })}</Button>
          </div>
        </div>
      )}

      {/* Footer */}
      {warnings.length === 0 && (
        <div className={styles.footer}>
          <span className={styles.footerCount}>
            {assignedCount > 0
              ? t('ward.assignedCount', { count: assignedCount })
              : t('ward.noneAssigned')}
          </span>
          <Button
            onClick={handleSubmit}
            loading={submitting}
            disabled={assignedCount === 0}
          >
            {t('ward.submitAssignment')}
          </Button>
        </div>
      )}
    </div>
  )
}
