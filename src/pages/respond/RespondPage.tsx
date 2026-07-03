import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { HttpsCallable } from 'firebase/functions'
import { publicCallable } from '@/services/publicFunctions'
import { usePublicTask } from './usePublicTask'
import { SlotSelectionGrid } from './SlotSelectionGrid'
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
let submitWardAssignmentsAnonFn: HttpsCallable<SubmitWardAssignmentsAnonRequest, unknown> | null = null

function getSubmitAvailabilityAnonFn() {
  if (!submitAvailabilityAnonFn) {
    submitAvailabilityAnonFn = publicCallable<SubmitAvailabilityAnonRequest, unknown>('submitAvailabilityAnon')
  }
  return submitAvailabilityAnonFn
}

function getSubmitWardAssignmentsAnonFn() {
  if (!submitWardAssignmentsAnonFn) {
    submitWardAssignmentsAnonFn = publicCallable<SubmitWardAssignmentsAnonRequest, unknown>('submitWardAssignmentsAnon')
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

  const toggleLang = () => {
    const next = i18n.language === 'ko' ? 'en' : 'ko'
    i18n.changeLanguage(next)
    localStorage.setItem('publicLang', next)
  }

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
      error === 'invalid-link' ? t('respond.invalidLink')
      : error === 'load-failed' ? t('respond.loadFailed')
      : error ?? t('respond.notFound')
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
  const canSubmit = isInterview
    ? selectedSlots.length > 0
    : Object.values(wardDateMap).some(d => d)

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

        {submitError && <div className={styles.errorBanner}>{submitError}</div>}

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
              availableDateSlots={task.availableDateSlots}
              selectedSlots={selectedSlots}
              onToggle={handleToggleSlot}
            />
          </>
        ) : (
          <>
            <div className={styles.sectionTitle}>{t('respond.selectWardDatesTitle')}</div>
            <div className={styles.wardList}>
              {task.wardAssignments.map(({ wardName }) => (
                <div key={wardName} className={styles.wardItem}>
                  <span className={styles.wardName}>{wardName}</span>
                  <select
                    className={styles.wardDateSelect}
                    value={wardDateMap[wardName] ?? ''}
                    onChange={e => setWardDateMap(prev => ({ ...prev, [wardName]: e.target.value }))}
                  >
                    <option value="">{t('respond.dateSelect')}</option>
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
            {submitting ? t('respond.submitting') : t('respond.submit')}
          </button>
        </div>
      </div>
    </div>
  )
}
