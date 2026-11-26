import { useRef, type MouseEvent } from 'react'

/**
 * 배경을 눌러 닫기. 누르기 시작한 곳도 배경일 때만 닫는다.
 *
 * click은 누른 곳과 뗀 곳의 공통 조상에서 난다 — 대화상자 안의 글을 끌어 고르다 바깥에서 떼면
 * 배경에서 click이 나서, 쓰던 내용과 함께 닫혀 버린다.
 */
export function useBackdropDismiss(onClose: () => void) {
  const pressedInside = useRef(false)
  return {
    onMouseDown: (e: MouseEvent) => {
      pressedInside.current = e.target !== e.currentTarget
    },
    onClick: (e: MouseEvent) => {
      const inside = pressedInside.current
      pressedInside.current = false
      if (e.target === e.currentTarget && !inside) onClose()
    },
  }
}
