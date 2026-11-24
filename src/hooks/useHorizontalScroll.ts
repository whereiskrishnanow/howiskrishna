import { useEffect } from 'react'
import Lenis from 'lenis'
import 'lenis/dist/lenis.css'
import { cardCount, cardScroll, cardStep } from './useCylinder'

const DESKTOP = '(min-width: 768px)'

// Where the row was scrolled to, so coming back from a detail page lands you
// on the same card instead of at the start.
let savedScroll: number | null = null
// The page puts the scroll back itself (below). Left to the browser, it would
// also restore a position it remembered from some earlier visit, after ours,
// and bring the wrong card round to the front.
if ('scrollRestoration' in history) history.scrollRestoration = 'manual'
const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'
// How briskly the cylinder turns to the next card (per second): lower is
// slower and softer. As set, a turn eases in and glides home in about 1.2s.
const SPRING = 8 // the spring that carries the cylinder
const GOAL = 6 // how fast the point it's pulled towards moves on to the card

/**
 * On desktop the whole document scrolls sideways. Vertical wheel and trackpad
 * input is turned into eased horizontal movement, native horizontal swipes still
 * work, and the vertical keys (Space, Page Up/Down, arrows, Home/End) move across.
 * The scroll turns the cylinder of cards (useCylinder) and never ends: past the
 * last card it carries on round to the first. Each wheel or trackpad movement
 * and each key press turns it one card; a touch swipe, when it stops, settles
 * with the nearest card in front.
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

    // Turn the cylinder by `by` cards from where it's heading. The turn runs on
    // a critically damped spring: it gathers speed gently, glides, and settles
    // without a bump, and another scroll mid-turn carries the motion on (the
    // speed it has is kept) instead of restarting from a standstill. Positions
    // are unwrapped (they run on past the end), Lenis wraps them round.
    let springRaf = 0
    let springPos = 0
    let springVel = 0
    let springTarget = 0
    let springGoal = 0
    let springLast = 0
    const stopSpring = () => {
      cancelAnimationFrame(springRaf)
      springRaf = 0
      springVel = 0
    }
    const springTick = (now: number) => {
      if (!lenis) return stopSpring()
      const dt = Math.min(0.05, (now - springLast) / 1000)
      springLast = now
      // the spring chases a goal that itself eases towards the card, so the
      // turn starts with no kick at all and builds speed softly
      springGoal = springTarget + (springGoal - springTarget) * Math.exp(-GOAL * dt)
      // the exact critically damped step: smooth at any frame rate
      const x = springPos - springGoal
      const decay = Math.exp(-SPRING * dt)
      const k = springVel + SPRING * x
      springPos = springGoal + (x + k * dt) * decay
      springVel = (springVel - SPRING * k * dt) * decay
      const done = Math.abs(springPos - springTarget) < 0.25 && Math.abs(springVel) < 4
      if (done) springPos = springTarget
      lenis.scrollTo(springPos, { immediate: true, programmatic: false, force: true })
      if (done) stopSpring()
      else springRaf = requestAnimationFrame(springTick)
    }
    const stepBy = (by: number) => {
      if (!lenis) return
      const step = cardStep() || window.innerWidth * 0.8
      if (!springRaf) {
        springPos = lenis.animatedScroll
        // the browser can move the page without Lenis knowing (restoring the
        // scroll on reload): start from where the page really is
        const wrapped = ((springPos % lenis.limit) + lenis.limit) % lenis.limit
        if (Math.abs(wrapped - window.scrollX) > 1) springPos = window.scrollX
        springGoal = springPos
        springVel = lenis.velocity * 60 // Lenis' is per frame; the spring's per second
      }
      springTarget = (Math.round((springRaf ? springTarget : springPos) / step) + by) * step
      if (reduced.matches) {
        stopSpring()
        lenis.scrollTo(springTarget, { immediate: true, programmatic: false })
        return
      }
      if (!springRaf) {
        springLast = performance.now()
        springRaf = requestAnimationFrame(springTick)
      }
    }

    // One card per scroll movement: a wheel or trackpad gesture turns the
    // cylinder exactly one card, whatever its size. The gesture's later events
    // (a spun wheel, a trackpad's coasting) are swallowed until it goes quiet,
    // or until a fresh push starts while the old one is still coasting down.
    let gesture = false
    let lastSize = 0
    let lastStep = 0
    let quiet: number | undefined
    const onGesture = ({ deltaX, deltaY, event }: { deltaX: number; deltaY: number; event: WheelEvent | TouchEvent }) => {
      if (!event.type.includes('wheel')) {
        stopSpring() // touch: swipes as before, settling on a card
        return true
      }
      if (event.cancelable) event.preventDefault()
      const d = Math.abs(deltaX) > Math.abs(deltaY) ? deltaX : deltaY
      const size = Math.abs(d)
      window.clearTimeout(quiet)
      quiet = window.setTimeout(() => (gesture = false), 180)
      const now = performance.now()
      const fresh = !gesture || (size > lastSize * 1.6 + 4 && now - lastStep > 350)
      lastSize = size
      if (!fresh || size < 2) return false
      gesture = true
      lastStep = now
      stepBy(Math.sign(d))
      return false
    }

    const start = () => {
      stopSpring()
      lenis?.destroy()
      lenis = desktop.matches
        ? new Lenis({
            orientation: 'horizontal',
            gestureOrientation: 'both',
            lerp: reduced.matches ? 1 : 0.085,
            // the cylinder turns round and round: no start, no end
            infinite: true,
            syncTouch: true, // Lenis needs this for infinite scrolling on touch screens
            virtualScroll: onGesture,
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
      if (target.closest?.('input, textarea, select, button, [contenteditable]')) return

      // one card per press; Space and Page Up/Down too
      const by: Record<string, number> = {
        ArrowRight: 1,
        ArrowDown: 1,
        ArrowLeft: -1,
        ArrowUp: -1,
        PageDown: 1,
        PageUp: -1,
        ' ': e.shiftKey ? -1 : 1,
      }

      if (e.key !== 'Home' && e.key !== 'End' && !(e.key in by)) return
      e.preventDefault()
      if (e.key === 'Home' || e.key === 'End') {
        // to the first or last card, whichever way round is shorter
        const to = cardScroll(e.key === 'Home' ? 0 : cardCount() - 1)
        stopSpring()
        lenis.scrollTo(to, { immediate: reduced.matches })
        return
      }
      stepBy(by[e.key]) // a held key or quick presses add up
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

    // Settle on a card: once the scroll comes to rest between two cards, ease
    // the nearest one round to the front.
    let settle: number | undefined
    const onScroll = () => {
      window.clearTimeout(settle)
      settle = window.setTimeout(() => {
        const step = cardStep()
        if (!lenis || !step || lenis.isScrolling || springRaf) return
        const to = Math.round(lenis.scroll / step) * step
        if (Math.abs(to - lenis.scroll) > 1) lenis.scrollTo(to, { duration: 0.9, immediate: reduced.matches })
      }, 140)
    }
    window.addEventListener('scroll', onScroll, { passive: true })

    // Bring a card round to the front (a click on a side card, or tabbing to one);
    // Lenis turns whichever way round is shorter.
    const spinTo = (i: number) => {
      if (!lenis || i < 0) return
      stopSpring()
      lenis.scrollTo(cardScroll(i), { duration: 1.1, immediate: reduced.matches })
    }
    const onSpinTo = (e: Event) => spinTo((e as CustomEvent<number>).detail)
    const onFocusIn = (e: FocusEvent) => {
      const card = (e.target as HTMLElement).closest?.('.projects > .project')
      if (card) spinTo([...card.parentElement!.children].indexOf(card))
    }
    window.addEventListener('portfolio:spin-to', onSpinTo)
    document.addEventListener('focusin', onFocusIn)

    start()
    // Remember the position the moment a link leaves the page. By the time this
    // effect cleans up, the row is already gone and the position reads 0.
    const remember = () => {
      savedScroll = window.scrollX
    }
    window.addEventListener('hashchange', remember)
    window.addEventListener('portfolio:leave', remember)

    // Restore it even when it's 0 (the first card): otherwise the browser puts
    // back whatever position it last remembered for this page on its own.
    if (savedScroll !== null) {
      window.scrollTo(savedScroll, 0)
      ;(lenis as Lenis | null)?.scrollTo(savedScroll, { immediate: true }) // set inside start()
    }
    desktop.addEventListener('change', start)
    reduced.addEventListener('change', start)
    window.addEventListener('wheel', checkLimit, { passive: true, capture: true })
    window.addEventListener('keydown', checkLimit, { capture: true })
    window.addEventListener('keydown', onKeyDown)

    return () => {
      window.clearTimeout(settle)
      window.clearTimeout(quiet)
      stopSpring()
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('portfolio:spin-to', onSpinTo)
      document.removeEventListener('focusin', onFocusIn)
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
