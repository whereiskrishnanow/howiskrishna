import { useEffect, type RefObject } from 'react'
import { isLite } from '../lib/device'

// The cards' blur tails lean gently the way the cursor is moving, then ease
// back once it stops. Sets --tail-x / --tail-y (each -1..1) on the element;
// the CSS turns them into a small offset that grows with each blur layer's depth.
// Mouse/trackpad only; phones and reduced motion keep the tails still.

const FULL_SPEED = 1200 // px/s of cursor speed for the full lean
const SPEED_SMOOTHING = 0.06 // s; averages out jittery pointer events
const SPEED_DECAY = 0.12 // s; how quickly the lean lets go once the cursor stops
const STIFFNESS = 45 // spring pulling the tail toward its lean, per s²
const DAMPING_RATIO = 0.85 // just under 1: a soft settle, barely a sway

export function useBlurTail(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current
    if (!el || isLite() || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return

    const damping = 2 * DAMPING_RATIO * Math.sqrt(STIFFNESS)
    const speed = { x: 0, y: 0 } // smoothed cursor velocity, px/s
    const tail = { x: 0, y: 0, vx: 0, vy: 0 } // the lean and its velocity
    let lastMove = { x: 0, y: 0, t: 0 }
    let raf = 0
    let last = 0

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const decay = Math.exp(-dt / SPEED_DECAY)
      speed.x *= decay
      speed.y *= decay
      for (const axis of ['x', 'y'] as const) {
        const target = Math.max(-1, Math.min(1, speed[axis] / FULL_SPEED))
        const v = axis === 'x' ? 'vx' : 'vy'
        tail[v] += ((target - tail[axis]) * STIFFNESS - tail[v] * damping) * dt
        tail[axis] += tail[v] * dt
      }
      el.style.setProperty('--tail-x', tail.x.toFixed(4))
      el.style.setProperty('--tail-y', tail.y.toFixed(4))
      const settled =
        Math.abs(speed.x) + Math.abs(speed.y) < 1 &&
        Math.abs(tail.x) + Math.abs(tail.y) < 0.001 &&
        Math.abs(tail.vx) + Math.abs(tail.vy) < 0.001
      raf = settled ? 0 : requestAnimationFrame(frame)
    }

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return
      const t = e.timeStamp
      const dt = (t - lastMove.t) / 1000
      if (lastMove.t && dt > 0 && dt < 0.1) {
        const k = 1 - Math.exp(-dt / SPEED_SMOOTHING)
        speed.x += ((e.clientX - lastMove.x) / dt - speed.x) * k
        speed.y += ((e.clientY - lastMove.y) / dt - speed.y) * k
      }
      lastMove = { x: e.clientX, y: e.clientY, t }
      if (!raf) {
        last = performance.now()
        raf = requestAnimationFrame(frame)
      }
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onMove)
      el.style.removeProperty('--tail-x')
      el.style.removeProperty('--tail-y')
    }
  }, [ref])
}
