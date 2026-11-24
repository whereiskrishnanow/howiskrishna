import { useEffect, useRef, type RefObject } from 'react'
import { startCurvedCards } from '../cylinder/curvedCards'
import { CYLINDER } from '../hooks/useCylinder'

/**
 * Desktop: draws the cylinder's cards bent round it (curvedCards.ts). Marks
 * <html> with .curved-cards while it runs, which hides the flat HTML pictures;
 * without WebGL nothing changes and the flat cards show.
 */
export function CurvedCards({ listRef }: { listRef: RefObject<HTMLElement | null> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const list = listRef.current
    if (!canvas || !list) return
    const desktop = window.matchMedia(CYLINDER)
    const root = document.documentElement
    let stop: (() => void) | null = null

    const sync = () => {
      if (desktop.matches && !stop) {
        stop = startCurvedCards(canvas, list)
        if (stop) root.classList.add('curved-cards')
      } else if (!desktop.matches && stop) {
        stop()
        stop = null
        root.classList.remove('curved-cards')
      }
    }
    sync()
    desktop.addEventListener('change', sync)
    return () => {
      desktop.removeEventListener('change', sync)
      stop?.()
      root.classList.remove('curved-cards')
    }
  }, [listRef])

  return <canvas ref={canvasRef} className="curved-cards-canvas" aria-hidden="true" />
}
