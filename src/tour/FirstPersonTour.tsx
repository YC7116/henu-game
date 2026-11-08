import { useCallback, useEffect, useRef, useState } from 'react'
import T from '../three-vendor'
import { createArt } from './art'
import { createHall, BRIDGE_Y, floorY, FLOORS, R606, type Hotspot } from './building'
import { SITE_COORD_TEXT, SITE_FROM_GATE } from '../geo'
import './tour.css'
import SceneDialogue from '../SceneDialogue'
import PhotoViewer from '../PhotoViewer'
import { gateBefore, gateAfter, journeyEnding } from '../scene-dialogue-lines'
import type { Character } from '../content'
import { BUILD_STAGES, GATE_DISPLAY_URL } from './gate-display'

/**
 * First-person interior walk-through for 建筑工程学院.
 *
 * Controls: pointer-lock mouse look + WASD / arrows, Shift to hurry,
 * E to read the nearest exhibit, Esc to close a card or leave the building.
 * Supports touch drag + on-screen pad, and `?view=` presets used for QA shots.
 */

type Pose = { x: number; z: number; yaw: number; pitch: number; feet: number }

const PRESETS: Record<string, Pose> = {
  // 从校园路进广场，朝西看——东西向的两栋楼夹着广场，门对门，斜碑在东端
  entry: { x: 41, z: 7.8, yaw: Math.PI / 2, pitch: 0.04, feet: 0 },
  sign: { x: 40.8, z: 10.2, yaw: 1.75, pitch: 0.07, feet: 0 },
  plaza: { x: 28, z: 7.8, yaw: Math.PI / 2, pitch: 0.06, feet: 0 },
  // 航拍：配合 ?eye=60 用，看两栋楼与广场的平面关系
  aerial: { x: 14, z: 7.8, yaw: Math.PI / 2, pitch: -0.55, feet: 0 },
  court: { x: -14, z: 7.8, yaw: Math.PI / 2, pitch: 0.66, feet: 0 },
  // 南楼（照片里的那栋）：门厅朝北开，进门左手电梯、右手楼梯
  doorS: { x: 19.6, z: 13.6, yaw: Math.PI, pitch: 0.0, feet: 0 },
  lobbyS: { x: 19.6, z: 20.4, yaw: Math.PI, pitch: 0.0, feet: 0 },
  honorS: { x: 15.6, z: 21.6, yaw: Math.PI / 2, pitch: 0.02, feet: 0 },
  galleryS: { x: -3.5, z: 20.2, yaw: Math.PI / 2, pitch: 0.02, feet: 0 },
  modelS: { x: -7.2, z: 15.8, yaw: Math.PI, pitch: 0.04, feet: 0 },
  liftS: { x: 30, z: 16.9, yaw: Math.PI, pitch: 0.02, feet: 0 },
  stairS: { x: 9.6, z: 16.8, yaw: Math.PI, pitch: 0.06, feet: 0 },
  corridorS: { x: 2, z: 26.5, yaw: -Math.PI / 2, pitch: 0.0, feet: 0 },
  f2corrS: { x: 0, z: 26.5, yaw: -Math.PI / 2, pitch: 0.0, feet: 4.2 },
  f6corrS: { x: 0, z: 26.5, yaw: -Math.PI / 2, pitch: 0.0, feet: floorY(6) },
  incar: { x: 30, z: 24.0, yaw: -1.05, pitch: 0.05, feet: 0 },
  // 北楼（镜像）：电梯厅在东端、楼梯间在西端，与南楼跨广场互为镜像
  doorN: { x: 19.6, z: -2.4, yaw: 0, pitch: 0.0, feet: 0 },
  lobbyN: { x: 19.6, z: -4.8, yaw: 0, pitch: 0.0, feet: 0 },
  galleryN: { x: -3.5, z: -4.6, yaw: Math.PI / 2, pitch: 0.02, feet: 0 },
  liftN: { x: 30, z: -1.9, yaw: 0, pitch: 0.02, feet: 0 },
  stairN: { x: 9.6, z: -2.6, yaw: 0, pitch: 0.06, feet: 0 },
  corridorN: { x: 0, z: -11.1, yaw: -Math.PI / 2, pitch: 0.0, feet: 0 },
  // 五层连廊：正对大门轴线，从圆形柱廊鼓座顶上跨过
  bridge: { x: 19.6, z: 9.5, yaw: 0, pitch: 0.0, feet: BRIDGE_Y },
  bridgeW: { x: 19.6, z: 7.8, yaw: Math.PI / 2, pitch: 0.0, feet: BRIDGE_Y },
  passN: { x: 19.6, z: -5.0, yaw: Math.PI, pitch: 0.0, feet: BRIDGE_Y },
  // 南楼六层 606 教室：门口 / 室内 / 大屏幕前
  room606: { x: R606.doorX, z: 26.6, yaw: 0, pitch: 0.02, feet: floorY(6) },
  inside606: { x: R606.x0 + 7.8, z: 23.0, yaw: Math.PI / 2, pitch: 0.03, feet: floorY(6) },
  screen606: { x: R606.x0 + 3.6, z: 20.6, yaw: Math.PI / 2, pitch: 0.05, feet: floorY(6) },
}

/** 截图用：?eye=44 把相机抬到 44 m 高，核对总平面时不用真的爬楼。 */
const EYE = (() => {
  if (typeof location === 'undefined') return 1.62
  const v = Number(new URLSearchParams(location.search).get('eye'))
  return Number.isFinite(v) && v > 0 ? v : 1.62
})()

/* ------------------------------------------------------- 606 大屏小游戏 --- */

/**
 * 空洞骑士风的横版 2D 跳跃：从 606 教室讲台的大屏幕里启动。
 * A/D 移动、空格跳、Esc 离开；掉进尖刺坑回起点，摸到尽头的金色碎片
 * 就算赢，奖励一块「建筑碎片」（碎片计数存到参观 HUD）。
 */
function MiniGame606({ onWin, onClose }: { onWin: () => void; onClose: () => void }) {
  const cvsRef = useRef<HTMLCanvasElement>(null)
  const [won, setWon] = useState(false)
  const [deaths, setDeaths] = useState(0)
  const wonRef = useRef(false)
  useEffect(() => {
    const canvas = cvsRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const W = 960, H = 540
    const GROUND = 470
    const LEVEL_W = 4400
    // 平台 [x, 顶面 y, 宽]；坑 / 刺带；尽头的碎片
    const PLAT: [number, number, number][] = [
      [-80, GROUND, 660], [680, GROUND, 400], [1180, GROUND, 540], [1830, GROUND, 420],
      [2350, GROUND, 660], [3110, GROUND, 420], [3630, GROUND, 770],
      [520, 380, 130], [770, 322, 120], [990, 390, 150],
      [1400, 380, 130], [1630, 322, 130], [2060, 380, 140], [2280, 322, 130],
      [3210, 378, 140], [3440, 314, 140], [4040, 380, 150],
    ]
    const PITS: [number, number][] = [[580, 680], [1080, 1180], [1720, 1830], [2250, 2350], [3010, 3110], [3530, 3630]]
    const SURF_SPIKES: [number, number][] = [[2580, 2700]]
    const GOAL = { x: 4260, y: 396 }
    const P = { x: 60, y: 380, vx: 0, vy: 0, w: 26, h: 36, onGround: false, face: 1 }
    const keys = new Set<string>()
    const GRAV = 2300, JUMP = 880, SPEED = 350
    let camX = 0
    let raf = 0
    let last = performance.now()

    const onKey = (e: KeyboardEvent, down: boolean) => {
      const k = e.key.toLowerCase()
      if (['a', 'd', 'w', 's', 'arrowleft', 'arrowright', 'arrowup', ' ', 'escape'].includes(k)) e.preventDefault()
      if (k === 'escape' && down) { onClose(); return }
      if (down) keys.add(k)
      else keys.delete(k)
    }
    const kd = (e: KeyboardEvent) => onKey(e, true)
    const ku = (e: KeyboardEvent) => onKey(e, false)
    window.addEventListener('keydown', kd)
    window.addEventListener('keyup', ku)

    const reset = () => {
      P.x = 60; P.y = 380; P.vx = 0; P.vy = 0
      setDeaths(d => d + 1)
    }

    const step = (dt: number) => {
      const L = keys.has('a') || keys.has('arrowleft')
      const R = keys.has('d') || keys.has('arrowright')
      const want = (R ? 1 : 0) - (L ? 1 : 0)
      P.vx += (want * SPEED - P.vx) * Math.min(1, dt * 12)
      if (Math.abs(P.vx) > 4) P.face = Math.sign(P.vx)
      if ((keys.has('w') || keys.has(' ') || keys.has('arrowup')) && P.onGround) {
        P.vy = -JUMP
        P.onGround = false
      }
      P.vy += GRAV * dt
      P.x = Math.max(0, Math.min(LEVEL_W, P.x + P.vx * dt))
      P.y += P.vy * dt
      P.onGround = false
      for (const [px, py, pw] of PLAT) {
        if (P.vy >= 0 && P.x + P.w / 2 > px && P.x - P.w / 2 < px + pw
          && P.y + P.h > py && P.y + P.h - P.vy * dt <= py + 14) {
          P.y = py - P.h
          P.vy = 0
          P.onGround = true
        }
      }
      let dead = P.y > 700
      if (!dead) for (const [a, b] of PITS) if (P.x > a - 6 && P.x < b + 6 && P.y + P.h > 505) dead = true
      if (!dead) for (const [a, b] of SURF_SPIKES) if (P.x + 8 > a && P.x - 8 < b && P.y + P.h > GROUND - 22) dead = true
      if (dead) { reset(); return }
      if (Math.hypot(P.x - GOAL.x, P.y + P.h / 2 - GOAL.y) < 42) {
        wonRef.current = true
        setWon(true)
        onWin()
      }
    }

    const draw = () => {
      const t = performance.now() / 1000
      const bg = ctx.createLinearGradient(0, 0, 0, H)
      bg.addColorStop(0, '#0b1020')
      bg.addColorStop(0.7, '#141a30')
      bg.addColorStop(1, '#1a2138')
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, W, H)
      // 远景遗柱（视差）
      ctx.fillStyle = 'rgba(96,116,168,0.13)'
      for (let i = 0; i < 16; i++) {
        const bx = ((i * 330 - camX * 0.35) % 2200 + 2200) % 2200 - 80
        ctx.fillRect(bx, 84 + (i % 3) * 46, 44, 430)
      }
      // 飘尘
      ctx.fillStyle = 'rgba(210,225,255,0.35)'
      for (let i = 0; i < 34; i++) {
        const dx = ((i * 197 + t * (12 + i % 5 * 6) - camX * 0.6) % 1100 + 1100) % 1100 - 40
        const dy = 60 + (i * 83) % 420
        ctx.fillRect(dx, dy, 2.4, 2.4)
      }
      ctx.save()
      ctx.translate(-camX, 0)
      for (const [px, py, pw] of PLAT) {
        ctx.fillStyle = '#222a44'
        ctx.fillRect(px, py, pw, 560 - py)
        ctx.fillStyle = '#3d4a75'
        ctx.fillRect(px, py, pw, 6)
        ctx.fillStyle = 'rgba(150,180,255,0.3)'
        ctx.fillRect(px, py - 2, pw, 2)
      }
      ctx.fillStyle = '#c9d4ef'
      for (const [a, b] of PITS) {
        for (let sx = a; sx < b; sx += 22) {
          ctx.beginPath(); ctx.moveTo(sx, 560); ctx.lineTo(sx + 11, 502); ctx.lineTo(sx + 22, 560); ctx.closePath(); ctx.fill()
        }
      }
      for (const [a, b] of SURF_SPIKES) {
        for (let sx = a; sx < b; sx += 22) {
          ctx.beginPath(); ctx.moveTo(sx, GROUND + 5); ctx.lineTo(sx + 11, GROUND - 26); ctx.lineTo(sx + 22, GROUND + 5); ctx.closePath(); ctx.fill()
        }
      }
      // 尽头的碎片
      const gy = GOAL.y + Math.sin(t * 2) * 9
      ctx.save()
      ctx.translate(GOAL.x, gy)
      ctx.rotate(t * 0.9)
      ctx.fillStyle = '#ffd76a'
      ctx.strokeStyle = '#fff3c4'
      ctx.lineWidth = 3
      ctx.beginPath(); ctx.moveTo(0, -27); ctx.lineTo(17, 0); ctx.lineTo(0, 27); ctx.lineTo(-17, 0); ctx.closePath()
      ctx.fill(); ctx.stroke()
      ctx.restore()
      // 小骑士
      ctx.save()
      ctx.translate(P.x, P.y + P.h / 2)
      ctx.scale(P.face, 1)
      ctx.fillStyle = '#eef3ff'
      ctx.fillRect(-8, 0, 16, 16)
      ctx.beginPath(); ctx.arc(0, -7, 11.5, 0, Math.PI * 2); ctx.fill()
      ctx.beginPath(); ctx.moveTo(-10, -13); ctx.lineTo(-5, -24); ctx.lineTo(-1, -12); ctx.closePath(); ctx.fill()
      ctx.beginPath(); ctx.moveTo(10, -13); ctx.lineTo(5, -24); ctx.lineTo(1, -12); ctx.closePath(); ctx.fill()
      ctx.fillStyle = '#0b1020'
      ctx.fillRect(3, -10, 4.5, 5)
      ctx.restore()
      ctx.restore()
    }

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      const dt = Math.min(0.033, (now - last) / 1000)
      last = now
      if (!wonRef.current) step(dt)
      camX += ((P.x - W * 0.42) - camX) * Math.min(1, dt * 6)
      camX = Math.max(0, Math.min(LEVEL_W - W, camX))
      draw()
    }
    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('keydown', kd)
      window.removeEventListener('keyup', ku)
    }
  }, [onClose, onWin])

  return <div className="mg606-wrap" onClick={e => e.stopPropagation()}>
    <canvas ref={cvsRef} width={960} height={540} className="mg606-cvs" />
    <div className="mg606-hud">
      <span>空洞骑士式横版跳跃 · 摸到尽头的金色碎片</span>
      <span>摔进尖刺 ×{deaths}</span>
      <span><kbd>A</kbd>/<kbd>D</kbd> 移动 · <kbd>空格</kbd> 跳 · <kbd>Esc</kbd> 离开</span>
    </div>
    {won && <div className="mg606-win">
      <div className="mg606-frag">◆</div>
      <h3>获得 建筑碎片 ×1</h3>
      <p>大屏幕暗了下去，碎片收进了口袋。</p>
      <button onClick={onClose}>回到教室</button>
    </div>}
  </div>
}

export default function FirstPersonTour({ onClose, view, character='boy', onComplete }: { onClose: () => void; view?: string; character?: Character; onComplete?:()=>void }) {
  const completedRef=useRef(onComplete);completedRef.current=onComplete
  const host = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState('')
  const [zone, setZone] = useState('入口门厅')
  const [prompt, setPrompt] = useState<Hotspot | null>(null)
  const [card, setCard] = useState<Hotspot | null>(null)
  const [locked, setLocked] = useState(false)
  const [started, setStarted] = useState(() => typeof location !== 'undefined' && new URLSearchParams(location.search).has('go'))
  // 电梯：站在门口或轿厢里时出现的提示与选层面板
  const [lift, setLift] = useState<{ i: number; floor: number; open: number; moving: boolean; inside: boolean } | null>(null)
  const [liftPanel, setLiftPanel] = useState<number | null>(null)
  const liftRef = useRef<{ i: number; floor: number; open: number; moving: boolean; inside: boolean } | null>(null)
  // 画质档：max（默认，最高清晰度）／pixel（低分辨率 + 最近邻放大，和像素校园同一质感）。
  // 界面里按 P 或点右上角切换；?style=pixel 可直接进像素风。
  const [styleMode, setStyleMode] = useState<'max' | 'pixel'>(() => {
    if (typeof location === 'undefined') return 'max'
    return new URLSearchParams(location.search).get('style') === 'pixel' ? 'pixel' : 'max'
  })
  const [walkLog, setWalkLog] = useState<string[]>([])
  // 606 教室：交互门 / 大屏幕小游戏 / 建筑碎片计数
  const [nearAct, setNearAct] = useState({ door: false, screen: false })
  const [door606Open, setDoor606Open] = useState(false)
  const [game606, setGame606] = useState(false)
  const [gatePhotoOpen,setGatePhotoOpen]=useState(false)
  const [detailOpen,setDetailOpen]=useState(false)
  const detailOpenRef=useRef(false)
  const endingSeen=useRef(false)
  const [endingOpen,setEndingOpen]=useState(false)
  function closeDetail(){
    setDetailOpen(false)
    if(endingSeen.current)setEndingOpen(true)
    else{endingSeen.current=true;setGateDialogue('ending')}
  }
  const closeDetailRef=useRef(closeDetail);closeDetailRef.current=closeDetail

  useEffect(()=>{
    if(!endingOpen||gatePhotoOpen)return
    const key=(event:KeyboardEvent)=>{if(event.key===' '&&!event.repeat&&!event.ctrlKey&&!event.metaKey&&!event.altKey){event.preventDefault();event.stopImmediatePropagation();onClose()}}
    window.addEventListener('keydown',key,true);return()=>window.removeEventListener('keydown',key,true)
  },[endingOpen,gatePhotoOpen,onClose])
  const detailFrame=useRef<HTMLIFrameElement>(null)
  const detailClose=useRef<HTMLButtonElement>(null)
  const [gateDialogue,setGateDialogue]=useState<'before'|'after'|'ending'|null>(null)
  const gateDialogueRef=useRef<boolean>(false);gateDialogueRef.current=!!gateDialogue||endingOpen||gatePhotoOpen
  const previousAssemblyStatus=useRef('ready')
  const [assemblyOpen,setAssemblyOpen]=useState(false)
  const assemblyOpenRef=useRef(false)
  const [assembly,setAssembly]=useState({status:'loading',progress:0,stage:0})
  const [nearAssembly,setNearAssembly]=useState(false)
  const assemblyNearRef=useRef(false)
  const assemblyApi=useRef<{start:()=>void;retry:()=>void}>({start(){},retry(){}})
  const [fragments, setFragments] = useState(0)
  const gameOpenRef = useRef(false)
  const actRef = useRef({ door: false, screen: false })
  const doorOpenRef = useRef(false)
  useEffect(() => { gameOpenRef.current = game606 }, [game606])
  useEffect(()=>{assemblyOpenRef.current=assemblyOpen},[assemblyOpen])
  useEffect(()=>{
    detailOpenRef.current=detailOpen
    const receive=(event:MessageEvent)=>{if(event.origin===location.origin && event.source===detailFrame.current?.contentWindow && event.data?.type==='henu-gate-viewer-close')closeDetailRef.current()}
    window.addEventListener('message',receive)
    return()=>window.removeEventListener('message',receive)
  },[detailOpen])
  const openGame = useCallback(() => setGame606(true), [])
  const closeGame = useCallback(() => setGame606(false), [])
  const winFragment = useCallback(() => setFragments(f => f + 1), [])
  const promptRef = useRef<Hotspot | null>(null)
  const cardOpen = useRef(false)
  const api = useRef<{ interact: () => void; reset: () => void; lock: () => void; setStyle: (m: 'max' | 'pixel') => void; callLift: (i: number, floor: number) => void; toggleDoor606: () => boolean }>({ interact: () => {}, reset: () => {}, lock: () => {}, setStyle: () => {}, callLift: () => {}, toggleDoor606: () => false })
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  const styleModeRef = useRef(styleMode)
  styleModeRef.current = styleMode

  const shot = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('shot') : null
  const isShot = shot !== null

  useEffect(() => { cardOpen.current = !!card }, [card])

  useEffect(() => {
    const el = host.current
    if (!el) return
    let renderer: any
    let scene: any
    let hall: any
    let art: any
    try {
      art = createArt()
      hall = createHall(art, styleModeRef.current === 'max' ? 3072 : 2048)
      renderer = new T.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', alpha: false })
    } catch (error) {
      setFailed('这台设备暂时无法启动 3D 参观（WebGL 未就绪）。可以继续用图片地标浏览。')
      return
    }
    // ?lift=2 联调用：一进场就把两台电梯叫到指定层，方便截图看门与轿厢
    {
      const lp = new URLSearchParams(location.search).get('lift')
      // 截图时用 snap：首帧就要看到门开、轿厢到位，否则镜头里是空井道
      if (lp) for (let i = 0; i < hall.liftCount; i++) hall.snapLift(i, Number(lp) || 1)
      // ?door=1：一进来就把 606 教室的门打开（截图/联调用）
      if (new URLSearchParams(location.search).has('door')) hall.door606Toggle?.()
    }
    const canvas = renderer.domElement as HTMLCanvasElement
    canvas.className = 'tour-canvas'
    canvas.tabIndex = 0
    el.appendChild(canvas)

    // 两档画质：
    // - max：按设备像素比渲染（最多 2×），保留全部细节，阴影贴图 3072²；
    // - pixel：内部固定约 600p，再用最近邻放大到屏幕，和像素校园同一观感。
    // 两档都保留一层动态分辨率兜底，但 max 档的下限更高，只有真掉帧才降。
    const MAX_DPR = Math.min(window.devicePixelRatio || 1, 2)
    const PIXEL_BASE_HEIGHT = 600
    let renderScale = 1
    let mode: 'max' | 'pixel' = styleModeRef.current
    const applyPixelRatio = () => {
      const h = el.clientHeight || 1
      if (mode === 'pixel') renderer.setPixelRatio(Math.max(0.4, Math.min(1, (PIXEL_BASE_HEIGHT * renderScale) / h)))
      else renderer.setPixelRatio(MAX_DPR * renderScale)
    }
    canvas.classList.toggle('is-pixel', mode === 'pixel')
    applyPixelRatio()
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = T.PCFSoftShadowMap
    // 建筑与家具都是静态的，阴影贴图只在首帧烘一次，之后每帧不再重算。
    // 这一步在集显/低端设备上通常能省掉一半以上的 GPU 时间。
    renderer.shadowMap.autoUpdate = false
    renderer.shadowMap.needsUpdate = true
    renderer.toneMapping = T.ACESFilmicToneMapping
    renderer.toneMappingExposure = 0.95
    renderer.outputColorSpace = T.SRGBColorSpace

    scene = new T.Scene()
    scene.background = art.sky
    scene.fog = new T.FogExp2('#e6e7e0', 0.0052)
    scene.backgroundIntensity = 0.9
    const pmrem = new T.PMREMGenerator(renderer)
    const envRT = pmrem.fromEquirectangular(art.sky)
    scene.environment = envRT.texture
    pmrem.dispose()
    scene.add(hall.root)

    // MAX 档把贴图各向异性拉满：水磨石地面与砖墙在低角度看会明显变清晰。
    const maxAniso = renderer.capabilities.getMaxAnisotropy?.() || 1
    const seenTex = new Set<any>()
    hall.root.traverse((object: any) => {
      const material = object.material
      for (const m of Array.isArray(material) ? material : [material]) {
        if (!m) continue
        for (const key of ['map', 'normalMap', 'roughnessMap']) {
          const tex = m[key]
          if (tex && !seenTex.has(tex)) {
            seenTex.add(tex)
            tex.anisotropy = maxAniso
            tex.needsUpdate = true
          }
        }
      }
    })

    const camera = new T.PerspectiveCamera(70, 1, 0.05, 320)
    camera.rotation.order = 'YXZ'

    const preset = (view && PRESETS[view]) || PRESETS.entry
    const p: Pose = { ...preset }
    if (view && PRESETS[view]) {
      const surface = hall.surfaceAt(p.x, p.z, p.feet)
      if (surface !== null) p.feet = surface
    }
    let camY = p.feet + 1.62
    // 相机视角与移动速度都做帧率无关的平滑，避免低帧率下转身一顿一顿。
    let viewYaw = p.yaw
    let viewPitch = p.pitch
    let speedNow = 0
    let dirX = 0
    let dirZ = -1
    let prevYaw = p.yaw
    // 安全点：万一脚下那块面突然消失（比如人还站在门槛上、轿厢却开走了），
    // 立刻退回上一个站得住的位置，而不是卡在半空动弹不得。
    let lastGood = { x: p.x, z: p.z, feet: p.feet }

    /** 每帧把脚重新贴到脚下那块面上。
     *  电梯地板是会动的——站着不动时也必须更新，否则轿厢升到 1.3 m 以上，
     *  抬脚判定（|feet - 轿厢高度| < 1.3）失效，人就留在原地、卡在半空。 */
    const settle = () => {
      const h = hall.surfaceAt(p.x, p.z, p.feet)
      if (h === null) {
        const back = hall.surfaceAt(lastGood.x, lastGood.z, lastGood.feet)
        if (back !== null) {
          p.x = lastGood.x
          p.z = lastGood.z
          p.feet = back
        } else {
          // 连安全点也悬空了：送回南楼门厅，绝不允许把人卡死在半空
          p.x = 19.6
          p.z = 20.4
          p.feet = hall.surfaceAt(19.6, 20.4, 0) ?? 0
        }
        speedNow = 0
        return false
      }
      p.feet = h
      lastGood = { x: p.x, z: p.z, feet: h }
      return true
    }

    // 人是 0.32 m 半径的圆柱，不是一根线。没有这个半径，走到墙边相机中心就贴到墙面上，
    // 近裁剪面 0.05 一切就把墙切掉——从屋里能看见室外/背面，也就是"穿模"。
    const BODY = 0.32
    const PROBES: [number, number][] = [[BODY, 0], [-BODY, 0], [0, BODY], [0, -BODY]]
    /** 脚下高度 h 时能不能站在 (x,z)：中心 + 四向探针都不许撞体。 */
    const stepOk = (x: number, z: number, h: number) => {
      if (hall.blockedAt(x, z, h)) return false
      for (let i = 0; i < PROBES.length; i++) {
        if (hall.blockedAt(x + PROBES[i][0], z + PROBES[i][1], h)) return false
      }
      return true
    }
    // 一帧的位移量（2.45 m/s @60fps）。自检必须用这个步长，
    // 以前用 0.06 的大步长会"跨过"门槛那条 2 cm 缝，把电梯的 bug 掩盖掉。
    const STEP = 0.0408

    // ?walktest=1 drives the same collision code along the intended route so the
    // stair, bridge and balcony can be verified without a human at the keyboard.
    if (new URLSearchParams(location.search).has('walktest')) {
      // 通用行走器：撞墙即停，返回是否到达
      const walker = (pos: { x: number; z: number; feet: number }, tx: number, tz: number, eps = 0.16) => {
        let guard = 0
        while (Math.hypot(tx - pos.x, tz - pos.z) > eps && guard++ < 9000) {
          const dx = tx - pos.x
          const dz = tz - pos.z
          const len = Math.hypot(dx, dz) || 1
          const sx = (dx / len) * STEP
          const sz = (dz / len) * STEP
          let moved = false
          const hx = hall.surfaceAt(pos.x + sx, pos.z, pos.feet)
          if (hx !== null && stepOk(pos.x + sx, pos.z, hx)) { pos.x += sx; pos.feet = hx; moved = true }
          const hz = hall.surfaceAt(pos.x, pos.z + sz, pos.feet)
          if (hz !== null && stepOk(pos.x, pos.z + sz, hz)) { pos.z += sz; pos.feet = hz; moved = true }
          if (!moved) break
        }
        return Math.hypot(tx - pos.x, tz - pos.z) < eps + 0.12
      }
      let cur = { x: hall.start.x, z: hall.start.z, feet: 0 }
      const out = ['start ' + cur.x.toFixed(2) + ',' + cur.z.toFixed(2)]
      // ---- 一层动线：广场 → 南楼门厅 → 走廊 → 陈列厅 → 楼梯间 → 电梯厅 ----
      const route: [number, number][] = [
        [33, 7.8], [28.5, 9.3], [26.2, 9.3], [19.6, 12.6], [19.6, 18.0], [19.6, 21.6],
        [19.6, 24.6], [19.6, 26.4], [-0.8, 26.4], [-0.8, 22.2], [-7.2, 19.0],
        [-13.5, 20.2], [-7.2, 21.0], [-0.8, 23.5], [-0.8, 26.4], [19.6, 26.4],
        [19.6, 21.8], [19.6, 18.6], [13.6, 18.8], [10.7, 18.2], [19.6, 18.6],
        [23.5, 20.6], [27.5, 18.8], [28.4, 18.2], [30, 18.1],
      ]
      for (const [tx, tz] of route) {
        const ok = walker(cur, tx, tz)
        out.push(`→${tx},${tz} ${ok ? 'ok' : 'BLOCKED'} at ${cur.x.toFixed(2)},${cur.z.toFixed(2)} y=${cur.feet.toFixed(2)} zone=${hall.zone(cur.x, cur.z, cur.feet)}`)
      }
      // ---- 南楼楼梯：直跑上二层，平台直接开向走廊 ----
      {
        cur = { x: 9.6, z: 16.6, feet: 0 }
        const up = walker(cur, 9.6, 24.2, 0.14)
        out.push(`→南楼楼梯上行 ${up ? 'ok' : 'BLOCKED'} feet=${cur.feet.toFixed(2)} ${Math.abs(cur.feet - 4.2) < 0.05 ? 'ok' : 'FAIL'} zone=${hall.zone(cur.x, cur.z, cur.feet)}`)
        const corr = walker(cur, 9.6, 26.6, 0.14)
        out.push(`→二层平台进走廊 ${corr ? 'ok' : 'BLOCKED'} feet=${cur.feet.toFixed(2)} zone=${hall.zone(cur.x, cur.z, cur.feet)}`)
      }
      // ---- 南楼电梯：呼叫 → 门开 → 进轿厢 → 选 6 层 → 到位 → 出轿厢 ----
      {
        cur = { x: 30, z: 18.2, feet: 0 }
        const atDoor = hall.liftIndex(cur.x, cur.z, cur.feet) === 1
        // 站在电梯厅的任意位置都应该能呼梯（修「没法交互」）
        const hallSpot = hall.liftIndex(28, 20, 0) === 1 && hall.liftIndex(32.2, 16.6, 0) === 1
        // 门没开时应该过不去
        const shutBlocked = hall.blockedAt(30, 22.96, 0)
        hall.sendLift(1, 1)
        for (let k = 0; k < 180; k++) hall.tick(1 / 60)
        const opened = hall.liftState(1).open > 0.9
        const intoCar = walker(cur, 30, 24.0, 0.12)
        const inCar = hall.insideLift(1, cur.x, cur.z)
        hall.sendLift(1, 6)
        for (let k = 0; k < 1100; k++) {
          hall.tick(1 / 60)
          const h = hall.surfaceAt(cur.x, cur.z, cur.feet)
          if (h !== null) cur.feet = h
        }
        const carY = hall.liftState(1).y
        const outCar = walker(cur, 30, 21.8, 0.12)
        out.push(`lift door=${atDoor ? 'ok' : 'MISS'} hallSpot=${hallSpot ? 'ok' : 'MISS'} closedBlocks=${shutBlocked ? 'ok' : 'LEAK'} open=${opened ? 'ok' : 'NO'}`
          + ` enter=${intoCar && inCar ? 'ok' : 'BLOCKED'} carY=${carY.toFixed(2)} exit=${outCar ? 'ok' : 'BLOCKED'}`
          + ` feet=${cur.feet.toFixed(2)} zone=${hall.zone(cur.x, cur.z, cur.feet)}`
          + ` ${Math.abs(carY - floorY(6)) < 0.05 && Math.abs(cur.feet - floorY(6)) < 0.05 ? 'ok' : 'FAIL'}`)
      }
      // ---- 站着不动坐电梯：轿厢升到五层，脚必须跟着走 ----
      {
        // 上一项自检把电梯留在了 6 层，先召回一层再测，否则人一进来就悬在空井道里
        hall.sendLift(1, 1)
        for (let k = 0; k < 1600; k++) hall.tick(1 / 60)
        p.x = 30
        p.z = 24.0
        p.feet = 0
        lastGood = { x: p.x, z: p.z, feet: 0 }
        settle()
        hall.sendLift(1, 5)
        for (let k = 0; k < 1400; k++) {
          hall.tick(1 / 60)
          settle()
        }
        const y5 = hall.liftState(1).y
        const ride5 = Math.abs(p.feet - y5) < 0.05 && Math.abs(y5 - floorY(5)) < 0.05
        out.push(`→坐到五层 carY=${y5.toFixed(2)} feet=${p.feet.toFixed(2)} ${ride5 ? 'ok' : '掉队'}`)
        // 出轿厢 → 电梯厅 → 门厅 → 走廊 → 大门轴线上的连廊通道 → 玻璃连廊 → 北楼五层走廊
        const pcur = { x: p.x, z: p.z, feet: p.feet }
        const steps: [number, number][] = [
          [30, 21.8], [28.5, 19.0], [24, 18.8], [21.8, 24.6], [21.8, 26.6], [19.6, 26.6],
          [19.6, 24.2], [19.6, 19.0], [19.6, 12.0], [19.6, -4.0], [19.6, -11.1],
        ]
        let allOk = true
        for (const [tx, tz] of steps) {
          if (!walker(pcur, tx, tz, 0.18)) { allOk = false; break }
        }
        p.x = pcur.x
        p.z = pcur.z
        p.feet = pcur.feet
        out.push(`→五层过连廊 ${allOk ? 'ok' : 'BLOCKED'} at ${p.x.toFixed(2)},${p.z.toFixed(2)} feet=${p.feet.toFixed(2)}` +
          ` zone=${hall.zone(p.x, p.z, p.feet)}`)
      }
        // ---- 北楼电梯：镜像方向再验一遍（电梯厅同样在东端）----
        {
          hall.sendLift(0, 1)
          for (let k = 0; k < 1600; k++) hall.tick(1 / 60)
          cur = { x: 30, z: -2.4, feet: 0 }
          const atDoor0 = hall.liftIndex(cur.x, cur.z, cur.feet) === 0
          hall.sendLift(0, 1)
          for (let k = 0; k < 180; k++) hall.tick(1 / 60)
          const opened0 = hall.liftState(0).open > 0.9
          const in0 = walker(cur, 30, -8.4, 0.12)
          const inCar0 = hall.insideLift(0, cur.x, cur.z)
          hall.sendLift(0, 3)
          for (let k = 0; k < 900; k++) {
            hall.tick(1 / 60)
            const h = hall.surfaceAt(cur.x, cur.z, cur.feet)
            if (h !== null) cur.feet = h
          }
          const carY0 = hall.liftState(0).y
          const out0 = walker(cur, 30, -6.0, 0.12)
          out.push(`→北楼电梯 door=${atDoor0 ? 'ok' : 'MISS'} open=${opened0 ? 'ok' : 'NO'}`
            + ` enter=${in0 && inCar0 ? 'ok' : 'BLOCKED'} carY=${carY0.toFixed(2)} exit=${out0 ? 'ok' : 'BLOCKED'}`
            + ` feet=${cur.feet.toFixed(2)} zone=${hall.zone(cur.x, cur.z, cur.feet)}`
            + ` ${Math.abs(carY0 - floorY(3)) < 0.05 && Math.abs(cur.feet - floorY(3)) < 0.05 ? 'ok' : 'FAIL'}`)
        }
        // ---- 606 教室：交互门 + 大屏幕感应 ----
        {
          cur = { x: 28, z: 26.6, feet: floorY(6) }
          const toDoor = walker(cur, R606.doorX, 26.4, 0.14)
          const doorNear = hall.door606Near(cur.x, cur.z, cur.feet)
          const shutBlocked = hall.blockedAt(R606.doorX, 25.05, floorY(6))
          hall.door606Toggle()
          for (let k = 0; k < 150; k++) hall.tick(1 / 60)
          const openPass = !hall.blockedAt(R606.doorX, 25.05, floorY(6))
          const into = walker(cur, R606.doorX, 23.4, 0.14) && walker(cur, R606.x0 + 3.2, 21.8, 0.14)
          const nearScreen = hall.screen606Near(cur.x, cur.z, cur.feet)
          out.push(`→606门 toDoor=${toDoor ? 'ok' : 'BLOCKED'} near=${doorNear ? 'ok' : 'MISS'}`
            + ` shutBlocks=${shutBlocked ? 'ok' : 'LEAK'} openPass=${openPass ? 'ok' : 'NO'}`
            + ` enter=${into ? 'ok' : 'BLOCKED'} screen=${nearScreen ? 'ok' : 'MISS'} zone=${hall.zone(cur.x, cur.z, cur.feet)}`)
          out.push(`→606末端墙 ${hall.blockedAt(R606.x0,26.6,floorY(6))?'ok':'LEAK'} · 电梯至末端教室横向 ${(30-R606.doorX).toFixed(1)}m`)
          hall.door606Toggle() // 关门复位
          for (let k = 0; k < 150; k++) hall.tick(1 / 60)
        }
        // 复位，别让 walktest 之后一进来就站在五层
        p.x = hall.start.x
        p.z = hall.start.z
        p.feet = 0
        camY = 1.62
        lastGood = { x: p.x, z: p.z, feet: 0 }

      // ---- 穿模回归：北楼走廊往东走到山墙、广场上贴着北楼门脸 ----
      {
        cur = { x: 0, z: -11.1, feet: 0 }
        let k = 0
        for (; k < 2000; k++) {
          const nx2 = cur.x + 0.02
          const h2 = hall.surfaceAt(nx2, cur.z, cur.feet)
          if (h2 === null || !stepOk(nx2, cur.z, h2)) break
          cur = { x: nx2, z: cur.z, feet: h2 }
        }
        const gap = 33.95 - cur.x
        out.push(`→走廊贴山墙 x=${cur.x.toFixed(2)} 距墙 ${gap.toFixed(2)}m ${gap > 0.28 ? 'ok' : '穿模'}`)
      }
      {
        cur = { x: 26, z: 1.4, feet: 0 }
        let k = 0
        for (; k < 400; k++) {
          const nz2 = cur.z - 0.02
          const h2 = hall.surfaceAt(cur.x, nz2, cur.feet)
          if (h2 === null || !stepOk(cur.x, nz2, h2)) break
          cur = { x: cur.x, z: nz2, feet: h2 }
        }
        out.push(`→北楼门脸前 z=${cur.z.toFixed(2)} ${cur.z > 0.28 ? 'ok' : '穿模'}`)
      }
      setWalkLog(out)
      document.title = out.join(' | ')
    }

    let baseFov = 70
    let stretch = 0
    const resize = () => {
      const w = Math.max(1,el.clientWidth)
      const h = Math.max(1,el.clientHeight)
      renderer.setSize(w, h, false)
      camera.aspect = w / Math.max(1, h)
      baseFov = w < 720 ? 78 : 70
      camera.fov = baseFov + stretch
      camera.updateProjectionMatrix()
    }
    const observer = new ResizeObserver(resize)
    observer.observe(el)
    document.addEventListener('fullscreenchange',resize)
    resize()

    /* --------------------------------------------------------- input --- */

    const keys = new Set<string>()
    let dragging = false
    let lastPointer = { x: 0, y: 0 }
    let walkPhase = 0

    const onKeyDown = (event: KeyboardEvent) => {
      if(gateDialogueRef.current)return
      if(event.ctrlKey||event.metaKey||event.altKey||(event.target as HTMLElement)?.closest('input,textarea,select,[contenteditable="true"]'))return
      const key = event.key.toLowerCase()
      // 606 小游戏开着时：所有按键都归游戏自己管
      if(detailOpenRef.current){if(key==='escape')closeDetailRef.current();return}
      if (gameOpenRef.current) return
      if(assemblyOpenRef.current){if(key==='escape'){setAssemblyOpen(false);if(document.pointerLockElement)document.exitPointerLock()};return}
      if((key==='e'||key==='f')&&!event.repeat&&assemblyNearRef.current){event.preventDefault();setAssemblyOpen(true);setGateDialogue('before');if(document.pointerLockElement)document.exitPointerLock();return}
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
        event.preventDefault()
        keys.add(key)
      }
      if (key === 'shift') keys.add('shift')
      if ((key === 'e' || key === 'f') && !event.repeat) {
        // 优先级：大屏幕（启动游戏）> 606 门（开/关）> 电梯 > 展签
        if (actRef.current.screen) {
          event.preventDefault()
          setGame606(true)
          if (document.pointerLockElement) document.exitPointerLock()
          return
        }
        if (actRef.current.door) {
          event.preventDefault()
          setDoor606Open(hall.door606Toggle())
          return
        }
        const target = promptRef.current
        if (target) {
          event.preventDefault()
          setCard(target)
          if (document.pointerLockElement) document.exitPointerLock()
          return
        }
        const lf = liftRef.current
        if (lf) {
          event.preventDefault()
          if (lf.inside) {
            setLiftPanel(lf.i)
            if (document.pointerLockElement) document.exitPointerLock()
          } else {
            api.current.callLift(lf.i, lf.floor)
          }
        }
      }
      if (key === 'escape') {
        if (document.pointerLockElement) document.exitPointerLock()
        else if (cardOpen.current) setCard(null)
        else closeRef.current()
      }
      if (key === 'r' && !event.repeat) api.current.reset()
      if (key === 'p' && !event.repeat) {
        const next = styleModeRef.current === 'max' ? 'pixel' : 'max'
        styleModeRef.current = next
        setStyleMode(next)
        api.current.setStyle(next)
      }
    }
    const onKeyUp = (event: KeyboardEvent) => {
      keys.delete(event.key.toLowerCase())
      if (event.key === 'Shift') keys.delete('shift')
    }
    const clearKeys = () => keys.clear()

    const look = (dx: number, dy: number) => {
      p.yaw -= dx * 0.0020
      p.pitch -= dy * 0.0020
      p.pitch = Math.max(-1.2, Math.min(1.2, p.pitch))
    }
    const onMouseMove = (event: MouseEvent) => {
      if (document.pointerLockElement === canvas) look(event.movementX, event.movementY)
    }
    // 预览面板/iframe 里可能不允许 pointer lock，失败时不能把整个交互卡死，
    // 所以鼠标也允许按住拖动转头（不依赖锁定）。
    const onPointerDown = (event: PointerEvent) => {
      if(assemblyOpenRef.current)return
      dragging = true
      lastPointer = { x: event.clientX, y: event.clientY }
      canvas.setPointerCapture?.(event.pointerId)
    }
    const onPointerMove = (event: PointerEvent) => {
      if (!dragging || document.pointerLockElement === canvas) return
      look(event.clientX - lastPointer.x, event.clientY - lastPointer.y)
      lastPointer = { x: event.clientX, y: event.clientY }
    }
    const onPointerUp = () => { dragging = false }

    const onLockChange = () => {
      const isLocked = document.pointerLockElement === canvas
      setLocked(isLocked)
      if (!isLocked) clearKeys()
    }
    const lockPointer = () => {
      if (document.pointerLockElement === canvas) return
      try {
        const result = canvas.requestPointerLock?.()
        if (result && typeof (result as Promise<void>).catch === 'function') (result as Promise<void>).catch(() => {})
      } catch {
        /* 浏览器拒绝锁定时静默降级为拖动转头 */
      }
    }
    const onClick = () => {
      if (isShot || assemblyOpenRef.current) return
      if (!document.pointerLockElement && !cardOpen.current) lockPointer()
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', clearKeys)
    document.addEventListener('visibilitychange',clearKeys)
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('pointerlockchange', onLockChange)
    canvas.addEventListener('click', onClick)
    canvas.addEventListener('pointerdown', onPointerDown)
    canvas.addEventListener('pointermove', onPointerMove)
    canvas.addEventListener('pointerup', onPointerUp)
    canvas.addEventListener('pointercancel', onPointerUp)

    api.current.lock = () => lockPointer()
    api.current.setStyle = (next: 'max' | 'pixel') => {
      mode = next
      canvas.classList.toggle('is-pixel', mode === 'pixel')
      applyPixelRatio()
      resize()
    }
    api.current.reset = () => {
      p.x = PRESETS.entry.x
      p.z = PRESETS.entry.z
      p.yaw = PRESETS.entry.yaw
      p.pitch = PRESETS.entry.pitch
      p.feet = 0
      camY = 1.62
      speedNow = 0
    }
    api.current.callLift = (i: number, floor: number) => hall.sendLift(i, floor)
    api.current.toggleDoor606 = () => hall.door606Toggle()
    assemblyApi.current={retry:()=>hall.gateDisplay.retry(),start:()=>{
      keys.clear();speedNow=0;p.x=R606.x1-3;p.z=24.1;p.feet=floorY(6);p.yaw=0;p.pitch=-.36;hall.gateDisplay.start()
    }}
    api.current.interact = () => {
      const target = promptRef.current
      if (target) {
        setCard(target)
        if (document.pointerLockElement) document.exitPointerLock()
      }
    }

    let wasInRoom606=false
    /* -------------------------------------------------------- walking --- */

    const tryAt = (nx: number, nz: number) => {
      const h = hall.surfaceAt(nx, nz, p.feet)
      if (h === null || !stepOk(nx, nz, h)) return false
      p.x = nx
      p.z = nz
      p.feet = h
      return true
    }

    let last = performance.now()
    let smoothDt = 1 / 60
    let uiClock = 0
    let perfAcc = 0
    let perfFrames = 0
    let raf = 0
    let alive = true

    const frame = (now: number) => {
      if (!alive) return
      const rawDt = Math.min(0.05, Math.max(0, (now - last) / 1000))
      last = now
      smoothDt += (rawDt - smoothDt) * 0.25
      // 卡顿那几帧用平滑步长推进，画面上的位移更连续，不会突然窜一下。
      if(detailOpenRef.current){raf=requestAnimationFrame(frame);return}
      const dt = rawDt > smoothDt * 1.8 ? smoothDt * 1.8 : rawDt

      const frozen = (cardOpen.current || gameOpenRef.current || assemblyOpenRef.current) && !isShot
      const forward = Number(keys.has('w') || keys.has('arrowup')) - Number(keys.has('s') || keys.has('arrowdown'))
      const strafe = Number(keys.has('d') || keys.has('arrowright')) - Number(keys.has('a') || keys.has('arrowleft'))
      const moving = !frozen && (forward !== 0 || strafe !== 0)

      // 速度用指数平滑：起步有加速、松手有一点收住，不会一顿一顿地启停。
      const wanted = moving ? (keys.has('shift') ? 4.3 : 2.45) : 0
      speedNow += (wanted - speedNow) * (1 - Math.exp(-dt * (wanted > speedNow ? 14 : 20)))
      if (moving) {
        const fx = -Math.sin(p.yaw)
        const fz = -Math.cos(p.yaw)
        const rx = Math.cos(p.yaw)
        const rz = -Math.sin(p.yaw)
        let dx = fx * forward + rx * strafe
        let dz = fz * forward + rz * strafe
        const len = Math.hypot(dx, dz) || 1
        dirX = dx / len
        dirZ = dz / len
      }
      if (speedNow > 0.02 && !frozen) {
        const dist = speedNow * dt
        const steps = Math.max(1, Math.ceil(dist / 0.06))
        const stepX = (dirX * dist) / steps
        const stepZ = (dirZ * dist) / steps
        for (let i = 0; i < steps; i++) {
          if (!tryAt(p.x + stepX, p.z)) tryAt(p.x, p.z)
          if (!tryAt(p.x, p.z + stepZ)) tryAt(p.x, p.z)
        }
        walkPhase += dist * (0.7 + speedNow * 0.07)
      }

      settle()

      const walking = speedNow > 0.2
      const bob = walking ? Math.sin(walkPhase) * 0.018 : 0
      const targetY = p.feet + (assemblyOpenRef.current?3.0:EYE) + bob
      const carIdx = hall.liftIndex(p.x, p.z, p.feet)
      const riding = carIdx >= 0 && hall.insideLift(carIdx, p.x, p.z)
      camY += (targetY - camY) * Math.min(1, dt * (riding ? 26 : 12))

      // 转头也让视线值平滑追随目标值，鼠标抖动/掉帧时不会闪。
      const lookEase = 1 - Math.exp(-dt * 34)
      viewYaw += (p.yaw - viewYaw) * lookEase
      viewPitch += (p.pitch - viewPitch) * lookEase

      camera.position.set(assemblyOpenRef.current?R606.x1-3:p.x, camY, assemblyOpenRef.current?24.1:p.z)
      camera.rotation.set(assemblyOpenRef.current?-.36:viewPitch, assemblyOpenRef.current?0:viewYaw, Math.sin(walkPhase * 0.5) * (walking ? 0.0028 : 0))

      // 快速转身时视野轻微扩张（最多 3°），转身更有速度感、边缘也更有"拉"的感觉。
      const yawSpeed = Math.abs(viewYaw - prevYaw) / Math.max(dt, 0.001)
      prevYaw = viewYaw
      const wantedStretch = frozen ? 0 : Math.min(3, yawSpeed * 0.5)
      stretch += (wantedStretch - stretch) * (1 - Math.exp(-rawDt * 5))
      const displayFov=assemblyOpenRef.current?50:baseFov
      if (Math.abs(camera.fov - (displayFov + stretch)) > 0.04) {
        camera.fov = displayFov + stretch
        camera.updateProjectionMatrix()
      }

      hall.tick(dt)
      renderer.render(scene, camera)

      // 每 45 帧核算一次帧时间：慢就降内部渲染分辨率，空出来再慢慢升回去。
      perfAcc += rawDt
      perfFrames += 1
      if (perfFrames >= 45) {
        const avg = perfAcc / perfFrames
        perfAcc = 0
        perfFrames = 0
        let want = renderScale
        const slow = mode === 'max' ? 0.0265 : 0.0215
        const floor = mode === 'max' ? 0.78 : 0.6
        if (avg > slow) want = renderScale * Math.max(floor, 0.0167 / avg)
        else if (avg < 0.0148) want = renderScale * 1.12
        want = Math.max(floor, Math.min(1, want))
        if (Math.abs(want - renderScale) > 0.045) {
          renderScale = want
          applyPixelRatio()
          resize()
        }
        const hud = document.getElementById('tour-perf')
        if (hud) hud.textContent = `${(1 / avg).toFixed(0)} fps · 渲染 ${(renderScale * 100).toFixed(0)}% · ${renderer.info.render.calls} 次绘制`
      }

      if (now - uiClock > 120) {
        uiClock = now
        const currentZone=hall.zone(p.x,p.z,p.feet)
        setZone(currentZone)
        const inRoom606=currentZone==='南楼 · 606 教室'
        if(wasInRoom606&&!inRoom606){hall.gateDisplay.reset();setAssemblyOpen(false);setDetailOpen(false);setGateDialogue(null);setEndingOpen(false);setGatePhotoOpen(false)}
        wasInRoom606=inRoom606
        const assemblyNear=hall.gateDisplay.near(p.x,p.z,p.feet);assemblyNearRef.current=assemblyNear;setNearAssembly(assemblyNear);const gateState=hall.gateDisplay.state();setAssembly(gateState);if(previousAssemblyStatus.current==='building'&&gateState.status==='complete'){setGateDialogue('after');completedRef.current?.()};previousAssemblyStatus.current=gateState.status
        const li = hall.liftIndex(p.x, p.z, p.feet)
        // 606：门 / 大屏幕的感应区
        const nearDoor = typeof hall.door606Near === 'function' && hall.door606Near(p.x, p.z, p.feet)
        const nearScreen = typeof hall.screen606Near === 'function' && hall.screen606Near(p.x, p.z, p.feet)
        if (nearDoor !== actRef.current.door || nearScreen !== actRef.current.screen) {
          actRef.current = { door: nearDoor, screen: nearScreen }
          setNearAct(actRef.current)
        }
        const dOpen = typeof hall.door606Open === 'function' ? hall.door606Open() : false
        if (dOpen !== doorOpenRef.current) {
          doorOpenRef.current = dOpen
          setDoor606Open(dOpen)
        }
        let best: Hotspot | null = null
        let bestDistance = Infinity
        for (const spot of hall.hotspots) {
          const d = Math.hypot(spot.x - p.x, spot.z - p.z)
          if (d < spot.radius && Math.abs(spot.y - p.feet) < 1.8 && d < bestDistance) {
            best = spot
            bestDistance = d
          }
        }
        // 机关优先：电梯厅里 / 606 门与大屏幕前，展签一律让位，E 永远先触发机关
        if (li >= 0 || nearDoor || nearScreen || assemblyNear) best = null
        if (best?.id !== promptRef.current?.id) {
          promptRef.current = best
          setPrompt(best)
        }
        if (li >= 0) {
          const st = hall.liftState(li)
          const inside = hall.insideLift(li, p.x, p.z)
          const prev = liftRef.current
          const changed = !prev || prev.i !== li || prev.inside !== inside || prev.floor !== st.floor
            || prev.moving !== st.moving || Math.abs(prev.open - st.open) > 0.05
          if (changed) {
            const next = { i: li, floor: st.floor, open: st.open, moving: st.moving, inside }
            liftRef.current = next
            setLift(next)
          }
        } else if (liftRef.current) {
          liftRef.current = null
          setLift(null)
          setLiftPanel(null)
        }
      }
      raf = requestAnimationFrame(frame)
    }

    setReady(true)
    raf = requestAnimationFrame(frame)

    return () => {
      alive = false
      cancelAnimationFrame(raf)
      observer.disconnect()
      document.removeEventListener('fullscreenchange',resize)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', clearKeys)
      document.removeEventListener('visibilitychange',clearKeys)
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('pointerlockchange', onLockChange)
      canvas.removeEventListener('click', onClick)
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerup', onPointerUp)
      canvas.removeEventListener('pointercancel', onPointerUp)
      if (document.pointerLockElement === canvas) document.exitPointerLock()
      scene.traverse((object: any) => {
        if (object.isMesh || object.isPoints || object.isLine) {
          object.geometry?.dispose?.()
          const material = object.material
          for (const m of Array.isArray(material) ? material : [material]) {
            if (!m) continue
            m.map?.dispose?.()
            m.normalMap?.dispose?.()
            m.dispose?.()
          }
        }
      })
      hall.dispose()
      envRT.dispose?.()
      renderer.dispose()
      renderer.forceContextLoss?.()
      if (canvas.parentElement === el) el.removeChild(canvas)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view])

  return <div className="tour" ref={host}>
    {!ready && !failed && <div className="tour-loading"><span/>正在砌柱廊、铺水磨石……</div>}
    {failed && <div className="tour-loading tour-fail">{failed}<button onClick={() => closeRef.current()}>返回校园</button></div>}

    {ready && !isShot && <>
      {started && <div className="tour-hud">
        <div className="tour-title">
          <span className="tour-kicker">LANDMARK 06 · INTERIOR TOUR</span>
          <h2>建筑工程学院<small>据实景照片重建 · 非测绘</small></h2>
          <span className="tour-geo">{SITE_COORD_TEXT} · {SITE_FROM_GATE.text} · 16 号楼 16A/16B</span>
          <span className="tour-zone"><i/>{zone}</span>
        </div>
        <div className="tour-tools">
          {fragments > 0 && <span className="tour-frag" title="通关 606 大屏幕小游戏获得">◆ 建筑碎片 ×{fragments}</span>}
          <button className="tour-style" onClick={() => {
            const next = styleMode === 'max' ? 'pixel' : 'max'
            setStyleMode(next)
            api.current.setStyle(next)
          }} title="切换画质：MAX / 像素风（P）">{styleMode === 'max' ? '画质 MAX' : '像素风'}</button>
          <button onClick={() => api.current.reset()} title="回到入口（R）">回到入口</button>
          <button onClick={() => closeRef.current()} title="退出参观（Esc）">退出参观</button>
        </div>
      </div>}

      <div className="tour-cross" aria-hidden="true"/>
      <div className="tour-warm" aria-hidden="true"/>
      <div className="tour-grain" aria-hidden="true"/>
      <div className="tour-vignette" aria-hidden="true"/>
      {typeof location !== 'undefined' && new URLSearchParams(location.search).has('perf')
        ? <div id="tour-perf" className="tour-perf">测量中…</div>
        : null}

      {prompt && !card && !assemblyOpen && <button className="tour-prompt" onClick={() => api.current.interact()}>
        <kbd>E</kbd><span>{prompt.title}</span><small>{prompt.kicker.split(' · ')[1]}</small>
      </button>}

      {nearAct.screen && !game606 && !assemblyOpen && !nearAssembly && <button className="tour-prompt" onClick={openGame}>
        <kbd>E</kbd><span>启动大屏幕小游戏</span><small>606 · SCREEN</small>
      </button>}
      {nearAct.door && !nearAct.screen && !game606 && !assemblyOpen && !nearAssembly && <button className="tour-prompt" onClick={() => setDoor606Open(api.current.toggleDoor606())}>
        <kbd>E</kbd><span>{door606Open ? '关闭 606 教室门' : '打开 606 教室门'}</span><small>606 · DOOR</small>
      </button>}

      {lift && !prompt && !nearAct.door && !nearAct.screen && !card && liftPanel === null && (
        <button className="tour-prompt tour-lift-prompt" onClick={() => {
          if (lift.inside) setLiftPanel(lift.i)
          else api.current.callLift(lift.i, lift.floor)
        }}>
          <kbd>E</kbd>
          <span>{lift.inside ? '选择楼层' : lift.moving ? `电梯运行中 · 去 ${lift.floor} 层` : '呼叫电梯'}</span>
          <small>{lift.moving ? 'MOTION' : `当前 ${lift.floor}F`}</small>
        </button>
      )}

      {liftPanel !== null && (
        <div className="tour-lift-panel" role="dialog" aria-label="电梯选层">
          <span className="tour-kicker">LIFT · SELECT FLOOR</span>
          <h3>去几层</h3>
          <div className="tour-lift-grid">
            {[6, 5, 4, 3, 2, 1].map((n) => (
              <button
                key={n}
                className={`tour-lift-btn${n >= 1 && n <= FLOORS ? ' is-live' : ''}`}
                disabled={n < 1 || n > FLOORS}
                title={`去 ${n} 层`}
                onClick={() => {
                  api.current.callLift(liftPanel, n)
                  setLiftPanel(null)
                  liftRef.current = null
                  setLift(null)
                  if (!isShot) api.current.lock()
                }}
              >{n}</button>
            ))}
          </div>
          <p className="tour-note">1–6 层都能到。南楼、北楼各一部电梯；五层连廊跨过两楼之间的天井互通。</p>
          <button className="tour-quiet" onClick={() => { setLiftPanel(null); if (!isShot) api.current.lock() }}>算了</button>
        </div>
      )}

      {started && <div className="tour-keys">
        <span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> 行走</span>
        <span><kbd>鼠标</kbd> 转头 / 按住拖动</span>
        <span><kbd>Shift</kbd> 快走</span>
        <span><kbd>E</kbd> 查看</span>
        <span><kbd>P</kbd> 画质</span>
        <span><kbd>Esc</kbd> 退出</span>
      </div>}

      {!started && !isShot && <div className="tour-intro">
        <div className="tour-intro-card">
          <span className="tour-kicker">FIRST-PERSON TOUR</span>
          <h2>走进建筑工程学院</h2>
          <p>东西向的南北两栋红砖楼门对门，中间夹着东端的入口广场和一圈白色柱廊；学院名牌立在广场最东边。南楼（左手楼）进门左手电梯、右手楼梯，一楼是照片里的门厅、铜牌荣誉墙与院史陈列厅；北楼与其镜像对称（电梯同样在东端），五层一道玻璃连廊跨过天井把两栋楼连起来。</p>
          <ul>
            <li><b>鼠标</b> 转头（锁定被浏览器拦住时，改成<b>按住左键拖动</b>），<b>WASD</b> 行走，<b>Shift</b> 快走</li>
            <li>走到展项附近按 <b>E</b> 读展签；走到电梯门口按 <b>E</b> 选层</li>
            <li>南楼、北楼格局镜像对称：广场北侧门朝南的是北楼，南侧门朝北的是南楼，每栋各一部电梯，五层连廊互通</li>
          </ul>
          <div className="tour-intro-actions">
            <button className="tour-go" onClick={() => { setStarted(true); api.current.lock() }}>进入参观</button>
            <button className="tour-quiet" onClick={() => setStarted(true)}>先看看（拖动转头）</button>
          </div>
          <p className="tour-geo-line">{SITE_COORD_TEXT}（GCJ-02）· {SITE_FROM_GATE.text}<br/>高德卫星实测：16 号楼是东西向的南北两栋（各约 90 × 15 m），中间留窄缝，东端放宽成入口广场、开门对校园路；五层一道玻璃连廊跨缝相连。六层，层高 4.2 m，每栋楼一部电梯。</p>
          <p className="tour-disclaimer">空间比例与构件做法按现场照片还原，平面尺寸、房间功能与展陈文字为体验重建，不是测绘图纸，也不代表学院正式信息。</p>
        </div>
      </div>}

      {card && <aside className="tour-card" role="dialog" aria-label={card.title}>
        <span className="tour-kicker">{card.kicker}</span>
        <h3>{card.title}</h3>
        {card.lines.map((line, i) => <p key={i}>{line}</p>)}
        {card.note && <p className="tour-note">{card.note}</p>}
        <div className="tour-card-actions">
          <button onClick={() => { setCard(null); if (!isShot) api.current.lock() }}>继续参观</button>
          <button className="tour-quiet" onClick={() => closeRef.current()}>离开建筑</button>
        </div>
      </aside>}

      {nearAssembly && !assemblyOpen && !game606 && <button className="tour-prompt" onClick={()=>{setAssemblyOpen(true);setGateDialogue('before');if(document.pointerLockElement)document.exitPointerLock()}}><kbd>E</kbd><span>建筑碎片展示台</span><small>606 · BUILD</small></button>}
      {assemblyOpen && !gateDialogue && !endingOpen && <div className="gate-build-panel" role="dialog" aria-label="南大门搭建展示台"><span className="tour-kicker">606 · 建筑碎片的答案</span><h3>{assembly.status==='complete'?'南大门搭建展示台':'建筑碎片展示台'}</h3><p>{assembly.status==='loading'?'正在载入你的校门模型……':assembly.status==='error'?'模型加载失败，请重试。':assembly.status==='building'?BUILD_STAGES[assembly.stage]:assembly.status==='complete'?'熟悉的南大门，原来就藏在这些建筑碎片里。':'将建筑模块依次归位，看看它们能拼成什么。'}</p>
      <progress max={1} value={assembly.progress} aria-label="南大门搭建进度"/>
      <div className="gate-build-actions">{assembly.status==='error'?<button onClick={()=>assemblyApi.current.retry()}>重新载入</button>:<button disabled={assembly.status==='loading'||assembly.status==='building'} onClick={()=>assembly.status==='complete'?assemblyApi.current.start():setGateDialogue('before')}>{assembly.status==='complete'?'重看搭建动画':'开始搭建'}</button>}
      {assembly.status==='complete'&&<button onClick={()=>{setDetailOpen(true);if(document.pointerLockElement)document.exitPointerLock()}}>查看3D环绕详细展示</button>}{assembly.status==='complete'&&<button onClick={()=>setGatePhotoOpen(true)}>查看完整图片</button>}{assembly.status==='complete'&&<button onClick={()=>{endingSeen.current=true;setGateDialogue('ending')}}>与筑小智道别</button>}<button onClick={()=>setAssemblyOpen(false)}>返回教室</button></div></div>}
      {gateDialogue&&<SceneDialogue key={gateDialogue} character={character} lines={gateDialogue==='before'?gateBefore:gateDialogue==='after'?gateAfter:journeyEnding} title={gateDialogue==='before'?'606 · 搭建前对话':gateDialogue==='after'?'606 · 揭晓答案':'606 · 校园里见'} finishLabel={gateDialogue==='before'?'开始搭建':gateDialogue==='after'?'环绕查看南大门':'结束对话'} cancelLabel={gateDialogue==='before'?'先看看展示台':'留在展示台旁'} onCancel={gateDialogue==='ending'?undefined:()=>setGateDialogue(null)} onFinish={()=>{if(gateDialogue==='before'){assemblyApi.current.start()}else if(gateDialogue==='after'){setDetailOpen(true)}else{setEndingOpen(true)}setGateDialogue(null)}}/>}
      {endingOpen&&<section className="journey-ending" role="dialog" aria-modal="true" aria-label="寻迹旅程结束"><div className="journey-ending-copy"><span>河大寻迹 · 金明秘境</span><h2>这次寻迹，暂告一段落。</h2><p>下次路过，记得看看身边的风景。</p><p>按空格返回校园</p><div><button onClick={()=>closeRef.current()}>返回校园 →</button><button onClick={()=>{setEndingOpen(false);setDetailOpen(true)}}>再看看南大门 ⛶</button><button onClick={()=>setGatePhotoOpen(true)}>查看完整图片</button></div></div></section>}
      {gatePhotoOpen&&<PhotoViewer place={{id:'architecture',name:'南大门完整图片',number:'06',x:0,y:0,image:'/assets/rewards/fragments/south-gate-complete.png',description:'',note:'',photos:[{src:'/assets/rewards/fragments/south-gate-complete.png',title:'河南大学南大门 · 完整微缩景观',width:1392,height:1130}]}} index={0} onIndex={()=>{}} onClose={()=>setGatePhotoOpen(false)}/>}
      {detailOpen&&<section className="gate-detail-overlay" role="dialog" aria-modal="true" aria-label="南大门3D环绕详细展示"><div className="gate-detail-head"><strong>南大门 · 3D环绕详细展示</strong><button ref={detailClose} onClick={closeDetail}>结束欣赏，返回606 ×</button></div><iframe ref={detailFrame} title="南大门环绕模型" src={GATE_DISPLAY_URL} onLoad={()=>detailClose.current?.focus({preventScroll:true})}/></section>}
      {game606 && <MiniGame606 onWin={winFragment} onClose={closeGame} />}

      {!locked && started && !card && <div className="tour-hint">点击画面锁定鼠标；若没反应，按住左键拖动也能转头</div>}
    </>}

    {ready && isShot && <div className="tour-shot-badge">{view || 'entry'}</div>}
    {walkLog.length > 0 && <pre id="walktest" style={{ position: 'absolute', left: 12, top: 12, zIndex: 99, color: '#fff', fontSize: 11, lineHeight: 1.5, background: '#000a', padding: 10 }}>{walkLog.join('\n')}</pre>}
  </div>
}
