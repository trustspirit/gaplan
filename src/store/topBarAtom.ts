import { atom } from 'jotai'

// Per-page TopBar configuration, set by pages via useTopBar().
// Lives in an atom so AppShell can be hoisted into a layout route
// (mounted once) while each page still controls its own TopBar line.
export interface TopBarConfig {
  subtext?: string
  pendingCount?: number
  helpInfoKey?: string
}

export const topBarConfigAtom = atom<TopBarConfig>({})
