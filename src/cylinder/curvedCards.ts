import { cardBend, cylinderShape, spinDeg, syncCylinder } from '../hooks/useCylinder'

// The cylinder's cards, drawn bent: each one is a patch of the cylinder's
// surface rather than a flat panel (CSS can only turn flat boxes), so WebGL
// draws them on a canvas behind the page. The look matches the flat cards in
// BlurMedia: a picture with a soft top edge that blurs more and more further
// down and melts into a glow, drifting slowly underneath, filled with the
// page's contrast colour while hovered.
//
// The titles and links stay as HTML on the cylinder (styles.css, "Cylinder"):
// each card's HTML box spans the chord between the bent card's two edges, so
// titles sit on its top-left corner and hovering or clicking the card hits it.
// This canvas reads the same geometry from the page every frame, and projects
// exactly as the CSS perspective does, so the two line up.

const COLS = 72 // mesh columns per card (smooth curve)
const ROWS = 24
const BLEED_X = 0.375 // glow beyond each side, in card widths (0.6 card heights)
const TOP = -0.05 // the soft top edge starts just above the card, in card heights
const BOTTOM = 1.9 // the glow ends this far down
const FADE_IN = 1.2 // s, matches the cards' CSS entrance
const FADE_DELAY = 0.2
const SOLID_EASE = 0.5 // s, the hover fill (as .media-solid)

const VERT = `#version 300 es
in vec2 a; // x: across the card (0 = centre, ±0.5 = edges, in card widths), y: down (card heights)
uniform float theta, radius, cardW, cardH, top, persp;
uniform float bend; // 0: a flat panel (the card in front), 1: bent round the cylinder
uniform vec2 origin, viewport;
out vec2 local; // px from the card's top-left
out float facing;
void main() {
  float ang = theta + a.x * cardW / radius;
  vec2 curved = radius * vec2(sin(ang), cos(ang));
  vec2 curvedN = vec2(sin(ang), cos(ang));
  // flat: across the chord between the bent card's edges, where its HTML box is
  float halfArc = cardW / radius * 0.5;
  vec2 flatN = vec2(sin(theta), cos(theta));
  vec2 flatP = radius * cos(halfArc) * flatN + a.x * 2.0 * radius * sin(halfArc) * vec2(cos(theta), -sin(theta));
  vec2 xz = mix(flatP, curved, bend);
  vec2 n = normalize(mix(flatN, curvedN, bend));
  vec3 p = vec3(xz.x, top + a.y * cardH, xz.y - radius);
  float w = (persp - p.z) / persp;
  vec2 screen = origin + p.xy / w;
  // how squarely this bit of surface faces the viewer
  vec3 toEye = normalize(vec3(-p.x, 0.0, persp - p.z));
  facing = dot(vec3(n.x, 0.0, n.y), toEye);
  local = vec2((a.x + 0.5) * cardW, a.y * cardH);
  gl_Position = vec4((screen.x / viewport.x * 2.0 - 1.0) * w, (1.0 - screen.y / viewport.y * 2.0) * w, 0.0, w);
}`

const FRAG = `#version 300 es
precision highp float;
uniform sampler2D img;
uniform vec2 texSize;
uniform float cardW, cardH, hasTex, solid, alpha;
uniform vec3 tint, contrast;
uniform vec3 drift; // pan phase (0..1), zoom, turn (rad)
in vec2 local;
in float facing;
out vec4 color;

float erf(float x) {
  float x2 = x * x;
  float t = x2 * (1.2732395 + 0.147 * x2) / (1.0 + 0.147 * x2);
  return sign(x) * sqrt(1.0 - exp(-t));
}
// how much of the card a gaussian of this size centred here covers, along one axis
float cover(float p, float lo, float hi, float s) {
  float k = 0.70710678 / s;
  return 0.5 * (erf((p - lo) * k) - erf((p - hi) * k));
}

vec3 picture(vec2 q, float sigma) {
  if (hasTex < 0.5) return tint;
  // the drift (as the .media-img keyframes): pan around an ellipse, zoom, turn
  vec2 c = q - vec2(cardW, cardH) * 0.5;
  float a = 6.2831853 * drift.x;
  c -= vec2(0.09 * cardW * cos(a), 0.05 * cardH * sin(a));
  float cs = cos(-drift.z), sn = sin(-drift.z);
  c = mat2(cs, sn, -sn, cs) * c / drift.y;
  // the picture covers the card (object-fit: cover), cropped, never stretched
  float aspect = texSize.x / texSize.y;
  vec2 fit = aspect > cardW / cardH ? vec2(cardH * aspect, cardH) : vec2(cardW, cardW / aspect);
  vec2 uv = c / fit + 0.5;
  // blur: a ring of taps on a pre-shrunk copy of the picture
  float texel = texSize.x / (fit.x * drift.y); // texels per px
  float s = max(sigma * texel, 0.5);
  float lod = max(log2(s) - 0.6, 0.0);
  vec2 d = vec2(s) / texSize;
  vec3 sum = textureLod(img, uv, lod).rgb * 2.0;
  for (int i = 0; i < 8; i++) {
    float t = float(i) * 0.785398 + 0.39;
    sum += textureLod(img, uv + vec2(cos(t), sin(t)) * d, lod).rgb;
  }
  return sum / 10.0;
}

void main() {
  float face = clamp(0.2 + 0.8 * facing, 0.0, 1.0) * step(0.0, facing);
  if (face <= 0.0) discard;
  float v = local.y / cardH;
  // blur grows with depth: crisp(ish) at the top, widest from ~55% down
  float t = clamp(pow(max(v, 0.0) / 0.55, 0.87), 0.0, 1.0);
  float sigma = cardH * (0.0063 + 0.17 * pow(t, 1.2));
  float coverage = cover(local.x, 0.0, cardW, sigma) * cover(local.y, 0.0, cardH, sigma);
  float glow = clamp((1.32 - v) / 0.92, 0.0, 1.0); // the glow fades out lower down
  vec2 q = clamp(local, vec2(0.0), vec2(cardW, cardH));
  vec3 col = mix(picture(q, max(sigma, cardH * 0.025)), contrast, solid);
  float a = coverage * glow * face * alpha;
  if (a < 0.002) discard;
  color = vec4(col * a, a);
}`

type Card = {
  li: HTMLElement
  tex: WebGLTexture | null
  texSize: [number, number]
  tint: [number, number, number]
  solid: number
}

const hex = (h: string): [number, number, number] => {
  let s = h.trim().replace('#', '')
  if (s.length === 3) s = [...s].map((c) => c + c).join('')
  const n = Number.parseInt(s, 16)
  return Number.isNaN(n) ? [0.5, 0.5, 0.5] : [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

// CSS ease-in-out, near enough
const ease = (x: number) => x * x * (3 - 2 * x)
const alternate = (time: number, period: number) => {
  const u = time / period
  const f = u - Math.floor(u)
  return ease(Math.floor(u) % 2 ? 1 - f : f)
}

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!
  gl.shaderSource(s, src)
  gl.compileShader(s)
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'shader')
  return s
}

/**
 * Draw the cards of `list` bent around the cylinder on `canvas`. Returns a
 * stop function, or null when WebGL isn't available (the flat cards show).
 */
export function startCurvedCards(canvas: HTMLCanvasElement, list: HTMLElement) {
  const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: true })
  if (!gl) return null
  let prog: WebGLProgram
  try {
    prog = gl.createProgram()!
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT))
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG))
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) ?? 'link')
  } catch (err) {
    console.warn('Curved cards unavailable:', err)
    return null
  }
  gl.useProgram(prog)
  const u = (name: string) => gl.getUniformLocation(prog, name)
  const U = {
    theta: u('theta'), bend: u('bend'), radius: u('radius'), cardW: u('cardW'), cardH: u('cardH'), top: u('top'),
    persp: u('persp'), origin: u('origin'), viewport: u('viewport'), texSize: u('texSize'),
    hasTex: u('hasTex'), solid: u('solid'), alpha: u('alpha'), tint: u('tint'), contrast: u('contrast'),
    drift: u('drift'),
  }

  // one mesh, shared by every card: a grid over the card and its glow
  const verts: number[] = []
  const at = (c: number, r: number) => [
    -0.5 - BLEED_X + (c / COLS) * (1 + 2 * BLEED_X),
    TOP + (r / ROWS) * (BOTTOM - TOP),
  ]
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      const [a, b, cc, d] = [at(c, r), at(c + 1, r), at(c, r + 1), at(c + 1, r + 1)]
      verts.push(...a, ...b, ...cc, ...b, ...d, ...cc)
    }
  const buf = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buf)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW)
  const loc = gl.getAttribLocation(prog, 'a')
  gl.enableVertexAttribArray(loc)
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
  const count = verts.length / 2

  gl.enable(gl.BLEND)
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA) // premultiplied
  gl.uniform1i(u('img'), 0)

  let stopped = false
  const cards: Card[] = [...list.querySelectorAll<HTMLElement>(':scope > .project')].map((li) => {
    const img = li.querySelector<HTMLImageElement>('.media-img')
    const frame = li.querySelector<HTMLElement>('.media-frame')
    const card: Card = { li, tex: null, texSize: [1, 1], tint: hex(frame?.style.backgroundColor ? rgbToHex(frame.style.backgroundColor) : '#888'), solid: 0 }
    if (img?.src) {
      const pic = new Image()
      pic.decoding = 'async'
      pic.src = img.src
      pic.decode().then(
        () => {
          if (stopped) return
          const tex = gl.createTexture()
          gl.bindTexture(gl.TEXTURE_2D, tex)
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, pic)
          gl.generateMipmap(gl.TEXTURE_2D)
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
          card.tex = tex
          card.texSize = [pic.naturalWidth, pic.naturalHeight]
        },
        () => {}, // keep the tint
      )
    }
    return card
  })

  // the page's contrast colour (the hover fill) follows the theme and the hovered card
  let contrast: [number, number, number] = [0, 0, 0]
  const readContrast = () => {
    contrast = hex(getComputedStyle(document.documentElement).getPropertyValue('--contrast') || '#000')
  }
  readContrast()
  const themeWatch = new MutationObserver(readContrast)
  themeWatch.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-ink'] })

  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const stage = list.parentElement!
  let raf = 0
  let last = performance.now()
  const born = last

  const frame = (now: number) => {
    raf = requestAnimationFrame(frame)
    const dt = Math.min(0.1, (now - last) / 1000)
    last = now

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const vw = window.innerWidth
    const vh = window.innerHeight
    if (canvas.width !== Math.round(vw * dpr) || canvas.height !== Math.round(vh * dpr)) {
      canvas.width = Math.round(vw * dpr)
      canvas.height = Math.round(vh * dpr)
    }
    gl.viewport(0, 0, canvas.width, canvas.height)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)

    syncCylinder() // the HTML text turns in this same frame
    const shape = cylinderShape(list)
    if (!shape) return
    const { cardW, cardH, radius, step, perspective, mediaTop } = shape
    const box = stage.getBoundingClientRect()
    // the CSS entrance turns the list into place (its `rotate`); follow it
    const entrance = parseRotateY(getComputedStyle(list).rotate)
    const spin = ((entrance - spinDeg()) * Math.PI) / 180
    const fade = still ? 1 : ease(Math.min(1, Math.max(0, ((now - born) / 1000 - FADE_DELAY) / FADE_IN)))
    const time = now / 1000

    gl.uniform1f(U.radius, radius)
    gl.uniform1f(U.cardW, cardW)
    gl.uniform1f(U.cardH, cardH)
    gl.uniform1f(U.top, mediaTop)
    gl.uniform1f(U.persp, perspective)
    gl.uniform2f(U.origin, box.left + box.width / 2, box.top + box.height / 2)
    gl.uniform2f(U.viewport, vw, vh)
    gl.uniform3f(U.contrast, ...contrast)

    // back to front, so nearer cards' glows lie over farther ones
    const order = cards
      .map((card, i) => ({ card, i, theta: spin + i * step }))
      .sort((a, b) => Math.cos(a.theta) - Math.cos(b.theta))
    for (const { card, i, theta } of order) {
      const morph = card.li.querySelector('[data-morph]') !== null // opening: the HTML card takes over
      const target = card.li.hasAttribute('data-active') && !morph ? 1 : 0
      card.solid += (target - card.solid) * (1 - Math.exp(-dt / (SOLID_EASE / 3)))
      if (morph || Math.cos(theta) < -0.35) continue

      gl.uniform1f(U.theta, theta)
      gl.uniform1f(U.bend, cardBend(theta, step))
      gl.uniform1f(U.solid, card.solid)
      gl.uniform1f(U.alpha, fade)
      gl.uniform3f(U.tint, ...card.tint)
      gl.uniform1f(U.hasTex, card.tex ? 1 : 0)
      gl.uniform2f(U.texSize, ...card.texSize)
      if (still) gl.uniform3f(U.drift, 0, 1.12, 0)
      else
        gl.uniform3f(
          U.drift,
          ((time + i * 2.3) / 12) % 1, // pan: 12s loop
          1.3 + 0.08 * alternate(time + i * 1.1, 5), // breathe: 5s
          ((-3 + 6 * alternate(time + i * 1.7, 8)) * Math.PI) / 180, // turn: 8s
        )
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, card.tex)
      gl.drawArrays(gl.TRIANGLES, 0, count)
    }
  }
  raf = requestAnimationFrame(frame)

  return () => {
    stopped = true
    cancelAnimationFrame(raf)
    themeWatch.disconnect()
    cards.forEach((c) => c.tex && gl.deleteTexture(c.tex))
    gl.deleteBuffer(buf)
    gl.deleteProgram(prog)
    gl.clear(gl.COLOR_BUFFER_BIT)
  }
}

/** The y angle (deg) out of a computed `rotate` value ("none", "y 20deg", "0 1 0 20deg"). */
function parseRotateY(value: string) {
  const m = value.match(/(-?[\d.]+)deg\s*$/)
  return m ? Number.parseFloat(m[1]) : 0
}

function rgbToHex(rgb: string) {
  const m = rgb.match(/\d+/g)
  if (!m) return '#888'
  return '#' + m.slice(0, 3).map((n) => Number(n).toString(16).padStart(2, '0')).join('')
}
