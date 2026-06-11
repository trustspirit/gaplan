import { useMemo } from 'react'
import { useAtomValue } from 'jotai'
import { authUserAtom } from '@/store/authAtom'
import { seventyViewAtom } from '@/store/seventyViewAtom'
import { useUsers } from '@/hooks/useUsers'
import { resolveEffectiveScope, type EffectiveScope } from '@/utils/scope'

export function useEffectiveScope(): EffectiveScope {
  const user = useAtomValue(authUserAtom)
  const viewSeventyUid = useAtomValue(seventyViewAtom)
  const { users } = useUsers()
  return useMemo(
    () => resolveEffectiveScope(user, viewSeventyUid, users),
    [user, viewSeventyUid, users],
  )
}
