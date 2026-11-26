import { useEffect, useMemo, useRef, useState } from 'react'
import dayjs from 'dayjs'
import { useParams, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { HttpsCallable } from 'firebase/functions'
import { publicCallable } from '@/services/publicFunctions'
import { usePublicTask } from './usePublicTask'
import { SlotSelectionGrid } from './SlotSelectionGrid'
import { splitDateSlots } from './respondSlots'
import styles from './RespondPage.module.scss'

interface SelectedSlot {
  date: string
  startTime: string
  endTime: string
}

interface SubmitAvailabilityAnonRequest {
  taskId: string
  token: string
  respondedSlots: SelectedSlot[]
}

interface SubmitWardAssignmentsAnonRequest {
  taskId: string
  token: string
  wardAssignments: Array<{ wardName: string; date: string }>
}

let submitAvailabilityAnonFn: HttpsCallable<SubmitAvailabilityAnonRequest, unknown> | null = null
let submitWardAssignmentsAnonFn: HttpsCallable<SubmitWardAssignmentsAnonRequest, unknown> | null =
  null

function getSubmitAvailabilityAnonFn() {
  if (!submitAvailabilityAnonFn) {
    submitAvailabilityAnonFn = publicCallable<SubmitAvailabilityAnonRequest, unknown>(
      'submitAvailabilityAnon',
    )
  }
  return submitAvailabilityAnonFn
}

function getSubmitWardAssignmentsAnonFn() {
  if (!submitWardAssignmentsAnonFn) {
    submitWardAssignmentsAnonFn = publicCallable<SubmitWardAssignmentsAnonRequest, unknown>(
      'submitWardAssignmentsAnon',
    )
  }
  return submitWardAssignmentsAnonFn
}

export default function RespondPage() {
  const { t, i18n } = useTranslation()
  const { taskId } = useParams<{ taskId: string }>()
  const [search] = useSearchParams()
  const token = search.get('t')

  const { task, loading, error, retry } = usePublicTask(taskId, token)

  const [selectedSlots, setSelectedSlots] = useState<SelectedSlot[]>([])
  const [wardDateMap, setWardDateMap] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // External respondents keep their own language preference (same key as the
  // public schedule page)
  useEffect(() => {
    const saved = localStorage.getItem('publicLang')
    if (saved && saved !== i18n.language) {
      i18n.changeLanguage(saved)
    }
  }, [i18n])

  // 이미 낸 응답으로 채운다 — 다시 연 회장이 빈 화면에서 처음부터 고르다 예전 응답을 덮어쓰지 않게.
  const prefilled = useRef(false)
  useEffect(() => {
    if (!task || prefilled.current) return
    prefilled.current = true
    setSelectedSlots(task.respondedSlots ?? [])
    setWardDateMap(Object.fromEntries((task.wardAssignments ?? []).map((a) => [a.wardName, a.date])))
  }, [task])

  const dateSlots = useMemo(
    () => (task ? splitDateSlots(task.availableDateSlots, task.slotDurationMinutes) : []),
    [task],
  )

  const toggleLang = () => {
    const next = i18n.language === 'ko' ? 'en' : 'ko'
    i18n.changeLanguage(next)
    localStorage.setItem('publicLang', next)
  }

  const handleToggleSlot = (slot: SelectedSlot) => {
    const key = `${slot.date}_${slot.startTime}_${slot.endTime}`
    setSelectedSlots((prev) => {
      const exists = prev.some((s) => `${s.date}_${s.startTime}_${s.endTime}` === key)
      return exists
        ? prev.filter((s) => `${s.date}_${s.startTime}_${s.endTime}` !== key)
        : [...prev, slot]
    })
  }

  const handleSubmit = async () => {
    if (!taskId || !token || !task) return
    setSubmitError(null)
    setSubmitting(true)
    try {
      if (task.type === 'select_interview') {
        await getSubmitAvailabilityAnonFn()({ taskId, token, respondedSlots: selectedSlots })
      } else {
        const wardAssignments = Object.entries(wardDateMap)
          .filter(([, date]) => date)
          .map(([wardName, date]) => ({ wardName, date }))
        await getSubmitWardAssignmentsAnonFn()({ taskId, token, wardAssignments })
      }
      setSuccess(true)
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : t('respond.submitErrorFallback'))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className={styles.loadingBox}>{t('respond.loading')}</div>
  }

  if (error || !task) {
    const errorText =
      error === 'invalid-link'
        ? t('respond.invalidLink')
        : error === 'load-failed'
          ? t('respond.loadFailed')
          : (error ?? t('respond.notFound'))
    const canRetry = error !== 'invalid-link'
    return (
      <div className={styles.page}>
        <div className={styles.content}>
          <div className={styles.errorBanner}>{errorText}</div>
          {canRetry && (
            <button type="button" className={styles.retryBtn} onClick={retry}>
              {t('common.retry')}
            </button>
          )}
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className={styles.page}>
        <div className={styles.successBox}>
          <div className={styles.successIcon}>✅</div>
          <div className={styles.successTitle}>{t('respond.successTitle')}</div>
          <div className={styles.successSub}>{t('respond.successSub')}</div>
        </div>
      </div>
    )
  }

  const isInterview = task.type === 'select_interview'
  // 서버가 준 스테이크의 와드. 예전 서버는 주지 않는다 — 그때는 이미 낸 응답의 와드만 보인다.
  const wardNames = task.wards?.length ? task.wards : task.wardAssignments.map((a) => a.wardName)
  const canSubmit = isInterview
    ? selectedSlots.length > 0
    : Object.values(wardDateMap).some((d) => d)

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button type="button" className={styles.langToggle} onClick={toggleLang}>
          {i18n.language === 'ko' ? 'EN' : '한'}
        </button>
        <div className={styles.headerTitle}>{t('respond.title')}</div>
        <div className={styles.headerSub}>{t('respond.subtitle')}</div>
      </div>

      <div className={styles.content}>
        <div className={styles.taskCard}>
          <div className={styles.taskTitle}>{task.title || t('respond.taskFallbackTitle')}</div>
          {task.note && <div className={styles.taskNote}>{task.note}</div>}
        </div>

        {isInterview ? (
          <>
            <div className={styles.sectionTitle}>
              {t('respond.selectTimesTitle')}
              {selectedSlots.length > 0 && (
                <span className={styles.selectedCount}>
                  {t('respond.selectedCount', { count: selectedSlots.length })}
                </span>
              )}
            </div>
            <SlotSelectionGrid
              availableDateSlots={dateSlots}
              selectedSlots={selectedSlots}
              onToggle={handleToggleSlot}
            />
          </>
        ) : (
          <>
            <div className={styles.sectionTitle}>{t('respond.selectWardDatesTitle')}</div>
            <div className={styles.wardList}>
              {wardNames.map((wardName) => (
                <div key={wardName} className={styles.wardItem}>
                  <span className={styles.wardName}>{wardName}</span>
                  <select
                    className={styles.wardDateSelect}
                    aria-label={wardName}
                    value={wardDateMap[wardName] ?? ''}
                    onChange={(e) =>
                      setWardDateMap((prev) => ({ ...prev, [wardName]: e.target.value }))
                    }
                  >
                    <option value="">{t('respond.dateSelect')}</option>
                    {task.availableDates.map((date) => (
                      <option key={date} value={date}>
                        {dayjs(date).format(t('respond.dateFormat'))}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </>
        )}

        <div className={styles.submitSection}>
          {/* 보내기 단추 바로 위에 — 긴 목록을 내려와 누른 사람도 실패를 본다 */}
          {submitError && (
            <div className={styles.errorBanner} role="alert">
              {submitError}
            </div>
          )}
          <button
            type="button"
            className={styles.submitBtn}
            disabled={!canSubmit || submitting}
            onClick={handleSubmit}
          >
            {submitting ? t('respond.submitting') : t('respond.submit')}
          </button>
        </div>
      </div>
    </div>
  )
}
