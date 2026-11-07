import type { Direction, PlayerState, Prop, Rect, RoomConfig, RoomEntrance, Vec } from './types'

export const PLAYER_RADIUS = 7
export const MOVE_SPEED = 138
export const SHARD_REACH = 52
export const PROP_REACH = 50

/** 脚下的地面高度；没有 steps 的房间恒为 0。 */
export function groundHeight(y: number, cfg: RoomConfig): number {
  if (!cfg.steps) return 0
  let z = 0
  for (const band of cfg.steps) if (y >= band.y0) z = band.z
  return z
}

export function maxHeight(cfg: RoomConfig): number {
  return cfg.steps ? Math.max(...cfg.steps.map(band => band.z)) : 0
}

export function playerStart(cfg: RoomConfig, entrance?: RoomEntrance): PlayerState {
  const entryProp = entrance === 'stairs'
    ? cfg.props.find(prop => prop.kind === 'stairs')
    : entrance
      ? cfg.props.find(prop => (prop.kind === 'door' || prop.kind === 'classdoor') && prop.to === entrance.fromRoom)
      : undefined
  const spawn = entryProp ? propAnchor(entryProp) : cfg.spawn
  const direction: Direction = entryProp?.kind === 'classdoor' ? 'down' : 'up'
  return { ...spawn, direction, distance: 0, moving: false, z: groundHeight(spawn.y, cfg) }
}

export function blocksOf(cfg: RoomConfig): Rect[] {
  const list = cfg.props.reduce<Rect[]>((acc, prop) => (prop.block ? [...acc, prop.block] : acc), [])
  if (cfg.npc) list.push({ x: cfg.npc.at.x - 10, y: cfg.npc.at.y - 4, w: 20, h: 10 })
  return list
}

export function innerBounds(cfg: RoomConfig): Rect {
  const r = PLAYER_RADIUS
  const top = cfg.topWall ?? cfg.wall
  return {
    x: cfg.wall + r,
    y: top + r,
    w: cfg.size.w - cfg.wall * 2 - r * 2,
    h: cfg.size.h - top - cfg.wall - r * 2,
  }
}

export function isBlocked(point: Vec, cfg: RoomConfig): boolean {
  const r = PLAYER_RADIUS
  const area = innerBounds(cfg)
  if (point.x < area.x || point.x > area.x + area.w) return true
  if (point.y < area.y || point.y > area.y + area.h) return true
  for (const b of blocksOf(cfg)) {
    if (point.x > b.x - r && point.x < b.x + b.w + r && point.y > b.y - r && point.y < b.y + b.h + r) return true
  }
  return false
}

function directionOf(input: Vec): Direction {
  if (Math.abs(input.x) > Math.abs(input.y)) return input.x < 0 ? 'left' : 'right'
  return input.y < 0 ? 'up' : 'down'
}

export function movePlayer(player: PlayerState, input: Vec, dt: number, cfg: RoomConfig): PlayerState {
  const length = Math.hypot(input.x, input.y)
  if (!length) return { ...player, moving: false }
  const step = MOVE_SPEED * Math.min(0.05, Math.max(0, dt))
  const dx = (input.x / length) * step
  const dy = (input.y / length) * step
  const parts = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 2.5))
  let { x, y } = player
  for (let i = 0; i < parts; i++) {
    if (!isBlocked({ x: x + dx / parts, y }, cfg)) x += dx / parts
    if (!isBlocked({ x, y: y + dy / parts }, cfg)) y += dy / parts
  }
  const travelled = Math.hypot(x - player.x, y - player.y)
  return { x, y, direction: directionOf(input), distance: player.distance + travelled, moving: travelled > 0.01, z: player.z }
}

/** 房间按可视区域等比铺满并居中；房间比屏幕小的时候也不会贴左上角。 */
export function fitView(cfg: RoomConfig, viewWidth: number, viewHeight: number) {
  const zoom = Math.min(viewWidth / cfg.size.w, viewHeight / cfg.size.h)
  return {
    zoom,
    ox: (viewWidth - cfg.size.w * zoom) / 2,
    oy: (viewHeight - cfg.size.h * zoom) / 2,
  }
}

export function propAnchor(prop: Prop): Vec {
  switch (prop.kind) {
    case 'podium':
      return { x: prop.x + prop.w / 2, y: prop.y + prop.h + 12 }
    case 'cabinet':
      return { x: prop.x + prop.w / 2, y: prop.y + prop.h + 14 }
    case 'blackboard':
      return { x: prop.x + 40, y: prop.y + prop.h + 16 }
    case 'window':
      return { x: prop.x + prop.w + 10, y: prop.y + prop.h * 0.78 }
    case 'bulletin':
      return { x: prop.x - 12, y: prop.y + prop.h * 0.8 }
    case 'door':
      return { x: prop.x + prop.w / 2, y: prop.y - 12 }
    case 'classdoor':
      return { x: prop.x + prop.w / 2, y: prop.y + prop.h + 12 }
    case 'box':
      return { x: prop.x + prop.w / 2, y: prop.y + prop.h + 12 }
    case 'stairs':
      return { x: prop.x + prop.w / 2, y: prop.y - 14 }
    default:
      return { x: prop.x + prop.w / 2, y: prop.y + prop.h + 14 }
  }
}

export function distance(a: Vec, b: Vec) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}
