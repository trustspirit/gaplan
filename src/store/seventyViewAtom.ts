import { atomWithStorage } from 'jotai/utils'

/**
 * admin 전역 칠십인 뷰 선택. null = 전체.
 * 선택기 UI와 admin default 초기화는 G3에서 추가. G1에서는 기본 null.
 */
export const seventyViewAtom = atomWithStorage<string | null>('gaplan.seventyView', null)
