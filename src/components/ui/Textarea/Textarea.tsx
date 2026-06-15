import clsx from 'clsx'
import styles from './Textarea.module.scss'

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  wrapperClassName?: string
}

export function Textarea({ label, error, className, wrapperClassName, id, ...props }: TextareaProps) {
  const textareaId = id ?? label
  return (
    <div className={clsx(styles.wrapper, wrapperClassName)}>
      {label && <label htmlFor={textareaId} className={styles.label}>{label}</label>}
      <textarea id={textareaId} className={clsx(styles.textarea, error && styles.error, className)} {...props} />
      {error && <span className={styles.errorMsg}>{error}</span>}
    </div>
  )
}
