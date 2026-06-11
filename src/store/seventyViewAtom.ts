import { atomWithStorage } from 'jotai/utils'

/**
 * admin 전역 칠십인 뷰 선택.
 * null = 기본값(assignedSeventyUid 있으면 그 칠십인, 없으면 전체)
 * '__all__' = 전체 명시 선택
 * <uid> = 해당 칠십인
 */
export const seventyViewAtom = atomWithStorage<string | null>('gaplan.seventyView', null)
