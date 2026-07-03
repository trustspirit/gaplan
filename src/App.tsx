import { useEffect } from 'react'
import { useSetAtom } from 'jotai'
import { toast, Toaster } from 'sonner'
import { authUserAtom, authLoadingAtom } from '@/store/authAtom'
import { subscribeToAuthState, consumeRedirectResult } from '@/services/authService'
import i18n from '@/i18n'
import { AppRouter } from '@/router'

function isAnonymousPublicRoute(pathname: string) {
  return pathname.startsWith('/public/schedule/') || pathname.startsWith('/respond/')
}

export default function App() {
  const setUser = useSetAtom(authUserAtom)
  const setLoading = useSetAtom(authLoadingAtom)
  const anonymousPublicRoute = isAnonymousPublicRoute(window.location.pathname)

  useEffect(() => {
    if (anonymousPublicRoute) {
      setUser(null)
      setLoading(false)
      return
    }

    consumeRedirectResult()
    return subscribeToAuthState(setUser, setLoading, () => {
      toast.error(i18n.t('common.loginError'))
    })
  }, [setUser, setLoading, anonymousPublicRoute])

  return (
    <>
      <AppRouter />
      <Toaster
        position="top-right"
        richColors
        closeButton
        style={{
          '--offset-top': 'max(env(safe-area-inset-top, 0px), 60px)',
          '--mobile-offset-top': 'max(env(safe-area-inset-top, 0px), 60px)',
        } as React.CSSProperties}
      />
    </>
  )
}
