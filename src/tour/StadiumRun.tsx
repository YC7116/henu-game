import { useEffect, useRef, useState } from 'react'
import T from '../three-vendor'
import { createStadium, DIM } from './stadium'
import { buildFrog } from './frog'
import { buildFrogFromGLB } from './frog-glb'
import './stadium.css'

/**
 * 志义体育场 · 100 m 直道决赛（6 人）
 *
 * 流程：赛前介绍（每个选手展示动作，参考奥运入场）→ 3-2-1-GO → 起跑反应判定
 * → 加速跑（长加速段）→ 冲线 → 名次结算；另有自由参观与角色切换。
 */

type Mode = 'menu' | 'sprint' | 'tour'
type SprintPhase = 'lineup' | 'countdown' | 'run' | 'finished'
type ViewMode = 'fp' | 'tp'
type CharId = 'runner' | 'frog'

type Rig = {
  root: any
  pose: (phase: number, amount: number) => void
  showcase: (t: number) => void
  idle: () => void
}

const RACE_LEN = 100
const EYE = 1.62
const GROUND = 0.645
const LINEUP_EACH = 2.4
const LINEUP_EACH_FROG = 3.2
const lineupSpan = (id: string) => (id === 'frog' ? LINEUP_EACH_FROG : LINEUP_EACH)

const CHARS: Array<{ id: CharId; name: string; tag: string; desc: string }> = [
  { id: 'runner', name: '校园跑者', tag: '默认', desc: '短袖 + 短裤的标准田径选手，起跑、加速、摆臂都是田径动作。' },
  { id: 'frog', name: '奶蛙', tag: '彩蛋', desc: '黄色梨形身体、凸起圆眼、奶油色大肚皮；赛前会捧腹大笑，再摆一个上掌下拳的起手式。' },
]

const damp = (cur: number, target: number, lambda: number, dt: number) =>
  target + (cur - target) * Math.exp(-lambda * dt)

const dampAngle = (cur: number, target: number, lambda: number, dt: number) => {
  const d = ((target - cur + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI
  return cur + d * (1 - Math.exp(-lambda * dt))
}

const fmt = (t: number) => {
  const m = Math.floor(t / 60)
  const s = t - m * 60
  return `${String(m).padStart(2, '0')}:${s.toFixed(2).padStart(5, '0')}`
}

type Racer = {
  lane: number
  name: string
  isPlayer: boolean
  vmax: number
  tau: number
  react: number
  progress: number
  reaction: number
  speed: number
  time: number
  finished: boolean
  phase: number
  mesh: Rig
  charId: CharId
}

/** 低模跑者：髋/膝/肩/肘都是独立关节，带赛前展示动作 */
function buildRunner(
  colors: { shirt: string; shorts: string; skin: string; hair: string },
  T3: any,
): Rig {
  const root = new T3.Group()
  const skin = new T3.MeshStandardMaterial({ color: colors.skin, roughness: 0.92 })
  const shirt = new T3.MeshStandardMaterial({ color: colors.shirt, roughness: 0.82 })
  const shortsMat = new T3.MeshStandardMaterial({ color: colors.shorts, roughness: 0.9 })
  const shoeMat = new T3.MeshStandardMaterial({ color: '#f4f0e6', roughness: 0.7 })
  const hairMat = new T3.MeshStandardMaterial({ color: colors.hair, roughness: 0.95 })

  const hips = new T3.Group()
  hips.position.y = 0.92
  root.add(hips)

  const torso = new T3.Mesh(new T3.CapsuleGeometry(0.155, 0.36, 4, 12), shirt)
  torso.position.y = 0.3
  hips.add(torso)

  const neck = new T3.Mesh(new T3.CylinderGeometry(0.055, 0.065, 0.08, 8), skin)
  neck.position.y = 0.55
  hips.add(neck)

  const head = new T3.Mesh(new T3.IcosahedronGeometry(0.145, 1), skin)
  head.position.y = 0.66
  hips.add(head)

  const hair = new T3.Mesh(new T3.SphereGeometry(0.15, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.58), hairMat)
  hair.position.y = 0.675
  hips.add(hair)

  const waist = new T3.Mesh(new T3.CylinderGeometry(0.17, 0.16, 0.18, 10), shortsMat)
  waist.position.y = 0.05
  hips.add(waist)

  const limb = (side: number, y: number, upper: number, lower: number, rU: number, rL: number, matU: any, matL: any) => {
    const shoulder = new T3.Group()
    shoulder.position.set(side * 0.2, y, 0)
    const up = new T3.Mesh(new T3.CylinderGeometry(rU, rU * 0.92, upper, 8), matU)
    up.position.y = -upper / 2
    shoulder.add(up)
    const joint = new T3.Group()
    joint.position.y = -upper
    shoulder.add(joint)
    const low = new T3.Mesh(new T3.CylinderGeometry(rL * 1.05, rL * 0.8, lower, 8), matL)
    low.position.y = -lower / 2
    joint.add(low)
    return { shoulder, joint }
  }

  const armL = limb(-1, 0.44, 0.3, 0.27, 0.055, 0.05, shirt, skin)
  const armR = limb(1, 0.44, 0.3, 0.27, 0.055, 0.05, shirt, skin)
  hips.add(armL.shoulder, armR.shoulder)

  const legL = limb(-1, 0, 0.44, 0.44, 0.075, 0.058, shortsMat, skin)
  const legR = limb(1, 0, 0.44, 0.44, 0.075, 0.058, shortsMat, skin)
  legL.shoulder.position.set(-0.1, 0, 0)
  legR.shoulder.position.set(0.1, 0, 0)
  hips.add(legL.shoulder, legR.shoulder)

  for (const leg of [legL, legR]) {
    const shoe = new T3.Mesh(new T3.BoxGeometry(0.115, 0.075, 0.24), shoeMat)
    shoe.position.set(0, -0.44 - 0.015, 0.05)
    leg.joint.add(shoe)
  }

  root.traverse((o: any) => {
    if (o.isMesh) o.castShadow = true
  })

  const pose = (phase: number, amount: number) => {
    const swing = Math.sin(phase) * 0.92 * amount
    legL.shoulder.rotation.x = swing
    legR.shoulder.rotation.x = -swing
    legL.joint.rotation.x = Math.max(0, -swing) * 1.25 + 0.26
    legR.joint.rotation.x = Math.max(0, swing) * 1.25 + 0.26
    armL.shoulder.rotation.x = -swing * 0.9
    armR.shoulder.rotation.x = swing * 0.9
    armL.shoulder.rotation.z = 0.1
    armR.shoulder.rotation.z = -0.1
    armL.joint.rotation.x = -0.9 - Math.max(0, swing) * 0.7
    armR.joint.rotation.x = -0.9 - Math.max(0, -swing) * 0.7
    hips.position.y = 0.92 + Math.abs(Math.sin(phase * 2)) * 0.03 * amount
    hips.rotation.x = 0.12 * amount
    hips.rotation.z = Math.sin(phase) * 0.03 * amount
    // 抬胯随步频起伏，避免摆动时脚掌插进跑道
    root.position.y = Math.abs(Math.sin(phase)) * 0.055 * amount
  }

  const idle = () => {
    legL.shoulder.rotation.x = 0
    legR.shoulder.rotation.x = 0
    legL.joint.rotation.x = 0.06
    legR.joint.rotation.x = 0.06
    armL.shoulder.rotation.set(0, 0, 0.12)
    armR.shoulder.rotation.set(0, 0, -0.12)
    armL.joint.rotation.x = -0.18
    armR.joint.rotation.x = -0.18
    hips.rotation.set(0, 0, 0)
    hips.position.y = 0.92
    root.position.y = 0
  }

  /** 赛前展示：先举手示意，再双手叉腰挺胸 */
  const showcase = (t: number) => {
    const p = Math.max(0, Math.min(1, t))
    if (p < 0.55) {
      const u = p / 0.55
      const raise = Math.min(1, u * 1.5)
      const wave = Math.sin(u * Math.PI * 5) * 0.25 * raise
      armR.shoulder.rotation.x = -2.4 * raise
      armR.shoulder.rotation.z = -0.25 - wave
      armR.joint.rotation.x = -0.35 * raise
      armL.shoulder.rotation.x = 0.18
      armL.shoulder.rotation.z = 0.3
      armL.joint.rotation.x = -1.35
      hips.rotation.x = 0.02
      legL.shoulder.rotation.x = -0.05
      legR.shoulder.rotation.x = 0.05
      legL.joint.rotation.x = 0.08
      legR.joint.rotation.x = 0.08
      hips.position.y = 0.92 + Math.sin(u * Math.PI) * 0.02
    } else {
      const u = (p - 0.55) / 0.45
      const ease = Math.min(1, u * 1.8)
      armR.shoulder.rotation.x = -2.4 * (1 - ease) + 0.1 * ease
      armR.shoulder.rotation.z = -0.25 * (1 - ease) - 0.75 * ease
      armR.joint.rotation.x = -1.55 * ease
      armL.shoulder.rotation.x = 0.2
      armL.shoulder.rotation.z = 0.75
      armL.joint.rotation.x = -1.55
      hips.rotation.x = -0.04
      hips.position.y = 0.94
      legL.shoulder.rotation.x = -0.08
      legR.shoulder.rotation.x = 0.08
      legL.joint.rotation.x = 0.05
      legR.joint.rotation.x = 0.05
    }
  }

  return { root, pose, showcase, idle }
}

const LANES = [1, 2, 3, 4, 5, 6, 7, 8]
const PLAYER_LANE = 4

const RIVALS = [
  { lane: 1, name: '红队', shirt: '#b23a2f', shorts: '#232d38', skin: '#e6bd98', hair: '#20191a', vmax: 10.5, tau: 1.66, react: 0.19 },
  { lane: 2, name: '橙队', shirt: '#c4713a', shorts: '#2b2622', skin: '#e0b48c', hair: '#1d1713', vmax: 10.4, tau: 1.74, react: 0.2 },
  { lane: 3, name: '蓝队', shirt: '#33589c', shorts: '#1d2530', skin: '#dcae84', hair: '#1a1512', vmax: 10.6, tau: 1.6, react: 0.17 },
  { lane: 5, name: '青队', shirt: '#2b8a8f', shorts: '#1e2a33', skin: '#d8a97f', hair: '#221c18', vmax: 10.65, tau: 1.82, react: 0.16 },
  { lane: 6, name: '黄队', shirt: '#d9b23f', shorts: '#2b3138', skin: '#e8c39f', hair: '#1b1714', vmax: 10.35, tau: 1.54, react: 0.23 },
  { lane: 7, name: '绿队', shirt: '#3f7d52', shorts: '#222d26', skin: '#cf9f74', hair: '#171412', vmax: 10.55, tau: 1.9, react: 0.21 },
  { lane: 8, name: '灰队', shirt: '#6c7480', shorts: '#262b31', skin: '#e2b48f', hair: '#241e1b', vmax: 10.25, tau: 1.62, react: 0.26 },
]

const PLAYER_COLORS = { shirt: '#2f6f9e', shorts: '#232d38', skin: '#e2b48f', hair: '#1e1a18' }
const PLAYER_VMAX = 11.15
const PLAYER_TAU = 1.55

export default function StadiumRun({ onClose }: { onClose: () => void }) {
  const host = useRef<HTMLDivElement>(null)
  const [mode, setMode] = useState<Mode>('menu')
  const [sprintPhase, setSprintPhase] = useState<SprintPhase>('lineup')
  const [hud, setHud] = useState({ dist: 0, time: 0, speed: 0, lane: PLAYER_LANE, rank: 8 })
  const [count, setCount] = useState(3)
  const [grade, setGrade] = useState<{ kind: string; reaction: number } | null>(null)
  const [lineup, setLineup] = useState<{ index: number; total: number; name: string; action: string; charId: CharId } | null>(null)
  const [char, setChar] = useState<CharId>('runner')
  const [result, setResult] = useState<{
    time: number
    splits: number[]
    rank: number
    best: boolean
    board: Array<{ name: string; time: number; isPlayer: boolean }>
    gap: number
    fragments: number
  } | null>(null)
  const [view, setView] = useState<ViewMode>('tp')
  const [best, setBest] = useState<number | null>(() => {
    const v = typeof localStorage !== 'undefined' ? localStorage.getItem('henu-stadium-sprint-best') : null
    return v ? Number(v) : null
  })
  const [styleMode, setStyleMode] = useState<'max' | 'pixel'>('max')
  const [ready, setReady] = useState(false)
  const [locked, setLocked] = useState(false)

  const styleRef = useRef<'max' | 'pixel'>(styleMode)
  styleRef.current = styleMode
  const viewRef = useRef<ViewMode>(view)
  viewRef.current = view
  const charRef = useRef<CharId>(char)
  charRef.current = char
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  const apiRef = useRef<{
    startSprint: () => void
    startTour: () => void
    exit: () => void
    setStyle: (m: 'max' | 'pixel') => void
    setView: (v: ViewMode) => void
    setCharacter: (c: CharId) => void
  } | null>(null)

  useEffect(() => {
    const el = host.current
    if (!el) return

    const stadium = createStadium(3072)
    const scene = stadium.scene as any
    const SPRINT = (stadium as any).SPRINT as { start: number; length: number }

    const origin = stadium.sampleAt(SPRINT.start)
    const dir = origin.tan.clone().normalize()
    const nrm = new T.Vector3(-dir.z, 0, dir.x)
    const faceYaw = Math.atan2(dir.x, dir.z)
    const laneZ = (lane: number) => (lane - 4.5) * DIM.laneW
  // 列出场时整体沿直道方向后退一点，让脚落在起跑线后，同时保持与跑道线平行
  const LINEUP_PAD = 1.2

    const racers: Racer[] = []
    const addRacer = (lane: number, name: string, mesh: Rig, isPlayer: boolean, vmax: number, tau: number, react: number, charId: CharId) => {
      scene.add(mesh.root)
      const r: Racer = {
        lane,
        name,
        isPlayer,
        vmax,
        tau,
        react,
        progress: 0,
        reaction: 0,
        speed: 0,
        time: 0,
        finished: false,
        phase: Math.random() * 6.28,
        mesh,
        charId,
      }
      racers.push(r)
      return r
    }

    const makeRig = (charId: CharId, colors: any = PLAYER_COLORS): Rig =>
      charId === 'frog' ? (buildFrogFromGLB() as unknown as Rig) : buildRunner(colors, T)

    const player = addRacer(
      PLAYER_LANE,
      '你',
      makeRig(charRef.current),
      true,
      PLAYER_VMAX,
      PLAYER_TAU,
      0,
      charRef.current,
    )
    for (const rv of RIVALS) {
      addRacer(rv.lane, rv.name, buildRunner(rv, T), false, rv.vmax, rv.tau, rv.react, 'runner')
    }
    racers.sort((a, b) => a.lane - b.lane)

    const setPlayerRig = (id: CharId) => {
      scene.remove(player.mesh.root)
      player.mesh = makeRig(id)
      scene.add(player.mesh.root)
      player.charId = id
    }

    const renderer = new T.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.setSize(el.clientWidth, el.clientHeight)
    renderer.domElement.tabIndex=0
    renderer.domElement.setAttribute('aria-label','体育场赛跑画布')
    el.appendChild(renderer.domElement)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = T.PCFSoftShadowMap
    renderer.toneMapping = T.ACESFilmicToneMapping
    renderer.toneMappingExposure = 0.78
    renderer.outputColorSpace = T.SRGBColorSpace

    const pmrem = new T.PMREMGenerator(renderer)
    const envCanvas = document.createElement('canvas')
    envCanvas.width = 512
    envCanvas.height = 256
    const ectx = envCanvas.getContext('2d') as CanvasRenderingContext2D
    const grad = ectx.createLinearGradient(0, 0, 0, 256)
    grad.addColorStop(0, '#4d7fb8')
    grad.addColorStop(0.35, '#b6cfe2')
    grad.addColorStop(0.52, '#eef2f2')
    grad.addColorStop(0.58, '#cfc9b8')
    grad.addColorStop(1, '#8a9078')
    ectx.fillStyle = grad
    ectx.fillRect(0, 0, 512, 256)
    const envTex = new T.CanvasTexture(envCanvas)
    envTex.mapping = T.EquirectangularReflectionMapping
    envTex.colorSpace = T.SRGBColorSpace
    const envRT = pmrem.fromEquirectangular(envTex)
    scene.environment = envRT.texture
    scene.environmentIntensity = 0.55
    pmrem.dispose()

    const camera = new T.PerspectiveCamera(60, el.clientWidth / el.clientHeight, 0.12, 2600)

    const applyStyle = (m: 'max' | 'pixel') => {
      const c = renderer.domElement
      if (m === 'pixel') {
        const h = 600
        const w = Math.round((h * el.clientWidth) / el.clientHeight)
        renderer.setPixelRatio(1)
        renderer.setSize(w, h, false)
        c.style.width = '100%'
        c.style.height = '100%'
        c.style.imageRendering = 'pixelated'
      } else {
        c.style.imageRendering = 'auto'
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
        renderer.setSize(el.clientWidth, el.clientHeight)
      }
    }

    const requestPointerLock = () => {
      const c = renderer.domElement as HTMLCanvasElement
      if (c.requestPointerLock) {
        try {
        const p = c.requestPointerLock() as unknown as Promise<void> | undefined
        if (p && typeof (p as any).catch === 'function') (p as any).catch(() => undefined)
        } catch { /* Keep keyboard controls available when locking is refused. */ }
      }
    }

    const state = {
      mode: 'menu' as Mode,
      phase: 'lineup' as SprintPhase,
      view: 'tp' as ViewMode,
      t: 0,
      go: false,
      playerReacted: false,
      reaction: 0,
      falseStart: false,
      gradeTimer: 0,
      penalty: 0,
      lane: PLAYER_LANE,
      laneTarget: PLAYER_LANE,
      lineupIdx: 0,
      lineupClock: 0,
      px: 0,
      pz: 0,
      yaw: 0,
      pitch: 0,
      smoothYaw: 0,
      smoothPitch: 0,
      camYaw: 0,
      camPos: new T.Vector3(0, 3, 0),
      camInit: false,
      lean: 0,
      kick: 0,
      bob: 0,
      fov: 60,
      time2: 0,
    }

    const keys: Record<string, boolean> = {}
    let finishedOnce = false
    let countdown = 3.05
    const setCountdown = (v: number) => {
      countdown = v
    }

    const resetRace = () => {
      state.t = 0
      state.go = false
      state.playerReacted = false
      state.reaction = 0
      state.falseStart = false
      state.penalty = 0
      state.lane = PLAYER_LANE
      state.laneTarget = PLAYER_LANE
      state.camInit = false
      state.phase = 'lineup'
      state.lineupIdx = 0
      state.lineupClock = 0
      finishedOnce = false
      for (const r of racers) {
        r.progress = 0
        r.speed = 0
        r.time = 0
        r.finished = false
        r.mesh.idle()
      }
      setResult(null)
      setGrade(null)
      setCountdown(3.05)
      setSprintPhase('lineup')
      setLineup({ index: 0, total: racers.length, name: racers[0].name, action: '', charId: racers[0].charId })
    }

    const enterTour = () => {
      const p = stadium.sampleAt(SPRINT.start - 8)
      state.px = p.pos.x
      state.pz = p.pos.z - 3
      const yaw = Math.atan2(p.tan.x, p.tan.z)
      state.yaw = yaw
      state.smoothYaw = yaw
      state.camYaw = yaw
      state.pitch = -0.05
      state.smoothPitch = -0.05
      state.camInit = false
      requestPointerLock()
    }

    const api = {
      startSprint: () => {
        state.mode = 'sprint'
        setMode('sprint')
        resetRace()
      },
      startTour: () => {
        state.mode = 'tour'
        setMode('tour')
        enterTour()
      },
      exit: () => {
        if (document.pointerLockElement) document.exitPointerLock()
        state.mode = 'menu'
        setMode('menu')
      },
      setStyle: (m: 'max' | 'pixel') => applyStyle(m),
      setView: (v: ViewMode) => {
        state.view = v
      },
      setCharacter: (c: CharId) => {
        setChar(c)
        charRef.current = c
        setPlayerRig(c)
      },
    }
    apiRef.current = api

    const gradeOf = (reaction: number, falseStart: boolean) => {
      if (falseStart) return { kind: '抢跑', reaction }
      if (reaction <= 0.14) return { kind: '完美起步', reaction }
      if (reaction <= 0.24) return { kind: '起跑不错', reaction }
      if (reaction <= 0.38) return { kind: '起跑一般', reaction }
      return { kind: '慢半拍', reaction }
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if(e.ctrlKey||e.metaKey||e.altKey||(e.target as HTMLElement)?.closest('input,textarea,select,[contenteditable="true"]'))return
      if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault()
      const isW = e.code === 'KeyW' || e.code === 'ArrowUp'
      if (isW && !keys[e.code]) {
        if (state.mode === 'sprint' && state.phase === 'countdown' && !state.go) {
          state.falseStart = true
        } else if (state.mode === 'sprint' && state.go && !state.playerReacted) {
          state.playerReacted = true
          state.reaction = state.t
          const g = gradeOf(state.reaction, state.falseStart)
          setGrade(g)
          state.gradeTimer = 2.4
          if (state.falseStart) state.penalty = 0.15
        }
      }
      keys[e.code] = true
      if (e.code === 'Escape') {
        if (document.pointerLockElement) document.exitPointerLock()
        else closeRef.current()
      }
      if (e.code === 'KeyP' && !e.repeat) {
        const next = styleRef.current === 'max' ? 'pixel' : 'max'
        setStyleMode(next)
        styleRef.current = next
        applyStyle(next)
      }
      if (e.code === 'KeyC' && !e.repeat) {
        const next: ViewMode = viewRef.current === 'fp' ? 'tp' : 'fp'
        setView(next)
        viewRef.current = next
        state.view = next
      }
      if (e.code === 'Space') {
        e.preventDefault()
        if (state.mode === 'sprint' && state.phase === 'lineup') {
          state.lineupIdx = racers.length - 1
          state.lineupClock = LINEUP_EACH
        } else if (state.mode === 'sprint' && state.phase === 'finished') {
          resetRace()
        }
      }
      if (state.mode === 'sprint') {
        if (e.code === 'ArrowLeft' || e.code === 'KeyA') state.laneTarget = Math.max(1, state.laneTarget - 1)
        if (e.code === 'ArrowRight' || e.code === 'KeyD') state.laneTarget = Math.min(8, state.laneTarget + 1)
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      keys[e.code] = false
    }
    const onMouseMove = (e: MouseEvent) => {
      if (state.mode !== 'tour' || document.pointerLockElement === null) return
      state.yaw -= e.movementX * 0.0022
      state.pitch = Math.max(-1.0, Math.min(0.9, state.pitch - e.movementY * 0.002))
    }
    const onLockChange = () => setLocked(!!document.pointerLockElement)
    const onCanvasClick = () => {
      if (state.mode === 'tour' && !document.pointerLockElement) requestPointerLock()
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('pointerlockchange', onLockChange)
    renderer.domElement.addEventListener('click', onCanvasClick)

    const onResize = () => {
      if (styleRef.current === 'pixel') applyStyle('pixel')
      else renderer.setSize(el.clientWidth, el.clientHeight)
      camera.aspect = Math.max(1,el.clientWidth) / Math.max(1,el.clientHeight)
      camera.updateProjectionMatrix()
    }
    const resizeObserver=new ResizeObserver(onResize);resizeObserver.observe(el)
    document.addEventListener('fullscreenchange',onResize)
    const clearKeys=()=>{for(const key of Object.keys(keys))keys[key]=false}
    window.addEventListener('blur',clearKeys)
    document.addEventListener('visibilitychange',clearKeys)
    window.addEventListener('resize', onResize)

    const rankOf = (me: Racer) => racers.filter((r) => r.progress > me.progress).length + 1

    const finish = (playerTime: number) => {
      const standings = racers.map((r) => ({ r, t: r.time || 0 }))
      const now = state.t
      for (const s of standings) {
        if (!s.r.finished) {
          let t = now
          let d = s.r.progress
          let v = s.r.speed
          while (d < RACE_LEN && t < now + 30) {
            t += 0.01
            v += (s.r.vmax - v) * (1 - Math.exp(-0.01 / s.r.tau))
            d += v * 0.01
          }
          s.t = t
        }
      }
      standings.sort((a, b) => a.t - b.t)
      const board = standings.map((s) => ({ name: s.r.name, time: s.t, isPlayer: s.r.isPlayer }))
      const rank = standings.findIndex((s) => s.r.isPlayer) + 1
      const gap = playerTime - standings[0].t

      const prev = Number(localStorage.getItem('henu-stadium-sprint-best') || 0)
      const isBest = !prev || playerTime < prev
      if (isBest) localStorage.setItem('henu-stadium-sprint-best', String(playerTime))
      setBest((b) => (isBest ? playerTime : b))
      // 完赛奖励：一枚「志义体育场」建筑碎片，累计存在本机
      const fragKey = 'henu-stadium-fragments'
      const fragTotal = Number(localStorage.getItem(fragKey) || 0) + 1
      localStorage.setItem(fragKey, String(fragTotal))
      setResult({ time: playerTime, splits: [playerTime * 0.48, playerTime], rank, best: isBest, board, gap, fragments: fragTotal })
      setSprintPhase('finished')
      state.phase = 'finished'
      finishedOnce = true
    }

    const placeAt = (r: Racer, extra = 0) => {
    const pad = state.phase === 'lineup' ? LINEUP_PAD : 0
      const lz = laneZ(r.lane)
      r.mesh.root.position.set(
        origin.pos.x + dir.x * (r.progress + extra - pad) + nrm.x * lz,
        GROUND,
        origin.pos.z + dir.z * (r.progress + extra - pad) + nrm.z * lz,
      )
      r.mesh.root.rotation.y = faceYaw
    }

    let raf = 0
    let alive = true
    let last = performance.now()
    let hudClock = 0

    function frame(now: number) {
      if (!alive) return
      if(document.hidden){last=now;raf=requestAnimationFrame(frame);return}
      const dt = Math.min(0.1, Math.max(0.0005, (now - last) / 1000))
      last = now
      state.time2 += dt
      const viewMode = viewRef.current

      if (state.mode === 'sprint') {
        // ---- 赛前介绍 ----
        if (state.phase === 'lineup') {
          state.lineupClock += dt
          const curSpan = lineupSpan(racers[Math.min(state.lineupIdx, racers.length - 1)].charId)
          if (state.lineupClock >= curSpan) {
            state.lineupClock = 0
            state.lineupIdx += 1
            if (state.lineupIdx >= racers.length) {
              state.phase = 'countdown'
              setSprintPhase('countdown')
              setLineup(null)
              setCountdown(3.05)
              for (const r of racers) r.mesh.idle()
            } else {
              const r = racers[state.lineupIdx]
              setLineup({
                index: state.lineupIdx,
                total: racers.length,
                name: r.name,
                action: r.charId === 'frog' ? '抱臂站立 · 蓄势待发' : '挥手示意 · 叉腰',
                charId: r.charId,
              })
            }
          }
          const cur = racers[Math.min(state.lineupIdx, racers.length - 1)]
          const t = Math.min(1, state.lineupClock / lineupSpan(cur.charId))
          for (const r of racers) {
            if (r === cur) r.mesh.showcase(t)
            else r.mesh.idle()
            placeAt(r, 0.55)
            r.mesh.root.visible = true
          }
          const focus = cur.mesh.root.position
          const isFrog = cur.charId === 'frog'
          // 直接站在角色正面：从角色朝向反推机位，保证能看到脸
          const ry = cur.mesh.root.rotation.y
          const faceX = Math.sin(ry)
          const faceZ = Math.cos(ry)
          const ahead = isFrog ? 6.2 : 3.6
          const side = isFrog ? 1.1 : 1.7
          const target = new T.Vector3(
            focus.x + faceX * ahead + nrm.x * side,
            GROUND + (isFrog ? 1.2 : 1.35),
            focus.z + faceZ * ahead + nrm.z * side,
          )
          state.camPos.lerp(target, 1 - Math.exp(-dt * 6))
          camera.position.copy(state.camPos)
          camera.up.set(0, 1, 0)
          camera.lookAt(
            focus.x,
            GROUND + (isFrog ? 1.0 : 1.0),
            focus.z,
          )
          camera.fov = damp(camera.fov, isFrog ? 34 : 42, 4, dt)
          camera.updateProjectionMatrix()
        }

        // ---- 倒计时 ----
        if (state.phase === 'countdown') {
          countdown -= dt
          setCount(Math.min(3, Math.max(1, Math.ceil(countdown))))
          for (const r of racers) {
            r.mesh.idle()
            placeAt(r, 0.55)
            r.mesh.root.visible = true
            r.mesh.root.rotation.x = 0
            r.mesh.root.position.y = GROUND
          }
          const baseX = origin.pos.x - dir.x * LINEUP_PAD + dir.x * 0 + nrm.x * laneZ(PLAYER_LANE)
          const baseZ = origin.pos.z - dir.z * LINEUP_PAD + dir.z * 0 + nrm.z * laneZ(PLAYER_LANE)
          const back = 8.6
          const target = new T.Vector3(baseX - dir.x * back, GROUND + 4.0, baseZ - dir.z * back)
          state.camPos.lerp(target, 1 - Math.exp(-dt * 5))
          camera.position.copy(state.camPos)
          camera.up.set(0, 1, 0)
          camera.lookAt(baseX + dir.x * 15, GROUND + 0.6, baseZ + dir.z * 15)
          camera.fov = damp(camera.fov, 56, 5, dt)
          camera.updateProjectionMatrix()

          if (countdown <= 0.05) {
            state.phase = 'run'
            state.go = true
            state.t = 0
            setSprintPhase('run')
            state.kick = 1
            if (keys['KeyW'] || keys['ArrowUp']) {
              state.playerReacted = true
              state.falseStart = true
              state.reaction = 0
              state.penalty = 0.15
              setGrade({ kind: '抢跑', reaction: 0 })
              state.gradeTimer = 2.4
            }
          }
        }

        // ---- 起跑与跑动 ----
        if (state.phase === 'run' && !finishedOnce) {
          state.t += dt
          const holding = keys['KeyW'] || keys['ArrowUp']
          if (state.playerReacted && holding) {
            const k = player.progress < 9 ? (1 / player.tau) * 2.9 : player.progress < 28 ? (1 / player.tau) * 1.55 : 1 / player.tau
            player.speed += (player.vmax - player.speed) * (1 - Math.exp(-dt * k))
          } else if (state.playerReacted) {
            player.speed += (0 - player.speed) * (1 - Math.exp(-dt * 1.3))
          } else {
            player.speed = 0
          }
          const accelNow = (player.vmax - player.speed) * (1 / player.tau)
          state.lean = 0.42 * Math.min(1, accelNow / 5.4 + player.speed / 30)
          player.progress += player.speed * dt
          state.lane = damp(state.lane, state.laneTarget, 9, dt)

          for (const r of racers) {
            if (r.isPlayer) continue
            if (state.t < r.react) continue
            const k = r.progress < 9 ? (1 / r.tau) * 2.7 : r.progress < 28 ? (1 / r.tau) * 1.5 : 1 / r.tau
            r.speed += (r.vmax - r.speed) * (1 - Math.exp(-dt * k))
            r.progress += r.speed * dt
            r.phase += dt * (5.4 + r.speed * 1.05)
            if (!r.finished && r.progress >= RACE_LEN) {
              r.finished = true
              r.progress = RACE_LEN
              r.time = state.t
            }
          }

          player.phase += dt * (5.4 + player.speed * 1.05)

          if (!player.finished && player.progress >= RACE_LEN) {
            player.finished = true
            player.progress = RACE_LEN
            player.time = state.t + state.penalty
            player.reaction = state.reaction
            finish(player.time)
          }
        }

        if (state.phase === 'run' || state.phase === 'finished') {
          const pLane = state.lane
          const pp = player.progress
          const baseX = origin.pos.x + dir.x * pp + nrm.x * laneZ(pLane)
          const baseZ = origin.pos.z + dir.z * pp + nrm.z * laneZ(pLane)
          state.camYaw = dampAngle(state.camYaw, Math.atan2(dir.x, dir.z), 14, dt)

          for (const r of racers) {
            placeAt(r)
            r.mesh.root.visible = r.isPlayer ? viewMode === 'tp' : true
            r.mesh.pose(r.phase, Math.min(1, 0.15 + r.speed / 7))
          }
          player.mesh.root.position.set(baseX, GROUND, baseZ)
          player.mesh.root.rotation.y = faceYaw
          player.mesh.root.rotation.x = 0
          for (const r of racers) {
            if (!r.isPlayer) r.mesh.root.rotation.x = 0
          }
          player.mesh.root.visible = viewMode === 'tp'

          state.kick = Math.max(0, state.kick - dt * 2.4)
          if (viewMode === 'fp') {
            state.bob += dt * (2.4 + player.speed * 1.3)
            const bobY = Math.sin(state.bob * 2) * 0.028 * Math.min(1, player.speed / 6)
            camera.position.set(baseX, GROUND + EYE + bobY, baseZ)
            if (state.kick > 0) {
              const s = state.kick * 0.05
              camera.position.x += (Math.random() - 0.5) * s
              camera.position.y += (Math.random() - 0.5) * s
            }
            state.fov = damp(state.fov, 60 + Math.min(10, player.speed * 1.1) + state.kick * 7, 6, dt)
            camera.fov = state.fov
            camera.updateProjectionMatrix()
            camera.up.set(0, 1, 0)
            camera.rotation.set(0, 0, 0)
            camera.rotateY(state.camYaw + Math.PI)
            camera.rotateX(-0.03)
            state.camInit = false
          } else {
            const back = 8.6
            const target = new T.Vector3(baseX - dir.x * back, GROUND + 4.0, baseZ - dir.z * back)
            if (!state.camInit) {
              state.camPos.copy(target)
              state.camInit = true
            }
            state.camPos.lerp(target, 1 - Math.exp(-dt * 9))
            camera.position.copy(state.camPos)
            if (state.kick > 0) {
              const s = state.kick * 0.09
              camera.position.x += (Math.random() - 0.5) * s
              camera.position.y += (Math.random() - 0.5) * s
            }
            camera.up.set(0, 1, 0)
            camera.lookAt(baseX + dir.x * 15, GROUND + 0.55, baseZ + dir.z * 15)
            state.fov = damp(state.fov, 56 + Math.min(8, player.speed) + state.kick * 6, 6, dt)
            camera.fov = state.fov
            camera.updateProjectionMatrix()
          }
        }

        if (state.gradeTimer > 0) {
          state.gradeTimer -= dt
          if (state.gradeTimer <= 0) setGrade(null)
        }
      } else if (state.mode === 'tour') {
        const run = keys['ShiftLeft'] || keys['ShiftRight']
        const speed = run ? 8.6 : 4.0
        let dx = 0
        let dz = 0
        if (keys['KeyW'] || keys['ArrowUp']) dz += 1
        if (keys['KeyS'] || keys['ArrowDown']) dz -= 1
        if (keys['KeyA'] || keys['ArrowLeft']) dx -= 1
        if (keys['KeyD'] || keys['ArrowRight']) dx += 1
        const len = Math.hypot(dx, dz) || 1
        const sy = Math.sin(state.yaw)
        const cyw = Math.cos(state.yaw)
        state.px += ((dx / len) * cyw - (dz / len) * -sy) * speed * dt
        state.pz += ((dx / len) * -sy - (dz / len) * -cyw) * speed * dt
        state.px = Math.max(-(DIM.apronL / 2 - 4), Math.min(DIM.apronL / 2 - 4, state.px))
        state.pz = Math.max(-(DIM.apronW / 2 - 4), Math.min(DIM.apronW / 2 - 4, state.pz))

        const moving = dz !== 0 || dx !== 0
        state.smoothYaw = dampAngle(state.smoothYaw, state.yaw, 16, dt)
        state.smoothPitch = damp(state.smoothPitch, state.pitch, 16, dt)
        state.bob += dt * (moving ? (run ? 9.6 : 6.2) : 0)
        player.mesh.root.position.set(state.px, GROUND, state.pz)
        player.mesh.root.rotation.y = state.smoothYaw
        player.mesh.root.visible = viewMode === 'tp'
        player.mesh.pose(state.bob, moving ? (run ? 0.85 : 0.45) : 0.1)
        for (const r of racers) {
          if (r.isPlayer) continue
          r.mesh.root.visible = false
        }

        if (viewMode === 'fp') {
          const bob = Math.sin(state.bob) * 0.024 * (moving ? 1 : 0)
          camera.position.set(state.px, GROUND + EYE + bob, state.pz)
          camera.up.set(0, 1, 0)
          camera.rotation.set(0, 0, 0)
          camera.rotateY(state.smoothYaw + Math.PI)
          camera.rotateX(state.smoothPitch)
          camera.fov = damp(camera.fov, 62, 6, dt)
          camera.updateProjectionMatrix()
          state.camInit = false
        } else {
          const back = 4.0
          const target = new T.Vector3(
            state.px - Math.sin(state.smoothYaw) * back,
            GROUND + 2.0,
            state.pz - Math.cos(state.smoothYaw) * back,
          )
          if (!state.camInit) {
            state.camPos.copy(target)
            state.camInit = true
          }
          state.camPos.lerp(target, 1 - Math.exp(-dt * 10))
          camera.position.copy(state.camPos)
          camera.up.set(0, 1, 0)
          camera.lookAt(
            state.px + Math.sin(state.smoothYaw) * 7,
            GROUND + 1.5 - state.smoothPitch * 3.2,
            state.pz + Math.cos(state.smoothYaw) * 7,
          )
          camera.fov = damp(camera.fov, 58, 6, dt)
          camera.updateProjectionMatrix()
        }
      } else {
        const t = state.time2 * 0.06
        camera.position.set(Math.cos(t) * 152, 64, Math.sin(t) * 152)
        camera.up.set(0, 1, 0)
        camera.lookAt(0, 8, 0)
        camera.fov = 46
        camera.updateProjectionMatrix()
        for (const r of racers) r.mesh.root.visible = false
        state.camInit = false
      }

      hudClock += dt
      if (hudClock > 0.08) {
        hudClock = 0
        setHud({
          dist: Math.max(0, Math.round(player.progress)),
          time: state.mode === 'sprint' ? state.t : 0,
          speed: player.speed,
          lane: Math.round(state.lane),
          rank: state.mode === 'sprint' ? rankOf(player) : 6,
        })
      }

      renderer.render(scene, camera)
      raf = requestAnimationFrame(frame)
    }

    setReady(true)
    applyStyle(styleRef.current)
    raf = requestAnimationFrame(frame)

    return () => {
      alive = false
      cancelAnimationFrame(raf)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('pointerlockchange', onLockChange)
      renderer.domElement.removeEventListener('click', onCanvasClick)
      resizeObserver.disconnect()
      document.removeEventListener('fullscreenchange',onResize)
      window.removeEventListener('blur',clearKeys)
      document.removeEventListener('visibilitychange',clearKeys)
      window.removeEventListener('resize', onResize)
      if (document.pointerLockElement) document.exitPointerLock()
      stadium.dispose()
      envRT.dispose?.()
      renderer.dispose()
      renderer.forceContextLoss?.()
      if (renderer.domElement.parentElement === el) el.removeChild(renderer.domElement)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggleView = () => {
    const next: ViewMode = view === 'fp' ? 'tp' : 'fp'
    setView(next)
    viewRef.current = next
    apiRef.current?.setView(next)
  }

  const medalText = (rank: number) => (rank === 1 ? '冠军' : rank === 2 ? '亚军' : rank === 3 ? '季军' : `第 ${rank} 名`)
  const currentChar = CHARS.find((c) => c.id === char)!

  return (
    <div className="stadium-run" ref={host}>
      {!ready && (
        <div className="tour-loading">
          <span />
          正在搭建跑道与看台……
        </div>
      )}

      {ready && (
        <>
          <div className="stadium-hud">
            <div className="stadium-hud-left">
              <span className="stadium-kicker">LANDMARK 05 · ZHIYI STADIUM</span>
              <strong>志义体育场</strong>
              <em>
                {mode === 'sprint' ? '100 m 直道决赛 · 8 人' : mode === 'tour' ? '自由参观 · 第一 / 第三人称' : '八道环形跑道 · 百米直道 · 单侧罩棚看台'}
              </em>
            </div>
            {mode === 'sprint' && (
              <div className="stadium-hud-right">
                <div className="stadium-stat">
                  <span>名次</span>
                  <b>{hud.rank} / 6</b>
                </div>
                <div className="stadium-stat">
                  <span>距离</span>
                  <b>{hud.dist} m</b>
                </div>
                <div className="stadium-stat">
                  <span>用时</span>
                  <b>{fmt(hud.time)}</b>
                </div>
                <div className="stadium-stat">
                  <span>速度</span>
                  <b>{hud.speed.toFixed(1)} m/s</b>
                </div>
              </div>
            )}
          </div>

          {(mode === 'sprint' || mode === 'tour') && (
            <div className="stadium-tools">
              <button className="stadium-style" onClick={toggleView}>
                {view === 'fp' ? '切到第三人称 (C)' : '切到第一人称 (C)'}
              </button>
              <button
                className="stadium-style"
                onClick={() => {
                  const next = styleMode === 'max' ? 'pixel' : 'max'
                  setStyleMode(next)
                  styleRef.current = next
                  apiRef.current?.setStyle(next)
                }}
              >
                {styleMode === 'max' ? '画质 MAX' : '像素风'}
              </button>
              {mode === 'tour' && (
                <button onClick={() => document.querySelector<HTMLCanvasElement>('.stadium-run canvas')?.requestPointerLock()}>
                  {locked ? '鼠标已锁定' : '锁定鼠标'}
                </button>
              )}
              <button onClick={() => apiRef.current?.exit()}>返回</button>
              <button onClick={() => closeRef.current()}>回到校园</button>
            </div>
          )}

          {mode === 'sprint' && (
            <div className="stadium-keys">
              <span>
                <kbd>W</kbd>/<kbd>↑</kbd> 冲刺
              </span>
              <span>
                <kbd>A</kbd>
                <kbd>D</kbd> 变道
              </span>
              <span>
                <kbd>C</kbd> 视角
              </span>
              <span>
                <kbd>Space</kbd> {sprintPhase === 'lineup' ? '跳过介绍' : '重跑'}
              </span>
              <span>
                <kbd>P</kbd> 画质
              </span>
              <span>
                <kbd>Esc</kbd> 退出
              </span>
            </div>
          )}

          {mode === 'tour' && (
            <div className="stadium-keys">
              <span>
                <kbd>W</kbd>
                <kbd>A</kbd>
                <kbd>S</kbd>
                <kbd>D</kbd> 移动
              </span>
              <span>鼠标 环视</span>
              <span>
                <kbd>Shift</kbd> 快走
              </span>
              <span>
                <kbd>C</kbd> 视角
              </span>
              <span>
                <kbd>P</kbd> 画质
              </span>
              <span>
                <kbd>Esc</kbd> 退出
              </span>
            </div>
          )}

          {mode === 'sprint' && (
            <div className="stadium-speedbar" aria-hidden="true">
              <i style={{ width: `${Math.min(100, (hud.speed / PLAYER_VMAX) * 100).toFixed(1)}%` }} />
              <em>{hud.speed >= PLAYER_VMAX * 0.96 ? '极速' : hud.speed >= PLAYER_VMAX * 0.55 ? '加速中' : '起跑'}</em>
            </div>
          )}

          {mode === 'sprint' && lineup && sprintPhase === 'lineup' && (
            <div className="stadium-lineup">
              <span className="stadium-kicker">ATHLETE INTRO · 第 {lineup.index + 1} / {lineup.total} 位</span>
              <strong>
                第 {[3, 4, 5, 6, 7, 8][lineup.index]} 道 · {lineup.name}
                {lineup.charId === 'frog' ? ' · 奶蛙' : ''}
              </strong>
              <em>{lineup.action}</em>
            </div>
          )}

          {mode === 'sprint' && sprintPhase === 'countdown' && (
            <div className="stadium-count" aria-live="assertive">
              <b>{count}</b>
            </div>
          )}

          {mode === 'sprint' && grade && (
            <div className={`stadium-startgrade is-${grade.kind === '完美起步' ? 'perfect' : grade.kind === '抢跑' ? 'foul' : 'ok'}`}>
              <strong>{grade.kind}</strong>
              <span>{grade.reaction.toFixed(2)} s</span>
            </div>
          )}

          {mode === 'sprint' && sprintPhase === 'finished' && result && (
            <div className="stadium-reward" role="dialog" aria-label="决赛成绩">
              <div className="stadium-reward-card">
                <div className={`stadium-medal is-rank-${Math.min(4, result.rank)}`} aria-hidden="true">
                  <span>{result.rank}</span>
                  <i>名</i>
                </div>
                <span className="stadium-kicker">FINISH · 金明杯 100 m 决赛</span>
                <h2>{medalText(result.rank)}</h2>
                <p className="stadium-reward-time">{result.time.toFixed(2)} s</p>
                <dl>
                  <div>
                    <dt>50 m 分段</dt>
                    <dd>{result.splits[0].toFixed(2)} s</dd>
                  </div>
                  <div>
                    <dt>与冠军差距</dt>
                    <dd>{result.rank === 1 ? '—' : `+${result.gap.toFixed(2)} s`}</dd>
                  </div>
                  <div>
                    <dt>个人最佳</dt>
                    <dd>{best ? `${best.toFixed(2)} s` : '—'}</dd>
                  </div>
                  <div>
                    <dt>角色</dt>
                    <dd>{currentChar.name}</dd>
                  </div>
                </dl>
                <ol className="stadium-board">
                  {result.board.map((b, i) => (
                    <li key={b.name + i} className={b.isPlayer ? 'is-me' : ''}>
                      <em>{i + 1}</em>
                      <span>{b.name}</span>
                      <b>{b.time.toFixed(2)}</b>
                    </li>
                  ))}
                </ol>
                <div className="stadium-fragment">
                  <div className="stadium-fragment-piece">
                    <img src="/assets/rewards/henu-gate-fragment.jpg" alt="建筑碎片 · 河南大学南大门" />
                  </div>
                  <div className="stadium-fragment-meta">
                    <span className="stadium-fragment-kicker">BUILDING FRAGMENT</span>
                    <strong>建筑碎片</strong>
                    <span className="stadium-fragment-count">已收集 {Math.min(result.fragments, 4)} / 4</span>
                  </div>
                </div>
                <p className="stadium-reward-note">
                  你拿到了 <b>「金明杯 · 百米」完赛徽章</b>，以及一枚
                  <b> 建筑碎片</b>（累计 {Math.min(result.fragments, 4)}/4，存在本机）。
                  <br />
                  碎片可以在「遇见筑小智」里拼回这所学校。
                </p>
                <div className="stadium-intro-actions">
                  <button className="stadium-go" onClick={() => apiRef.current?.startSprint()}>
                    再跑一次
                  </button>
                  <button className="stadium-quiet" onClick={() => apiRef.current?.startTour()}>
                    自由参观
                  </button>
                  <button className="stadium-quiet" onClick={() => closeRef.current()}>
                    回到校园
                  </button>
                </div>
              </div>
            </div>
          )}

          {mode === 'menu' && (
            <div className="stadium-intro">
              <div className="stadium-intro-card">
                <span className="stadium-kicker">LANDMARK 05 · 志义体育场</span>
                <h2>金明杯 · 百米决赛</h2>
                <p>红色塑胶跑道、绿色内场、单侧罩棚看台，依据卫星影像与实拍重建。</p>
                <ul>
                  <li>
                    <b>100 m 决赛</b>：6 人同场，赛前逐个亮相，起跑反应会被评分
                  </li>
                  <li>
                    <b>自由参观</b>：在跑道与内场里随便走，鼠标环视
                  </li>
                  <li>
                    <b>C 切换第一 / 第三人称</b>，P 切换 MAX / 像素画质
                  </li>
                </ul>
                <div className="stadium-charpick">
                  <span className="stadium-kicker">选手角色</span>
                  <div className="stadium-charpick-row">
                    {CHARS.map((c) => (
                      <button
                        key={c.id}
                        className={`stadium-char ${char === c.id ? 'is-on' : ''}`}
                        onClick={() => apiRef.current?.setCharacter(c.id)}
                      >
                        <b>{c.name}</b>
                        <i>{c.tag}</i>
                      </button>
                    ))}
                  </div>
                  <p className="stadium-charpick-desc">{currentChar.desc}</p>
                </div>
                <div className="stadium-intro-actions">
                  <button className="stadium-go" onClick={() => apiRef.current?.startSprint()}>
                    进入决赛
                  </button>
                  <button className="stadium-quiet" onClick={() => apiRef.current?.startTour()}>
                    自由参观
                  </button>
                  <button className="stadium-quiet" onClick={() => closeRef.current()}>
                    先不进去
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
