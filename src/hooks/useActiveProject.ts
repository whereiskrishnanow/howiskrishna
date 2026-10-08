import { useCallback, useEffect, useRef, useState } from 'react'
import type { Project } from '../content'
import { inkForHex, measureInk, type Ink } from '../lib/tone'

// Leaving a card waits this long before restoring the page, so sweeping the
// pointer across the gap to the next card doesn't flash the default background.
const LEAVE_DELAY = 140

/**
 * Tracks which card is hovered (or keyboard-focused) and themes the page for it:
 * sets data-ink="white|black" on <html> so the text flips to whichever contrasts
 * with that card's picture.
 */
export function useActiveProject(projects: Project[]) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const leaveTimer = useRef<number | undefined>(undefined)

  // Start from each card's tint, then refine from the actual image.
  const [inks, setInks] = useState<Record<string, Ink>>(() =>
    Object.fromEntries(projects.map((p) => [p.id, p.ink ?? inkForHex(p.tint)])),
  )
  useEffect(() => {
    let cancelled = false
    for (const p of projects) {
      if (p.ink) continue
      measureInk(p.image)
        .then((ink) => !cancelled && setInks((prev) => (prev[p.id] === ink ? prev : { ...prev, [p.id]: ink })))
        .catch(() => {}) // keep the tint-based guess
    }
    return () => {
      cancelled = true
    }
  }, [projects])

  const activate = useCallback((id: string) => {
    window.clearTimeout(leaveTimer.current)
    setActiveId(id)
  }, [])

  const deactivate = useCallback((id: string) => {
    window.clearTimeout(leaveTimer.current)
    leaveTimer.current = window.setTimeout(() => setActiveId((cur) => (cur === id ? null : cur)), LEAVE_DELAY)
  }, [])

  // leaving the page: stop any pending reset and drop the theme
  useEffect(
    () => () => {
      window.clearTimeout(leaveTimer.current)
      delete document.documentElement.dataset.ink
    },
    [],
  )

  const ink = activeId ? inks[activeId] : null
  useEffect(() => {
    const root = document.documentElement
    if (ink) root.dataset.ink = ink
    else delete root.dataset.ink
  }, [ink])

  return { activeId, ink, activate, deactivate }
}
