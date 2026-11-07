import type { RoomConfig } from './types'

/**
 * 综合教学楼 · 阶梯教室（303）。
 *
 * 参照实地照片：绿色分格黑板 + 木框、木质讲台、左侧带蓝色窗帘的长窗、
 * 浅灰水磨石地面配刷白的台阶立面、长条木面桌加连体座椅、灰色钢架。
 *
 * 房间 800 × 470，墙体 28，后墙 76。四排座位，每排分左右两段，
 * 中间与两侧各留一条过道。台阶从讲台向后每排抬高 8px，
 * 后排门口最高（z=32），玩家进门后沿过道往下走到讲台。
 */
export const teachingRoom: RoomConfig = {
  id: 'teaching-303',
  name: '综合教学楼 · 阶梯教室',
  subtitle: '四排座位 · 黑板还留着上一节课的粉笔灰',
  size: { w: 800, h: 470 },
  wall: 28,
  topWall: 76,
  steps: [
    { y0: 76, y1: 140, z: 0 },
    { y0: 140, y1: 196, z: 8 },
    { y0: 196, y1: 252, z: 16 },
    { y0: 252, y1: 308, z: 24 },
    { y0: 308, y1: 442, z: 32 },
  ],
  spawn: { x: 368, y: 408 },
  door: { x: 392, y: 446 },
  props: [
    { id: 'blackboard', kind: 'blackboard', x: 210, y: 20, w: 380, h: 32, note: { title: '黑板', text: '上一节课写到一半被擦掉了。只剩「3x² + 2x」，和一行没擦干净的「dx」。' } },
    { id: 'clock', kind: 'clock', x: 630, y: 22, w: 34, h: 18, note: { title: '电子钟', text: '红色的数字还在跳。它比教室里任何一个人都更清楚这节课拖了多久。' } },
    { id: 'podium', kind: 'podium', x: 300, y: 80, w: 70, h: 30, block: { x: 300, y: 80, w: 70, h: 44 } },
    { id: 'bench-1a', kind: 'bench', x: 110, y: 158, w: 240, h: 32, block: { x: 110, y: 158, w: 240, h: 37 }, note: { title: '第一排', text: '木面桌还留着上一个人的温度。桌角刻着一行小字：离黑板最近的人，往往最不敢举手。' } },
    { id: 'bench-1b', kind: 'bench', x: 390, y: 158, w: 230, h: 32, block: { x: 390, y: 158, w: 230, h: 37 } },
    { id: 'bench-2a', kind: 'bench', x: 110, y: 214, w: 240, h: 32, block: { x: 110, y: 214, w: 240, h: 37 }, note: { title: '第二排', text: '抽屉里塞着一张折起来的草稿纸，写的是一道没算完的题。' } },
    { id: 'bench-2b', kind: 'bench', x: 390, y: 214, w: 230, h: 32, block: { x: 390, y: 214, w: 230, h: 37 } },
    { id: 'bench-3a', kind: 'bench', x: 110, y: 270, w: 240, h: 32, block: { x: 110, y: 270, w: 240, h: 37 }, note: { title: '第三排', text: '最左边的座位没有关严，椅背上还挂着一条围巾。' } },
    { id: 'bench-3b', kind: 'bench', x: 390, y: 270, w: 230, h: 32, block: { x: 390, y: 270, w: 230, h: 37 } },
    { id: 'bench-4a', kind: 'bench', x: 110, y: 326, w: 240, h: 32, block: { x: 110, y: 326, w: 240, h: 37 }, note: { title: '最后一排', text: '这里离黑板最远，也离门最近。有人在这里睡过一整个下午。' } },
    { id: 'bench-4b', kind: 'bench', x: 390, y: 326, w: 230, h: 32, block: { x: 390, y: 326, w: 230, h: 37 } },
    { id: 'cabinet', kind: 'cabinet', x: 650, y: 82, w: 80, h: 46, block: { x: 650, y: 82, w: 80, h: 56 } },
    { id: 'window', kind: 'window', x: 2, y: 150, w: 26, h: 160, curtain: true, note: { title: '窗外', text: '蓝色的窗帘拉了一半。下午的光从缝里斜着落进来，铺在最前面几排桌上。' } },
    { id: 'bulletin', kind: 'bulletin', x: 774, y: 160, w: 24, h: 100, note: { title: '墙上的通知', text: '调课通知、竞赛报名，还有一张被撕掉一半的座位表。撕口正好在第三排。' } },
    { id: 'door', kind: 'door', x: 356, y: 446, w: 72, h: 28 },
    { id: 'stairs', kind: 'stairs', x: 690, y: 352, w: 58, h: 76, block: { x: 690, y: 352, w: 58, h: 78 }, label: '上二层 · 语音实验室' },
  ],
  tip: '沿中间或两侧过道往下走。黑板、第三排、窗台、墙上通知都藏了东西。',
  exitLabel: '离开教室',
  stairsTo: 'language-lab',
  shards: [
    {
      id: 'int',
      piece: '∫',
      title: '积分号碎片',
      slot: 0,
      source: 'sequence',
      clue: '讲台抽屉上有一把符号锁，锁面刻着「按写出一道定积分的顺序」。',
    },
    {
      id: 'bound',
      piece: '₀²',
      title: '上下限碎片',
      slot: 1,
      source: 'pickup',
      at: { x: 470, y: 62 },
      clue: '黑板槽里有东西反光，就在粉笔灰最多的地方。',
    },
    {
      id: 'quad',
      piece: '3x²',
      title: '二次项碎片',
      slot: 2,
      source: 'pickup',
      at: { x: 130, y: 276 },
      clue: '第三排最左边那个座位没有关严。',
    },
    {
      id: 'linear',
      piece: '+2x',
      title: '一次项碎片',
      slot: 3,
      source: 'pickup',
      at: { x: 42, y: 200 },
      requires: 2,
      clue: '窗台上的粉笔字迹，要等手上有点东西了才看得懂。',
    },
    {
      id: 'diff',
      piece: 'dx',
      title: '微分碎片',
      slot: 4,
      source: 'pickup',
      at: { x: 756, y: 205 },
      requires: 3,
      clue: '墙上那张被撕掉一半的座位表。',
    },
  ],
  puzzle: {
    slots: ['积分号', '上下限', '二次项', '一次项', '微分'],
    lock: {
      answer: '12',
      digits: 2,
      question: '∫₀² (3x² + 2x) dx = ?',
      hint: '∫3x²dx = x³，∫2x dx = x²。原函数是 x³ + x²，代入上下限相减。',
    },
    sequence: {
      prompt: '抽屉上的铜锁有五个符号槽。锁面刻着：按写出一道定积分的顺序。',
      order: ['∫', '₀²', '3x²', '+2x', 'dx'],
      buttons: ['3x²', 'dy', '∫', '+2x', '₀²', '= C', 'dx', '∫₀¹'],
    },
  },
  award: {
    name: '教学楼的建筑碎片',
    text: '一块嵌着窗格的碎片，边缘还留着粉笔的白。它记得所有在这个教室里算错的式子，也记得所有算对的那一次。',
  },
}
