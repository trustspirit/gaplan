import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { httpsCallable } from 'firebase/functions'
import { useAtomValue } from 'jotai'
import { X } from 'lucide-react'
import { authUserAtom } from '@/store/authAtom'
import { functions } from '@/firebase'
import { useUsers } from '@/hooks/useUsers'
import { ALL_UNITS, getWardsByUnit } from '@/constants/regions'
import type { ScheduleType } from '@/types'
import { Button, Select, Input } from '@/components/ui'
import styles from './ScheduleFormModal.module.scss'

const adminCreateScheduleFn = httpsCallable(functions, 'adminCreateSchedule')

interface ScheduleFormModalProps {
  initialDate?: string
  onClose: () => void
  onSaved: () => void
}

export function ScheduleFormModal({ initialDate, onClose, onSaved }: ScheduleFormModalProps) {
  const user = useAtomValue(authUserAtom)!
  const { users } = useUsers()

  const [type, setType] = useState<ScheduleType>('ward_visit')
  const [seventyUid, setSeventyUid] = useState(user.role === 'seventy' ? user.uid : '')
  const [unitId, setUnitId] = useState('')
  const [wardName, setWardName] = useState('')
  const [presidentUid, setPresidentUid] = useState('')
  const [date, setDate] = useState(initialDate ?? '')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset ward and president when stake changes
  useEffect(() => { setWardName(''); setPresidentUid('') }, [unitId])

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  const seventyUsers = users.filter(u => u.role === 'seventy')
  const wardOptions = unitId ? getWardsByUnit(unitId).map(w => ({ value: w.name, label: w.name })) : []
  const unitOptions = ALL_UNITS.map(u => ({ value: u.id, label: u.name }))
  const seventyOptions = seventyUsers.map(u => ({ value: u.uid, label: u.name }))
  const presidentOptions = users
    .filter(u => u.role === 'president' && u.unitId === unitId && !!unitId)
    .map(u => ({ value: u.uid, label: u.name }))

  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setError(null)
    if (!date || !startTime || !endTime) { setError('날짜와 시간을 입력해주세요.'); return }
    if (startTime >= endTime) { setError('종료 시간은 시작 시간보다 늦어야 합니다.'); return }
    if (user.role === 'admin' && !seventyUid) { setError('담당 칠십인을 선택해주세요.'); return }
    if (type === 'ward_visit' && (!unitId || !wardName)) { setError('스테이크/지방부와 와드/지부를 선택해주세요.'); return }
    if (type === 'interview' && !unitId) { setError('스테이크/지방부를 선택해주세요.'); return }

    setSaving(true)
    try {
      await adminCreateScheduleFn({
        type,
        seventyUid,
        ...(unitId ? { unitId } : {}),
        ...(wardName ? { wardName } : {}),
        ...(presidentUid ? { presidentUid } : {}),
        date,
        startTime,
        endTime,
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      })
      onSaved()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const TYPE_TABS: Array<{ value: ScheduleType; label: string }> = [
    { value: 'ward_visit', label: '와드 방문' },
    { value: 'interview', label: '접견' },
    { value: 'meeting', label: '모임' },
  ]

  return createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.sheet} role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>새 일정 등록</h3>
          <button type="button" onClick={onClose} className={styles.closeBtn} aria-label="닫기">
            <X size={18} />
          </button>
        </div>

        {/* Type segmented control */}
        <div className={styles.segmented}>
          {TYPE_TABS.map(tab => (
            <button
              key={tab.value}
              type="button"
              className={type === tab.value ? styles.segBtnActive : styles.segBtn}
              onClick={() => { setType(tab.value); setUnitId(''); setWardName(''); setPresidentUid('') }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {error && <div className={styles.errorBanner}>{error}</div>}

        <form onSubmit={handleSave}>
          <div className={styles.fields}>
            {/* Seventy selector — admin only */}
            {user.role === 'admin' && (
              <Select
                label="담당 칠십인"
                value={seventyUid}
                onChange={e => setSeventyUid(e.target.value)}
                options={seventyOptions}
              />
            )}

            {/* Stake/District — required for ward_visit/interview, optional for meeting */}
            <Select
              label={type === 'meeting' ? '스테이크/지방부 (선택)' : '스테이크/지방부'}
              value={unitId}
              onChange={e => setUnitId(e.target.value)}
              options={unitOptions}
            />

            {/* Ward — ward_visit only */}
            {type === 'ward_visit' && (
              <Select
                label="와드/지부"
                value={wardName}
                onChange={e => setWardName(e.target.value)}
                options={wardOptions}
                disabled={!unitId}
              />
            )}

            {/* President — interview only, optional */}
            {type === 'interview' && (
              <Select
                label="회장 (선택)"
                value={presidentUid}
                onChange={e => setPresidentUid(e.target.value)}
                options={presidentOptions}
                disabled={!unitId}
              />
            )}

            <Input
              type="date"
              label="날짜"
              value={date}
              onChange={e => setDate(e.target.value)}
            />

            <div className={styles.timeRow}>
              <Input
                type="time"
                label="시작 시간"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
              />
              <Input
                type="time"
                label="종료 시간"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
              />
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>메모 (선택)</label>
              <textarea
                className={styles.textarea}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="메모를 입력하세요"
                rows={3}
              />
            </div>
          </div>

          <div className={styles.footer}>
            <Button variant="ghost" onClick={onClose} disabled={saving}>취소</Button>
            <Button type="submit" loading={saving}>일정 저장</Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
