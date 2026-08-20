import { type ReactNode } from 'react'
import clsx from 'clsx'
import { fieldIds } from './fieldIds'
import styles from './Field.module.scss'

interface FieldProps {
  fieldId: string
  label?: string
  hint?: string
  error?: string
  wrapperClassName?: string
  children: ReactNode
}

export function Field({ fieldId, label, hint, error, wrapperClassName, children }: FieldProps) {
  const { errorId, hintId } = fieldIds(fieldId)
  return (
    <div className={clsx(styles.wrapper, wrapperClassName)}>
      {label && (
        <label htmlFor={fieldId} className={styles.label}>
          {label}
        </label>
      )}
      {children}
      {hint && (
        <span id={hintId} className={styles.hint}>
          {hint}
        </span>
      )}
      {error && (
        <span id={errorId} className={styles.errorMsg}>
          {error}
        </span>
      )}
    </div>
  )
}
