import { useIsMobile } from '@/hooks/useIsMobile'
import { BottomSheet } from '@/components/ui/BottomSheet/BottomSheet'
import { Modal } from '@/components/ui/Modal/Modal'
import { Button } from '@/components/ui/Button/Button'
import styles from './DeleteConfirmSheet.module.scss'

interface DeleteConfirmSheetProps {
  open: boolean
  description?: string
  onConfirm: () => void
  onCancel: () => void
}

export function DeleteConfirmSheet({ open, description, onConfirm, onCancel }: DeleteConfirmSheetProps) {
  const isMobile = useIsMobile()

  const content = (
    <div>
      <p className={styles.message}>
        {description && <span className={styles.description}>{description}</span>}
        이 작업은 되돌릴 수 없어요.
      </p>
      <div className={styles.actions}>
        <Button variant="ghost" fullWidth onClick={onCancel}>취소</Button>
        <Button variant="danger" fullWidth onClick={onConfirm}>삭제</Button>
      </div>
    </div>
  )

  if (isMobile) {
    return (
      <BottomSheet open={open} onClose={onCancel} title="삭제하시겠어요?">
        {content}
      </BottomSheet>
    )
  }

  return (
    <Modal open={open} onClose={onCancel} title="삭제하시겠어요?">
      {content}
    </Modal>
  )
}
