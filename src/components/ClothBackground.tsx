import { useEffect, useRef } from 'react'
import { isLite } from '../lib/device'

// The page background as a sheet of very smooth cloth. A height field is
// simulated on the CPU (a tensioned membrane: neighbours pull each other level,
// a weak spring pulls it back to rest, damping settles it), the cursor presses
// into it as it moves, and a few slow, broad folds drift underneath. Each frame
// the surface normals go to the GPU, which lights the cloth softly from the
// upper left in the page's grey, with dithering so the gradients never band.

const CELLS = 16000 // simulation cells, spread to match the screen's shape
const TENSION = 0.28 // how strongly neighbouring cells pull level (< 0.5 to stay stable)
const RETURN = 0.004 // pull back toward the resting drape
const DAMPING = 0.032 // energy lost each frame (lower = ripples travel further)
const PRESS = 0.08 // how hard the moving cursor pushes into the cloth
const PRESS_RADIUS = 6 // in cells
const SLOPE = 0.8 // turns height differences into how steeply the light falls
const DRIFT = 0.06 // speed of the slow drift of the big folds
const BREEZE = 1 // strength of the waves the breeze rolls across the cloth
const BREEZE_SPEED = 1 // how fast those waves travel

const VERT = `#version 300 es
in vec2 p;
out vec2 uv;
void main() {
  uv = vec2(p.x * 0.5 + 0.5, 0.5 - p.y * 0.5);
  gl_Position = vec4(p, 0.0, 1.0);
}`

const FRAG = `#version 300 es
precision highp float;
uniform sampler2D normals;
in vec2 uv;
out vec4 color;
float hash(vec2 q) { return fract(sin(dot(q, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
  vec3 n = normalize(vec3(texture(normals, uv).rg * 2.0 - 1.0, 1.0));
  vec3 light = normalize(vec3(-0.45, 0.55, 0.8)); // upper left, in front
  vec3 halfway = normalize(light + vec3(0.0, 0.0, 1.0));
  float diffuse = dot(n, light) - light.z;           // 0 on a flat sheet
  float sheen = pow(max(dot(n, halfway), 0.0), 40.0) - pow(halfway.z, 40.0);
  float v = 0.9333 + diffuse * 0.16 + sheen * 0.035; // #eee at rest
  v += (hash(gl_FragCoord.xy) - 0.5) / 255.0;       // dither: no banding
  color = vec4(vec3(v), 1.0);
}`

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!
  gl.shaderSource(s, src)
  gl.compileShader(s)
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'shader')
  return s
}

export function ClothBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const gl = canvas?.getContext('webgl2', { alpha: false, antialias: false, powerPreference: 'low-power' })
    if (!canvas || !gl) return // no WebGL: the plain grey page background shows

    const prog = gl.createProgram()!
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT))
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG))
    gl.linkProgram(prog)
    gl.useProgram(prog)
    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(prog, 'p')
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
    const tex = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

    // On phones (and with reduced motion) the cloth is drawn once and holds
    // still: the simulation would cost a phone every frame it has.
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches || isLite()

    let gw = 160
    let gh = 100
    let h = new Float32Array(0) // displacement from the resting drape
    let vel = new Float32Array(0)
    let rest = new Float32Array(0) // the slow folds
    let pixels = new Uint8Array(0)

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      gl.viewport(0, 0, canvas.width, canvas.height)
      // same cell budget on any screen shape (a tall phone shouldn't cost 3x)
      const aspect = window.innerWidth / window.innerHeight
      gw = Math.max(24, Math.round(Math.sqrt(CELLS * aspect)))
      gh = Math.max(24, Math.round(CELLS / gw))
      h = new Float32Array(gw * gh)
      vel = new Float32Array(gw * gh)
      rest = new Float32Array(gw * gh)
      pixels = new Uint8Array(gw * gh * 4)
    }

    // The resting shape at time `sec`: broad, soft folds like a sheet laid
    // loosely (drifting very slowly), plus the breeze: softer waves rolling
    // across from the left, swelling and fading in gentle gusts like silk
    // lifting in moving air.
    const drape = (sec: number) => {
      const s = gw / 160 // keep fold size independent of grid resolution
      const t = sec * DRIFT
      const w = sec * BREEZE_SPEED
      // two slow, out-of-step swells so the gusts never repeat obviously
      const gust = BREEZE * (0.65 + 0.35 * Math.sin(sec * 0.23) * Math.sin(sec * 0.131 + 1.1))
      for (let y = 0; y < gh; y++) {
        for (let x = 0; x < gw; x++) {
          const u = x / gw
          const v = y / gw
          const folds =
            9 * Math.sin(u * 4.6 + v * 1.9 + t * 1.0) +
            6 * Math.sin(u * 2.2 - v * 4.1 + 1.3 + t * 0.7) +
            2.5 * Math.sin((u + v * 0.6) * 9.5 + 0.4 + t * 1.4)
          const breeze =
            gust *
            (3.2 * Math.sin(u * 7.0 - v * 1.6 - w * 1.05) +
              1.9 * Math.sin(u * 11.5 + v * 3.2 - w * 1.55 + 2.0) +
              0.9 * Math.sin(u * 17.0 - v * 5.0 - w * 2.1 + 4.1))
          rest[y * gw + x] = s * (folds + breeze)
        }
      }
    }

    // Pointer, in grid cells, and how far it moved since the last frame.
    const pointer = { x: -1, y: -1, dx: 0, dy: 0, fresh: false }
    const onMove = (e: PointerEvent) => {
      const x = (e.clientX / window.innerWidth) * gw
      const y = (e.clientY / window.innerHeight) * gh
      if (pointer.x >= 0) {
        pointer.dx += x - pointer.x
        pointer.dy += y - pointer.y
      }
      pointer.x = x
      pointer.y = y
      pointer.fresh = true
    }

    const step = () => {
      // the moving cursor presses a soft dent into the cloth, deeper when faster
      if (pointer.fresh) {
        const speed = Math.min(Math.hypot(pointer.dx, pointer.dy), 6)
        const r = PRESS_RADIUS
        const x0 = Math.max(1, Math.floor(pointer.x - r * 2))
        const x1 = Math.min(gw - 2, Math.ceil(pointer.x + r * 2))
        const y0 = Math.max(1, Math.floor(pointer.y - r * 2))
        const y1 = Math.min(gh - 2, Math.ceil(pointer.y + r * 2))
        for (let y = y0; y <= y1; y++) {
          for (let x = x0; x <= x1; x++) {
            const d2 = (x - pointer.x) ** 2 + (y - pointer.y) ** 2
            vel[y * gw + x] -= PRESS * speed * Math.exp(-d2 / (2 * r * r))
          }
        }
        pointer.dx = pointer.dy = 0
        pointer.fresh = false
      }
      // membrane physics; the edges stay pinned
      for (let y = 1; y < gh - 1; y++) {
        for (let x = 1; x < gw - 1; x++) {
          const i = y * gw + x
          const lap = h[i - 1] + h[i + 1] + h[i - gw] + h[i + gw] - 4 * h[i]
          vel[i] = (vel[i] + TENSION * lap - RETURN * h[i]) * (1 - DAMPING)
        }
      }
      for (let i = 0; i < h.length; i++) h[i] += vel[i]
    }

    const upload = () => {
      for (let y = 0; y < gh; y++) {
        const yu = Math.max(0, y - 1)
        const yd = Math.min(gh - 1, y + 1)
        for (let x = 0; x < gw; x++) {
          const xl = Math.max(0, x - 1)
          const xr = Math.min(gw - 1, x + 1)
          const H = (xx: number, yy: number) => rest[yy * gw + xx] + h[yy * gw + xx]
          // normal tilt: x to the right, y up (grid rows run downward)
          const nx = -(H(xr, y) - H(xl, y)) * 0.5 * SLOPE
          const ny = (H(x, yd) - H(x, yu)) * 0.5 * SLOPE
          const o = (y * gw + x) * 4
          pixels[o] = Math.max(0, Math.min(255, Math.round((nx * 0.5 + 0.5) * 255)))
          pixels[o + 1] = Math.max(0, Math.min(255, Math.round((ny * 0.5 + 0.5) * 255)))
          pixels[o + 2] = 0
          pixels[o + 3] = 255
        }
      }
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gw, gh, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixels)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    }

    resize()
    drape(0)
    upload()
    canvas.dataset.ready = ''

    if (still) {
      const onResize = () => {
        resize()
        drape(0)
        upload()
      }
      window.addEventListener('resize', onResize)
      return () => window.removeEventListener('resize', onResize)
    }

    let raf = 0
    const start = performance.now()
    const frame = (now: number) => {
      drape((now - start) / 1000)
      step()
      upload()
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('resize', resize)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return <canvas ref={canvasRef} className="cloth" aria-hidden="true" />
}
