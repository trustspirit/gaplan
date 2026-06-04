import { useEffect } from 'react'
import { useSetAtom } from 'jotai'
import { toast, Toaster } from 'sonner'
import { authUserAtom, authLoadingAtom } from '@/store/authAtom'
import { subscribeToAuthState } from '@/services/authService'
import { AppRouter } from '@/router'

export default function App() {
  const setUser = useSetAtom(authUserAtom)
  const setLoading = useSetAtom(authLoadingAtom)

  useEffect(() => {
    return subscribeToAuthState(setUser, setLoading, () => {
      toast.error('접근 권한이 없습니다. 관리자에게 문의하세요.')
    })
  }, [setUser, setLoading])

  return (
    <>
      <AppRouter />
      <Toaster position="top-right" richColors />
    </>
  )
}
