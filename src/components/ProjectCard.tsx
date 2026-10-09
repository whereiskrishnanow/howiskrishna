import { useEffect, useRef, type CSSProperties } from 'react'
import type { Project } from '../content'
import { BlurMedia } from './BlurMedia'
import { Scramble } from './Scramble'
import { navigate } from '../hooks/useRoute'
import { warmCaseStudy } from '../caseStudies'

type Props = {
  project: Project
  index: number
  active: boolean
  onActivate: (id: string) => void
  onDeactivate: (id: string) => void
}

export function ProjectCard({ project, index, active, onActivate, onDeactivate }: Props) {
  const ref = useRef<HTMLLIElement>(null)

  // Only animate cards that are on screen; there are a lot of blurred layers.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([entry]) => el.toggleAttribute('data-onscreen', entry.isIntersecting), {
      rootMargin: '0px 200px',
    })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <li ref={ref} className="project" data-active={active || undefined} style={{ '--i': index } as CSSProperties}>
      <a
        className="project-link"
        href={project.href}
        onClick={(e) => {
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
          e.preventDefault()
          e.currentTarget.dataset.morph = '' // this card's band is the one that morphs
          onDeactivate(project.id)
          navigate(project.href, project.id)
        }}
        // Mouse and pen only: on touch the tap just follows the link.
        onPointerEnter={(e) => {
          warmCaseStudy(project.id)
          if (e.pointerType !== 'touch') onActivate(project.id)
        }}
        onPointerLeave={(e) => e.pointerType !== 'touch' && onDeactivate(project.id)}
        onFocus={(e) => {
          warmCaseStudy(project.id)
          if (e.currentTarget.matches(':focus-visible')) onActivate(project.id)
        }}
        onBlur={() => onDeactivate(project.id)}
      >
        <span className="project-head">
          <span className="project-text">
            <span className="project-title-row">
              <h2 className="project-title">{project.title}</h2>
            </span>
            <span className="project-desc">
              <Scramble text={project.description} active={active} delay={60} duration={500} />
            </span>
          </span>
        </span>
        <BlurMedia project={project} />
      </a>
    </li>
  )
}
