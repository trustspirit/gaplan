import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import clsx from 'clsx'
import styles from './Modal.module.scss'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  className?: string
}
export function Modal({ open, onClose, title, children, className }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal>
      <div className={clsx(styles.modal, className)} onClick={e => e.stopPropagation()}>
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
