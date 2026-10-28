import { useEffect, useRef, type RefObject } from 'react'

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

// 켜져 있는 트랩들. 상세 시트 위에 삭제 확인처럼 창이 겹치면 맨 위(가장 나중에 켜진) 것만
// 키를 처리한다 — 모두가 window 리스너를 달면 Esc 한 번에 둘 다 닫히고, Tab은 아래 창이
// 포커스를 제 첫 칸으로 끌어간 뒤 위 창이 다시 끌어와 첫 칸에 갇힌다.
const trapStack: symbol[] = []

// Traps Tab focus inside `containerRef` while `active`, moves focus into the
// container on open, restores it on close, and calls `onEscape` on Escape.
// The container element needs tabIndex={-1} to receive the initial focus.
export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  active: boolean,
  onEscape?: () => void
) {
  const onEscapeRef = useRef(onEscape)
  useEffect(() => {
    onEscapeRef.current = onEscape
  }, [onEscape])

  useEffect(() => {
    if (!active) return
    const container = containerRef.current
    const previouslyFocused = document.activeElement as HTMLElement | null
    // preventScroll: the container may still be mid entrance-transition (e.g. a
    // bottom sheet animating up from translateY(100%)); the default focus scroll
    // would chase it and yank the fixed overlay around on mobile.
    container?.focus({ preventScroll: true })

    const id = Symbol('focus-trap')
    trapStack.push(id)

    const onKey = (e: KeyboardEvent) => {
      if (trapStack[trapStack.length - 1] !== id) return
      if (e.key === 'Escape') {
        onEscapeRef.current?.()
        return
      }
      if (e.key !== 'Tab' || !container) return
      const focusables = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE))
      if (focusables.length === 0) {
        e.preventDefault()
        container.focus()
        return
      }
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const current = document.activeElement
      const outside = !container.contains(current)
      if (e.shiftKey && (current === first || current === container || outside)) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && (current === last || outside)) {
        e.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      trapStack.splice(trapStack.indexOf(id), 1)
      window.removeEventListener('keydown', onKey)
      previouslyFocused?.focus?.({ preventScroll: true })
    }
  }, [active, containerRef])
}
