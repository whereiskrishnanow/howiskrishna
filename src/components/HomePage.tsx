import { contacts, intro, projects } from '../content'
import { useActiveProject } from '../hooks/useActiveProject'
import { useHorizontalScroll } from '../hooks/useHorizontalScroll'
import { Backdrop } from './Backdrop'
import { ProjectCard } from './ProjectCard'
import { Scramble } from './Scramble'

export function HomePage() {
  useHorizontalScroll()
  const { activeId, ink, activate, deactivate } = useActiveProject(projects)

  return (
    <>
      <Backdrop projects={projects} activeId={activeId} ink={ink} />

      <main className="track">
        <div className="row">
          <header className="intro">
            <h1 className="intro-title">{intro.title}</h1>
            <p className="intro-summary">
              <Scramble text={intro.summary} delay={200} duration={1200} />
            </p>
          </header>

          <ul className="projects" aria-label="Selected work">
            {projects.map((project, i) => (
              <ProjectCard
                key={project.id}
                project={project}
                index={i}
                active={project.id === activeId}
                onActivate={activate}
                onDeactivate={deactivate}
              />
            ))}
          </ul>
        </div>
      </main>

      <nav className="contact" aria-label="Contact">
        <ul>
          {contacts.map((c, i) => (
            <li key={c.label}>
              <a href={c.href} {...(c.external && { target: '_blank', rel: 'noreferrer' })}>
                {/* decodes just after the intro text, one link after another */}
                <Scramble text={c.label} delay={500 + i * 120} duration={600} />
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </>
  )
}
