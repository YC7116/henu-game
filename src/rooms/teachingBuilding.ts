import type { RoomConfig } from './types'

/** 1F 大厅：筑小智在这里，两侧楼梯分别上二层与三层。 */
const hall1f: RoomConfig = {
  id: 'hall-1f',
  name: '综合教学楼 · 一层大厅',
  subtitle: '入口大厅 · 右侧一部楼梯，上下各层通用',
  size: { w: 820, h: 420 },
  wall: 28,
  topWall: 56,
  spawn: { x: 410, y: 356 },
  tip: '楼梯在右侧，走近按 E 选去几层。也可以先和筑小智说句话。',
  props: [
    { id: 'gate-door', kind: 'door', x: 374, y: 392, w: 72, h: 28, to: 'campus', label: '回到校园' },
    { id: 'stairs', kind: 'stairs', x: 660, y: 280, w: 64, h: 96, block: { x: 660, y: 280, w: 64, h: 98 }, label: '走楼梯', floors: [
      { label: '二层', to: 'corridor-2f' },
      { label: '三层', to: 'corridor-3f' },
    ] },
    { id: 'guide', kind: 'screen', x: 300, y: 8, w: 220, h: 40, text: '1F 大厅 · 2F 201—204 · 3F 301—303' },
    { id: 'reception', kind: 'podium', x: 520, y: 112, w: 96, h: 34, block: { x: 520, y: 112, w: 96, h: 46 }, note: { title: '服务台', text: '台面上摆着一叠新生手册，最上面那本被人翻得起了毛边。' } },
    { id: 'board-l', kind: 'bulletin', x: 2, y: 140, w: 24, h: 96, note: { title: '楼层导览', text: '一层大厅，二层 201—204，三层 301—303。纸角被人反复卷过。' } },
    { id: 'board-r', kind: 'bulletin', x: 794, y: 140, w: 24, h: 96, note: { title: '社团招新', text: '几张手绘海报，其中一张写着「结构设计大赛，等你来搭」。' } },
    { id: 'plant-1', kind: 'plant', x: 60, y: 96, w: 34, h: 24, block: { x: 60, y: 96, w: 34, h: 26 }, note: { title: '绿植', text: '叶子擦得很干净，这栋楼里有人认真照顾它。' } },
    { id: 'plant-2', kind: 'plant', x: 726, y: 96, w: 34, h: 24, block: { x: 726, y: 96, w: 34, h: 26 }, note: { title: '绿植', text: '和一楼另一侧那盆是同一批，花盆底还贴着编号。' } },
  ],
  npc: {
    id: 'zhuxiaozhi',
    name: '筑小智',
    tag: '校园知识守护者',
    at: { x: 410, y: 206 },
    sprite: 'zhuxiaozhi',
    lines: [
      { text: '随便转转，或许能找到建筑碎片的线索。' },
      { text: '这栋楼里上上下下，总有人在算题。三层那位老师，好像一直在等一个答案。' },
      { text: '对了——有些数字不在墙上，在你答过的题里。二楼那个盒子，认的就是这种数字。' },
    ],
  },
  award: { name: '综合教学楼', text: '' },
}

/** 2F 走廊：只有 202 能进，其余门都锁着。 */
const corridor2f: RoomConfig = {
  id: 'corridor-2f',
  name: '综合教学楼 · 二层走廊',
  subtitle: '201 — 204 · 只有一间门是开着的',
  size: { w: 820, h: 300 },
  wall: 28,
  topWall: 56,
  spawn: { x: 410, y: 150 },
  tip: '沿走廊走，能进的那扇门按 E 进去。',
  props: [
    { id: 'door-201', kind: 'classdoor', x: 160, y: 28, w: 64, h: 28, plate: '201', lockedText: '有人正在上课，你或许不应该打扰他们。' },
    { id: 'door-202', kind: 'classdoor', x: 300, y: 28, w: 64, h: 28, plate: '202', to: 'classroom-202', label: '进入 202 教室' },
    { id: 'door-203', kind: 'classdoor', x: 620, y: 28, w: 64, h: 28, plate: '203', lockedText: '有人正在上课，你或许不应该打扰他们。' },
    { id: 'door-204', kind: 'classdoor', x: 700, y: 28, w: 64, h: 28, plate: '204', lockedText: '门锁着。门上的课表写着「实验课，暂停使用」。' },
    { id: 'stairs', kind: 'stairs', x: 62, y: 196, w: 64, h: 64, block: { x: 62, y: 196, w: 64, h: 66 }, label: '走楼梯', floors: [
      { label: '一层', to: 'hall-1f' },
      { label: '三层', to: 'corridor-3f' },
    ] },
    { id: 'window', kind: 'window', x: 792, y: 90, w: 26, h: 140, note: { title: '走廊尽头', text: '从这里能看见楼下的树冠，风一过，整片叶子都在翻面。' } },
    { id: 'plant-1', kind: 'plant', x: 200, y: 236, w: 34, h: 24, block: { x: 200, y: 236, w: 34, h: 26 }, note: { title: '走廊的绿植', text: '花盆底下垫着一张旧报纸，日期已经看不清了。' } },
    { id: 'plant-2', kind: 'plant', x: 560, y: 236, w: 34, h: 24, block: { x: 560, y: 236, w: 34, h: 26 }, note: { title: '走廊的绿植', text: '叶子朝窗那边歪着，长年晒一边光。' } },
  ],
  award: { name: '二层走廊', text: '' },
}

/** 3F 走廊：303 是阶梯教室。 */
const corridor3f: RoomConfig = {
  id: 'corridor-3f',
  name: '综合教学楼 · 三层走廊',
  subtitle: '301 — 303 · 尽头那间门开着',
  size: { w: 820, h: 300 },
  wall: 28,
  topWall: 56,
  spawn: { x: 410, y: 150 },
  tip: '303 的门开着，就在走廊右侧。',
  props: [
    { id: 'door-301', kind: 'classdoor', x: 160, y: 28, w: 64, h: 28, plate: '301', lockedText: '有人正在上课，你或许不应该打扰他们。' },
    { id: 'door-302', kind: 'classdoor', x: 620, y: 28, w: 64, h: 28, plate: '302', lockedText: '有人正在上课，你或许不应该打扰他们。' },
    { id: 'door-303', kind: 'classdoor', x: 300, y: 28, w: 64, h: 28, plate: '303', to: 'classroom-303', label: '进入 303 阶梯教室' },
    { id: 'stairs', kind: 'stairs', x: 62, y: 196, w: 64, h: 64, block: { x: 62, y: 196, w: 64, h: 66 }, label: '走楼梯', floors: [
      { label: '一层', to: 'hall-1f' },
      { label: '二层', to: 'corridor-2f' },
    ] },
    { id: 'window', kind: 'window', x: 792, y: 90, w: 26, h: 140, note: { title: '走廊尽头', text: '三层的窗比二层更靠近树冠，光被叶子筛成一片一片。' } },
    { id: 'plant-1', kind: 'plant', x: 560, y: 236, w: 34, h: 24, block: { x: 560, y: 236, w: 34, h: 26 }, note: { title: '走廊的绿植', text: '这盆比楼下的高一点，大概是同一批买的。' } },
  ],
  award: { name: '三层走廊', text: '' },
}

/**
 * 303 阶梯教室：按实地照片还原，四排座位分左右两段，台阶可走。
 * 老师在讲台上出题，玩家算出 12 才算过关。
 */
const classroom303: RoomConfig = {
  id: 'classroom-303',
  name: '综合教学楼 · 303 阶梯教室',
  subtitle: '老师还站在讲台前，黑板上的式子没擦',
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
  tip: '沿过道走到讲台前，跟老师说句话。',
  props: [
    { id: 'blackboard', kind: 'blackboard', x: 210, y: 20, w: 380, h: 32, note: { title: '黑板', text: '上节课留下半道式子：「3x² + 2x」，后面跟着一个没写完的等号。' } },
    { id: 'clock', kind: 'clock', x: 630, y: 22, w: 34, h: 18, note: { title: '电子钟', text: '红色的数字还在跳。这节课拖得比平时久。' } },
    { id: 'podium', kind: 'podium', x: 300, y: 80, w: 70, h: 30, block: { x: 300, y: 80, w: 70, h: 44 }, note: { title: '讲台', text: '一叠批改过的作业，红笔停在第三本上。' } },
    { id: 'bench-1a', kind: 'bench', x: 110, y: 158, w: 240, h: 32, block: { x: 110, y: 158, w: 240, h: 37 }, note: { title: '第一排', text: '桌面上刻着一行小字：离黑板最近的人，往往最不敢举手。' } },
    { id: 'bench-1b', kind: 'bench', x: 390, y: 158, w: 230, h: 32, block: { x: 390, y: 158, w: 230, h: 37 } },
    { id: 'bench-2a', kind: 'bench', x: 110, y: 214, w: 240, h: 32, block: { x: 110, y: 214, w: 240, h: 37 }, note: { title: '第二排', text: '抽屉里塞着一张折起来的草稿纸，写的是一道没算完的题。' } },
    { id: 'bench-2b', kind: 'bench', x: 390, y: 214, w: 230, h: 32, block: { x: 390, y: 214, w: 230, h: 37 } },
    { id: 'bench-3a', kind: 'bench', x: 110, y: 270, w: 240, h: 32, block: { x: 110, y: 270, w: 240, h: 37 }, note: { title: '第三排', text: '最左边的座位没关严，椅背上还挂着一条围巾。' } },
    { id: 'bench-3b', kind: 'bench', x: 390, y: 270, w: 230, h: 32, block: { x: 390, y: 270, w: 230, h: 37 } },
    { id: 'bench-4a', kind: 'bench', x: 110, y: 326, w: 240, h: 32, block: { x: 110, y: 326, w: 240, h: 37 }, note: { title: '最后一排', text: '这里离黑板最远，也离门最近。有人在这里睡过一整个下午。' } },
    { id: 'bench-4b', kind: 'bench', x: 390, y: 326, w: 230, h: 32, block: { x: 390, y: 326, w: 230, h: 37 } },
    { id: 'window', kind: 'window', x: 2, y: 150, w: 26, h: 160, curtain: true, note: { title: '窗外', text: '蓝色的窗帘拉了一半。下午的光从缝里斜着落进来，铺在最前面几排桌上。' } },
    { id: 'exit-door', kind: 'door', x: 356, y: 442, w: 72, h: 28, to: 'corridor-3f', label: '回三层走廊' },
  ],
  npc: {
    id: 'teacher',
    name: '老师',
    tag: '高等数学 · 阶梯教室',
    at: { x: 335, y: 118 },
    sprite: 'teacher',
    lines: [
      { text: '（老师从作业本上抬起头）你是来找建筑碎片的？' },
      { text: '我这里有道题。算出来了，或许有线索。' },
      { text: '∫₀² (3x² + 2x) dx —— 把值告诉我。' },
    ],
    quiz: {
      prompt: '把算出来的值输进去',
      question: '∫₀² (3x² + 2x) dx = ?',
      answer: '12',
      digits: 2,
      ok: '12，对。记住这个数——它只是一个答案的一部分。',
      retry: '再算一遍。先求原函数，再代上下限。',
    },
  },
  award: { name: '303 阶梯教室', text: '' },
}

/** 202 教室：讲台上放着一个四位密码盒。 */
const classroom202: RoomConfig = {
  id: 'classroom-202',
  name: '综合教学楼 · 202 教室',
  subtitle: '空着的普通教室，讲台上有个盒子',
  size: { w: 640, h: 380 },
  wall: 28,
  topWall: 56,
  spawn: { x: 312, y: 330 },
  tip: '讲台上那个盒子，走近按 E。',
  props: [
    { id: 'blackboard', kind: 'blackboard', x: 190, y: 14, w: 260, h: 26, note: { title: '黑板', text: '擦得很干净，只有右下角留着一行小字：今日值日。' } },
    { id: 'box', kind: 'box', x: 298, y: 66, w: 46, h: 26, block: { x: 298, y: 66, w: 46, h: 40 } },
    { id: 'desk-1', kind: 'desk', x: 120, y: 150, w: 66, h: 34, block: { x: 120, y: 150, w: 66, h: 58 }, note: { title: '课桌', text: '抽屉里有一支没盖笔帽的中性笔。' } },
    { id: 'desk-2', kind: 'desk', x: 260, y: 150, w: 66, h: 34, block: { x: 260, y: 150, w: 66, h: 58 } },
    { id: 'desk-3', kind: 'desk', x: 400, y: 150, w: 66, h: 34, block: { x: 400, y: 150, w: 66, h: 58 }, note: { title: '课桌', text: '桌角贴着一张便利贴：周三交作业。字迹已经褪了。' } },
    { id: 'desk-4', kind: 'desk', x: 120, y: 240, w: 66, h: 34, block: { x: 120, y: 240, w: 66, h: 58 }, note: { title: '课桌', text: '这里离窗户最近，也离黑板最远。' } },
    { id: 'desk-5', kind: 'desk', x: 260, y: 240, w: 66, h: 34, block: { x: 260, y: 240, w: 66, h: 58 } },
    { id: 'desk-6', kind: 'desk', x: 400, y: 240, w: 66, h: 34, block: { x: 400, y: 240, w: 66, h: 58 }, note: { title: '课桌', text: '桌洞里有一支用到很短的粉笔。' } },
    { id: 'window', kind: 'window', x: 2, y: 110, w: 26, h: 130, note: { title: '窗外', text: '对面的楼是红的。下午的课刚散，走廊里还有脚步声。' } },
    { id: 'exit-door', kind: 'door', x: 280, y: 352, w: 64, h: 28, to: 'corridor-2f', label: '回二层走廊' },
  ],
  box: {
    id: 'box-202',
    at: { x: 321, y: 104 },
    digits: 4,
    answer: '1912',
    firstLine: '或许，你已经找到了答案的一部分。完整的答案，应该是一个对这所学校有着特别意义的数字。',
    prompt: '盒盖上有一圈数字轮，四位。',
    ok: '咔哒一声，盒盖弹开了。',
  },
  award: {
    name: '教学楼的建筑碎片',
    text: '一块嵌着窗格的碎片，边缘还留着粉笔的白。它记得这栋楼里所有算错的式子，也记得所有算对的那一次。',
  },
}

export const teachingRooms: RoomConfig[] = [hall1f, corridor2f, corridor3f, classroom303, classroom202]
