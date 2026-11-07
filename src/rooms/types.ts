export type Vec = { x: number; y: number }
export type Rect = { x: number; y: number; w: number; h: number }

export type PropKind =
  | 'blackboard'
  | 'clock'
  | 'podium'
  | 'desk'
  | 'cabinet'
  | 'window'
  | 'bulletin'
  | 'plant'
  | 'door'
  | 'booth'
  | 'gate'
  | 'screen'
  | 'stairs'
  | 'bench'

export type Prop = {
  id: string
  kind: PropKind
  x: number
  y: number
  w: number
  h: number
  /** 阻挡玩家的脚下区域；墙面装饰不需要。 */
  block?: Rect
  /** 窗是否带窗帘。 */
  curtain?: boolean
  /** 交互时按钮上显示的文案，不填就用 note.title。 */
  label?: string
  /** 靠近时点击给出的说明文本。 */
  note?: { title: string; text: string }
}

export type ShardSource = 'pickup' | 'sequence'

export type Shard = {
  id: string
  /** 拼装时显示的部分，例如 "3x²"。 */
  piece: string
  title: string
  /** 正确槽位序号。 */
  slot: number
  source: ShardSource
  /** 拾取点，仅 source 为 pickup 时使用。 */
  at?: Vec
  /** 需要已持有多少片才显现。 */
  requires?: number
  clue: string
}

/** 收集碎片型关卡（拼装题目 + 密码锁）。 */
export type PuzzleConfig = {
  slots: string[]
  lock: { answer: string; digits: number; question: string; hint: string }
  sequence: { order: string[]; buttons: string[]; prompt: string }
}

export type ExamOption = {
  text: string
  ok: boolean
  /** 考官对这句回答的回应；答错时就是一句纠正。 */
  reply: string
}

export type ExamQuestion = {
  ask: string
  /** 中文提示，给看不懂题的人一个台阶。 */
  hint?: string
  options: ExamOption[]
}

/** 口试型关卡（连续应答 + 耐心值）。 */
export type ExamConfig = {
  title: string
  subtitle: string
  intro: string
  hearts: number
  questions: ExamQuestion[]
  failLine: string
  passLine: string
}

export type Award = { name: string; text: string }

/** 一级台阶：世界 y 在 [y0, y1) 之间、台面抬高 z 像素。数组必须从远（上）到近（下）排列。 */
export type StepBand = { y0: number; y1: number; z: number }

export type RoomConfig = {
  id: string
  name: string
  subtitle: string
  size: { w: number; h: number }
  wall: number
  /** 后墙更厚，给黑板和挂图留出墙面高度，也避免角色头部压到墙上。 */
  topWall?: number
  spawn: Vec
  door: Vec
  props: Prop[]
  /** 阶梯教室的台阶。不填就是平地。 */
  steps?: StepBand[]
  /** 底部提示语。 */
  tip?: string
  /** 离开按钮的文案。 */
  exitLabel?: string
  /** 有楼梯时，上楼去哪个房间。 */
  stairsTo?: string
  shards: Shard[]
  puzzle?: PuzzleConfig
  exam?: ExamConfig
  /** 本关的最终奖励。 */
  award: Award
}

export type Direction = 'up' | 'down' | 'left' | 'right'
export type PlayerState = Vec & { direction: Direction; distance: number; moving: boolean; z: number }
