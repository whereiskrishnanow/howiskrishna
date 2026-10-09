import { useEffect, useState } from 'react'
import { flushSync } from 'react-dom'

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

/**
 * Go to a route. Where the browser supports it, the clicked card's band and
 * title morph into the detail page's header (see "Page transition" in
 * styles.css); everywhere else it just switches.
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
    }
  }
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (!document.startViewTransition || reduced) {
    clearMorph()
    return go()
  }
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
