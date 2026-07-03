import { describe, it, expect, afterEach } from 'vitest'
import { acquireScrollLock, releaseScrollLock } from './scrollLock'

afterEach(() => {
  // drain any leftover locks so tests stay independent
  for (let i = 0; i < 10; i++) releaseScrollLock()
  document.querySelector('[data-scroll-container]')?.remove()
})

describe('scrollLock', () => {
  it('body와 data-scroll-container에 overflow:hidden을 걸고 해제한다', () => {
    const scroller = document.createElement('div')
    scroller.setAttribute('data-scroll-container', '')
    document.body.appendChild(scroller)

    acquireScrollLock()
    expect(document.body.style.overflow).toBe('hidden')
    expect(document.documentElement.style.overflow).toBe('hidden')
    expect(scroller.style.overflow).toBe('hidden')

    releaseScrollLock()
    expect(document.body.style.overflow).toBe('')
    expect(document.documentElement.style.overflow).toBe('')
    expect(scroller.style.overflow).toBe('')
  })

  it('중첩 lock은 ref-count로 마지막 해제 때만 풀린다', () => {
    acquireScrollLock()
    acquireScrollLock()
    releaseScrollLock()
    expect(document.body.style.overflow).toBe('hidden')
    releaseScrollLock()
    expect(document.body.style.overflow).toBe('')
  })

  it('과잉 해제는 무해하다', () => {
    releaseScrollLock()
    acquireScrollLock()
    expect(document.body.style.overflow).toBe('hidden')
    releaseScrollLock()
    expect(document.body.style.overflow).toBe('')
  })
})
