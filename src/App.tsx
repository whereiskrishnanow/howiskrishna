import { projects } from './content'
import { CaseStudyPage } from './components/CaseStudyPage'
import { ClothBackground } from './components/ClothBackground'
import { DotCursor } from './components/DotCursor'
import { HomePage } from './components/HomePage'
import { useRoute } from './hooks/useRoute'

export function App() {
  const route = useRoute()
  const project = route.name === 'work' ? projects.find((p) => p.id === route.id) : undefined

  return (
    <>
      <ClothBackground />
      {project ? <CaseStudyPage key={project.id} project={project} /> : <HomePage />}
      <DotCursor />
    </>
  )
}
