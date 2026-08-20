import type { ReactNode } from 'react'
import clsx from 'clsx'
import { useTranslation } from 'react-i18next'
import { Inbox, AlertCircle, Lock } from 'lucide-react'
import { Button } from '@/components/ui/Button/Button'
import styles from './State.module.scss'

interface StateProps {
  title?: string
  description?: string
  action?: ReactNode
  className?: string
}

interface ShellProps extends StateProps {
  icon: ReactNode
  tone: 'neutral' | 'danger'
  /** 에러는 스크린리더가 바로 읽어야 해서 role=status를 붙인다 */
  live?: boolean
}

function StateShell({ icon, tone, live, title, description, action, className }: ShellProps) {
  return (
    <div
      className={clsx(styles.state, styles[tone], className)}
      role={live ? 'status' : undefined}
    >
      <div className={styles.icon} aria-hidden="true">
        {icon}
      </div>
      <p className={styles.title}>{title}</p>
      {description && <p className={styles.description}>{description}</p>}
      {action && <div className={styles.action}>{action}</div>}
    </div>
  )
}

export function EmptyState({ icon, ...props }: StateProps & { icon?: ReactNode }) {
  const { t } = useTranslation()
  return (
    <StateShell
      tone="neutral"
      icon={icon ?? <Inbox size={22} />}
      {...props}
      title={props.title ?? t('state.emptyTitle')}
    />
  )
}

export function ErrorState({ onRetry, ...props }: StateProps & { onRetry?: () => void }) {
  const { t } = useTranslation()
  return (
    <StateShell
      tone="danger"
      live
      icon={<AlertCircle size={22} />}
      {...props}
      title={props.title ?? t('state.errorTitle')}
      description={props.description ?? t('state.errorDescription')}
      action={
        props.action ??
        (onRetry ? (
          <Button variant="secondary" size="sm" onClick={onRetry}>
            {t('common.retry')}
          </Button>
        ) : undefined)
      }
    />
  )
}

export function ForbiddenState(props: StateProps) {
  const { t } = useTranslation()
  return (
    <StateShell
      tone="neutral"
      icon={<Lock size={22} />}
      {...props}
      title={props.title ?? t('state.forbiddenTitle')}
      description={props.description ?? t('state.forbiddenDescription')}
    />
  )
}
