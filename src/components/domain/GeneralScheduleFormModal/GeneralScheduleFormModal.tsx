import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { useAtomValue } from 'jotai'
import { authUserAtom } from '@/store/authAtom'
import {
  createGeneralSchedule,
  updateGeneralSchedule,
} from '@/services/generalScheduleService'
import { Button, Input, Select, Textarea } from '@/components/ui'
import type { GeneralSchedule, GeneralScheduleCategory } from '@/types'
import { ALL_UNITS, REGIONS } from '@/constants/regions'
import { acquireScrollLock, releaseScrollLock } from '@/utils/scrollLock'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import styles from './GeneralScheduleFormModal.module.scss'

interface Props {
  initialData?: GeneralSchedule
  initialDate?: string
  onClose: () => void
  onSaved: () => void
}

export function GeneralScheduleFormModal({ initialData, initialDate, onClose, onSaved }: Props) {
  const { t } = useTranslation()
  const user = useAtomValue(authUserAtom)!

  const [title, setTitle]             = useState(initialData?.title ?? '')
  const [date, setDate]               = useState(initialData?.date ?? initialDate ?? '')
  const [category, setCategory]       = useState<GeneralScheduleCategory>(initialData?.category ?? 'conference')
  const [startTime, setStartTime]     = useState(initialData?.startTime ?? '')
  const [endTime, setEndTime]         = useState(initialData?.endTime ?? '')
  const [description, setDescription] = useState(initialData?.description ?? '')
  const [isPublic, setIsPublic]       = useState(initialData?.isPublic ?? false)
  const [saving, setSaving]           = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const [targetRegionIds, setTargetRegionIds] = useState<string[]>(
    initialData?.targetRegionIds ?? []
  )
  const [targetUnitIds, setTargetUnitIds] = useState<string[]>(
    initialData?.targetUnitIds ?? []
  )

  const CATEGORY_OPTIONS = [
    { value: 'conference', label: t('generalSchedule.category.conference') },
    { value: 'fasting',    label: t('generalSchedule.category.fasting') },
    { value: 'other',      label: t('generalSchedule.category.other') },
  ]

  // Guard against losing a filled form to a stray backdrop tap / Escape
  const isDirty =
    title !== (initialData?.title ?? '') ||
    date !== (initialData?.date ?? initialDate ?? '') ||
    category !== (initialData?.category ?? 'conference') ||
    startTime !== (initialData?.startTime ?? '') ||
    endTime !== (initialData?.endTime ?? '') ||
    description !== (initialData?.description ?? '') ||
    isPublic !== (initialData?.isPublic ?? false) ||
    JSON.stringify(targetRegionIds) !== JSON.stringify(initialData?.targetRegionIds ?? []) ||
    JSON.stringify(targetUnitIds) !== JSON.stringify(initialData?.targetUnitIds ?? [])
  const requestClose = () => {
    if (isDirty && !window.confirm(t('common.discardChanges'))) return
    onClose()
  }

  const modalRef = useRef<HTMLDivElement>(null)
  useFocusTrap(modalRef, true, requestClose)
  useEffect(() => {
    acquireScrollLock()
    return releaseScrollLock
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !date) { setError(t('generalSchedule.errorTitleDateRequired')); return }
    if (startTime && endTime && startTime >= endTime) {
      setError(t('admin.scheduleTimeError'))
      return
    }
    setSaving(true)
    setError(null)
    try {
      const payload = {
        title:       title.trim(),
        date,
        category,
        startTime:   startTime || undefined,
        endTime:     endTime || undefined,
        description: description.trim() || undefined,
        isPublic:    user.role === 'admin' ? isPublic : false,
        targetRegionIds: user.role === 'admin' ? targetRegionIds : [],
        targetUnitIds,
        createdBy:   user.uid,
      }
      if (initialData) {
        await updateGeneralSchedule(initialData.id, payload)
      } else {
        await createGeneralSchedule(payload)
      }
      toast.success(t('generalSchedule.savedSuccess'))
      onSaved()
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? t('common.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  return createPortal(
    <div className={styles.overlay} onClick={requestClose}>
      <div
        ref={modalRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        className={styles.modal}
        onClick={e => e.stopPropagation()}
      >
        <div className={styles.header}>
          <h2 className={styles.title}>
            {initialData ? t('generalSchedule.editTitle') : t('generalSchedule.newTitle')}
          </h2>
          <button type="button" className={styles.closeBtn} onClick={requestClose} aria-label={t('common.close')}><X size={18} /></button>
        </div>

        <form className={styles.form} onSubmit={handleSave}>
          <Input
            label={t('generalSchedule.titleLabel')}
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
            maxLength={100}
          />
          <Input
            label={t('generalSchedule.dateLabel')}
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            required
          />
          <Select
            label={t('generalSchedule.categoryLabel')}
            value={category}
            onChange={e => setCategory(e.target.value as GeneralScheduleCategory)}
            options={CATEGORY_OPTIONS}
          />
          <div className={styles.timeRow}>
            <Input
              label={t('generalSchedule.startTimeLabel')}
              type="time"
              value={startTime}
              onChange={e => setStartTime(e.target.value)}
            />
            <Input
              label={t('generalSchedule.endTimeLabel')}
              type="time"
              value={endTime}
              onChange={e => setEndTime(e.target.value)}
            />
          </div>
          <Textarea
            label={t('generalSchedule.descriptionLabel')}
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
            maxLength={500}
          />
          {user.role === 'admin' && (
            <label className={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={isPublic}
                onChange={e => setIsPublic(e.target.checked)}
              />
              <span>{t('generalSchedule.isPublicLabel')}</span>
            </label>
          )}
          {/* 지역 타겟 (admin만) */}
          {user.role === 'admin' && (
            <div className={styles.targetSection}>
              <p className={styles.targetLabel}>
                {t('generalSchedule.targetRegionLabel')} <span className={styles.targetHint}>{t('generalSchedule.targetHint')}</span>
              </p>
              <div className={styles.checkGroup}>
                {REGIONS.map(r => (
                  <label key={r.id} className={styles.checkItem}>
                    <input
                      type="checkbox"
                      checked={targetRegionIds.includes(r.id)}
                      onChange={e => setTargetRegionIds(prev =>
                        e.target.checked ? [...prev, r.id] : prev.filter(x => x !== r.id)
                      )}
                    />
                    {r.name}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* 스테이크/지방부 타겟 */}
          <div className={styles.targetSection}>
            <p className={styles.targetLabel}>
              {t('generalSchedule.targetUnitLabel')} <span className={styles.targetHint}>{t('generalSchedule.targetHint')}</span>
            </p>
            <div className={styles.checkGroup}>
              {ALL_UNITS
                .filter(u =>
                  user.role === 'admin'
                    ? true
                    : (user.regionIds?.length ? user.regionIds : user.regionId ? [user.regionId] : []).includes(u.regionId ?? '')
                )
                .map(u => (
                  <label key={u.id} className={styles.checkItem}>
                    <input
                      type="checkbox"
                      checked={targetUnitIds.includes(u.id)}
                      onChange={e => setTargetUnitIds(prev =>
                        e.target.checked ? [...prev, u.id] : prev.filter(x => x !== u.id)
                      )}
                    />
                    {u.name.ko}
                  </label>
                ))}
            </div>
          </div>

          {error && <p className={styles.error}>{error}</p>}
          <div className={styles.footer}>
            <Button type="button" variant="secondary" onClick={requestClose}>{t('common.cancel')}</Button>
            <Button type="submit" loading={saving}>{t('generalSchedule.saveBtn')}</Button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  )
}
