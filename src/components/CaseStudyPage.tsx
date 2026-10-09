import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { inkForHex, measureInk, type Ink } from '../lib/tone'
import { navigate } from '../hooks/useRoute'
import { caseStudies, warmCaseStudy, type Block } from '../caseStudies'
import type { Project } from '../content'
import { BlurMedia } from './BlurMedia'
import { Scramble } from './Scramble'

const COMING_SOON: Block[] = [{ type: 'p', text: 'The full case study is on its way. Meanwhile, happy to walk you through it on a call.' }]

function Content({ block }: { block: Block }) {
  switch (block.type) {
    case 'p':
      return <p className="cs-p">{block.text}</p>
    case 'closing':
      return <p className="cs-p cs-closing">{block.text}</p>
    case 'h2':
      return <h2 className="cs-h2">{block.text}</h2>
    case 'list':
      return (
        <ul className="cs-list">
          {block.items.map((item) => (
            <li key={item.text}>
              {item.lead && block.style === 'apps' && (
                <>
                  <strong>{item.lead}</strong> → <em>{item.text}</em>
                </>
              )}
              {item.lead && block.style !== 'apps' && (
                <>
                  <strong>{item.lead}:</strong> {item.text}
                </>
              )}
              {!item.lead && item.text}
            </li>
          ))}
        </ul>
      )
    case 'phones':
      return (
        <div className="cs-phones">
          {block.items.map((item) => (
            <figure key={item.src}>
              <figcaption>{item.label}</figcaption>
              <img src={item.src} alt={`CooKit: ${item.label}`} loading="lazy" decoding="async" />
            </figure>
          ))}
        </div>
      )
    case 'images':
      return (
        <figure className="cs-figure">
          {block.src.map((src, i) => (
            <img
              key={src}
              src={src}
              alt={i === 0 ? block.alt : ''}
              loading="lazy"
              decoding="async"
            />
          ))}
          {block.caption && (
            <figcaption>
              {block.caption.title && <strong>{block.caption.title}</strong>}
              {block.caption.title && ' — '}
              {block.caption.text}
            </figcaption>
          )}
        </figure>
      )
  }
}

/**
 * A project's detail page. The title, tagline and a wide version of the card's
 * blurred picture form a header that rises as you scroll and then pins to the
 * top; the article slides up underneath it and disappears into the glow.
 */
export function CaseStudyPage({ project }: { project: Project }) {
  const study = caseStudies[project.id]
  const blocks = study?.blocks ?? COMING_SOON
  const band = useRef<HTMLDivElement>(null)
  const scrollerTop = useRef<HTMLDivElement>(null)

  // The title sits on the band, so it takes white or black, whichever reads
  // better on this project's picture (same choice as the home page hover).
  const [ink, setInk] = useState<Ink>(project.ink ?? inkForHex(project.tint))
  useEffect(() => {
    if (project.ink) return
    let live = true
    measureInk(project.image)
      .then((i) => live && setInk(i))
      .catch(() => {})
    return () => {
      live = false
    }
  }, [project.image, project.ink])

  // before paint, so the page transition captures the top of the page
  useLayoutEffect(() => {
    window.scrollTo(0, 0)
    if (scrollerTop.current) scrollerTop.current.scrollTop = 0
  }, [project.id])

  useEffect(() => {
    const previous = document.title
    document.title = `${project.title} — Krishna Vamsi Anumalasetty`
    return () => {
      document.title = previous
    }
  }, [project.id, project.title])

  // The article scrolls in its own full-screen panel (see .cs-scroll), so the
  // fade into the band is fixed in place and never lags behind the scroll.
  // Focus it so the keyboard scrolls it straight away.
  useEffect(() => {
    scrollerTop.current?.focus({ preventScroll: true })
    warmCaseStudy(project.id) // decode the screenshots before they scroll into view
  }, [project.id])

  return (
    <div className="cs-page">
      <header className="cs-head" data-ink={ink} style={{ '--head-ink': ink === 'white' ? '#fff' : '#000' } as CSSProperties}>
        <div className="cs-band" ref={band}>
          <BlurMedia project={project} />
        </div>
        <div className="cs-head-inner">
          <a
            className="cs-back"
            href="#/"
            aria-label="Back to home"
            onClick={(e) => {
              if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
              e.preventDefault()
              navigate('#/', project.id)
            }}
          >
            <svg viewBox="0 0 44 14" aria-hidden="true">
              <path d="M43 7H1.5M7.5 1 1.5 7l6 6" />
            </svg>
          </a>
          <div className="cs-titlebar">
            <h1 className="cs-title">{project.title}</h1>
            <p className="cs-tagline">
              <Scramble text={study?.tagline ?? project.description} delay={150} duration={700} />
            </p>
          </div>
        </div>
      </header>

      <div className="cs-scroll" ref={scrollerTop} tabIndex={-1}>
        <article className="cs">
          <div className="cs-body">
            {blocks.map((block, i) => (
              <Content key={i} block={block} />
            ))}
          </div>
        </article>
      </div>
    </div>
  )
}
