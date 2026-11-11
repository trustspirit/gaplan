import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button/Button'
import { ResponsiveDialog } from '@/components/ui/ResponsiveDialog/ResponsiveDialog'
import styles from './ConfirmSheet.module.scss'

interface ConfirmSheetProps {
  open: boolean
  /** 묻는 말. 다이얼로그의 제목이자 접근성 이름이다. */
  title: string
  /** 무엇에 대한 확인인지(일정 제목 등). 굵게 한 줄. */
  subject?: string
  /** 확인하면 어떻게 되는지. */
  message?: string
  confirmLabel: string
  cancelLabel?: string
  /** 되돌리기 어려운 동작이면 'danger'. */
  tone?: 'danger' | 'primary'
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/**
 * 앱의 확인창. 삭제 확인(DeleteConfirmSheet)만 있던 것을 넓혔다 — 만료, 공개 전환, 작성 중인
 * 내용 버리기처럼 "정말 할까요?"를 묻는 곳이 각자 window.confirm을 쓰거나 아예 묻지 않았다.
 * 데스크톱은 가운데 다이얼로그, 모바일은 아래에서 올라오는 시트다(ResponsiveDialog).
 */
export function ConfirmSheet({
  open,
  title,
  subject,
  message,
  confirmLabel,
  cancelLabel,
  tone = 'primary',
  loading,
  onConfirm,
  onCancel,
}: ConfirmSheetProps) {
  const { t } = useTranslation()
  return (
    <ResponsiveDialog open={open} onClose={onCancel} title={title}>
      {(subject || message) && (
        <p className={styles.message}>
          {subject && <span className={styles.subject}>{subject}</span>}
          {message}
        </p>
      )}
      <div className={styles.actions}>
        <Button variant="ghost" fullWidth onClick={onCancel} disabled={loading}>
          {cancelLabel ?? t('common.cancel')}
        </Button>
        <Button variant={tone === 'danger' ? 'danger' : 'primary'} fullWidth onClick={onConfirm} loading={loading}>
          {confirmLabel}
        </Button>
      </div>
    </ResponsiveDialog>
  )
}
