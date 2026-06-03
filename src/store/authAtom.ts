import { atom } from 'jotai'
import type { AppUser } from '@/types'

export const authUserAtom = atom<AppUser | null>(null)
export const authLoadingAtom = atom(true)
