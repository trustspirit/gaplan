import { useTranslation } from 'react-i18next'
import type { BalanceEntry } from '@/utils/visitPlanContext'
import styles from './BalancePanel.module.scss'

interface Props {
  balance: BalanceEntry[]
}

export function BalancePanel({ balance }: Props) {
  const { t } = useTranslation()
  if (balance.length === 0) return null

  const max = Math.max(1, ...balance.map(b => b.total))

  return (
    <div className={styles.panel}>
      <h3 className={styles.title}>{t('visitPlan.balance')}</h3>
      <ul className={styles.list}>
        {balance.map(b => (
          <li key={b.unitId} className={styles.row}>
            <span className={styles.name}>{b.name}</span>
            <span className={styles.bar}>
              <span className={styles.fill} style={{ width: `${(b.total / max) * 100}%` }} />
            </span>
            <span className={styles.count}>{b.actualCount}+{b.plannedCount}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
