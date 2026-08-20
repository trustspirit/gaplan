import type { ReactNode } from 'react'
import { useIsMobile } from '@/hooks/useIsMobile'
import { Modal } from '@/components/ui/Modal/Modal'
import { BottomSheet } from '@/components/ui/BottomSheet/BottomSheet'

interface ResponsiveDialogProps {
  open: boolean
  onClose: () => void
  title?: string
  'aria-label'?: string
  children: ReactNode
  /** 데스크톱 Modal에만 전달된다 — BottomSheet는 className을 받지 않는다 */
  className?: string
}

// 페이지마다 useIsMobile()로 Modal/BottomSheet를 고르던 분기를 여기로 모은다.
export function ResponsiveDialog({
  open,
  onClose,
  title,
  'aria-label': ariaLabel,
  children,
  className,
}: ResponsiveDialogProps) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <BottomSheet open={open} onClose={onClose} title={title} aria-label={ariaLabel}>
        {children}
      </BottomSheet>
    )
  }

  return (
    <Modal open={open} onClose={onClose} title={title} aria-label={ariaLabel} className={className}>
      {children}
    </Modal>
  )
}
