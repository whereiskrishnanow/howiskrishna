import { useEffect, useRef, useState } from 'react'

// Replaces the mouse pointer with a small slime-like dot that inverts whatever
// is under it (see .dot-cursor in styles.css). While moving, a tail of blobs
// trails behind on springs and the "goo" filter fuses them into one stretchy
// shape; when the pointer stops they catch up, jiggle, and settle back into a
// round dot. Mouse/trackpad only; touch screens keep their normal behaviour.

const BOX = 200 // px, drawing area around the dot (the tail stays inside it)
const HEAD = 5.4 // px radius of the dot before the goo filter (~9px across after)
const TAIL = [5, 4.6, 4.2, 3.8, 3.4, 3, 2.7, 2.4] // radii of the trailing blobs, nearest first
const FOLLOW = 0.03 // s; how quickly the dot catches up with the pointer (smooths jitter)
const STIFFNESS = 1700 // spring pull toward the blob ahead, per second squared
const DAMPING_RATIO = 0.7 // < 1 leaves a soft wobble as it settles
const LINK = 6.2 // px; furthest a blob can trail the one ahead, so the slime never breaks apart
const STEP = 1 / 240 // physics step in seconds, so motion is the same at any refresh rate
const MAX_STRETCH = BOX / 2 - 8 // keep the tail inside the drawing area

type Blob = { x: number; y: number; vx: number; vy: number }

export function DotCursor() {
  const [enabled, setEnabled] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const tail = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)')
    const update = () => setEnabled(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    const el = box.current
    if (!enabled || !el) return
    const root = document.documentElement
    root.classList.add('dot-cursor-on')
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const target = { x: -999, y: -999 } // the pointer
    const head = { x: -999, y: -999 } // the dot, easing after it
    const blobs: Blob[] = TAIL.map(() => ({ x: -999, y: -999, vx: 0, vy: 0 }))
    const damping = 2 * DAMPING_RATIO * Math.sqrt(STIFFNESS)
    let raf = 0
    let last = 0
    let carry = 0

    const draw = () => {
      el.style.transform = `translate3d(${head.x - BOX / 2}px, ${head.y - BOX / 2}px, 0)`
      blobs.forEach((b, i) => {
        const node = tail.current[i]
        if (node) node.style.transform = `translate3d(${b.x - head.x}px, ${b.y - head.y}px, 0)`
      })
    }

    const step = (dt: number) => {
      const ease = 1 - Math.exp(-dt / FOLLOW)
      head.x += (target.x - head.x) * ease
      head.y += (target.y - head.y) * ease
      let lead = head
      for (const b of blobs) {
        // a damped spring toward the blob ahead of it
        b.vx += ((lead.x - b.x) * STIFFNESS - b.vx * damping) * dt
        b.vy += ((lead.y - b.y) * STIFFNESS - b.vy * damping) * dt
        b.x += b.vx * dt
        b.y += b.vy * dt
        // stay attached to the blob ahead: stretch, never snap off into droplets
        const lx = b.x - lead.x
        const ly = b.y - lead.y
        const ld = Math.hypot(lx, ly)
        if (ld > LINK) {
          b.x = lead.x + (lx / ld) * LINK
          b.y = lead.y + (ly / ld) * LINK
        }
        // never let the tail outgrow the drawing area
        const dx = b.x - head.x
        const dy = b.y - head.y
        const d = Math.hypot(dx, dy)
        if (d > MAX_STRETCH) {
          b.x = head.x + (dx / d) * MAX_STRETCH
          b.y = head.y + (dy / d) * MAX_STRETCH
        }
        lead = b
      }
    }

    const settled = () =>
      Math.abs(target.x - head.x) < 0.05 &&
      Math.abs(target.y - head.y) < 0.05 &&
      blobs.every((b) => Math.abs(b.vx) + Math.abs(b.vy) < 1 && Math.hypot(b.x - head.x, b.y - head.y) < 0.05)

    const frame = (now: number) => {
      const elapsed = Math.min(0.05, (now - last) / 1000) // don't explode after a stall
      last = now
      carry += elapsed
      while (carry >= STEP) {
        step(STEP)
        carry -= STEP
      }
      draw()
      raf = settled() ? 0 : requestAnimationFrame(frame)
    }

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return
      const first = target.x < -900
      target.x = e.clientX
      target.y = e.clientY
      if (first || reduced) {
        // appear in place (or, with reduced motion, follow exactly with no tail)
        head.x = target.x
        head.y = target.y
        for (const b of blobs) Object.assign(b, { x: head.x, y: head.y, vx: 0, vy: 0 })
        draw()
      }
      el.dataset.visible = ''
      if (!reduced && !raf) {
        last = performance.now()
        carry = 0
        raf = requestAnimationFrame(frame)
      }
    }
    const onLeave = () => delete el.dataset.visible

    window.addEventListener('pointermove', onMove, { passive: true })
    root.addEventListener('pointerleave', onLeave)
    window.addEventListener('blur', onLeave)
    return () => {
      cancelAnimationFrame(raf)
      root.classList.remove('dot-cursor-on')
      window.removeEventListener('pointermove', onMove)
      root.removeEventListener('pointerleave', onLeave)
      window.removeEventListener('blur', onLeave)
    }
  }, [enabled])

  if (!enabled) return null

  const blob = (r: number) => ({ width: r * 2, height: r * 2, margin: -r })
  return (
    <>
      <svg className="dot-cursor-defs" aria-hidden="true" focusable="false">
        {/* Blur the blobs together, then cut the soft result back to a hard
            edge: overlapping blobs merge into one gooey shape. */}
        <filter id="dot-goo" x="0" y="0" width="100%" height="100%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.3" />
          <feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" />
        </filter>
      </svg>
      <div ref={box} className="dot-cursor" aria-hidden="true" style={{ width: BOX, height: BOX }}>
        {TAIL.map((r, i) => (
          <div
            key={i}
            ref={(node) => {
              tail.current[i] = node
            }}
            className="dot-cursor-blob"
            style={blob(r)}
          />
        ))}
        <div className="dot-cursor-blob" style={blob(HEAD)} />
      </div>
    </>
  )
}
