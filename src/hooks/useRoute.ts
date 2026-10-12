import { useEffect, useState } from 'react'
import { flushSync } from 'react-dom'
import { isLite } from '../lib/device'

// Hash-based routes (#/work/<id>), so the site works on any static host with no
// server rewrites.
export type Route = { name: 'home' } | { name: 'work'; id: string }

const parse = (): Route => {
  const match = window.location.hash.match(/^#\/work\/([\w-]+)/)
  return match ? { name: 'work', id: match[1] } : { name: 'home' }
}

const listeners = new Set<(r: Route) => void>()

// The card that morphs into (or out of) the detail page's band is marked with
// data-morph only while its transition runs; a leftover mark would disable that
// card's hover fill and give two elements the same transition name.
const clearMorph = () =>
  document.querySelectorAll('[data-morph]').forEach((el) => el.removeAttribute('data-morph'))

// The camera's way through: the centre of the card's picture, and how far to
// zoom for it to more than fill the screen. Read by "Page transition" in styles.css.
const aimAt = (card: Element | null) => {
  if (!card) return
  const r = card.getBoundingClientRect()
  const root = document.documentElement.style
  root.setProperty('--vt-x', `${r.left + r.width / 2}px`)
  root.setProperty('--vt-y', `${r.top + r.height / 2}px`)
  root.setProperty('--vt-zoom', (Math.max(innerWidth / r.width, innerHeight / r.height) * 1.15).toFixed(2))
}
const card = () => document.querySelector('.project-link[data-morph] .media')

/**
 * Go to a route. Where the browser supports it, the camera flies into the
 * clicked card and out the other side into its detail page (and back out of
 * it on the way home; see "Page transition" in styles.css); everywhere else
 * it just switches.
 */
export function navigate(href: string, id?: string) {
  const go = () => {
    window.dispatchEvent(new Event('portfolio:leave'))
    history.pushState(null, '', href)
    const route = parse()
    flushSync(() => listeners.forEach((l) => l(route)))
    // going back: the card the band shrinks into is the one for this project
    if (id && route.name === 'home') {
      document.querySelector(`.project-link[href="#/work/${id}"]`)?.setAttribute('data-morph', '')
      aimAt(card())
    }
  }
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  // phones switch pages instantly: snapshotting both pages costs them a stutter
  if (!document.startViewTransition || reduced || isLite()) {
    clearMorph()
    return go()
  }
  aimAt(card())
  document.documentElement.dataset.transition = parse().name === 'home' ? 'open' : 'close'
  const t = document.startViewTransition(go)
  t.finished.finally(() => {
    delete document.documentElement.dataset.transition
    clearMorph()
  })
}

export function useRoute() {
  const [route, setRoute] = useState(parse)
  useEffect(() => {
    const onChange = () => setRoute(parse())
    listeners.add(setRoute)
    window.addEventListener('hashchange', onChange)
    window.addEventListener('popstate', onChange)
    return () => {
      listeners.delete(setRoute)
      window.removeEventListener('hashchange', onChange)
      window.removeEventListener('popstate', onChange)
    }
  }, [])
  return route
}
