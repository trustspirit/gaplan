import clsx from 'clsx'
import { Field } from '@/components/ui/Field/Field'
import { useFieldIds } from '@/components/ui/Field/useFieldIds'
import styles from './Textarea.module.scss'

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
  wrapperClassName?: string
}
export function Textarea({
  label,
  error,
  hint,
  className,
  wrapperClassName,
  id,
  ...props
}: TextareaProps) {
  const { fieldId, describedBy } = useFieldIds(id)
  return (
    <Field
      fieldId={fieldId}
      label={label}
      hint={hint}
      error={error}
      wrapperClassName={wrapperClassName}
    >
      <textarea
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy({ error, hint })}
        className={clsx(styles.textarea, error && styles.error, className)}
        {...props}
      />
    </Field>
  )
}
