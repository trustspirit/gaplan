/**
 * ResponseMatrix — shows who selected which time slot across all responded tasks in a batch.
 *
 * Rows = time slots (generated from the task's availableDateSlots)
 * Cols = presidents who received the task
 * Cell = ✓ if that president selected this slot
 * Admin clicks a cell → adminConfirmSchedule for that president's task + slot
 */
import { useState, Fragment } from 'react'
import { useTranslation } from 'react-i18next'
import dayjs from 'dayjs'
import 'dayjs/locale/ko'
dayjs.locale('ko')
import clsx from 'clsx'
import { toast } from 'sonner'
import { CheckCircle2 } from 'lucide-react'
import { adminConfirmSchedule } from '@/services/scheduleService'
import { computeInterviewSlots } from '@/services/availabilityService'
import type { Task, RespondedSlot } from '@/types'
import styles from './ResponseMatrix.module.scss'

interface Respondent {
  name: string
  task: Task
}

interface ResponseMatrixProps {
  tasks: Task[]                    // all tasks in the same batch (or same group)
  getPresidentName: (uid: string) => string
  onConfirmed?: () => void
}

function slotKey(date: string, startTime: string) {
  return `${date}_${startTime}`
}

function heatClass(ratio: number): string {
  if (ratio === 0) return styles.heat0
  if (ratio <= 0.33) return styles.heat1
  if (ratio <= 0.66) return styles.heat2
  return styles.heat3
}

// Assign a consistent color per respondent index
const PALETTE = [
  '#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6',
  '#ec4899','#14b8a6','#f97316','#6366f1','#84cc16',
]
function respondentColor(idx: number) {
  return PALETTE[idx % PALETTE.length]
}

export function ResponseMatrix({ tasks, getPresidentName, onConfirmed }: ResponseMatrixProps) {
  const { t } = useTranslation()
  const [confirming, setConfirming] = useState<string | null>(null)
  const [view, setView] = useState<'heatmap' | 'participant'>('heatmap')
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set())

  // Use the first task's availableDateSlots to build the time axis
  const refTask = tasks[0]
  const slots = refTask
    ? computeInterviewSlots(refTask.availableDateSlots ?? [], refTask.slotDurationMinutes ?? 60)
    : []

  const respondents: Respondent[] = tasks
    .filter(t => t.status === 'responded')
    .map(t => ({ name: getPresidentName(t.assignedTo), task: t }))

  if (slots.length === 0 || respondents.length === 0) {
    return (
      <div className={styles.empty}>{t('admin.noResponse')}</div>
    )
  }

  // Index: slotKey → set of respondent taskIds that selected it
  const slotResponders = new Map<string, Set<string>>()
  for (const r of respondents) {
    for (const s of (r.task.respondedSlots ?? []) as RespondedSlot[]) {
      const key = slotKey(s.date, s.startTime)
      if (!slotResponders.has(key)) slotResponders.set(key, new Set())
      slotResponders.get(key)!.add(r.task.id)
    }
  }

  const visibleRespondents = respondents.filter(r => !hiddenIds.has(r.task.id))
  const totalVisible = visibleRespondents.length

  async function handleConfirm(task: Task, slot: { date: string; startTime: string; endTime: string }) {
    const key = `${task.id}_${slot.date}_${slot.startTime}`
    setConfirming(key)
    try {
      const result = await adminConfirmSchedule({ taskId: task.id, slot })
      if (result.success) {
        toast.success(`${getPresidentName(task.assignedTo)} — ${dayjs(slot.date).format('M/D')} ${slot.startTime} 확정!`)
        onConfirmed?.()
      } else {
        toast.error(result.error ?? '확정에 실패했습니다.')
      }
    } catch {
      toast.error('오류가 발생했습니다.')
    } finally {
      setConfirming(null)
    }
  }

  function toggleHidden(id: string) {
    setHiddenIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // Group slots by date for header display
  const dates = [...new Set(slots.map(s => s.date))]

  return (
    <div className={styles.matrix}>
      {/* Participant legend */}
      <div className={styles.legend}>
        {respondents.map((r, idx) => {
          const color = respondentColor(idx)
          const hidden = hiddenIds.has(r.task.id)
          const completed = r.task.status === 'completed'
          return (
            <label
              key={r.task.id}
              className={clsx(styles.legendItem, hidden && styles.legendItemHidden)}
            >
              <input
                type="checkbox"
                checked={!hidden}
                onChange={() => toggleHidden(r.task.id)}
                style={{ accentColor: color }}
              />
              <span className={styles.legendDot} style={{ background: color }} />
              <span className={clsx(styles.legendName, hidden && styles.legendNameHidden)}>
                {r.name}
                {completed && <CheckCircle2 size={12} className={styles.completedIcon} />}
              </span>
            </label>
          )
        })}
      </div>

      {/* View toggle */}
      <div className={styles.viewToggle}>
        <button
          type="button"
          className={clsx(styles.viewBtn, view === 'heatmap' && styles.viewBtnActive)}
          onClick={() => setView('heatmap')}
        >🟩 {t('admin.availabilityHeatmap')}</button>
        <button
          type="button"
          className={clsx(styles.viewBtn, view === 'participant' && styles.viewBtnActive)}
          onClick={() => setView('participant')}
        >👤 {t('admin.availabilityByParticipant')}</button>
      </div>

      {/* Matrix table */}
      <div className={styles.tableWrap}>
        {view === 'heatmap' ? (
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={clsx(styles.th, styles.thTime)}>시간</th>
                {dates.map(date => (
                  <th key={date} className={clsx(styles.th, styles.thDate)}>
                    <span className={styles.dateMonth}>{dayjs(date).format('M월')}</span>
                    <span className={styles.dateDay}>{dayjs(date).date()}</span>
                    <span className={styles.dateDow}>{dayjs(date).format('ddd')}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...new Set(slots.map(s => s.startTime))].map(time => (
                <tr key={time}>
                  <td className={clsx(styles.td, styles.tdTime)}>{time}</td>
                  {dates.map(date => {
                    const slot = slots.find(s => s.date === date && s.startTime === time)
                    if (!slot) return <td key={date} className={clsx(styles.td, styles.tdEmpty)} />

                    const key = slotKey(date, time)
                    const allResponders = slotResponders.get(key) ?? new Set()
                    const visibleCount = [...allResponders].filter(id => {
                      const r = respondents.find(r => r.task.id === id)
                      return r && !hiddenIds.has(r.task.id)
                    }).length
                    const ratio = totalVisible > 0 ? visibleCount / totalVisible : 0

                    const slotRespondentList = respondents.filter(
                      r => allResponders.has(r.task.id) && !hiddenIds.has(r.task.id)
                    )

                    return (
                      <td key={date} className={clsx(styles.td, styles.tdSlot, heatClass(ratio))}>
                        <span className={styles.slotCount}>{visibleCount}/{totalVisible}</span>
                        <div className={styles.slotNames}>
                          {slotRespondentList.map((r, idx) => {
                            const isConfirming = confirming === `${r.task.id}_${date}_${time}`
                            const isCompleted = r.task.status === 'completed'
                            return (
                              <button
                                key={r.task.id}
                                type="button"
                                className={clsx(
                                  styles.slotName,
                                  isCompleted && styles.slotNameConfirmed,
                                  isConfirming && styles.slotNameConfirming,
                                )}
                                style={{ borderLeftColor: respondentColor(respondents.indexOf(r)), color: respondentColor(respondents.indexOf(r)) }}
                                onClick={() => !isCompleted && handleConfirm(r.task, { date, startTime: time, endTime: slot.endTime })}
                                title={isCompleted ? '이미 확정됨' : `${r.name} — 이 시간으로 확정`}
                                disabled={!!confirming || isCompleted}
                              >
                                {isCompleted ? '✓ ' : ''}{r.name}
                              </button>
                            )
                          })}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          // Participant view
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={clsx(styles.th, styles.thTime)}>날짜 / 시간</th>
                {visibleRespondents.map((r, idx) => (
                  <th key={r.task.id} className={clsx(styles.th, styles.thParticipant)}
                    style={{ color: respondentColor(respondents.indexOf(r)) }}>
                    {r.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dates.map(date => (
                <Fragment key={date}>
                  <tr className={styles.dateHeader}>
                    <td className={clsx(styles.td, styles.tdDateHeader)} colSpan={visibleRespondents.length + 1}>
                      {dayjs(date).format('M월 D일 (ddd)')}
                    </td>
                  </tr>
                  {slots.filter(s => s.date === date).map(slot => (
                    <tr key={`${date}_${slot.startTime}`}>
                      <td className={clsx(styles.td, styles.tdTime)}>{slot.startTime}</td>
                      {visibleRespondents.map(r => {
                        const selected = (r.task.respondedSlots as RespondedSlot[] ?? [])
                          .some(s => s.date === date && s.startTime === slot.startTime)
                        const color = respondentColor(respondents.indexOf(r))
                        const isCompleted = r.task.status === 'completed'
                        const isConfirming = confirming === `${r.task.id}_${date}_${slot.startTime}`
                        return (
                          <td key={r.task.id} className={clsx(styles.td, styles.tdCheck)}>
                            {selected ? (
                              <button
                                type="button"
                                className={clsx(styles.checkBtn, isCompleted && styles.checkBtnConfirmed)}
                                style={{ background: color + '33', color }}
                                onClick={() => !isCompleted && handleConfirm(r.task, slot)}
                                title={isCompleted ? '이미 확정됨' : '이 시간으로 확정'}
                                disabled={!!confirming || isCompleted}
                              >
                                {isCompleted ? '✓' : isConfirming ? '...' : '✓'}
                              </button>
                            ) : (
                              <span className={styles.checkEmpty} />
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
