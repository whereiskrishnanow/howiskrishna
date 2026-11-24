import { useEffect } from 'react'
import Lenis from 'lenis'
import 'lenis/dist/lenis.css'

const DESKTOP = '(min-width: 768px)'

// Where the row was scrolled to, so coming back from a detail page lands you
// on the same card instead of at the start.
let savedScroll = 0
const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'

/**
 * On desktop the whole document scrolls sideways. Vertical wheel and trackpad
 * input is turned into eased horizontal movement, native horizontal swipes still
 * work, and the vertical keys (Space, Page Up/Down, arrows, Home/End) move across.
 * Below 768px the layout stacks and the browser scrolls normally.
 */
export function useHorizontalScroll() {
  useEffect(() => {
    // the sideways-scrolling page layout applies only while this page is shown
    document.documentElement.classList.add('is-home')
    const desktop = window.matchMedia(DESKTOP)
    const reduced = window.matchMedia(REDUCED_MOTION)
    let lenis: Lenis | null = null

    // The real end of the row, read fresh from the page.
    const realLimit = () => document.documentElement.scrollWidth - window.innerWidth

    const start = () => {
      lenis?.destroy()
      lenis = desktop.matches
        ? new Lenis({
            orientation: 'horizontal',
            gestureOrientation: 'both',
            lerp: reduced.matches ? 1 : 0.085,
            autoRaf: true,
          })
        : null
    }

    // Belt and braces: whatever changed the page without us noticing (a browser
    // extension, a late font, a resize mid-animation), never let the scroller
    // work from a stale end point. Re-check it on every scroll input, before
    // Lenis acts on it, so the last card always reaches the centre.
    const checkLimit = () => {
      if (lenis && Math.abs(lenis.limit - realLimit()) > 1) lenis.resize()
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (!lenis || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return
      const target = e.target as HTMLElement
      if (target.closest('input, textarea, select, button, [contenteditable]')) return

      const page = window.innerWidth * 0.8
      const line = 140
      const by: Record<string, number> = {
        ArrowRight: line,
        ArrowDown: line,
        ArrowLeft: -line,
        ArrowUp: -line,
        PageDown: page,
        PageUp: -page,
        ' ': e.shiftKey ? -page : page,
      }

      let to: number
      if (e.key === 'Home') to = 0
      else if (e.key === 'End') to = lenis.limit
      else if (e.key in by) to = lenis.targetScroll + by[e.key]
      else return

      e.preventDefault()
      lenis.scrollTo(to, { immediate: reduced.matches })
    }

    // Lenis only re-measures when the window resizes, but the row can change
    // width on its own (web fonts swapping in, images, content or style edits).
    // Without this it keeps a stale end point and stops short of the last card.
    // Watch the border box: the end space is padding, which the default
    // content-box observation doesn't see.
    const track = document.querySelector('.track')
    const remeasure = () => lenis?.resize()
    const trackObserver = new ResizeObserver(remeasure)
    if (track) trackObserver.observe(track, { box: 'border-box' })
    document.fonts?.ready.then(remeasure)
    window.addEventListener('load', remeasure)

    start()
    // Remember the position the moment a link leaves the page. By the time this
    // effect cleans up, the row is already gone and the position reads 0.
    const remember = () => {
      savedScroll = window.scrollX
    }
    window.addEventListener('hashchange', remember)
    window.addEventListener('portfolio:leave', remember)

    if (savedScroll) {
      window.scrollTo(savedScroll, 0)
      ;(lenis as Lenis | null)?.scrollTo(savedScroll, { immediate: true }) // set inside start()
    }
    desktop.addEventListener('change', start)
    reduced.addEventListener('change', start)
    window.addEventListener('wheel', checkLimit, { passive: true, capture: true })
    window.addEventListener('keydown', checkLimit, { capture: true })
    window.addEventListener('keydown', onKeyDown)

    return () => {
      window.removeEventListener('hashchange', remember)
      window.removeEventListener('portfolio:leave', remember)
      document.documentElement.classList.remove('is-home')
      desktop.removeEventListener('change', start)
      reduced.removeEventListener('change', start)
      window.removeEventListener('wheel', checkLimit, { capture: true })
      window.removeEventListener('keydown', checkLimit, { capture: true })
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('load', remeasure)
      trackObserver.disconnect()
      lenis?.destroy()
    }
  }, [])
}
