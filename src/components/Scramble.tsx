import { useEffect, useRef } from 'react'

// Text that "decodes": each character flickers through numbers, symbols and
// shapes, then settles into the real letter, roughly left to right. Every
// character keeps the width of its real letter, so nothing reflows while it runs.

const GLYPHS = '0123456789#%&*+=<>/?$@◆●▲■◇○△□✦✕'
const FLICKER = 40 // ms between glyph changes
const pick = () => GLYPHS[Math.floor(Math.random() * GLYPHS.length)]

type Props = {
  text: string
  /** Plays whenever this turns true; while false the real text just shows. */
  active?: boolean
  /** Total time for the whole line to resolve, in ms. */
  duration?: number
  /** Time spent showing only glyphs before letters start to resolve, in ms. */
  delay?: number
}

export function Scramble({ text, active = true, duration = 1200, delay = 0 }: Props) {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const chars = Array.from(ref.current?.querySelectorAll<HTMLElement>('.scramble-char') ?? [])
    const settle = () => chars.forEach((c) => c.classList.add('is-done'))
    if (!active || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      settle()
      return
    }

    // Each character resolves at its own moment: mostly in reading order, with
    // some randomness so it feels like decoding rather than typing.
    const n = chars.length
    const resolveAt = chars.map((_, i) => delay + (i / n) * duration * 0.7 + Math.random() * duration * 0.3)
    chars.forEach((c) => {
      c.classList.remove('is-done')
      c.dataset.glyph = pick()
    })

    const start = performance.now()
    let lastFlicker = start
    let raf = 0
    const tick = (now: number) => {
      const t = now - start
      const flicker = now - lastFlicker >= FLICKER
      if (flicker) lastFlicker = now
      let remaining = 0
      chars.forEach((c, i) => {
        if (t >= resolveAt[i]) c.classList.add('is-done')
        else {
          remaining++
          if (flicker) c.dataset.glyph = pick()
        }
      })
      raf = remaining ? requestAnimationFrame(tick) : 0
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [active, text, duration, delay])

  return (
    <span ref={ref}>
      <span className="sr-only">{text.replace(/\n/g, ' ')}</span>
      <span aria-hidden="true">
        {[...text].map((ch, i) =>
          ch === '\n' ? (
            // a space too, so the words stay apart wherever the break is hidden
            <span key={i}>
              {' '}
              <br />
            </span>
          ) : ch === ' ' ? (
            ' '
          ) : (
            <span key={i} className="scramble-char">
              {ch}
            </span>
          ),
        )}
      </span>
    </span>
  )
}
