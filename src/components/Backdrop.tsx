import type { Project } from '../content'
import type { Ink } from '../lib/tone'

/** The hovered card's picture, heavily blurred, filling the page behind everything. */
export function Backdrop({ projects, activeId, ink }: { projects: Project[]; activeId: string | null; ink: Ink | null }) {
  return (
    <div className="backdrop" aria-hidden="true">
      {projects.map((p) => (
        <div
          key={p.id}
          className="backdrop-layer"
          data-on={p.id === activeId || undefined}
          style={{ backgroundImage: `url(${p.image})`, backgroundColor: p.tint }}
        />
      ))}
      {/* A light wash that nudges the background further from the text colour. */}
      <div className="backdrop-veil" data-ink={ink ?? undefined} />
    </div>
  )
}
