import { useEffect } from 'react'
import { useSetAtom } from 'jotai'
import { Toaster } from 'sonner'
import { authUserAtom, authLoadingAtom } from '@/store/authAtom'
import { subscribeToAuthState } from '@/services/authService'
import { AppRouter } from '@/router'

export default function App() {
  const setUser = useSetAtom(authUserAtom)
  const setLoading = useSetAtom(authLoadingAtom)

  useEffect(() => {
    return subscribeToAuthState(setUser, setLoading)
  }, [setUser, setLoading])

  return (
    <>
      <AppRouter />
      <Toaster position="top-right" richColors />
    </>
  )
}
