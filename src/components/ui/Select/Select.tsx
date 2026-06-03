import clsx from 'clsx'
import styles from './Select.module.scss'

interface SelectOption { value: string; label: string }
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: SelectOption[]
}
export function Select({ label, error, options, className, id, ...props }: SelectProps) {
  const selectId = id ?? label
  return (
    <div className={styles.wrapper}>
      {label && <label htmlFor={selectId} className={styles.label}>{label}</label>}
      <select id={selectId} className={clsx(styles.select, error && styles.error, className)} {...props}>
        <option value="">선택하세요</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {error && <span className={styles.errorMsg}>{error}</span>}
    </div>
  )
}
