import { useId } from 'react'
import clsx from 'clsx'
import styles from './Input.module.scss'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  wrapperClassName?: string
}
export function Input({ label, error, className, wrapperClassName, id, ...props }: InputProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  const errorId = `${inputId}-error`
  return (
    <div className={clsx(styles.wrapper, wrapperClassName)}>
      {label && <label htmlFor={inputId} className={styles.label}>{label}</label>}
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={clsx(styles.input, error && styles.error, className)}
        {...props}
      />
      {error && <span id={errorId} className={styles.errorMsg}>{error}</span>}
    </div>
  )
}
