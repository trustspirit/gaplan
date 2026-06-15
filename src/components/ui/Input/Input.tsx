import clsx from 'clsx'
import styles from './Input.module.scss'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  wrapperClassName?: string
}
export function Input({ label, error, className, wrapperClassName, id, ...props }: InputProps) {
  const inputId = id ?? label
  return (
    <div className={clsx(styles.wrapper, wrapperClassName)}>
      {label && <label htmlFor={inputId} className={styles.label}>{label}</label>}
      <input id={inputId} className={clsx(styles.input, error && styles.error, className)} {...props} />
      {error && <span className={styles.errorMsg}>{error}</span>}
    </div>
  )
}
