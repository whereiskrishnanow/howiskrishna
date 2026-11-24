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

/** Switch theme; the page fades to the new colours. */
export function setTheme(theme: Theme) {
  try {
    localStorage.setItem(KEY, theme)
  } catch {
    // private mode etc.: still switches, just isn't remembered
  }
  apply(theme)
  return true
}
