import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import clsx from 'clsx'
import styles from './BottomSheet.module.scss'

// Module-level ref-count: multiple nested BottomSheets share one scroll lock
let scrollLockCount = 0
let savedScrollY = 0

function acquireScrollLock() {
  if (scrollLockCount === 0) {
    savedScrollY = window.scrollY
    document.body.style.position = 'fixed'
    document.body.style.top = `-${savedScrollY}px`
    document.body.style.width = '100%'
  }
  scrollLockCount++
}

function releaseScrollLock() {
  scrollLockCount = Math.max(0, scrollLockCount - 1)
  if (scrollLockCount === 0) {
    document.body.style.position = ''
    document.body.style.top = ''
    document.body.style.width = ''
    window.scrollTo(0, savedScrollY)
  }
}

interface BottomSheetProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
}

export function BottomSheet({ open, onClose, title, children }: BottomSheetProps) {
  useEffect(() => {
    if (open) {
      acquireScrollLock()
      return () => releaseScrollLock()
    }
  }, [open])

  return createPortal(
    <div className={clsx(styles.overlay, open && styles.open)} onClick={onClose}>
      <div className={clsx(styles.sheet, open && styles.sheetOpen)} onClick={e => e.stopPropagation()}>
        <div className={styles.handle} />
        {title && (
          <div className={styles.header}>
            <h2 className={styles.title}>{title}</h2>
            <button onClick={onClose} className={styles.close} aria-label="닫기"><X size={18} /></button>
          </div>
        )}
        <div className={styles.body}>{children}</div>
      </div>
    </div>,
    document.body
  )
}
