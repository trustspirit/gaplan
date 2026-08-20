import { useTranslation } from 'react-i18next'
import clsx from 'clsx'
import { Field } from '@/components/ui/Field/Field'
import { useFieldIds } from '@/components/ui/Field/useFieldIds'
import styles from './Select.module.scss'

interface SelectOption { value: string; label: string }
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  hint?: string
  options: SelectOption[]
  wrapperClassName?: string
  placeholder?: string
}
export function Select({
  label,
  error,
  hint,
  options,
  className,
  wrapperClassName,
  id,
  placeholder,
  ...props
}: SelectProps) {
  const { t } = useTranslation()
  const { fieldId, describedBy } = useFieldIds(id)
  return (
    <Field
      fieldId={fieldId}
      label={label}
      hint={hint}
      error={error}
      wrapperClassName={wrapperClassName}
    >
      <select
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy({ error, hint })}
        className={clsx(styles.select, error && styles.error, className)}
        {...props}
      >
        <option value="">{placeholder ?? t('common.selectPlaceholder')}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  )
}
