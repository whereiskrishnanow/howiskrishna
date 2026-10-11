import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js'

// A right hand (WebXR "generic-hand" model, MIT, see public/models/LICENSE.md)
// with a forearm, posed by curling its finger joints from relaxed to a fist.
// In the model, fingers point along -Y and the palm faces -X; the joints are
// flat (not parented), so a curl turns every later joint of a finger around
// the earlier one.

const FINGERS: [string, number[]][] = [
  // proximal, intermediate, distal knuckle bend in a fist (degrees)
  ['index-finger', [58, 78, 45]],
  ['middle-finger', [64, 82, 45]],
  ['ring-finger', [68, 82, 45]],
  ['pinky-finger', [72, 80, 45]],
]
const FINGER_JOINTS = ['phalanx-proximal', 'phalanx-intermediate', 'phalanx-distal', 'tip']
const THUMB_JOINTS = ['metacarpal', 'phalanx-proximal', 'phalanx-distal', 'tip'].map((j) => `thumb-${j}`)
const THUMB = [-25, -35, -30] // wraps over the fingers, around the joint's Y axis
const RELAXED = 0.32 // a reaching hand is never quite flat

const X = new THREE.Vector3(1, 0, 0)
const Y = new THREE.Vector3(0, 1, 0)

export type Hand = {
  /** The hand to draw, and an identical one that only casts shadows (for the scene under the page). */
  visible: THREE.Object3D
  shadow: THREE.Object3D
  /** 0 = relaxed, 1 = a fist. */
  setGrip(amount: number): void
  /** Where held cloth sits inside the fist, in the hand's own coordinates. */
  grip: THREE.Vector3
}

let loading: Promise<Hand> | undefined
export const loadHand = () => (loading ??= build())

async function build(): Promise<Hand> {
  const gltf = await new GLTFLoader().loadAsync('models/hand-right.glb')
  const skin = new THREE.MeshPhysicalMaterial({
    color: '#9a6a52',
    roughness: 0.52,
    sheen: 0.35, // light scattering in the skin, warm at the edges
    sheenRoughness: 0.45,
    sheenColor: new THREE.Color('#e6a58c'),
    clearcoat: 0.06,
    clearcoatRoughness: 0.6,
  })
  const visible = new THREE.Group()
  visible.add(gltf.scene)
  gltf.scene.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) {
      ;(o as THREE.Mesh).material = skin
      o.castShadow = true
      o.frustumCulled = false // skinned: its bounds don't follow the pose
    }
  })
  // the forearm, running back from the wrist (off screen most of the time)
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.036, 0.34, 32, 1, true), skin)
  arm.scale.set(0.95, 1, 1.25)
  arm.position.copy(gltf.scene.getObjectByName('wrist')!.position).add(new THREE.Vector3(0, 0.17, 0))
  arm.castShadow = true
  visible.add(arm)

  const shadow = cloneSkinned(visible)
  shadow.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).material = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false })
  })

  const rigs = [visible, shadow].map((root) => {
    const bones = new Map<string, THREE.Object3D>()
    root.traverse((o) => o.name.includes('-') && bones.set(o.name, o))
    const rest = new Map([...bones].map(([n, b]) => [n, [b.position.clone(), b.quaternion.clone()] as const]))
    return { bones, rest }
  })

  const q = new THREE.Quaternion()
  const axis = new THREE.Vector3()
  // bend each joint of a chain, carrying the rest of the finger with it
  const curl = (bones: Map<string, THREE.Object3D>, names: string[], degrees: number[], around: THREE.Vector3) => {
    const chain = names.map((n) => bones.get(n)!)
    degrees.forEach((deg, k) => {
      const pivot = chain[k].position
      q.setFromAxisAngle(axis.copy(around).applyQuaternion(chain[k].quaternion), THREE.MathUtils.degToRad(deg))
      for (let j = k + 1; j < chain.length; j++) {
        chain[j].position.sub(pivot).applyQuaternion(q).add(pivot)
        chain[j].quaternion.premultiply(q)
      }
      chain[k].quaternion.premultiply(q)
    })
  }

  const setGrip = (amount: number) => {
    const t = RELAXED + (1 - RELAXED) * amount
    for (const { bones, rest } of rigs) {
      for (const [n, [p, r]] of rest) {
        bones.get(n)!.position.copy(p)
        bones.get(n)!.quaternion.copy(r)
      }
      for (const [finger, bends] of FINGERS) {
        curl(bones, FINGER_JOINTS.map((j) => `${finger}-${j}`), bends.map((b) => b * t), X)
      }
      curl(bones, THUMB_JOINTS, THUMB.map((b) => b * t), Y)
    }
  }

  // the cloth sits in the curl of the fingers, just inside the palm
  setGrip(1)
  const b = rigs[0].bones
  const grip = new THREE.Vector3()
    .add(b.get('middle-finger-phalanx-proximal')!.position)
    .add(b.get('ring-finger-phalanx-proximal')!.position)
    .add(b.get('middle-finger-tip')!.position)
    .add(b.get('ring-finger-tip')!.position)
    .multiplyScalar(0.25)
  setGrip(0)

  return { visible, shadow, setGrip, grip }
}
