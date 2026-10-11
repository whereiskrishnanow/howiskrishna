import { useEffect, useState } from 'react'
import { currentTheme, setTheme, warmTheme, type Theme } from '../lib/theme'
import { Scramble } from './Scramble'

// The light/dark switch: a small sun that an eclipse turns into a crescent moon.
// Going dark, the rays draw in and a shadow slides across the disc; going light,
// the shadow slides off and the rays come back out. On hover the rays turn (or
// the moon rocks) and the name of the other mode decodes beside it.

const RAYS = Array.from({ length: 8 }, (_, i) => (i * 360) / 8)

export function ThemeSwitch() {
  const [theme, setLocal] = useState<Theme>(currentTheme)
  const [hover, setHover] = useState(false)

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
      data-theme-state={theme}
      aria-label={`Switch to ${next} mode`}
      onPointerEnter={(e) => {
        warmTheme()
        if (e.pointerType !== 'touch') setHover(true)
      }}
      onPointerLeave={() => setHover(false)}
      onFocus={(e) => e.currentTarget.matches(':focus-visible') && setHover(true)}
      onBlur={() => setHover(false)}
      // the icon turns straight away; the page follows as the sheet comes off
      onClick={() => setTheme(next) && setLocal(next)}
    >
      <span className="theme-switch-label" aria-hidden="true">
        <Scramble key={next} text={next === 'dark' ? 'Dark' : 'Light'} active={hover} duration={380} />
      </span>
      <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
        <defs>
          <mask id="theme-eclipse">
            <rect width="24" height="24" fill="#fff" />
            <circle className="theme-switch-shadow" cx="12" cy="12" r="6.6" fill="#000" />
          </mask>
        </defs>
        <g className="theme-switch-rays">
          {RAYS.map((a) => (
            <line key={a} x1="12" y1="2.2" x2="12" y2="4.4" transform={`rotate(${a} 12 12)`} />
          ))}
        </g>
        <circle className="theme-switch-disc" cx="12" cy="12" r="4.6" mask="url(#theme-eclipse)" />
      </svg>
    </button>
  )
}
