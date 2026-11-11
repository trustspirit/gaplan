import { useTranslation } from 'react-i18next'
import { ConfirmSheet } from '@/components/ui/ConfirmSheet/ConfirmSheet'

interface DeleteConfirmSheetProps {
  open: boolean
  description?: string
  onConfirm: () => void
  onCancel: () => void
}

/**
 * 삭제 확인. ConfirmSheet에 삭제용 문구를 채운 것이다.
 *
 * 예전에는 "이 작업은 되돌릴 수 없어요"라고 적었는데, 일정·행사·계획 삭제는 확인 직후
 * "되돌리기" 알림이 뜬다 — 문구와 동작이 어긋났다. 되돌릴 수 있는지는 호출부마다 달라서
 * (Zoom 링크 삭제는 되돌리기가 없다) 여기서는 어느 쪽도 단정하지 않는다.
 */
export function DeleteConfirmSheet({ open, description, onConfirm, onCancel }: DeleteConfirmSheetProps) {
  const { t } = useTranslation()
  return (
    <ConfirmSheet
      open={open}
      title={t('confirm.deleteTitle')}
      subject={description}
      confirmLabel={t('common.delete')}
      tone="danger"
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  )
}
