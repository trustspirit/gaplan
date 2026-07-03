import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import clsx from 'clsx'
import { acquireScrollLock, releaseScrollLock } from '@/utils/scrollLock'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import styles from './BottomSheet.module.scss'

interface BottomSheetProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
}

export function BottomSheet({ open, onClose, title, children }: BottomSheetProps) {
  const { t } = useTranslation()
  const sheetRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  useFocusTrap(sheetRef, open, onClose)

  useEffect(() => {
    if (open) {
      acquireScrollLock()
      return releaseScrollLock
    }
  }, [open])

  return createPortal(
    // inert keeps the closed (but still mounted, for the exit transition)
    // sheet out of the tab order and accessibility tree
    <div className={clsx(styles.overlay, open && styles.open)} onClick={onClose} inert={!open}>
      <div
        ref={sheetRef}
        tabIndex={-1}
        role="dialog"
        aria-modal
        aria-labelledby={title ? titleId : undefined}
        className={clsx(styles.sheet, open && styles.sheetOpen)}
        onClick={e => e.stopPropagation()}
      >
        <div className={styles.handle} />
        {title && (
          <div className={styles.header}>
            <h2 id={titleId} className={styles.title}>{title}</h2>
            <button onClick={onClose} className={styles.close} aria-label={t('common.close')}><X size={18} /></button>
          </div>
        )}
        <div className={styles.body}>{children}</div>
      </div>
    </div>,
    document.body
  )
}
