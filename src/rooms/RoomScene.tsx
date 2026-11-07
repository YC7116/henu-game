import { useEffect, useRef, useState } from 'react'
import type { Character } from '../content'
import { distance, groundHeight, movePlayer, playerStart, PROP_REACH, propAnchor, SHARD_REACH } from './engine'
import { AssemblePanel, ExamPanel, LockPanel, NotePanel, SequencePanel } from './panels'
import { renderRoom, type RoomArt } from './renderer'
import type { PlayerState, RoomConfig, Vec } from './types'
import './rooms.css'

export type RoomProgress = {
  collected: string[]
  sequenceDone: boolean
  assembled: boolean
  done: boolean
}

export const emptyProgress: RoomProgress = {
  collected: [],
  sequenceDone: false,
  assembled: false,
  done: false,
}

type Target = {
  id: string
  kind: 'shard' | 'prop' | 'exit' | 'gate' | 'stairs'
  at: Vec
  label: string
  radius: number
  locked?: boolean
}

type Panel = null | 'sequence' | 'assemble' | 'lock' | 'note' | 'award' | 'exam'

function unlockedSet(cfg: RoomConfig, progress: RoomProgress) {
  const held = progress.collected.length
  const set = new Set<string>()
  for (const shard of cfg.shards) {
    if (shard.source === 'pickup' && (shard.requires ?? 0) <= held) set.add(shard.id)
  }
  return set
}

function propLabel(propId: string, progress: RoomProgress) {
  if (propId === 'podium') return progress.sequenceDone ? '讲台（抽屉已开）' : '讲台抽屉'
  if (propId === 'cabinet') {
    if (progress.done) return '储物柜（已打开）'
    return progress.assembled ? '储物柜密码锁' : '储物柜'
  }
  return '查看'
}

function buildTargets(cfg: RoomConfig, progress: RoomProgress): Target[] {
  const collected = new Set(progress.collected)
  const unlocked = unlockedSet(cfg, progress)
  const list: Target[] = []

  for (const shard of cfg.shards) {
    if (shard.source !== 'pickup' || !shard.at || collected.has(shard.id)) continue
    const isOpen = unlocked.has(shard.id)
    list.push({
      id: shard.id,
      kind: 'shard',
      at: shard.at,
      label: isOpen ? `拾取「${shard.piece}」碎片` : '这里有东西，但看不清',
      radius: SHARD_REACH,
      locked: !isOpen,
    })
  }

  for (const prop of cfg.props) {
    if (prop.kind === 'door') continue
    if (prop.kind === 'gate') {
      list.push({
        id: prop.id,
        kind: 'gate',
        at: propAnchor(prop),
        label: progress.done ? '闸机（已放行）' : '闸机 · 参加口试',
        radius: PROP_REACH,
      })
      continue
    }
    if (prop.kind === 'stairs') {
      if (!cfg.stairsTo) continue
      list.push({
        id: prop.id,
        kind: 'stairs',
        at: propAnchor(prop),
        label: prop.label ?? '走楼梯',
        radius: PROP_REACH,
      })
      continue
    }
    if (prop.kind !== 'podium' && prop.kind !== 'cabinet' && !prop.note) continue
    list.push({
      id: prop.id,
      kind: 'prop',
      at: propAnchor(prop),
      label: prop.label ?? (prop.note ? `查看${prop.note.title}` : propLabel(prop.id, progress)),
      radius: PROP_REACH,
    })
  }

  const door = cfg.props.find(p => p.kind === 'door')
  if (door) list.push({ id: 'exit', kind: 'exit', at: propAnchor(door), label: cfg.exitLabel ?? '离开', radius: PROP_REACH })
  return list
}

function nearestTarget(cfg: RoomConfig, progress: RoomProgress, player: Vec): Target | null {
  let best: Target | null = null
  let bestScore = Infinity
  for (const target of buildTargets(cfg, progress)) {
    const d = distance(player, target.at)
    if (d > target.radius) continue
    // 碎片优先：站在课桌旁时，发光的碎片应该压过课桌的说明文字。
    const score = d - (target.kind === 'shard' ? 26 : 0)
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
}: {
  room: RoomConfig
  character: Character
  progress: RoomProgress
  onProgress: (next: RoomProgress) => void
  onExit: () => void
  onGoRoom?: (id: string) => void
}) {
  const cfg = room
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const playerRef = useRef<PlayerState>(playerStart(cfg))
  const keys = useRef(new Set<string>())
  const progressRef = useRef(progress)
  const panelRef = useRef<Panel>(null)
  const exitRef = useRef(onExit)
  const goRoomRef = useRef(onGoRoom)
  const [nearby, setNearby] = useState<Target | null>(null)
  const [panel, setPanel] = useState<Panel>(null)
  const [note, setNote] = useState<{ title: string; text: string } | null>(null)
  const [toast, setToast] = useState('')
  const [ready, setReady] = useState(false)

  progressRef.current = progress
  panelRef.current = panel
  exitRef.current = onExit
  goRoomRef.current = onGoRoom

  const collected = new Set(progress.collected)
  const allHeld = !!cfg.puzzle && collected.size === cfg.shards.length

  const interactRef = useRef<(target: Target) => void>(() => {})
  interactRef.current = (target: Target) => {
    const current = progressRef.current
    if (target.kind === 'exit') {
      exitRef.current()
      return
    }
    if (target.kind === 'stairs') {
      if (cfg.stairsTo) goRoomRef.current?.(cfg.stairsTo)
      return
    }
    if (target.kind === 'gate') {
      if (current.done) {
        setNote({ title: cfg.award.name, text: cfg.award.text })
        setPanel('note')
      } else if (cfg.exam) {
        setPanel('exam')
      }
      return
    }
    if (target.kind === 'shard') {
      if (target.locked) {
        setToast('还看不清。先找找别处，线索会慢慢对上。')
        return
      }
      const shard = cfg.shards.find(s => s.id === target.id)!
      if (current.collected.includes(shard.id)) return
      onProgress({ ...current, collected: [...current.collected, shard.id] })
      setToast(`拾得碎片「${shard.piece}」`)
      return
    }
    const prop = cfg.props.find(p => p.id === target.id)
    if (!prop) return
    if (prop.id === 'podium') {
      if (current.sequenceDone) {
        setNote({ title: '讲台', text: '抽屉已经开了，里面空空的，只剩一层粉笔灰。' })
        setPanel('note')
      } else {
        setPanel('sequence')
      }
      return
    }
    if (prop.id === 'cabinet') {
      if (!current.assembled) {
        setNote({ title: '储物柜', text: '柜门上有一把两位数密码锁。锁面刻着一行小字：算出来的那个数。' })
        setPanel('note')
        return
      }
      if (current.done) {
        setNote({ title: cfg.award.name, text: cfg.award.text })
        setPanel('note')
        return
      }
      setPanel('lock')
      return
    }
    if (prop.note) {
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

    Promise.all([load('/assets/sprites-v0.3.0/boy.png'), load('/assets/sprites-v0.3.0/girl.png')])
      .then(([boy, girl]) => {
        if (cancelled) return
        art = { boy, girl }
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
            collected: new Set(progressRef.current.collected),
            unlocked: unlockedSet(cfg, progressRef.current),
            assembled: progressRef.current.assembled,
            done: progressRef.current.done,
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
      .catch(() => setToast('角色素材加载失败，请刷新重试。'))

    return () => {
      cancelled = true
      cancelAnimationFrame(frame)
      observer.disconnect()
      keys.current.clear()
    }
  }, [cfg, character])

  /** 调试钩子：控制台里 `__room.pos = { x: 470, y: 83 }` 可把角色放到指定位置，方便挨个验收碎片。 */
  useEffect(() => {
    const holder = window as unknown as Record<string, unknown>
    holder.__room = {
      get pos() {
        return { ...playerRef.current }
      },
      set pos(next: Partial<Vec>) {
        playerRef.current = { ...playerRef.current, ...next }
      },
      get collected() {
        return progressRef.current.collected
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
          setPanel(null)
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

  function solveSequence() {
    onProgress({ ...progressRef.current, sequenceDone: true, collected: [...progressRef.current.collected, 'int'] })
    setPanel(null)
    setToast('抽屉开了，里面是一片写着 ∫ 的碎片。')
  }

  function finishAssembly() {
    onProgress({ ...progressRef.current, assembled: true })
  }

  function openLock() {
    onProgress({ ...progressRef.current, done: true })
    setPanel('award')
  }

  function passExam() {
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
        {cfg.shards.length > 0 && (
        <div className="room-bag" aria-label={`已收集 ${collected.size} 片，共 ${cfg.shards.length} 片`}>
          <span className="bag-label">
            碎片
            <small>
              {collected.size} / {cfg.shards.length}
            </small>
          </span>
          <div className="bag-slots">
            {cfg.shards.map(shard =>
              collected.has(shard.id) ? (
                <i key={shard.id} title={shard.title}>
                  {shard.piece}
                </i>
              ) : null,
            )}
            {collected.size === 0 && <em className="bag-empty">还没有碎片</em>}
          </div>
        </div>
        )}
      </div>

      {allHeld && !progress.assembled && (
        <button className="room-assemble" onClick={() => setPanel('assemble')}>
          <span>五片集齐</span>
          拼装题目
        </button>
      )}

      {progress.done && (
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

      {!nearby && !panel && ready && !progress.done && (
        <div className="room-tip">
          {allHeld ? '碎片齐了，打开右上角的「拼装题目」。' : (cfg.tip ?? '')}
        </div>
      )}

      <button className="room-exit" onClick={onExit}>
        {cfg.exitLabel ?? '离开'} <kbd>Esc</kbd>
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

      {panel === 'sequence' && cfg.puzzle && (
        <div className="room-modal" onClick={e => e.target === e.currentTarget && setPanel(null)}>
          <SequencePanel
            prompt={cfg.puzzle.sequence.prompt}
            order={cfg.puzzle.sequence.order}
            buttons={cfg.puzzle.sequence.buttons}
            onSolve={solveSequence}
            onClose={() => setPanel(null)}
          />
        </div>
      )}

      {panel === 'assemble' && cfg.puzzle && (
        <div className="room-modal" onClick={e => e.target === e.currentTarget && setPanel(null)}>
          <AssemblePanel
            slots={cfg.puzzle.slots}
            shards={cfg.shards}
            onComplete={finishAssembly}
            onClose={() => setPanel(null)}
          />
        </div>
      )}

      {panel === 'lock' && cfg.puzzle && (
        <div className="room-modal" onClick={e => e.target === e.currentTarget && setPanel(null)}>
          <LockPanel
            digits={cfg.puzzle.lock.digits}
            answer={cfg.puzzle.lock.answer}
            question={cfg.puzzle.lock.question}
            hint={cfg.puzzle.lock.hint}
            onOpen={openLock}
            onClose={() => setPanel(null)}
          />
        </div>
      )}

      {panel === 'exam' && cfg.exam && (
        <div className="room-modal">
          <ExamPanel exam={cfg.exam} onPass={passExam} onClose={() => setPanel(null)} />
        </div>
      )}

      {panel === 'note' && note && (
        <div className="room-modal" onClick={e => e.target === e.currentTarget && setPanel(null)}>
          <NotePanel title={note.title} text={note.text} onClose={() => setPanel(null)} />
        </div>
      )}

      {panel === 'award' && (
        <div className="room-modal">
          <div className="room-panel room-panel-core" role="dialog" aria-label={cfg.award.name}>
            <span className="core-eyebrow">ACQUIRED · {cfg.puzzle ? '建筑碎片' : 'PASS'}</span>
            <h3>{cfg.award.name}</h3>
            <p className="rp-text">{cfg.award.text}</p>
            {cfg.puzzle && <p className="core-formula">∫₀² (3x² + 2x) dx = 12</p>}
            <button className="rp-primary" onClick={onExit}>
              {cfg.puzzle ? '带着碎片离开教室' : '离开实验室'}
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
