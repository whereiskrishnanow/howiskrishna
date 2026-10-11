import { useEffect, useState } from 'react'
import { currentTheme, setTheme, warmTheme, type Theme } from '../lib/theme'
import { Scramble } from './Scramble'

// The light/dark switch: a text link naming the mode it switches to, set like
// the contact links. The new name decodes in when it changes.

export function ThemeSwitch() {
  const [theme, setLocal] = useState<Theme>(currentTheme)

  useEffect(() => {
    const sync = () => setLocal(currentTheme())
    window.addEventListener('portfolio:theme', sync)
    return () => window.removeEventListener('portfolio:theme', sync)
  }, [])

  const next: Theme = theme === 'dark' ? 'light' : 'dark'

  return (
    <button
      type="button"
      className="theme-switch"
      onPointerEnter={warmTheme}
      onFocus={warmTheme}
      // the label changes straight away; the page follows as the sheet comes off
      onClick={() => setTheme(next) && setLocal(next)}
    >
      <Scramble key={next} text={next === 'dark' ? 'Dark mode' : 'Light mode'} duration={500} />
    </button>
  )
}
