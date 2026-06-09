import clsx from 'clsx'
import { Loader2 } from 'lucide-react'
import styles from './Button.module.scss'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  fullWidth?: boolean
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  fullWidth,
  children,
  disabled,
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(
        styles.button,
        styles[variant],
        styles[size],
        fullWidth && styles.fullWidth,
        className,
      )}
      disabled={disabled || loading}
      aria-busy={loading ? 'true' : undefined}
      type={type}
      {...props}
    >
      {loading && <Loader2 className={styles.spinner} size={14} aria-hidden="true" />}
      <span className={styles.label} data-button-label="true">
        {children}
      </span>
    </button>
  )
}
