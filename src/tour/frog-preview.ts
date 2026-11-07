import T from '../three-vendor'
import { buildFrog } from './frog'
const scene = new T.Scene()
scene.background = new T.Color('#dbe4ea')

const camera = new T.PerspectiveCamera(35, innerWidth / innerHeight, 0.05, 100)
const renderer = new T.WebGLRenderer({ antialias: true })
renderer.setPixelRatio(2)
renderer.setSize(innerWidth, innerHeight)
renderer.shadowMap.enabled = true
renderer.shadowMap.type = T.PCFSoftShadowMap
renderer.toneMapping = T.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.02
renderer.outputColorSpace = T.SRGBColorSpace
document.body.appendChild(renderer.domElement)

const hemi = new T.HemisphereLight('#efe9dc', '#6b5a3c', 0.72)
scene.add(hemi)
const sun = new T.DirectionalLight('#fff1cf', 2.7)
sun.position.set(-3.2, 6.2, 4.2)
sun.castShadow = true
sun.shadow.mapSize.set(2048, 2048)
sun.shadow.bias = -0.0005
sun.shadow.normalBias = 0.02
const sc = sun.shadow.camera
sc.left = -3; sc.right = 3; sc.top = 3; sc.bottom = -3; sc.near = 0.5; sc.far = 20
sun.shadow.camera.updateProjectionMatrix()
scene.add(sun)
const rim = new T.DirectionalLight('#bcd8ff', 0.85)
rim.position.set(4, 3, -4)
scene.add(rim)

const ground = new T.Mesh(
  new T.CircleGeometry(6, 48),
  new T.MeshStandardMaterial({ color: '#c9c2b4', roughness: 0.95 }),
)
ground.rotation.x = -Math.PI / 2
ground.receiveShadow = true
scene.add(ground)

const frog = buildFrog(T)
scene.add(frog.root)

type Mode = 'idle' | 'run' | 'laugh' | 'karate'
let mode: Mode = 'idle'
let phase = 0
let t = 0
let auto = true

const setMode = (m: Mode) => {
  mode = m
  t = 0
  phase = 0
}

addEventListener('keydown', (e) => {
  if (e.key === '1') setMode('idle')
  if (e.key === '2') setMode('run')
  if (e.key === '3') setMode('laugh')
  if (e.key === '4') setMode('karate')
  if (e.key === ' ') auto = !auto
})

const params = new URLSearchParams(location.search)
const yaw = Number(params.get('yaw') ?? 20)
const pitch = Number(params.get('pitch') ?? 8)
const dist = Number(params.get('dist') ?? 5.2)
const modeParam = params.get('mode') as Mode | null
if (modeParam) setMode(modeParam)
auto = params.get('auto') !== '0'

const clock = new T.Clock()
function frame() {
  const dt = Math.min(0.06, clock.getDelta())
  t += dt
  if (mode === 'idle') frog.idle()
  else if (mode === 'run') {
    phase += dt * 9
    frog.pose(phase, 1)
  } else if (mode === 'laugh') {
    const p = Math.min(1, t / 3.2)
    ;(frog as any).showcase(p * (3.2 / 6.8))
  } else if (mode === 'karate') {
    const p = Math.min(1, (t + 3.2) / 6.8)
    ;(frog as any).showcase(p)
  }

  const ry = (yaw * Math.PI) / 180
  const rp = (pitch * Math.PI) / 180
  camera.position.set(
    Math.sin(ry) * Math.cos(rp) * dist,
    1.0 + Math.sin(rp) * dist,
    Math.cos(ry) * Math.cos(rp) * dist,
  )
  camera.lookAt(0, 1.0, 0)
  renderer.render(scene, camera)
  requestAnimationFrame(frame)
}
frame()

;(window as any).__frogReady = true
