import { useEffect } from 'react'
import { useSetAtom } from 'jotai'
import { topBarConfigAtom, type TopBarConfig } from '@/store/topBarAtom'

// Pages call this to configure the shared TopBar rendered by ShellLayout.
export function useTopBar({ subtext, pendingCount, helpInfoKey }: TopBarConfig) {
  const setConfig = useSetAtom(topBarConfigAtom)
  useEffect(() => {
    setConfig({ subtext, pendingCount, helpInfoKey })
    return () => setConfig({})
  }, [setConfig, subtext, pendingCount, helpInfoKey])
}
