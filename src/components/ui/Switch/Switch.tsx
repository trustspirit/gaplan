import { useId } from 'react'
import clsx from 'clsx'
import styles from './Switch.module.scss'

interface SwitchProps {
  checked: boolean
  onChange: (next: boolean) => void
  label?: string
  'aria-label'?: string
  disabled?: boolean
  className?: string
}

export function Switch({
  checked,
  onChange,
  label,
  'aria-label': ariaLabel,
  disabled,
  className,
}: SwitchProps) {
  const id = useId()
  return (
    <label className={clsx(styles.wrap, disabled && styles.disabled, className)} htmlFor={id}>
      <input
        id={id}
        type="checkbox"
        className={styles.input}
        checked={checked}
        disabled={disabled}
        aria-label={label ? undefined : ariaLabel}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className={styles.track} aria-hidden="true">
        <span className={styles.thumb} />
      </span>
      {label && <span className={styles.label}>{label}</span>}
    </label>
  )
}
