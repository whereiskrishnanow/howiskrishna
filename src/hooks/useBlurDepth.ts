import { useEffect, type RefObject } from 'react'
import { isLite } from '../lib/device'

// Gives each card's blur some depth. The card turns slightly toward the cursor
// in 3D, and the blur layers sit at different depths behind the crisp top edge:
// the softer a layer, the further back it floats, so it shifts more as the view
// angle changes (parallax) and the glow reads as a volume rather than a flat
// picture. Sets --tx / --ty (each -1..1, where the cursor is relative to the card)
// on every card; styles.css turns them into the tilt and the per-layer shift.
// Mouse/trackpad only; phones and reduced motion keep the cards flat.

const REACH = 0.6 // of the viewport: how far from a card the cursor still turns it fully
const EASE = 0.22 // s; how softly the cards follow the cursor

export function useBlurDepth(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const list = ref.current
    if (!list || isLite() || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return

    const cards = [...list.querySelectorAll<HTMLElement>('.project')]
    const media = cards.map((c) => c.querySelector<HTMLElement>('.media'))
    const state = cards.map(() => ({ x: 0, y: 0 }))
    const pointer = { x: 0, y: 0, inside: false }
    let raf = 0
    let last = 0

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const k = 1 - Math.exp(-dt / EASE)
      const reachX = window.innerWidth * REACH
      const reachY = window.innerHeight * REACH
      // read every position first, then write, so the browser lays out once
      const targets = media.map((m) => {
        if (!m || !pointer.inside) return { x: 0, y: 0 }
        const r = m.getBoundingClientRect()
        const clamp = (v: number) => Math.max(-1, Math.min(1, v))
        return {
          x: clamp((pointer.x - (r.left + r.width / 2)) / reachX),
          y: clamp((pointer.y - (r.top + r.height / 2)) / reachY),
        }
      })
      let moving = false
      cards.forEach((card, i) => {
        const s = state[i]
        s.x += (targets[i].x - s.x) * k
        s.y += (targets[i].y - s.y) * k
        if (Math.abs(targets[i].x - s.x) + Math.abs(targets[i].y - s.y) > 0.0005) moving = true
        card.style.setProperty('--tx', s.x.toFixed(4))
        card.style.setProperty('--ty', s.y.toFixed(4))
      })
      raf = moving ? requestAnimationFrame(frame) : 0
    }

    const wake = () => {
      if (raf) return
      last = performance.now()
      raf = requestAnimationFrame(frame)
    }
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return
      pointer.x = e.clientX
      pointer.y = e.clientY
      pointer.inside = true
      wake()
    }
    const onLeave = () => {
      pointer.inside = false
      wake()
    }
    const root = document.documentElement

    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('wheel', wake, { passive: true }) // cards slide under a still cursor
    window.addEventListener('scroll', wake, { passive: true })
    root.addEventListener('pointerleave', onLeave)
    window.addEventListener('blur', onLeave)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('wheel', wake)
      window.removeEventListener('scroll', wake)
      root.removeEventListener('pointerleave', onLeave)
      window.removeEventListener('blur', onLeave)
      cards.forEach((c) => {
        c.style.removeProperty('--tx')
        c.style.removeProperty('--ty')
      })
    }
  }, [ref])
}
