import { useId } from 'react'
import clsx from 'clsx'
import styles from './Textarea.module.scss'

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  wrapperClassName?: string
}

export function Textarea({ label, error, className, wrapperClassName, id, ...props }: TextareaProps) {
  const autoId = useId()
  const textareaId = id ?? autoId
  const errorId = `${textareaId}-error`
  return (
    <div className={clsx(styles.wrapper, wrapperClassName)}>
      {label && <label htmlFor={textareaId} className={styles.label}>{label}</label>}
      <textarea
        id={textareaId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={clsx(styles.textarea, error && styles.error, className)}
        {...props}
      />
      {error && <span id={errorId} className={styles.errorMsg}>{error}</span>}
    </div>
  )
}
