import { projects } from './content'
import { CaseStudyPage } from './components/CaseStudyPage'
import { DotCursor } from './components/DotCursor'
import { HomePage } from './components/HomePage'
import { ThemeSwitch } from './components/ThemeSwitch'
import { useRoute } from './hooks/useRoute'

export function App() {
  const route = useRoute()
  const project = route.name === 'work' ? projects.find((p) => p.id === route.id) : undefined

  return (
    <>
      {project ? <CaseStudyPage key={project.id} project={project} /> : <HomePage />}
      <ThemeSwitch />
      <DotCursor />
    </>
  )
}
