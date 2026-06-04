import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAtomValue } from 'jotai'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui'
import { signInWithGoogle } from '@/services/authService'
import { authUserAtom, authLoadingAtom } from '@/store/authAtom'
import styles from './LoginPage.module.scss'

export function LoginPage() {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const user = useAtomValue(authUserAtom)
  const authLoading = useAtomValue(authLoadingAtom)
  const navigate = useNavigate()

  if (!authLoading && user) {
    let dest = '/dashboard'
    if (user.role === 'pending' && !user.unitId) dest = '/onboarding'
    else if (user.role === 'pending') dest = '/pending'
    else if (user.role === 'president' && !user.unitId) dest = '/onboarding'
    navigate(dest, { replace: true })
    return null
  }

  const handleSignIn = async () => {
    setLoading(true)
    try {
      await signInWithGoogle()
    } catch {
      toast.error(t('auth.loginFailed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo} />
        <h1 className={styles.title}>gaplan</h1>
        <p className={styles.subtitle}>{t('auth.loginSubtitle')}</p>
        <Button onClick={handleSignIn} loading={loading} fullWidth size="lg">
          {t('auth.loginWith')}
        </Button>
      </div>
    </div>
  )
}
