import * as THREE from 'three'
import { Cloth } from './cloth'

// The theme switch on desktop. The page's background cloth (as it looks right
// now) becomes a real sheet lying on the screen; it's taken by the bottom-
// right corner, tugged, then yanked away towards the bottom right, uncovering
// the new background underneath. The sheet is drawn below the page's content,
// so only the cloth goes.
//
// World units are CSS pixels: the screen is the table at z = 0, seen from a
// camera that frames it exactly, so the flat sheet matches the page 1:1.

const COLS = 64 // cloth particles across
const STEP = 1 / 240 // simulation step, s
const FOV = 30
const LIGHT = new THREE.Vector3(0.35, 0.55, 1).normalize() // from the top right, in front

/**
 * Pull the current background away. `onTone` fires once the sheet covers the
 * page (switch the background underneath), `onUncovered` once most of the
 * screen is clear (switch the text colours); resolves when it's gone.
 */
export async function pullSheet(onUncovered: () => void, onTone: () => void) {
  const W = window.innerWidth
  const H = window.innerHeight
  const D = H / 2 / Math.tan(THREE.MathUtils.degToRad(FOV / 2)) // camera distance that frames the screen
  const camera = new THREE.PerspectiveCamera(FOV, W / H, D * 0.05, D * 4)
  camera.position.set(0, 0, D)

  // under the page: the sheet, and the shadow it casts on the new cloth
  const under = layer(0)
  under.shadowMap.enabled = true
  under.shadowMap.type = THREE.VSMShadowMap
  const ground = new THREE.Scene()
  const cloth = new Cloth(W, H, COLS)
  const picture = document.createElement('canvas')
  picture.width = W
  picture.height = H
  const texture = new THREE.CanvasTexture(picture)
  texture.colorSpace = THREE.SRGBColorSpace
  const sheet = new THREE.Mesh(
    new THREE.PlaneGeometry(W, H, cloth.cols - 1, cloth.rows - 1),
    new THREE.MeshLambertMaterial({ map: texture, side: THREE.DoubleSide }),
  )
  sheet.castShadow = sheet.receiveShadow = true
  sheet.frustumCulled = false
  const table = new THREE.Mesh(new THREE.PlaneGeometry(W * 4, H * 4), new THREE.ShadowMaterial({ opacity: 0.28 }))
  table.position.z = -1
  table.receiveShadow = true
  // Lambert divides by π: lights that add up to π leave the flat sheet exactly
  // its picture, so nothing jumps when it replaces the page's background.
  const key = new THREE.DirectionalLight(0xffffff, (0.32 * Math.PI) / LIGHT.z)
  key.position.copy(LIGHT).multiplyScalar(H * 2)
  key.castShadow = true
  Object.assign(key.shadow.camera, { left: -W, right: W, top: H, bottom: -H, near: H * 0.5, far: H * 4 })
  key.shadow.mapSize.set(2048, 2048)
  key.shadow.radius = 14 // soft-edged shadows in the folds
  key.shadow.blurSamples = 16
  key.shadow.bias = -0.0004
  key.shadow.normalBias = 1.5
  ground.add(
    sheet,
    table,
    key,
    straightDown(new THREE.DirectionalLight(0xffffff, 0.53 * Math.PI)),
    new THREE.AmbientLight(0xffffff, 0.15 * Math.PI),
  )

  under.compile(ground, camera)

  // The page's cloth as it is this frame. Our callback runs after the cloth's
  // own one, so its canvas still holds the frame it just drew.
  await new Promise<void>((done) =>
    requestAnimationFrame(() => {
      const ctx = picture.getContext('2d')!
      const src = document.querySelector<HTMLCanvasElement>('canvas.cloth')
      if (src) ctx.drawImage(src, 0, 0, W, H)
      else {
        ctx.fillStyle = getComputedStyle(document.body).backgroundColor
        ctx.fillRect(0, 0, W, H)
      }
      texture.needsUpdate = true
      under.render(ground, camera)
      onTone() // the sheet now hides the page's background: switch it underneath
      done()
    }),
  )

  const path = pullPath(W, H)
  const positions = sheet.geometry.attributes.position as THREE.BufferAttribute
  const grip = path(0).at
  cloth.grab(grip[0], grip[1], H * 0.16)
  let simTime = 0
  let uncovered = false

  await new Promise<void>((done) => {
    const start = performance.now()
    const frame = (now: number) => {
      const t = (now - start) / 1000
      while (simTime + STEP <= t) {
        simTime += STEP
        const p = path(simTime)
        cloth.step(STEP, p.at, p.gather)
      }
      positions.array.set(cloth.pos)
      positions.needsUpdate = true
      sheet.geometry.computeVertexNormals()
      under.render(ground, camera)

      const left = onScreen(cloth.pos, W, H, D)
      if (!uncovered && left < 0.6) {
        uncovered = true
        onUncovered()
      }
      if (left === 0 || t > 4) done()
      else requestAnimationFrame(frame)
    }
    requestAnimationFrame(frame)
  })

  if (!uncovered) onUncovered()
  sheet.geometry.dispose()
  ;(sheet.material as THREE.Material).dispose()
  texture.dispose()
  under.dispose()
  under.domElement.remove()
}

const straightDown = (light: THREE.DirectionalLight) => {
  light.position.set(0, 0, 1)
  return light
}

/** A full-screen, see-through WebGL canvas stacked at `z` among the page's layers. */
function layer(z: number) {
  const r = new THREE.WebGLRenderer({ alpha: true, antialias: true })
  r.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  r.setSize(window.innerWidth, window.innerHeight)
  Object.assign(r.domElement.style, { position: 'fixed', inset: '0', zIndex: String(z), pointerEvents: 'none' })
  document.body.append(r.domElement)
  return r
}

/** Share of the cloth still on screen (0 when it's all gone). */
function onScreen(pos: Float32Array, W: number, H: number, D: number) {
  let n = 0
  for (let i = 0; i < pos.length; i += 3) {
    const s = D / (D - pos[i + 2]) // nearer the camera looks bigger
    if (Math.abs(pos[i] * s) < W / 2 && Math.abs(pos[i + 1] * s) < H / 2) n++
  }
  return n / (pos.length / 3)
}

const easeOut = (x: number) => 1 - (1 - x) ** 3
const easeInOut = (x: number) => (x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2)
const clamp01 = (x: number) => Math.min(1, Math.max(0, x))
const mix = (a: number, b: number, x: number) => a + (b - a) * x

/**
 * Where the corner is pulled over time, and how much the held cloth is drawn
 * together: lifted, a short tug, then the yank.
 */
function pullPath(W: number, H: number) {
  const away = new THREE.Vector2(1, -0.72).normalize() // towards the bottom right
  const gx = W / 2 - 0.03 * H // taken by the corner
  const gy = -H / 2 + 0.03 * H
  const reach = Math.hypot(W, H) * 2.4 // how far the yank carries it

  return (t: number) => {
    let along = 0 // distance travelled towards the bottom right
    let z = 0
    let gather = 0.7
    if (t < 0.3) {
      const s = easeInOut(t / 0.3) // lift the corner, drawing it together a little
      z = H * 0.07 * s
      along = H * 0.02 * s
      gather = mix(1, 0.7, s)
    } else if (t < 0.52) {
      const s = easeInOut((t - 0.3) / 0.22) // tug
      along = mix(H * 0.02, H * 0.08, s)
      z = mix(H * 0.07, H * 0.1, s)
    } else {
      const s = (t - 0.52) / 0.9 // yank: accelerates, then keeps going
      along = H * 0.08 + reach * (s < 1 ? s * s : 2 * s - 1)
      z = H * 0.1 + H * 0.3 * easeOut(clamp01(s))
    }
    return { at: [gx + away.x * along, gy + away.y * along, z] as [number, number, number], gather }
  }
}
