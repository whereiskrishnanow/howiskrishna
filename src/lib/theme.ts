import { isLite } from './device'

// Light or dark. The choice is remembered per browser; with none saved, the
// system setting decides. index.html applies it before the first paint (so a
// dark page never flashes light); this module switches it afterwards.

export type Theme = 'light' | 'dark'

const KEY = 'theme'
let pulling = false

export const currentTheme = (): Theme =>
  document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'

const apply = (theme: Theme) => {
  document.documentElement.dataset.theme = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#131313' : '#eeeeee')
  window.dispatchEvent(new Event('portfolio:theme'))
}

// On desktop the switch pulls the old background away like a sheet (src/sheet,
// three.js: loaded only when the switch is first used).
const fancy = () =>
  !isLite() &&
  !window.matchMedia('(prefers-reduced-motion: reduce)').matches &&
  !!document.querySelector('canvas.cloth')
const sheet = () => import('../sheet/pullSheet')

/** Get the sheet animation ready (on hover over the switch). */
export const warmTheme = () => {
  if (fancy()) sheet().catch(() => {})
}

/** Switch theme. Returns false if a switch is already playing. */
export function setTheme(theme: Theme) {
  if (pulling) return false
  try {
    localStorage.setItem(KEY, theme)
  } catch {
    // private mode etc.: still switches, just isn't remembered
  }
  if (!fancy()) {
    apply(theme) // phones and reduced motion: a plain fade
    return true
  }
  pulling = true
  const tone = () => window.dispatchEvent(new CustomEvent('portfolio:cloth-tone', { detail: theme }))
  sheet()
    .then((m) => m.pullSheet(() => apply(theme), tone))
    .catch(() => {}) // no WebGL etc.: just switch
    .finally(() => {
      pulling = false
      if (currentTheme() !== theme) {
        tone()
        apply(theme)
      }
    })
  return true
}
