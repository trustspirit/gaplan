import { useId } from 'react'
import clsx from 'clsx'
import styles from './SegmentedControl.module.scss'

export interface SegmentOption<T extends string> {
  value: T
  label: string
}

interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[]
  value: T
  onChange: (next: T) => void
  'aria-label': string
  className?: string
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  'aria-label': ariaLabel,
  className,
}: SegmentedControlProps<T>) {
  const name = useId()
  return (
    <div className={clsx(styles.group, className)} role="radiogroup" aria-label={ariaLabel}>
      {options.map((option) => (
        <label
          key={option.value}
          className={clsx(styles.segment, option.value === value && styles.active)}
        >
          <input
            type="radio"
            name={name}
            className={styles.input}
            value={option.value}
            checked={option.value === value}
            onChange={() => onChange(option.value)}
          />
          <span className={styles.text}>{option.label}</span>
        </label>
      ))}
    </div>
  )
}
