import { useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { httpsCallable } from 'firebase/functions'
import { functions } from '@/firebase'
import { usePublicTask } from './usePublicTask'
import { SlotSelectionGrid } from './SlotSelectionGrid'
import styles from './RespondPage.module.scss'

const submitAvailabilityAnonFn = httpsCallable(functions, 'submitAvailabilityAnon')
const submitWardAssignmentsAnonFn = httpsCallable(functions, 'submitWardAssignmentsAnon')

interface SelectedSlot {
  date: string
  startTime: string
  endTime: string
}

export default function RespondPage() {
  const { taskId } = useParams<{ taskId: string }>()
  const [search] = useSearchParams()
  const token = search.get('t')

  const { task, loading, error } = usePublicTask(taskId, token)

  const [selectedSlots, setSelectedSlots] = useState<SelectedSlot[]>([])
  const [wardDateMap, setWardDateMap] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleToggleSlot = (slot: SelectedSlot) => {
    const key = `${slot.date}_${slot.startTime}_${slot.endTime}`
    setSelectedSlots(prev => {
      const exists = prev.some(s => `${s.date}_${s.startTime}_${s.endTime}` === key)
      return exists ? prev.filter(s => `${s.date}_${s.startTime}_${s.endTime}` !== key) : [...prev, slot]
    })
  }

  const handleSubmit = async () => {
    if (!taskId || !token || !task) return
    setSubmitError(null)
    setSubmitting(true)
    try {
      if (task.type === 'select_interview') {
        await submitAvailabilityAnonFn({ taskId, token, respondedSlots: selectedSlots })
      } else {
        const wardAssignments = Object.entries(wardDateMap)
          .filter(([, date]) => date)
          .map(([wardName, date]) => ({ wardName, date }))
        await submitWardAssignmentsAnonFn({ taskId, token, wardAssignments })
      }
      setSuccess(true)
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : '제출 중 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className={styles.loadingBox}>불러오는 중...</div>
  }

  if (error || !task) {
    return (
      <div className={styles.page}>
        <div className={styles.content}>
          <div className={styles.errorBanner}>{error ?? '태스크를 찾을 수 없습니다.'}</div>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className={styles.page}>
        <div className={styles.successBox}>
          <div className={styles.successIcon}>✅</div>
          <div className={styles.successTitle}>응답이 제출되었습니다</div>
          <div className={styles.successSub}>담당자에게 응답이 전달되었습니다.</div>
        </div>
      </div>
    )
  }

  const isInterview = task.type === 'select_interview'
  const canSubmit = isInterview
    ? selectedSlots.length > 0
    : Object.values(wardDateMap).some(d => d)

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerTitle}>일정 응답</div>
        <div className={styles.headerSub}>로그인 없이 응답할 수 있습니다</div>
      </div>

      <div className={styles.content}>
        <div className={styles.taskCard}>
          <div className={styles.taskTitle}>{task.title || '일정 요청'}</div>
          {task.note && <div className={styles.taskNote}>{task.note}</div>}
        </div>

        {submitError && <div className={styles.errorBanner}>{submitError}</div>}

        {isInterview ? (
          <>
            <div className={styles.sectionTitle}>가능한 시간을 선택하세요</div>
            <SlotSelectionGrid
              availableDateSlots={task.availableDateSlots}
              selectedSlots={selectedSlots}
              onToggle={handleToggleSlot}
            />
          </>
        ) : (
          <>
            <div className={styles.sectionTitle}>각 와드의 방문 날짜를 선택하세요</div>
            <div className={styles.wardList}>
              {task.wardAssignments.map(({ wardName }) => (
                <div key={wardName} className={styles.wardItem}>
                  <span className={styles.wardName}>{wardName}</span>
                  <select
                    className={styles.wardDateSelect}
                    value={wardDateMap[wardName] ?? ''}
                    onChange={e => setWardDateMap(prev => ({ ...prev, [wardName]: e.target.value }))}
                  >
                    <option value="">날짜 선택</option>
                    {task.availableDates.map(date => (
                      <option key={date} value={date}>{date}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </>
        )}

        <div className={styles.submitSection}>
          <button
            type="button"
            className={styles.submitBtn}
            disabled={!canSubmit || submitting}
            onClick={handleSubmit}
          >
            {submitting ? '제출 중...' : '응답 제출'}
          </button>
        </div>
      </div>
    </div>
  )
}
