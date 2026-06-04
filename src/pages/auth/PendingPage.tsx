import { Clock } from 'lucide-react'
import { useAtomValue } from 'jotai'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { authUserAtom } from '@/store/authAtom'
import { signOut } from '@/services/authService'
import { Button } from '@/components/ui'
import styles from './PendingPage.module.scss'

export function PendingPage() {
  const { t } = useTranslation()
  const user = useAtomValue(authUserAtom)

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch {
      toast.error(t('auth.logoutFailed'))
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.iconWrap}>
          <Clock size={32} />
        </div>
        <h1 className={styles.title}>{t('auth.pendingTitle')}</h1>
        <p className={styles.desc}>
          {user?.name ? `${user.name}님, ` : ''}{t('auth.pendingDesc')}
          <br />
          {t('auth.pendingHint')}
        </p>
        <p className={styles.email}>{user?.email}</p>
        <Button variant="ghost" size="sm" onClick={handleSignOut}>
          {t('auth.logout')}
        </Button>
      </div>
    </div>
  )
}
