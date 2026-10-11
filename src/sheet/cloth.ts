// A sheet of cloth lying on a table (z = 0, +z towards the viewer): a grid of
// particles moved by Verlet integration and held together by distance
// constraints (stretch, shear and bend), with friction against the table.
// A few particles can be pinched and dragged around.

const GRAVITY = 2600 // px/s², pulling towards the table
const DAMPING = 0.996 // velocity kept per step (air resistance)
const FRICTION = 0.18 // share of sliding speed lost per step while touching the table
const ITERATIONS = 6

export class Cloth {
  readonly cols: number
  readonly rows: number
  readonly pos: Float32Array
  private prev: Float32Array
  private links: number[] = [] // pairs of particle indices
  private rest: number[] = [] // their rest lengths
  private stiff: number[] = []
  private held = new Map<number, [number, number]>() // particle → offset from the pinch, at rest
  private tether: Float32Array // each particle's rest distance from the pinch

  constructor(width: number, height: number, cols: number) {
    this.cols = cols
    this.rows = Math.max(2, Math.round((cols * height) / width))
    const n = this.cols * this.rows
    this.pos = new Float32Array(n * 3)
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const i = (r * cols + c) * 3
        this.pos[i] = -width / 2 + (c / (cols - 1)) * width // same order as THREE.PlaneGeometry
        this.pos[i + 1] = height / 2 - (r / (this.rows - 1)) * height
      }
    }
    this.prev = this.pos.slice()
    this.tether = new Float32Array(n).fill(Infinity)
    const id = (r: number, c: number) => r * cols + c
    const link = (a: number, b: number, k: number) => {
      const d = Math.hypot(this.pos[a * 3] - this.pos[b * 3], this.pos[a * 3 + 1] - this.pos[b * 3 + 1])
      this.links.push(a, b)
      this.rest.push(d)
      this.stiff.push(k)
    }
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (c + 1 < cols) link(id(r, c), id(r, c + 1), 1) // stretch
        if (r + 1 < this.rows) link(id(r, c), id(r + 1, c), 1)
        if (c + 1 < cols && r + 1 < this.rows) {
          link(id(r, c), id(r + 1, c + 1), 0.7) // shear
          link(id(r, c + 1), id(r + 1, c), 0.7)
        }
        if (c + 2 < cols) link(id(r, c), id(r, c + 2), 0.45) // bend: keeps folds soft and round
        if (r + 2 < this.rows) link(id(r, c), id(r + 2, c), 0.45)
      }
    }
  }

  /** Pinch the cloth around (x, y): the particles within `radius` are held from now on. */
  grab(x: number, y: number, radius: number) {
    for (let i = 0; i < this.pos.length / 3; i++) {
      const dx = this.pos[i * 3] - x
      const dy = this.pos[i * 3 + 1] - y
      const d = Math.hypot(dx, dy)
      if (d < radius) this.held.set(i, [dx, dy])
      // however hard it's pulled, no part of the cloth gets further from the
      // pinch than it was: stops the sheet stretching like rubber on a fast yank
      this.tether[i] = d + radius
    }
  }

  /** One time step. The pinch is at `at`; `gather` (1 → 0) bunches the held cloth together. */
  step(dt: number, at: [number, number, number], gather: number) {
    const p = this.pos
    const q = this.prev
    for (let i = 0; i < p.length; i += 3) {
      const vx = (p[i] - q[i]) * DAMPING
      const vy = (p[i + 1] - q[i + 1]) * DAMPING
      const vz = (p[i + 2] - q[i + 2]) * DAMPING
      q[i] = p[i]
      q[i + 1] = p[i + 1]
      q[i + 2] = p[i + 2]
      p[i] += vx
      p[i + 1] += vy
      p[i + 2] += vz - GRAVITY * dt * dt
    }
    for (let it = 0; it < ITERATIONS; it++) {
      for (let k = 0; k < this.rest.length; k++) {
        const a = this.links[k * 2] * 3
        const b = this.links[k * 2 + 1] * 3
        const dx = p[b] - p[a]
        const dy = p[b + 1] - p[a + 1]
        const dz = p[b + 2] - p[a + 2]
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1
        const f = ((d - this.rest[k]) / d) * 0.5 * this.stiff[k]
        p[a] += dx * f
        p[a + 1] += dy * f
        p[a + 2] += dz * f
        p[b] -= dx * f
        p[b + 1] -= dy * f
        p[b + 2] -= dz * f
      }
      for (let i = 0; i < p.length / 3; i++) {
        const j = i * 3
        const dx = p[j] - at[0]
        const dy = p[j + 1] - at[1]
        const dz = p[j + 2] - at[2]
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz)
        if (d > this.tether[i]) {
          const s = this.tether[i] / d
          p[j] = at[0] + dx * s
          p[j + 1] = at[1] + dy * s
          p[j + 2] = at[2] + dz * s
        }
      }
      for (const [i, [ox, oy]] of this.held) {
        p[i * 3] = at[0] + ox * gather
        p[i * 3 + 1] = at[1] + oy * gather
        p[i * 3 + 2] = at[2]
      }
    }
    // the table: the cloth can't sink through it, and drags while it touches it
    for (let i = 0; i < p.length; i += 3) {
      if (p[i + 2] > 0.5) continue
      p[i + 2] = Math.max(0, p[i + 2])
      q[i] += (p[i] - q[i]) * FRICTION
      q[i + 1] += (p[i + 1] - q[i + 1]) * FRICTION
    }
  }
}
