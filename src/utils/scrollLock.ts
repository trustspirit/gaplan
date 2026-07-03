// Shared, ref-counted scroll lock for overlays (Modal, BottomSheet).
// The app shell is position:fixed and its `.content` element (marked with
// [data-scroll-container]) is the real scroll surface, so locking only
// document.body would be a no-op inside the shell. Public pages (respond,
// public schedule) scroll the body, so both are locked.
let lockCount = 0
let lockedScroller: HTMLElement | null = null

export function acquireScrollLock() {
  if (lockCount === 0) {
    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    lockedScroller = document.querySelector<HTMLElement>('[data-scroll-container]')
    if (lockedScroller) lockedScroller.style.overflow = 'hidden'
  }
  lockCount++
}

export function releaseScrollLock() {
  lockCount = Math.max(0, lockCount - 1)
  if (lockCount === 0) {
    document.documentElement.style.overflow = ''
    document.body.style.overflow = ''
    if (lockedScroller) {
      lockedScroller.style.overflow = ''
      lockedScroller = null
    }
  }
}
