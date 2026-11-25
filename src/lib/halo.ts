// Opening a card: the detail page is revealed through a circle that opens
// from where you clicked, quickly at first and then easing out, with a wide,
// faint band of the card's own colours riding its edge. The old page goes slightly soft
// as it's covered; the new one comes into focus. Runs as a view transition:
// styles.css ("Page transition: halo") masks the new page; this animates it
// and draws the light on a canvas that rides above both pages.

const DURATION = 1400 // ms
const BAND = 210 // px, the band's width scale: it spans about 3x this either side of the edge
const FEATHER = 170 // px, the softness of the circle's edge
const TINT = 0.3 // the colours' strength: faint
const BLUR_OUT = 2 // px, the old page as it's covered
const BLUR_IN = 2 // px, the new page as it's revealed

export type RGB = [number, number, number]

// how far the edge has travelled, 0..1: quick at first, then a long ease out
const RATE = 6
const spread = (t: number) => (1 - 2 ** (-RATE * t)) / (1 - 2 ** -RATE)
// the colours swell in and fade away through the transition
const flare = (t: number) => Math.min(1, t / 0.08) * (1 - t ** 1.6)
// the band's profile across the edge (x in BAND units)
const profile = (x: number) => Math.exp(-1.1 * (x / 2) ** 2)

// the band's colour at x (-3 inside .. 3 outside): a smooth blend through the palette
const blend = (palette: RGB[], x: number) => {
  let total = 0
  const c = [0, 0, 0]
  const mid = (palette.length - 1) / 2
  palette.forEach((p, i) => {
    const w = Math.exp(-(((x - (i - mid) * (3 / Math.max(mid, 1)) * 0.6) / 0.9) ** 2))
    total += w
    for (let k = 0; k < 3; k++) c[k] += p[k] * w
  })
  return c.map((v) => Math.round(v / total))
}

const hex = (h: string): RGB => {
  let s = h.trim().replace('#', '')
  if (s.length === 3) s = [...s].map((c) => c + c).join('')
  const n = Number.parseInt(s, 16)
  return Number.isNaN(n) ? [128, 128, 128] : [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
const lighten = (c: RGB, by: number): RGB => c.map((v) => Math.round(v + (255 - v) * by)) as RGB

/**
 * A card's colours for the halo: its picture's liveliest few, ordered deep to
 * pale (deep on the inside of the band). Falls back to shades of its tint.
 */
export function cardPalette(img: HTMLImageElement | null, tint: string): RGB[] {
  const fallback = [0.05, 0.25, 0.45, 0.6].map((by) => lighten(hex(tint), by))
  if (!img?.complete || !img.naturalWidth) return fallback
  try {
    const c = document.createElement('canvas')
    c.width = c.height = 4
    const ctx = c.getContext('2d', { willReadFrequently: true })!
    ctx.drawImage(img, 0, 0, 4, 4)
    const data = ctx.getImageData(0, 0, 4, 4).data
    const px: RGB[] = []
    for (let i = 0; i < data.length; i += 4) px.push([data[i], data[i + 1], data[i + 2]])
    const sat = ([r, g, b]: RGB) => Math.max(r, g, b) - Math.min(r, g, b)
    const light = ([r, g, b]: RGB) => 0.3 * r + 0.59 * g + 0.11 * b
    // the most colourful samples, nudged lighter so the band reads as light, not shadow
    return px
      .sort((a, b) => sat(b) + light(b) * 0.25 - (sat(a) + light(a) * 0.25))
      .slice(0, 4)
      .sort((a, b) => light(a) - light(b))
      .map((p, i) => lighten(p, 0.12 + i * 0.08))
  } catch {
    return fallback
  }
}

/**
 * Switch pages (`update`) behind a halo opening from (x, y). Returns the view
 * transition. The caller checks that view transitions are supported.
 */
export function haloTransition({ x, y, palette }: { x: number; y: number; palette: RGB[] }, update: () => void) {
  const stops = Array.from({ length: 25 }, (_, i) => {
    const at = -3 + i / 4
    return { x: at, rgb: blend(palette, at).join(','), a: profile(at) * TINT }
  })
  const root = document.documentElement
  const vw = window.innerWidth
  const vh = window.innerHeight
  const reach = Math.max(Math.hypot(x, y), Math.hypot(vw - x, y), Math.hypot(x, vh - y), Math.hypot(vw - x, vh - y)) + 3 * BAND

  root.style.setProperty('--halo-ox', `${x}px`)
  root.style.setProperty('--halo-oy', `${y}px`)
  root.style.setProperty('--halo-feather', `${FEATHER}px`)
  root.dataset.transition = 'halo'

  // the light, drawn at half resolution (it's all soft)
  const canvas = document.createElement('canvas')
  canvas.className = 'halo'
  canvas.setAttribute('aria-hidden', 'true')
  canvas.width = Math.ceil(vw / 2)
  canvas.height = Math.ceil(vh / 2)
  const ctx = canvas.getContext('2d')!
  ctx.scale(0.5, 0.5)
  const draw = (r: number, alpha: number) => {
    ctx.clearRect(0, 0, vw, vh)
    if (alpha <= 0) return
    const inner = Math.max(0, r - 3 * BAND)
    const outer = r + 3 * BAND
    const g = ctx.createRadialGradient(x, y, inner, x, y, outer)
    for (const s of stops) {
      const at = (r + s.x * BAND - inner) / (outer - inner)
      if (at < 0) continue // inside the circle's centre: nothing to draw yet
      g.addColorStop(Math.min(1, at), `rgba(${s.rgb},${(s.a * alpha).toFixed(3)})`)
    }
    ctx.fillStyle = g
    ctx.fillRect(0, 0, vw, vh)
  }

  // the light belongs to the new page, so it isn't in the old page's snapshot
  const transition = document.startViewTransition(() => {
    update()
    root.appendChild(canvas)
  })

  let raf = 0
  transition.ready.then(
    () => {
      const run = (pseudoElement: string, keyframes: Keyframe[], easing = 'linear') =>
        root.animate(keyframes, { duration: DURATION, fill: 'both', easing, pseudoElement })
      const ease = `linear(${Array.from({ length: 41 }, (_, i) => spread(i / 40).toFixed(4)).join(', ')})`
      const open = run('::view-transition-new(root)', [{ '--halo-r': '0px' }, { '--halo-r': `${reach}px` }], ease)
      run('::view-transition-old(root)', [
        { filter: 'blur(0px)' },
        { filter: `blur(${BLUR_OUT}px)`, offset: 0.6 },
        { filter: `blur(${BLUR_OUT}px)` },
      ])
      run('::view-transition-new(root)', [
        { filter: `blur(${BLUR_IN}px)` },
        { filter: 'blur(0px)', offset: 0.6 },
        { filter: 'blur(0px)' },
      ])
      const frame = () => {
        const t = Math.min(1, Number(open.currentTime ?? 0) / DURATION)
        draw(reach * spread(t), flare(t))
        if (t < 1) raf = requestAnimationFrame(frame)
      }
      frame()
    },
    () => {}, // skipped: the page has switched anyway
  )
  transition.finished.finally(() => {
    cancelAnimationFrame(raf)
    canvas.remove()
    for (const p of ['--halo-ox', '--halo-oy', '--halo-feather']) root.style.removeProperty(p)
    // the new page can start its heavier work now (CaseStudyPage's screenshots)
    window.dispatchEvent(new Event('portfolio:settled'))
  })
  return transition
}
