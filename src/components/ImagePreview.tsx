import { useEffect, useLayoutEffect, useRef, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import { createPortal } from 'react-dom'

// A full-screen preview of a case study's screenshot. The picture grows out of
// its place in the article into the middle of the screen, over the page
// blurred away behind it, with its caption underneath. Arrow keys, the side
// arrows or a swipe step through the page's screenshots; Esc, a click or the
// close button shrinks it back into place.

export type Shot = { src: string; alt: string; title?: string; text?: string }

type Props = {
  shots: Shot[]
  index: number
  onIndex: (index: number) => void
  onClose: () => void
}

const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)' // the site's --ease-out
const thumb = (i: number) => document.querySelector<HTMLElement>(`[data-shot="${i}"] img`)
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** The transform that puts `el` (laid out where it ends up) over `from`. */
function flip(el: Element, from: Element) {
  const a = from.getBoundingClientRect()
  const b = el.getBoundingClientRect()
  const dx = a.left + a.width / 2 - (b.left + b.width / 2)
  const dy = a.top + a.height / 2 - (b.top + b.height / 2)
  return `translate(${dx}px, ${dy}px) scale(${a.width / b.width})`
}

export function ImagePreview({ shots, index, onIndex, onClose }: Props) {
  const root = useRef<HTMLDivElement>(null)
  const img = useRef<HTMLImageElement>(null)
  const closing = useRef(false)
  const first = useRef(true)
  const step = useRef(0) // direction of the last step, for the slide-in
  const shot = shots[index]
  // sized from the screenshot's shape up front, so the opening move can be
  // measured before the full image has painted
  const t = thumb(index)
  const ratio = t instanceof HTMLImageElement && t.naturalWidth ? t.naturalWidth / t.naturalHeight : 1.6

  // the screenshot being previewed leaves its place in the article
  useLayoutEffect(() => {
    const t = thumb(index)
    if (t) t.style.visibility = 'hidden'
    return () => {
      if (t) t.style.visibility = ''
    }
  }, [index])

  // open: grow out of the thumbnail; later steps: slide the next one in
  useLayoutEffect(() => {
    const el = img.current
    const t = thumb(index)
    if (!el || reduced()) return
    if (first.current) {
      first.current = false
      root.current?.animate({ opacity: [0, 1] }, { duration: 320, easing: 'ease' })
      if (t) el.animate({ transform: [flip(el, t), 'none'] }, { duration: 560, easing: EASE })
      return
    }
    el.animate(
      { opacity: [0, 1], transform: [`translateX(${step.current * 28}px)`, 'none'] },
      { duration: 420, easing: EASE },
    )
  }, [index])

  const close = () => {
    if (closing.current) return
    closing.current = true
    const el = img.current
    const t = thumb(index)
    const r = t?.getBoundingClientRect()
    const visible = r && r.bottom > 0 && r.top < window.innerHeight
    if (!el || reduced()) return onClose()
    root.current?.animate({ opacity: [1, 0] }, { duration: 300, easing: 'ease', fill: 'forwards' })
    const a = el.animate(
      visible && t
        ? { transform: ['none', flip(el, t)] }
        : { transform: ['none', 'scale(0.96)'], opacity: [1, 0] },
      { duration: 420, easing: EASE, fill: 'forwards' },
    )
    a.finished.then(onClose, onClose)
  }

  const go = (by: number) => {
    const next = index + by
    if (next < 0 || next >= shots.length) return
    step.current = by
    onIndex(next)
  }

  // keyboard, and keep the page behind still while open
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
      else if (e.key === 'ArrowRight') go(1)
      else if (e.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })
  useEffect(() => {
    const back = document.activeElement as HTMLElement | null
    document.documentElement.classList.add('previewing')
    root.current?.focus({ preventScroll: true })
    return () => {
      document.documentElement.classList.remove('previewing')
      back?.focus({ preventScroll: true })
    }
  }, [])

  // swipe between screenshots on touch screens
  const swipe = useRef<{ x: number; y: number } | null>(null)
  const onPointerDown = (e: ReactPointerEvent) => {
    if (e.pointerType === 'touch') swipe.current = { x: e.clientX, y: e.clientY }
  }
  const onPointerUp = (e: ReactPointerEvent) => {
    const s = swipe.current
    swipe.current = null
    if (!s) return
    const dx = e.clientX - s.x
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(e.clientY - s.y)) {
      go(dx < 0 ? 1 : -1)
      e.preventDefault()
    }
  }

  // straight into <body>, above everything on the page (the switch, the header)
  return createPortal(
    <div
      ref={root}
      className="preview"
      role="dialog"
      aria-modal="true"
      aria-label={shot.alt || 'Screenshot preview'}
      tabIndex={-1}
      onClick={close}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
    >
      <figure className="preview-figure">
        <img
          ref={img}
          key={index}
          src={shot.src}
          alt={shot.alt}
          style={{ '--ratio': ratio } as CSSProperties}
          draggable={false}
        />
        {(shot.title || shot.text || shots.length > 1) && (
          <figcaption key={`c${index}`}>
            <span>
              {shot.title && <strong>{shot.title}</strong>}
              {shot.title && shot.text && ' — '}
              {shot.text}
            </span>
            {shots.length > 1 && (
              <span className="preview-count">
                {index + 1} / {shots.length}
              </span>
            )}
          </figcaption>
        )}
      </figure>

      <button type="button" className="preview-close" aria-label="Close preview" onClick={close}>
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <path d="M3 3l14 14M17 3 3 17" />
        </svg>
      </button>
      {index > 0 && (
        <button
          type="button"
          className="preview-nav preview-prev"
          aria-label="Previous screenshot"
          onClick={(e) => {
            e.stopPropagation()
            go(-1)
          }}
        >
          <svg viewBox="0 0 44 14" aria-hidden="true">
            <path d="M43 7H1.5M7.5 1 1.5 7l6 6" />
          </svg>
        </button>
      )}
      {index < shots.length - 1 && (
        <button
          type="button"
          className="preview-nav preview-next"
          aria-label="Next screenshot"
          onClick={(e) => {
            e.stopPropagation()
            go(1)
          }}
        >
          <svg viewBox="0 0 44 14" aria-hidden="true">
            <path d="M1 7h41.5M36.5 1l6 6-6 6" />
          </svg>
        </button>
      )}
    </div>,
    document.body,
  )
}
