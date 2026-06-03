import clsx from 'clsx'
import styles from './Input.module.scss'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}
export function Input({ label, error, className, id, ...props }: InputProps) {
  const inputId = id ?? label
  return (
    <div className={styles.wrapper}>
      {label && <label htmlFor={inputId} className={styles.label}>{label}</label>}
      <input id={inputId} className={clsx(styles.input, error && styles.error, className)} {...props} />
      {error && <span className={styles.errorMsg}>{error}</span>}
    </div>
  )
}
