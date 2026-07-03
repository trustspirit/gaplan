import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import clsx from 'clsx'
import { acquireScrollLock, releaseScrollLock } from '@/utils/scrollLock'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import styles from './Modal.module.scss'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  'aria-label'?: string
  children: React.ReactNode
  className?: string
}
export function Modal({ open, onClose, title, 'aria-label': ariaLabel, children, className }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  useFocusTrap(modalRef, open, onClose)

  useEffect(() => {
    if (!open) return
    acquireScrollLock()
    return releaseScrollLock
  }, [open])

  if (!open) return null

  return createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div
        ref={modalRef}
        tabIndex={-1}
        role="dialog"
        aria-modal
        aria-labelledby={title ? titleId : undefined}
        aria-label={title ? undefined : ariaLabel}
        className={clsx(styles.modal, className)}
        onClick={e => e.stopPropagation()}
      >
        {title && (
          <div className={styles.header}>
            <h2 id={titleId} className={styles.title}>{title}</h2>
            <button onClick={onClose} className={styles.close} aria-label="닫기"><X size={18} /></button>
          </div>
        )}
        <div className={styles.body}>{children}</div>
      </div>
    </div>,
    document.body
  )
}
