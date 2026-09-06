import { atom } from 'jotai'

/**
 * 빠른 이동(⌘K) 팔레트가 열려 있는지.
 *
 * 전역인 이유: 여는 손잡이가 두 곳에 있다 — 셸이 듣는 단축키와 TopBar의 검색 버튼.
 * TopBar는 AppShell에 prop으로 주입되므로 셸의 지역 상태에 닿지 못한다.
 */
export const commandPaletteOpenAtom = atom(false)
