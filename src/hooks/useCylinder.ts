import { useEffect, type RefObject } from 'react'

// Desktop: the cards stand around a cylinder (styles.css, "Cylinder"), and
// scrolling sideways turns it. The page still scrolls (so Lenis' easing,
// the keys and coming back to the same card all keep working); the row
// itself stays put and this hook turns the scroll position into the
// cylinder's angle: one card's worth of scroll turns it one card further.
// Sets --spin (deg) on the list and marks the card facing the front.

export const CYLINDER = '(min-width: 768px)'

/** Cards on the cylinder. */
export const cardCount = () => document.querySelectorAll('.projects > .project').length

/**
 * Scroll distance (px) that turns the cylinder by one card. The page is one
 * full turn wide, and Lenis wraps the scroll round at the end (infinite), so
 * the end of the page is the first card again.
 */
export function cardStep() {
  const n = cardCount()
  const range = document.documentElement.scrollWidth - window.innerWidth
  return n > 0 && range > 0 ? range / n : 0
}

/** Scroll position at which card `i` faces the front. */
export const cardScroll = (i: number) => i * cardStep()

// The cylinder's shape. Keep in step with the "Cylinder" block in styles.css:
// each card takes up 1/FILL of its share of the way round, the rest is gap.
export const FILL = 1.3
export const PERSPECTIVE = 3.2 // in card widths

/**
 * How bent a card is drawn, from 0 (flat) to 1 (bent round the cylinder). The
 * card in front stands flat like a normal card; the others follow the curve.
 * As the cylinder turns, the card coming round to the front straightens out
 * and the one leaving it bends. `theta`: the card's angle from the front,
 * `step`: the angle between neighbouring cards (both in radians).
 */
export function cardBend(theta: number, step: number) {
  const d = Math.abs(Math.atan2(Math.sin(theta), Math.cos(theta))) // 0..π
  const t = Math.min(1, d / step)
  return t * t * (3 - 2 * t)
}

let sync: (() => void) | null = null
/**
 * Bring the cylinder up to the current scroll position now. The bent cards'
 * renderer calls this at the start of each frame, so the HTML text and the
 * drawn cards always turn together in the same frame, never one behind.
 */
export const syncCylinder = () => sync?.()

let spin = 0
/** How far the cylinder has turned (deg); card i faces the front at i * 360/n. */
export const spinDeg = () => spin

/** The cylinder's measurements in px (and radians), read from the page's layout. */
export function cylinderShape(list: HTMLElement) {
  const media = list.querySelector<HTMLElement>('.project .media')
  const n = list.children.length
  if (!media || !n) return null
  const cardH = media.offsetHeight
  const cardW = media.offsetWidth
  return {
    cardW,
    cardH,
    step: (2 * Math.PI) / n,
    radius: (cardW * FILL * n) / (2 * Math.PI),
    perspective: cardW * PERSPECTIVE,
    // the card's top edge, from the middle of the list (the cylinder's centre height)
    mediaTop: offsetWithin(media, list) - list.offsetHeight / 2,
  }
}

function offsetWithin(el: HTMLElement, ancestor: HTMLElement, axis: 'offsetTop' | 'offsetLeft' = 'offsetTop') {
  let d = 0
  let node: HTMLElement | null = el
  while (node && node !== ancestor) {
    d += node[axis]
    node = node.offsetParent as HTMLElement | null
  }
  if (node === ancestor) return d
  const a = el.getBoundingClientRect()
  const b = ancestor.getBoundingClientRect()
  return axis === 'offsetTop' ? a.top - b.top : a.left - b.left
}

/**
 * Bend each card's text round the cylinder like the card itself. Every letter
 * (its own box: .glyph in the title, .scramble-char in the description) keeps
 * its distance from the card's left edge, but measured along the curve: it
 * moves from the flat card box (which spans the chord between the card's
 * edges) onto the arc, turned to follow it. Sets --gx/--gz (px) and --gphi
 * on each letter; styles.css applies them while the cards are drawn bent.
 */
function bendText(list: HTMLElement) {
  const shape = cylinderShape(list)
  if (!shape) return
  const { cardW, radius: r } = shape
  const arc = cardW / r // the angle the card spans
  const chord = 2 * r * Math.sin(arc / 2)
  const depth = r * Math.cos(arc / 2) // the flat box's distance from the axis
  const cards = [...list.children] as HTMLElement[]
  // read every position first, then write
  const moves = cards.flatMap((li) => {
    const left = offsetWithin(li, list, 'offsetLeft')
    return [...li.querySelectorAll<HTMLElement>('.project-title .glyph, .project-desc .scramble-char')].map((el) => {
      const s = offsetWithin(el, list, 'offsetLeft') - left + el.offsetWidth / 2 // along the card from its left edge
      const phi = s / r - arc / 2
      return {
        el,
        x: r * Math.sin(phi) - (s - chord / 2),
        z: r * Math.cos(phi) - depth,
        phi: (phi * 180) / Math.PI,
      }
    })
  })
  for (const { el, x, z, phi } of moves) {
    el.style.setProperty('--gx', `${x.toFixed(2)}px`)
    el.style.setProperty('--gz', `${z.toFixed(2)}px`)
    el.style.setProperty('--gphi', `${phi.toFixed(3)}deg`)
  }
}

export function useCylinder(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const list = ref.current
    if (!list) return
    const desktop = window.matchMedia(CYLINDER)
    const cards = [...list.querySelectorAll<HTMLElement>(':scope > .project')]
    let front = -1
    let done = '' // the scroll position and card step last drawn

    const update = (e?: Event) => {
      const key = `${desktop.matches}|${window.scrollX}|${cardStep()}`
      if (key === done && e?.type !== 'resize') return // nothing moved since
      done = key
      if (!desktop.matches) {
        spin = 0
        list.style.removeProperty('--spin')
        cards.forEach((c) => {
          c.removeAttribute('data-front')
          c.removeAttribute('data-back')
          c.style.removeProperty('--bend')
        })
        front = -1
        return
      }
      const step = cardStep()
      const at = step ? window.scrollX / step : 0 // in cards, 0 = first card in front
      spin = (at * 360) / cards.length
      list.style.setProperty('--spin', `${spin.toFixed(3)}deg`)
      const n = cards.length
      cards.forEach((c, k) => {
        const theta = ((k * 360) / n - spin) * (Math.PI / 180)
        // cards turned away can't be hovered or clicked through the front ones
        c.toggleAttribute('data-back', Math.cos(theta) < -0.05)
        // the text straightens with its card (curvedCards draws the card the same way)
        c.style.setProperty('--bend', cardBend(theta, (2 * Math.PI) / n).toFixed(3))
      })
      const i = ((Math.round(at) % n) + n) % n
      if (i !== front) {
        cards[front]?.removeAttribute('data-front')
        cards[i]?.setAttribute('data-front', '')
        front = i
      }
    }

    // the letters' places only change with the layout (fonts, window size)
    const bend = () => desktop.matches && bendText(list)
    const relayout = new ResizeObserver(bend)
    relayout.observe(list)
    document.fonts?.ready.then(bend)

    update()
    sync = update
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    desktop.addEventListener('change', update)
    return () => {
      if (sync === update) sync = null
      relayout.disconnect()
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
      desktop.removeEventListener('change', update)
      list.style.removeProperty('--spin')
      cards.forEach((c) => {
        c.removeAttribute('data-front')
        c.removeAttribute('data-back')
        c.style.removeProperty('--bend')
      })
    }
  }, [ref])
}
