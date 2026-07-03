import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import clsx from 'clsx'
import styles from './Select.module.scss'

interface SelectOption { value: string; label: string }
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: SelectOption[]
  wrapperClassName?: string
  placeholder?: string
}
export function Select({ label, error, options, className, wrapperClassName, id, placeholder, ...props }: SelectProps) {
  const { t } = useTranslation()
  const autoId = useId()
  const selectId = id ?? autoId
  const errorId = `${selectId}-error`
  return (
    <div className={clsx(styles.wrapper, wrapperClassName)}>
      {label && <label htmlFor={selectId} className={styles.label}>{label}</label>}
      <select
        id={selectId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={clsx(styles.select, error && styles.error, className)}
        {...props}
      >
        <option value="">{placeholder ?? t('common.selectPlaceholder')}</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {error && <span id={errorId} className={styles.errorMsg}>{error}</span>}
    </div>
  )
}
