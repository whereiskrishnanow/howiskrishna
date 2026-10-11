import { isLite } from './device'

// Light or dark. The choice is remembered per browser; with none saved, the
// system setting decides. index.html applies it before the first paint (so a
// dark page never flashes light); this module switches it afterwards.

export type Theme = 'light' | 'dark'

const KEY = 'theme'

export const currentTheme = (): Theme =>
  document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'

const apply = (theme: Theme) => {
  document.documentElement.dataset.theme = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#131313' : '#eeeeee')
  window.dispatchEvent(new Event('portfolio:theme'))
}

/**
 * Switch theme. On desktop the new theme spreads out from (x, y) as a growing
 * circle, like light falling across the page (or night closing in); phones and
 * reduced motion get a plain cross-fade.
 */
export function setTheme(theme: Theme, x: number, y: number) {
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
    const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))
    root.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
      { duration: 900, easing: 'cubic-bezier(0.65, 0, 0.35, 1)', pseudoElement: '::view-transition-new(root)' },
    )
  })
  t.finished.finally(() => root.classList.remove('theme-switching'))
}
