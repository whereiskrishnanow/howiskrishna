import { useEffect, useRef, useState } from 'react'

// Replaces the mouse pointer with a small drop of liquid glass. While moving,
// a tail of blobs trails behind on springs; one smooth outline is drawn around
// the head and tail, and the glass (a blurred, brightened view of the page
// through it, with a lit rim) is cut to that outline. When the pointer stops
// the tail catches up, wobbles and settles back into a round drop.
// Mouse/trackpad only; touch screens keep their normal behaviour.

const BOX = 170 // px, drawing area around the dot (the tail stays inside it)
const HEAD = 10 // px radius of the drop at rest (20px across)
const TAIL = [9.2, 8.4, 7.6, 6.8, 6, 5.3, 4.6, 4] // radii of the trailing blobs, nearest first
const FOLLOW = 0.03 // s; how quickly the dot catches up with the pointer (smooths jitter)
const STIFFNESS = 1700 // spring pull toward the blob ahead, per second squared
const DAMPING_RATIO = 0.7 // < 1 leaves a soft wobble as it settles
const LINK = 8.5 // px; furthest a blob can trail the one ahead, so the slime never breaks apart
const STEP = 1 / 240 // physics step in seconds, so motion is the same at any refresh rate
const MAX_STRETCH = BOX / 2 - 8 // keep the tail inside the drawing area

type Blob = { x: number; y: number; vx: number; vy: number }
type Pt = { x: number; y: number; r: number }

const f = (n: number) => n.toFixed(2)

/** One smooth outline around a chain of circles (head first), as an SVG path. */
function outline(pts: Pt[]): string {
  const head = pts[0]
  const spread = Math.max(...pts.map((p) => Math.hypot(p.x - head.x, p.y - head.y)))
  if (spread < 0.6) {
    const { x, y, r } = head
    return `M${f(x + r)} ${f(y)}A${f(r)} ${f(r)} 0 1 0 ${f(x - r)} ${f(y)}A${f(r)} ${f(r)} 0 1 0 ${f(x + r)} ${f(y)}Z`
  }
  // drop points that sit on top of the one before (no direction to work with)
  const chain: Pt[] = [head]
  for (const p of pts.slice(1)) {
    const q = chain[chain.length - 1]
    if (Math.hypot(p.x - q.x, p.y - q.y) > 0.4) chain.push(p)
  }
  const n = chain.length
  const left: { x: number; y: number }[] = []
  const right: { x: number; y: number }[] = []
  let tx = 0
  let ty = 0
  chain.forEach((p, i) => {
    const a = chain[Math.max(0, i - 1)]
    const b = chain[Math.min(n - 1, i + 1)]
    const dx = b.x - a.x
    const dy = b.y - a.y
    const d = Math.hypot(dx, dy)
    if (d > 0.001) {
      tx = dx / d
      ty = dy / d
    }
    left.push({ x: p.x - ty * p.r, y: p.y + tx * p.r })
    right.push({ x: p.x + ty * p.r, y: p.y - tx * p.r })
  })
  // smooth curve through a polyline: quadratic curves via the midpoints
  const smooth = (pl: { x: number; y: number }[]) => {
    let d = ''
    for (let i = 1; i < pl.length - 1; i++) {
      const mx = (pl[i].x + pl[i + 1].x) / 2
      const my = (pl[i].y + pl[i + 1].y) / 2
      d += `Q${f(pl[i].x)} ${f(pl[i].y)} ${f(mx)} ${f(my)}`
    }
    const e = pl[pl.length - 1]
    return d + `L${f(e.x)} ${f(e.y)}`
  }
  const tail = chain[n - 1]
  const rev = [...right].reverse()
  return (
    `M${f(left[0].x)} ${f(left[0].y)}` +
    smooth(left) +
    `A${f(tail.r)} ${f(tail.r)} 0 0 0 ${f(rev[0].x)} ${f(rev[0].y)}` + // round tail end
    smooth(rev) +
    `A${f(head.r)} ${f(head.r)} 0 0 0 ${f(left[0].x)} ${f(left[0].y)}Z` // round front
  )
}

export function DotCursor() {
  const [enabled, setEnabled] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const rim = useRef<SVGPathElement>(null)
  const line = useRef<SVGPathElement>(null)
  const glass = useRef<HTMLDivElement>(null)

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
      // the outline, in the box's own coordinates (head at the centre)
      const ox = BOX / 2 - head.x
      const oy = BOX / 2 - head.y
      const d = outline([
        { x: head.x + ox, y: head.y + oy, r: HEAD },
        ...blobs.map((b, i) => ({ x: b.x + ox, y: b.y + oy, r: TAIL[i] })),
      ])
      if (glass.current) glass.current.style.clipPath = `path('${d}')`
      rim.current?.setAttribute('d', d)
      line.current?.setAttribute('d', d)
    }

    const step = (dt: number) => {
      const ease = 1 - Math.exp(-dt / FOLLOW)
      head.x += (target.x - head.x) * ease
      head.y += (target.y - head.y) * ease
      let lead = head
      let prev: { x: number; y: number } | null = null
      for (const b of blobs) {
        // a damped spring toward the blob ahead of it
        b.vx += ((lead.x - b.x) * STIFFNESS - b.vx * damping) * dt
        b.vy += ((lead.y - b.y) * STIFFNESS - b.vy * damping) * dt
        b.x += b.vx * dt
        b.y += b.vy * dt
        // stay attached to the blob ahead: stretch, never snap off into droplets
        let lx = b.x - lead.x
        let ly = b.y - lead.y
        let ld = Math.hypot(lx, ly)
        if (ld > LINK) {
          b.x = lead.x + (lx / ld) * LINK
          b.y = lead.y + (ly / ld) * LINK
          lx = b.x - lead.x
          ly = b.y - lead.y
          ld = LINK
        }
        // no sharp kinks: bend at most ~50° from the segment ahead, so the
        // outline stays a smooth curve instead of folding into a hook
        if (prev && ld > 0.5) {
          const px = lead.x - prev.x
          const py = lead.y - prev.y
          const pd = Math.hypot(px, py)
          if (pd > 0.5) {
            const cos = (lx * px + ly * py) / (ld * pd)
            if (cos < 0.64) {
              const blend = 0.35
              b.x += ((lead.x + (px / pd) * ld) - b.x) * blend
              b.y += ((lead.y + (py / pd) * ld) - b.y) * blend
            }
          }
        }
        // never let the tail outgrow the drawing area
        const dx = b.x - head.x
        const dy = b.y - head.y
        const d = Math.hypot(dx, dy)
        if (d > MAX_STRETCH) {
          b.x = head.x + (dx / d) * MAX_STRETCH
          b.y = head.y + (dy / d) * MAX_STRETCH
        }
        prev = lead
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

  return (
    <div ref={box} className="glass-cursor" aria-hidden="true" style={{ width: BOX, height: BOX }}>
      <div ref={glass} className="glass-cursor-glass">
        <div className="glass-cursor-color glass-cursor-color-a" />
        <div className="glass-cursor-color glass-cursor-color-b" />
      </div>
      <svg className="glass-cursor-rim" viewBox={`0 0 ${BOX} ${BOX}`} width={BOX} height={BOX}>
        <defs>
          {/* light from the upper left: bright there, faint opposite */}
          <linearGradient id="glass-rim" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity="0.95" />
            <stop offset="0.45" stopColor="#fff" stopOpacity="0.15" />
            <stop offset="1" stopColor="#fff" stopOpacity="0.55" />
          </linearGradient>
          <radialGradient id="glass-sheen" cx="0.3" cy="0.25" r="0.8">
            <stop offset="0" stopColor="#fff" stopOpacity="0.32" />
            <stop offset="0.6" stopColor="#fff" stopOpacity="0.04" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
        </defs>
        <path ref={line} className="glass-cursor-line" />
        <path ref={rim} className="glass-cursor-edge" />
      </svg>
    </div>
  )
}
