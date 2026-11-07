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
  | 'classdoor'
  | 'box'

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
  /** 交互时按钮上显示的文案。 */
  label?: string
  /** 走近按下后跳转到哪个房间；'campus' 表示回主地图。 */
  to?: string
  /** 楼梯的候选楼层；有它就不直接用 to，而是弹出选择。 */
  floors?: { label: string; to: string; hint?: string }[]
  /** 有这行字、又没有 to 的门，只会给一句提示。 */
  lockedText?: string
  /** 显示屏上的文字。 */
  text?: string
  /** 教室门牌号，例如 202。 */
  plate?: string
  /** 靠近时点击给出的说明文本。 */
  note?: { title: string; text: string }
}

/** 一级台阶：世界 y 在 [y0, y1) 之间、台面抬高 z 像素。数组必须从远（上）到近（下）排列。 */
export type StepBand = { y0: number; y1: number; z: number }

export type DialogueLine = { who?: string; text: string }

/** 对话之后的小问答，用来确认玩家真的算出了答案。 */
export type NpcQuiz = {
  prompt: string
  question: string
  answer: string
  digits: number
  ok: string
  retry: string
}

export type Npc = {
  id: string
  name: string
  tag?: string
  at: Vec
  /** zhuxiaozhi 用现成素材，teacher 用代码画的像素小人。 */
  sprite: 'zhuxiaozhi' | 'teacher'
  coming?: string
  lines: DialogueLine[]
  quiz?: NpcQuiz
}

export type LockBox = {
  id: string
  at: Vec
  digits: number
  answer: string
  firstLine: string
  prompt: string
  ok: string
}

export type Award = { name: string; text: string }

export type RoomConfig = {
  id: string
  name: string
  subtitle: string
  size: { w: number; h: number }
  wall: number
  /** 后墙更厚，给黑板和挂图留出墙面高度，也避免角色头部压到墙上。 */
  topWall?: number
  spawn: Vec
  props: Prop[]
  /** 阶梯教室的台阶。不填就是平地。 */
  steps?: StepBand[]
  /** 底部提示语。 */
  tip?: string
  npc?: Npc
  box?: LockBox
  /** 本关的最终奖励。 */
  award: Award
}

export type Direction = 'up' | 'down' | 'left' | 'right'
export type PlayerState = Vec & { direction: Direction; distance: number; moving: boolean; z: number }
