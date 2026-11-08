import { useEffect, useRef, useState } from 'react'
import type { Character } from '../content'
import { distance, groundHeight, movePlayer, playerStart, PROP_REACH, propAnchor } from './engine'
import { AwardPanel, CodePanel, DialoguePanel, FloorPanel, NotePanel } from './panels'
import { renderRoom, type RoomArt } from './renderer'
import type { Npc, PlayerState, RoomConfig, RoomEntrance, Vec } from './types'
import './rooms.css'

export type RoomProgress = {
  /** 本房间的关键事件是否完成（202：开箱；303：答对题）。 */
  done: boolean
  flags: Record<string, boolean>
}

export const emptyProgress: RoomProgress = { done: false, flags: {} }

const NPC_REACH = 50

type Target = {
  id: string
  kind: 'nav' | 'locked' | 'note' | 'npc' | 'box' | 'floors'
  at: Vec
  label: string
  radius: number
  to?: string
  text?: string
}

type Panel = null | 'note' | 'npc' | 'box' | 'boxHint' | 'award' | 'floors'

function npcAnchor(npc: Npc): Vec {
  return { x: npc.at.x, y: npc.at.y + 26 }
}

function buildTargets(cfg: RoomConfig, progress: RoomProgress): Target[] {
  const list: Target[] = []
  for (const prop of cfg.props) {
    if (prop.floors) {
      list.push({
        id: prop.id,
        kind: 'floors',
        at: propAnchor(prop),
        label: prop.label ?? '走楼梯',
        radius: PROP_REACH,
      })
      continue
    }
    if (prop.to) {
      list.push({
        id: prop.id,
        kind: 'nav',
        at: propAnchor(prop),
        label: prop.label ?? '前往',
        to: prop.to,
        radius: PROP_REACH,
      })
    } else if (prop.lockedText) {
      list.push({
        id: prop.id,
        kind: 'locked',
        at: propAnchor(prop),
        label: `看看 ${prop.plate ?? ''} 的门`.replace('  ', ' '),
        text: prop.lockedText,
        radius: PROP_REACH,
      })
    } else if (prop.note) {
      list.push({
        id: prop.id,
        kind: 'note',
        at: propAnchor(prop),
        label: `查看${prop.note.title}`,
        radius: PROP_REACH,
      })
    }
  }
  if (cfg.npc) {
    list.push({
      id: cfg.npc.id,
      kind: 'npc',
      at: npcAnchor(cfg.npc),
      label: `和${cfg.npc.name}说话`,
      radius: NPC_REACH,
    })
  }
  if (cfg.box) {
    list.push({
      id: cfg.box.id,
      kind: 'box',
      at: cfg.box.at,
      label: progress.done ? '密码盒（已打开）' : '看看密码盒',
      radius: PROP_REACH,
    })
  }
  return list
}

function nearestTarget(cfg: RoomConfig, progress: RoomProgress, player: Vec): Target | null {
  let best: Target | null = null
  let bestScore = Infinity
  for (const target of buildTargets(cfg, progress)) {
    const d = distance(player, target.at)
    if (d > target.radius) continue
    // 人和盒子比「查看」优先，免得站在讲台前点不到老师。
    const score = d - (target.kind === 'npc' || target.kind === 'box' ? 18 : 0)
    if (score < bestScore) {
      best = target
      bestScore = score
    }
  }
  return best
}

export default function RoomScene({
  room,
  character,
  progress,
  onProgress,
  onExit,
  onGoRoom,
  teacherTaskCompleted = false,
  entrance,
}: {
  room: RoomConfig
  character: Character
  progress: RoomProgress
  onProgress: (next: RoomProgress) => void
  onExit: () => void
  onGoRoom?: (id: string, entrance?: RoomEntrance) => void
  teacherTaskCompleted?: boolean
  entrance?: RoomEntrance
}) {
  const cfg = room
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const playerRef = useRef<PlayerState>(playerStart(cfg, entrance))
  const keys = useRef(new Set<string>())
  const progressRef = useRef(progress)
  const panelRef = useRef<Panel>(null)
  const exitRef = useRef(onExit)
  const goRoomRef = useRef(onGoRoom)
  const [nearby, setNearby] = useState<Target | null>(null)
  const [panel, setPanel] = useState<Panel>(null)
  const [note, setNote] = useState<{ title: string; text: string } | null>(null)
  const [floorId, setFloorId] = useState<string | null>(null)
  const [toast, setToast] = useState('')
  const [ready, setReady] = useState(false)

  progressRef.current = progress
  panelRef.current = panel
  exitRef.current = onExit
  goRoomRef.current = onGoRoom

  const interactRef = useRef<(target: Target) => void>(() => {})
  interactRef.current = (target: Target) => {
    const current = progressRef.current
    if (target.kind === 'nav') {
      if (target.to === 'campus') exitRef.current()
      else if (target.to) goRoomRef.current?.(target.to, { fromRoom: cfg.id })
      return
    }
    if (target.kind === 'floors') {
      setFloorId(target.id)
      setPanel('floors')
      return
    }
    if (target.kind === 'locked') {
      setToast(target.text ?? '门锁着。')
      return
    }
    if (target.kind === 'npc') {
      if (cfg.npc) setPanel('npc')
      return
    }
    if (target.kind === 'box') {
      if (!cfg.box) return
      if (current.done) {
        setNote({ title: '密码盒', text: '盒子已经打开了，里面空了。' })
        setPanel('note')
        return
      }
      if (teacherTaskCompleted && !current.flags.teacherHintSeen) {
        onProgress({ ...current, flags: { ...current.flags, teacherHintSeen: true } })
        setPanel('boxHint')
        return
      }
      setPanel('box')
      return
    }
    const prop = cfg.props.find(p => p.id === target.id)
    if (prop?.note) {
      setNote(prop.note)
      setPanel('note')
    }
  }

  useEffect(() => {
    const element = canvasRef.current!
    const ctx = element.getContext('2d')
    if (!ctx) return
    let cancelled = false
    let frame = 0
    let last = 0
    let uiAt = 0
    let width = element.clientWidth
    let height = element.clientHeight
    let art: RoomArt | null = null

    const resize = () => {
      width = element.clientWidth
      height = element.clientHeight
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      element.width = Math.round(width * dpr)
      element.height = Math.round(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    const observer = new ResizeObserver(resize)
    observer.observe(element)
    resize()

    const load = (src: string) =>
      new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image()
        image.onload = () => resolve(image)
        image.onerror = reject
        image.src = src
      })

    Promise.all([
      load('/assets/sprites-v0.3.0/boy.png'),
      load('/assets/sprites-v0.3.0/girl.png'),
      load('/assets/characters/zhuxiaozhi.png'),
    ])
      .then(([boy, girl, zhuxiaozhi]) => {
        if (cancelled) return
        art = { boy, girl, zhuxiaozhi }
        setReady(true)
        element.focus({ preventScroll: true })
        const tick = (timestamp: number) => {
          if (cancelled || !art) return
          const dt = last ? Math.min((timestamp - last) / 1000, 0.05) : 0
          last = timestamp
          if (!panelRef.current) {
            const pressed = keys.current
            const x = Number(pressed.has('d') || pressed.has('arrowright')) - Number(pressed.has('a') || pressed.has('arrowleft'))
            const y = Number(pressed.has('s') || pressed.has('arrowdown')) - Number(pressed.has('w') || pressed.has('arrowup'))
            const moved = movePlayer(playerRef.current, { x, y }, dt, cfg)
            const target = groundHeight(moved.y, cfg)
            playerRef.current = { ...moved, z: moved.z + (target - moved.z) * (1 - Math.exp(-dt * 16)) }
          }
          renderRoom(ctx, cfg, art, playerRef.current, character, width, height, timestamp / 1000, {
            done: progressRef.current.done,
            talkative: false,
          })
          if (timestamp - uiAt > 110) {
            uiAt = timestamp
            const found = nearestTarget(cfg, progressRef.current, playerRef.current)
            setNearby(prev => (prev?.id === found?.id && prev?.label === found?.label ? prev : found))
          }
          frame = requestAnimationFrame(tick)
        }
        frame = requestAnimationFrame(tick)
      })
      .catch(() => setToast('素材加载失败，请刷新重试。'))

    return () => {
      cancelled = true
      cancelAnimationFrame(frame)
      observer.disconnect()
      keys.current.clear()
    }
  }, [cfg, character])

  useEffect(() => {
    const holder = window as unknown as Record<string, unknown>
    holder.__room = {
      get pos() {
        return { ...playerRef.current }
      },
      set pos(next: Partial<Vec>) {
        playerRef.current = { ...playerRef.current, ...next }
      },
      get room() {
        return cfg.id
      },
      get progress() {
        return progressRef.current
      },
      set progress(next: Partial<RoomProgress>) {
        onProgress({ ...progressRef.current, ...next })
      },
    }
    return () => {
      delete holder.__room
    }
  }, [])

  useEffect(() => {
    function down(event: KeyboardEvent) {
      const key = event.key.toLowerCase()
      const target = event.target as HTMLElement | null
      const inField = !!target && typeof target.closest === 'function' && !!target.closest('input,textarea,select,dialog,[contenteditable="true"]')
      if (inField) return
      if (event.key === 'Escape') {
        if (panelRef.current) {
          setPanel(panelRef.current === 'boxHint' ? 'box' : null)
          return
        }
        exitRef.current()
        return
      }
      if (panelRef.current) return
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowleft', 'arrowdown', 'arrowright'].includes(key)) {
        event.preventDefault()
        keys.current.add(key)
      }
      if (key === 'e' || key === ' ') {
        const onButton = key === ' ' && !!target && typeof target.closest === 'function' && !!target.closest('button')
        if (onButton) return
        event.preventDefault()
        const found = nearestTarget(cfg, progressRef.current, playerRef.current)
        if (found) interactRef.current(found)
      }
    }
    function up(event: KeyboardEvent) {
      keys.current.delete(event.key.toLowerCase())
    }
    function clear() {
      keys.current.clear()
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', clear)
    document.addEventListener('visibilitychange', clear)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', clear)
      document.removeEventListener('visibilitychange', clear)
    }
  }, [cfg])

  useEffect(() => {
    if (!toast) return
    const id = window.setTimeout(() => setToast(''), 2600)
    return () => clearTimeout(id)
  }, [toast])

  useEffect(() => {
    if (panel) keys.current.clear()
  }, [panel])

  function solveQuiz() {
    onProgress({ ...progressRef.current, done: true, flags: { ...progressRef.current.flags, quizPassed: true } })
  }

  function openBox() {
    onProgress({ ...progressRef.current, done: true })
    setPanel('award')
  }

  return (
    <section className="room-screen" aria-label={cfg.name}>
      <canvas
        ref={canvasRef}
        className="room-canvas"
        tabIndex={0}
        aria-label={`${cfg.name}内部，WASD 或方向键移动，靠近目标后按 E 交互`}
      />

      <div className="room-hud">
        <div className="room-title">
          <span className="room-eyebrow">JINMING · INDOOR</span>
          <strong>{cfg.name}</strong>
          <small>{cfg.subtitle}</small>
        </div>
      </div>

      {progress.done && cfg.award.text !== '' && (
        <div className="room-done">
          <span>本关完成</span>
          {cfg.award.name}已取得
        </div>
      )}

      {nearby && !panel && (
        <button className="room-prompt" onClick={() => interactRef.current(nearby)}>
          <kbd>E</kbd>
          <span>{nearby.label}</span>
        </button>
      )}

      {!nearby && !panel && ready && !progress.done && cfg.tip && <div className="room-tip">{cfg.tip}</div>}

      <button className="room-exit" onClick={onExit}>
        离开 <kbd>Esc</kbd>
      </button>

      <div className="room-touch" aria-label="屏幕方向控制">
        {[
          ['arrowup', '↑'],
          ['arrowleft', '←'],
          ['arrowdown', '↓'],
          ['arrowright', '→'],
        ].map(([key, label]) => (
          <button
            key={key}
            aria-label={`向${label}移动`}
            onPointerDown={e => {
              e.preventDefault()
              e.currentTarget.setPointerCapture(e.pointerId)
              keys.current.add(key)
            }}
            onPointerUp={() => keys.current.delete(key)}
            onPointerCancel={() => keys.current.delete(key)}
            onLostPointerCapture={() => keys.current.delete(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {!ready && <div className="room-loading">正在进入{cfg.name}……</div>}
      {toast && <div className="room-toast">{toast}</div>}

      {panel === 'note' && note && (
        <div className="room-modal" onClick={e => e.target === e.currentTarget && setPanel(null)}>
          <NotePanel title={note.title} text={note.text} onClose={() => setPanel(null)} />
        </div>
      )}

      {panel === 'npc' && cfg.npc && (
        <div className="room-modal">
          <DialoguePanel
            character={character}
            npc={cfg.npc}
            solved={!!progress.flags.quizPassed || (progress.done && !!cfg.box)}
            onSolved={solveQuiz}
            onClose={() => setPanel(null)}
          />
        </div>
      )}

      {panel === 'floors' && (
        <div className="room-modal" onClick={e => e.target === e.currentTarget && setPanel(null)}>
          <FloorPanel
            here={cfg.name}
            options={cfg.props.find(p => p.id === floorId)?.floors ?? []}
            onPick={to => {
              setPanel(null)
              goRoomRef.current?.(to, 'stairs')
            }}
            onClose={() => setPanel(null)}
          />
        </div>
      )}

      {panel === 'boxHint' && cfg.box && (
        <div className="room-modal">
          <div className="room-panel" role="dialog" aria-label="密码盒的提示">
            <header className="rp-head">
              <h3>密码盒的提示</h3>
              <button className="rp-close" onClick={() => setPanel('box')} aria-label="关闭提示，输入密码">×</button>
            </header>
            <p className="rp-text">{cfg.box.firstLine}</p>
            <button className="rp-primary" onClick={() => setPanel('box')}>试着输入密码</button>
          </div>
        </div>
      )}

      {panel === 'box' && cfg.box && (
        <div className="room-modal">
          <CodePanel box={cfg.box} hint={teacherTaskCompleted ? cfg.box.firstLine : undefined} onOpen={openBox} onClose={() => setPanel(null)} />
        </div>
      )}

      {panel === 'award' && (
        <div className="room-modal">
          <AwardPanel name={cfg.award.name} text={cfg.award.text} onClose={onExit} />
        </div>
      )}
    </section>
  )
}
