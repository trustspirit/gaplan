import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useIsMobile } from '@/hooks/useIsMobile'
import { BottomSheet } from '@/components/ui/BottomSheet/BottomSheet'
import { Modal } from '@/components/ui/Modal/Modal'
import { Button, Input } from '@/components/ui'
import type { Leader } from '@/types/leader'
import type { LeaderPatch } from '@/services/leaderService'
import styles from './LeaderEditSheet.module.scss'

interface LeaderEditSheetProps {
  leader: Leader | null
  onClose: () => void
  onSave: (patch: LeaderPatch) => Promise<void>
}

export function LeaderEditSheet({ leader, onClose, onSave }: LeaderEditSheetProps) {
  const { t } = useTranslation()
  const isMobile = useIsMobile()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [nameError, setNameError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // 다른 지도자를 열 때마다 폼을 그 사람 값으로 되돌린다.
  // id로만 키를 잡는다 — 부모가 같은 지도자를 가리키는 새 객체를
  // 넘길 때마다(참조만 바뀐 리렌더) 폼을 리셋하면 입력 중이던 값이
  // 날아간다. leader.name/phone/email은 리셋 시점에만 읽으면 되므로
  // 의존성에 넣지 않는다.
  useEffect(() => {
    if (!leader) return
    setName(leader.name)
    setPhone(leader.phone ?? '')
    setEmail(leader.email ?? '')
    setNameError(null)
    setSaveError(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leader?.id])

  if (!leader) return null

  const handleSave = async () => {
    if (!name.trim()) {
      setNameError(t('leaders.nameRequired'))
      setSaveError(null)
      return
    }
    setNameError(null)
    setSaveError(null)
    setSaving(true)
    try {
      await onSave({ name, phone, email })
      onClose()
    } catch (err) {
      // 시트를 닫지 않는다. 입력값이 날아가면 재시도할 수 없다.
      console.error('[LeaderEditSheet] save failed:', err)
      setSaveError(t('leaders.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  const content = (
    <div className={styles.form}>
      <div className={styles.meta}>
        <span className={styles.roleBadge}>{leader.role}</span>
        <span className={styles.unitName}>{leader.unitNameKo}</span>
      </div>

      <Input
        label={t('leaders.name')}
        value={name}
        error={nameError ?? undefined}
        onChange={e => setName(e.target.value)}
      />
      <Input
        label={t('leaders.phone')}
        type="tel"
        value={phone}
        onChange={e => setPhone(e.target.value)}
      />
      <Input
        label={t('leaders.email')}
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
      />

      {saveError && (
        <p className={styles.saveError} role="alert">{saveError}</p>
      )}

      <div className={styles.actions}>
        <Button variant="ghost" fullWidth onClick={onClose} disabled={saving}>
          {t('leaders.cancel')}
        </Button>
        <Button variant="primary" fullWidth onClick={handleSave} loading={saving}>
          {t('leaders.save')}
        </Button>
      </div>
    </div>
  )

  const title = t('leaders.edit')

  return isMobile ? (
    <BottomSheet open onClose={onClose} title={title}>{content}</BottomSheet>
  ) : (
    <Modal open onClose={onClose} title={title}>{content}</Modal>
  )
}
