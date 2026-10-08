import type { CSSProperties } from 'react'
import type { Project } from '../content'

// The same picture stacked several times, each copy blurrier than the last and
// weighted toward a deeper part of the card. Adjacent copies cross-fade, with the
// weights always summing to 1 (they add up via plus-lighter), so the blur grows
// smoothly from a crisp top edge into a soft glow.
// Depths and blur radii are fractions of the card height.
const STEPS = 8
const MAX_BLUR = 0.17 // blur radius of the deepest copy
// The picture itself is blurred at least this much (as a fraction of card
// height, ~5px at full size) so no detail shows near the top. It's blurred
// inside the frame, so the card's edge keeps its own, lighter softness.
const MIN_FILL_BLUR = 0.025
const REACH = 0.55 // depth below which only the deepest copy shows

// Measured from the top of the glow box, which starts --edge-room above the card.
const depth = (n: number) =>
  `calc(var(--edge-room) + var(--h) * ${(REACH * (n / (STEPS - 1)) ** 1.15).toFixed(4)})`

const LAYERS = Array.from({ length: STEPS }, (_, i) => {
  const stops = [
    i === 0 ? '#000 0' : `transparent ${depth(i - 1)}`,
    `#000 ${depth(i)}`,
    ...(i === STEPS - 1 ? [] : [`transparent ${depth(i + 1)}`]),
  ]
  const blur = MAX_BLUR * (i / (STEPS - 1)) ** 1.2
  return {
    blur: blur.toFixed(4),
    // top copies are too sharp on their own; top up their picture blur
    fill: Math.max(0, MIN_FILL_BLUR - blur),
    mask: `linear-gradient(to bottom, ${stops.join(', ')})`,
  }
})

// The image drifts slowly inside a fixed frame. Every copy runs the same
// animation, so the stack stays aligned while the colors shift under the blur.
function Frame({
  project,
  className,
  style,
  fill = 0,
}: {
  project: Pick<Project, 'image' | 'tint'>
  className: string
  style?: CSSProperties
  fill?: number
}) {
  return (
    <span className={className} style={{ backgroundColor: project.tint, ...style }}>
      <img
        className="media-img"
        src={project.image}
        alt=""
        decoding="async"
        draggable={false}
        style={fill > 0 ? { filter: `blur(calc(var(--h) * ${fill.toFixed(4)}))` } : undefined}
      />
      {/* Solid white/black that fades in over the picture while the card is active. */}
      <span className="media-solid" />
    </span>
  )
}

/**
 * A picture shown with the progressive blur: a soft top edge melting into a glow.
 * Size it with --h (and a width) on an ancestor.
 */
export function BlurMedia({ project }: { project: Pick<Project, 'image' | 'tint'> }) {
  return (
    <span className="media" aria-hidden="true">
      <span className="media-glow">
        {LAYERS.map((layer, i) => (
          <span key={i} className="media-layer" style={{ maskImage: layer.mask }}>
            <Frame
              project={project}
              className="media-frame"
              fill={layer.fill}
              style={{ '--blur': layer.blur } as CSSProperties}
            />
          </span>
        ))}
      </span>
    </span>
  )
}
