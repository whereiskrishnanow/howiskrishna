import { isLite } from './device'

// Light or dark. The choice is remembered per browser; with none saved, the
// system setting decides. index.html applies it before the first paint (so a
// dark page never flashes light); this module switches it afterwards.

export type Theme = 'light' | 'dark'

const KEY = 'theme'
export const PULL_MS = 1150 // how long the sheet takes to be pulled away

export const currentTheme = (): Theme =>
  document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'

const apply = (theme: Theme) => {
  document.documentElement.dataset.theme = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#131313' : '#eeeeee')
  window.dispatchEvent(new Event('portfolio:theme'))
}

/**
 * Switch theme. On desktop the old page is a sheet of cloth that someone grabs
 * by its bottom-left corner, tugs, then whips away, uncovering the new cloth
 * underneath. Phones and reduced motion get a plain cross-fade.
 */
export function setTheme(theme: Theme) {
  try {
    localStorage.setItem(KEY, theme)
  } catch {
    // private mode etc.: still switches, just isn't remembered
  }
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (!document.startViewTransition || reduced || isLite()) return apply(theme)

  const root = document.documentElement
  root.classList.add('theme-switching')
  const t = document.startViewTransition(() => apply(theme))
  t.ready.then(() => {
    // the sheet underneath feels it go: see ClothBackground
    window.dispatchEvent(new CustomEvent('portfolio:sheet-pull', { detail: PULL_MS }))
    root.animate(sheetKeyframes(theme === 'dark' ? 'light' : 'dark'), {
      duration: PULL_MS,
      easing: 'linear', // the timing is in the keyframes
      fill: 'forwards',
      pseudoElement: '::view-transition-old(root)',
    })
  })
  t.finished.finally(() => root.classList.remove('theme-switching'))
}

// ---- the sheet ----

const FRAMES = 48
const TUG = 0.2 // share of the time spent on the first little tug
const EDGE_POINTS = 18 // per side of the sheet's outline

const smooth = (x: number) => x * x * (3 - 2 * x)

/**
 * How far the sheet has gone (0 → 1) at time t: a small tug toward the corner
 * that settles back a touch, a beat of tension, then a sudden yank that keeps
 * accelerating until the sheet is gone.
 */
function pull(t: number) {
  if (t < TUG) {
    const s = t / TUG
    return 0.03 * Math.sin(s * Math.PI * 0.85) // out, and a little back
  }
  const s = (t - TUG) / (1 - TUG)
  return 0.03 * Math.sin(Math.PI * 0.85) + (1 - 0.03 * Math.sin(Math.PI * 0.85)) * s ** 1.9
}

/**
 * The sheet's outline in its own (unmoved) coordinates: a rectangle whose edges
 * ripple more the further they are from the hand at the bottom-left corner,
 * with the far top-right corner folding over as the cloth goes slack.
 */
function outline(W: number, H: number, p: number, t: number) {
  const slack = Math.min(1, p * 3.2) // cloth goes loose once it's moving
  const amp = (0.012 + 0.05 * slack) * Math.min(W, H)
  const phase = t * 22 // waves run along the edges, away from the hand
  const fold = slack * 0.42 * Math.min(W, H) // size of the flopped-over corner
  // distance from the held corner, 0..1
  const far = (x: number, y: number) => Math.min(1, (x / W + (H - y) / H) / 1.6)
  const wave = (d: number, k: number) => 0.5 + 0.5 * Math.sin(d * k - phase)

  const pts: [number, number][] = []
  // top edge, left → right, stopping where the corner folds over (ripples push
  // into the sheet, downward)
  for (let i = 0; i <= EDGE_POINTS; i++) {
    const x = ((W - fold) * i) / EDGE_POINTS
    pts.push([x, amp * wave(x / W, 9) * far(x, 0)])
  }
  // the fold: a slightly bowed crease across the top-right corner
  pts.push([W - fold * 0.52, fold * 0.52])
  // right edge, top → bottom, from below the fold (ripples push leftward)
  for (let i = 0; i <= EDGE_POINTS; i++) {
    const y = fold + ((H - fold) * i) / EDGE_POINTS
    pts.push([W - amp * wave((H - y) / H, 8) * far(W, y), y])
  }
  // bottom and left edges hang from the hand: they barely ripple
  for (let i = 1; i <= EDGE_POINTS; i++) {
    const x = W - (W * i) / EDGE_POINTS
    pts.push([x, H - amp * 0.35 * wave(x / W, 11) * far(x, H)])
  }
  for (let i = 1; i < EDGE_POINTS; i++) {
    const y = H - (H * i) / EDGE_POINTS
    pts.push([amp * 0.35 * wave((H - y) / H, 10) * far(0, y), y])
  }
  return pts.map(([x, y]) => `${x.toFixed(1)}px ${y.toFixed(1)}px`).join(', ')
}

function sheetKeyframes(from: Theme): Keyframe[] {
  const W = window.innerWidth
  const H = window.innerHeight
  return Array.from({ length: FRAMES + 1 }, (_, i) => {
    const t = i / FRAMES
    const p = pull(t)
    const lift = smooth(Math.min(1, p * 2.5))
    // gathered into the hand (it shrinks toward the corner), swinging as it goes
    const transform = [
      `translate(${(-0.7 * W * p).toFixed(1)}px, ${(0.62 * H * p).toFixed(1)}px)`,
      `rotate(${(-9 * p + 1.2 * Math.sin(t * 9) * lift).toFixed(2)}deg)`,
      `skew(${(10 * p).toFixed(2)}deg, ${(-4 * p).toFixed(2)}deg)`,
      `scale(${(1 - 0.5 * p).toFixed(3)}, ${(1 - 0.32 * p).toFixed(3)})`,
    ].join(' ')
    // tilting off the table, a light sheet falls into shade; a dark one catches the light
    const filter = from === 'light' ? `brightness(${(1 - 0.16 * lift).toFixed(3)})` : `brightness(${(1 + 0.5 * lift).toFixed(3)})`
    return { offset: t, transform, clipPath: `polygon(${outline(W, H, p, t)})`, filter }
  })
}
