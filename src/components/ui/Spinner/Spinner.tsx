import clsx from 'clsx'
import { useTranslation } from 'react-i18next'
import styles from './Spinner.module.scss'
export function Spinner({ className }: { className?: string }) {
  const { t } = useTranslation()
  return <div className={clsx(styles.spinner, className)} role="status" aria-label={t('common.loadingLabel')} />
}
