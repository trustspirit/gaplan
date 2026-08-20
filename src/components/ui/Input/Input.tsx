import clsx from 'clsx'
import { Field } from '@/components/ui/Field/Field'
import { useFieldIds } from '@/components/ui/Field/useFieldIds'
import styles from './Input.module.scss'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  wrapperClassName?: string
}
export function Input({
  label,
  error,
  hint,
  className,
  wrapperClassName,
  id,
  ...props
}: InputProps) {
  const { fieldId, describedBy } = useFieldIds(id)
  return (
    <Field
      fieldId={fieldId}
      label={label}
      hint={hint}
      error={error}
      wrapperClassName={wrapperClassName}
    >
      <input
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy({ error, hint })}
        className={clsx(styles.input, error && styles.error, className)}
        {...props}
      />
    </Field>
  )
}
