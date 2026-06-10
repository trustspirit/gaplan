import { useState, useEffect } from 'react'
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
import { Button, Input, Select } from '@/components/ui'
import type { GeneralSchedule, GeneralScheduleCategory } from '@/types'
import styles from './GeneralScheduleFormModal.module.scss'

const CATEGORY_OPTIONS = [
  { value: 'conference', label: '대회/행사' },
  { value: 'fasting',    label: '금식' },
  { value: 'other',      label: '기타' },
]

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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !date) { setError('제목과 날짜는 필수입니다.'); return }
    if (startTime && endTime && startTime >= endTime) {
      setError('종료 시간은 시작 시간보다 늦어야 합니다.')
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
      setError((err as { message?: string })?.message ?? '저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  return createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>
            {initialData ? t('generalSchedule.editTitle') : t('generalSchedule.newTitle')}
          </h2>
          <button type="button" className={styles.closeBtn} onClick={onClose}><X size={18} /></button>
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
          <div className={styles.descriptionField}>
            <label className={styles.label}>{t('generalSchedule.descriptionLabel')}</label>
            <textarea
              className={styles.textarea}
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              maxLength={500}
            />
          </div>
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
          {error && <p className={styles.error}>{error}</p>}
          <div className={styles.footer}>
            <Button type="button" variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
            <Button type="submit" loading={saving}>{t('generalSchedule.saveBtn')}</Button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  )
}
