import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import clsx from 'clsx'
import styles from './BottomSheet.module.scss'

interface BottomSheetProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
}
export function BottomSheet({ open, onClose, title, children }: BottomSheetProps) {
  useEffect(() => {
    if (open) {
      const scrollY = window.scrollY
      document.body.style.position = 'fixed'
      document.body.style.top = `-${scrollY}px`
      document.body.style.width = '100%'
      document.body.dataset.sheetScrollY = String(scrollY)
    } else {
      const scrollY = parseInt(document.body.dataset.sheetScrollY ?? '0', 10)
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
      delete document.body.dataset.sheetScrollY
      window.scrollTo(0, scrollY)
    }
    return () => {
      const scrollY = parseInt(document.body.dataset.sheetScrollY ?? '0', 10)
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
      delete document.body.dataset.sheetScrollY
      window.scrollTo(0, scrollY)
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
