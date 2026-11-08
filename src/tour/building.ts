import { createGateDisplay } from './gate-display'
import T from '../three-vendor'
import type { Art } from './art'
import {
  cv, tex, tileBeige, ceilingBoard, stainless, travertine, woodTile, grayWood,
  rubber, granitePaving, brickFacade, honorsWall, terrazzo, metalTextLit,
  crest, photoCase,
} from './textures'

/**
 * 建筑工程学院 · 第一人称参观场景（v0.7 镜像双楼版）
 *
 * 与前版最大的不同：总平面按卫星图 + 用户口述重排——
 *
 *  - 16 号楼是**东西向的两栋长楼**（每栋 90 × 18 m，层高 4.2 m，共六层），
 *    北楼 16A 在北、南楼 16B 在南，中间留一条 15.6 m 宽的缝；
 *  - 缝的**最东侧是入口广场**，东端开口接校园路；两栋楼的大门在广场的
 *    北、南两侧，**门对门**；
 *  - 两楼格局**镜像对称**：进大门左手边是电梯厅（每栋一部电梯，六层），
 *    右手边是直跑楼梯间，门厅居中，门厅背后是一条东西向内走廊，
 *    两侧是办公室；五层一道玻璃连廊跨过缝把两栋楼连起来；
 *  - 学院名牌（花岗岩斜碑）立在广场东端，面向校园路；
 *  - 一层院史陈列厅按实景照片装饰：米色大板砖、洞石院名墙、铜牌荣誉墙、
 *    大礼堂缩尺模型与院史展板。
 *
 * 尺寸按照片与卫星图估算，用于可行走的体验重建，不是测绘图纸。
 */

export type Collider = { x0: number; x1: number; z0: number; z1: number; y0: number; y1: number }
export type Hotspot = { id: string; title: string; kicker: string; lines: string[]; note?: string; x: number; z: number; y: number; radius: number }

export const FH = 4.2          // 层高
export const FLOORS = 6        // 总层数
export const F2 = FH           // 二层楼面标高
export const CEIL1 = 3.05      // 一层吊顶
export const CEIL2 = FH + 3.15 // 标准层吊顶（净高 3.15 m）
/** 第 n 层的楼面标高，n 从 1 开始。 */
export const floorY = (n: number) => (n - 1) * FH
export const ceilY = (n: number) => (n === 1 ? CEIL1 : floorY(n) + 3.15)
/** 屋面标高：顶层楼面 + 一个层高。 */
export const ROOF_Y = floorY(FLOORS) + FH
const WALL = 0.28

/* ---------------- 总平面：东西向两栋，东端夹广场，门对门 ---------------- */

const BLD_X0 = -56                     // 楼西端（东西向总长 90 m，同卫星实测）
const BLD_X1 = 34                      // 楼东端
const GAP_Z0 = 0, GAP_Z1 = 15.6        // 两楼之间的缝：东段是广场，西段是天井
export const BRIDGE = { x0: 18.0, x1: 21.2, z0: GAP_Z0, z1: GAP_Z1 }  // 五层连廊：正对大门轴线（门心 19.6）
export const BRIDGE_Y = floorY(5)
const DOOR_X0 = 17.4, DOOR_X1 = 21.8   // 两栋大门（门洞），正对广场
const HALL_D = 9.3                     // 门厅进深（立面 → 走廊墙）
const LOBBY_X0 = 12.8, LOBBY_X1 = 26.4 // 门厅横向范围
const GALL_X0 = -20, GALL_X1 = 5.6     // 一层院史陈列厅（门厅西邻、贴走廊）
const CORR_D0 = 9.6, CORR_D1 = 12.6   // 走廊（净宽 3 m）
const PASS_X0 = BRIDGE.x0, PASS_X1 = BRIDGE.x1  // 五层连廊通道（穿门厅接走廊）
const LIFT_WALL_D = 7.36               // 电梯门墙所在进深（井道镶嵌在墙后，没有独立房间）
const ST_D0 = 1.6, ST_D1 = 7.6         // 直跑梯段（沿 z，进深 1.6 → 7.6）
const LINTEL = 2.46
const CAR = { half: 0.78, top: 2.26 }
/** 南楼六层电梯厅附近的 606 教室（按照片布置：讲台 + 大屏幕，没有桌椅）。 */
export const R606 = { x0: -8, x1: 4, doorX: -2.8 } // 游戏路线压缩：从电梯口到门口约 33 m，原约 81 m

/**
 * 一栋楼的全部平面参数。z 一律用「进深 d」表达：d = (z - faceZ) * dir，
 * d=0 是门脸，d 越大越深入楼内。南北两栋共用同一套横向（x）尺寸，
 * 只有「电梯 / 楼梯在门厅哪一侧」互换——进门左手电梯、右手楼梯，
 * 对北楼（朝北进）来说是电梯在西、楼梯在东，南楼（朝南进）正好相反。
 */
export type Wing = {
  id: 'N' | 'S'
  faceZ: number                 // 门脸所在 z
  dir: 1 | -1                   // 室内沿 z 的延伸方向
  elevX: [number, number]       // 电梯厅 x 范围（进门左手）
  stairX: [number, number]      // 楼梯间 x 范围（进门右手）
  fx: [number, number]          // 直跑梯段条带 x
  corrOpen: [number, number]    // 电梯厅与走廊之间门洞的 x（让开井道）
  lift: { x: number; z0: number; z1: number; doorZ: number; dir: 1 | -1 }
  zAt: (d: number) => number
  depth: (z: number) => number
}

const mkWing = (
  id: 'N' | 'S', faceZ: number, dir: 1 | -1,
  elevX: [number, number], stairX: [number, number], fx: [number, number],
  corrOpen: [number, number],
  lift: Wing['lift'],
): Wing => ({
  id, faceZ, dir, elevX, stairX, fx, corrOpen, lift,
  zAt: (d) => faceZ + dir * d,
  depth: (z) => (z - faceZ) * dir,
})

export const WINGS: Wing[] = [
  // 北楼：电梯厅在东端（x 26.4–33.6）、楼梯间在西端——跨广场与南楼镜像
  mkWing('N', 0, -1, [26.4, 33.6], [5.6, 12.8], [8.6, 10.6], [26.8, 29.0],
    { x: 30.0, z0: -9.3, z1: -7.54, doorZ: -7.36, dir: 1 }),
  // 南楼（照片里的那栋）：电梯厅同样在东端，进门左手
  mkWing('S', 15.6, 1, [26.4, 33.6], [5.6, 12.8], [8.6, 10.6], [26.8, 29.0],
    { x: 30.0, z0: 23.14, z1: 24.9, doorZ: 22.96, dir: -1 }),
]

const inRect = (r: { x0: number; x1: number; z0: number; z1: number }, x: number, z: number) =>
  x > r.x0 && x < r.x1 && z > r.z0 && z < r.z1

/** 人是否站在某栋楼的直跑梯段条带里（含平台）——撞开脚手架用的。 */
function onFlight(w: Wing, x: number, d: number) {
  if (x <= w.fx[0] || x >= w.fx[1]) return false
  return d >= ST_D0 && d <= ST_D1
}

/** 楼梯面：平台 = 二层标高；梯段随进深线性上升。两栋同一套算法。 */
function stairAt(x: number, z: number) {
  for (const w of WINGS) {
    if (x <= w.fx[0] || x >= w.fx[1]) continue
    const d = w.depth(z)
    if (d > ST_D1 && d <= HALL_D) return F2
    if (d >= ST_D0 && d <= ST_D1) return (F2 * (d - ST_D0)) / (ST_D1 - ST_D0)
  }
  return null
}

/** 一层可站立面：两楼之间的缝（含广场/天井/引道）+ 两栋楼的一层。
 *  门厅/电梯厅/楼梯间/陈列厅的地面一直铺到走廊墙（9.6）；
 *  井道筒体立在大厅中央，靠它自己的碰撞体挡人。 */
function inFloor1(x: number, z: number) {
  if (z > GAP_Z0 && z < GAP_Z1 && x > BLD_X0 - 1 && x < 43) return true
  for (const w of WINGS) {
    const d = w.depth(z)
    if (d < -0.02 || d > 18) continue
    if (d <= CORR_D0 && x >= GALL_X0 && x <= 33.6) return true
    if (d >= CORR_D0 && d <= CORR_D1 && x >= BLD_X0 && x <= 33.6) return true
  }
  return false
}

/** 二至六层可站立面（每层同构；连廊通道全楼层保留，但只有五层有门洞可达）。
 *  南楼电梯厅附近的 606 教室（x -8..4，进深 0..9.45）整块登记为可站立。 */
function inPlate(x: number, z: number) {
  for (const w of WINGS) {
    const d = w.depth(z)
    if (d < -0.02 || d > 18) continue
    if (w.id === 'S' && x >= R606.x0 + 0.2 && x <= R606.x1 - 0.2 && d <= 9.62) return true // 606 教室（含门洞墙带）
    if (d <= CORR_D0 && x >= GALL_X1 && x <= 33.6 && !onFlight(w, x, d)) return true
    if (x >= PASS_X0 && x <= PASS_X1 && d <= CORR_D0) return true
    if (d >= CORR_D0 && d <= CORR_D1 && x >= BLD_X0 && x <= 33.6) return true
  }
  return false
}

/* --------------------------------------------------------------- 创建场景 --- */

export function createHall(art: Art, shadowSize = 2048) {
  const M = art.mats
  const root = new T.Group()
  const colliders: Collider[] = []
  const disposables: any[] = []

  const matCache = new Map<string, any>()
  function tiled(base: any, w: number, h: number, tile = 2.4) {
    const key = `${base.uuid}_${w.toFixed(2)}_${h.toFixed(2)}_${tile}`
    const hit = matCache.get(key)
    if (hit) return hit
    const m = base.clone()
    for (const k of ['map', 'normalMap']) {
      if (base[k]) {
        m[k] = base[k].clone()
        m[k].repeat.set(w / tile, h / tile)
        m[k].needsUpdate = true
      }
    }
    disposables.push(m)
    matCache.set(key, m)
    return m
  }

  function mesh(geo: any, mat: any, cast = true, receive = true) {
    const m = new T.Mesh(geo, mat)
    m.castShadow = cast
    m.receiveShadow = receive
    disposables.push(geo)
    root.add(m)
    return m
  }
  function box(w: number, h: number, d: number, mat: any, x: number, y: number, z: number, cast = true, receive = true) {
    const m = mesh(new T.BoxGeometry(w, h, d), mat, cast, receive)
    m.position.set(x, y, z)
    return m
  }
  function plane(w: number, h: number, mat: any, x: number, y: number, z: number, rx = -Math.PI / 2, ry = 0) {
    const m = mesh(new T.PlaneGeometry(w, h), mat, false, true)
    m.position.set(x, y, z)
    m.rotation.set(rx, ry, 0)
    return m
  }
  function segment(a: any, b: any, radius: number, mat: any, cast = true) {
    const dir = new T.Vector3().subVectors(b, a)
    const len = dir.length()
    const m = mesh(new T.CylinderGeometry(radius, radius, len, 24, 1), mat, cast, false)
    m.position.copy(a).addScaledVector(dir, 0.5)
    m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), dir.normalize())
    return m
  }
  const V = (x: number, y: number, z: number) => new T.Vector3(x, y, z)
  const solid = (x0: number, x1: number, z0: number, z1: number, y0 = 0, y1 = CEIL2) =>
    colliders.push({ x0, x1, z0, z1, y0, y1 })

  /* ------------------------------------------------------------ 材质表 --- */

  const T_BEIGE = tex(tileBeige(), 1, 1)
  const T_CEIL = tex(ceilingBoard(), 1, 1)
  const T_STEEL = tex(stainless(), 1, 1)
  const T_TRAV = tex(travertine(), 1, 1)
  const T_WOOD = tex(woodTile(), 1, 1)
  const T_GRAY = tex(grayWood(), 1, 1)
  const T_RUB = tex(rubber(), 1, 1)
  const T_GRAN = tex(granitePaving(), 1, 1)
  const T_FACADE = tex(brickFacade(), 1, 1)
  const T_HONOR = tex(honorsWall(), 1, 1)
  const T_TERR = tex(terrazzo(), 1, 1)
  const T_CREST = tex(crest(), 1, 1)
  const T_NAME = tex(metalTextLit('建筑工程学院', 'School of Civil Engineering and Architecture'), 1, 1)

  const MAT = {
    tile: new T.MeshStandardMaterial({ map: T_BEIGE, roughness: 0.28, metalness: 0.05, envMapIntensity: 0.55, color: '#e9e4d6' }),
    ceil: new T.MeshStandardMaterial({ map: T_CEIL, roughness: 0.94, metalness: 0, color: '#e7e4dc', emissive: '#5c5b56', emissiveIntensity: 0.9 }),
    steel: new T.MeshStandardMaterial({ map: T_STEEL, roughness: 0.26, metalness: 0.95, envMapIntensity: 1.15 }),
    trav: new T.MeshStandardMaterial({ map: T_TRAV, roughness: 0.42, metalness: 0.04, envMapIntensity: 0.5 }),
    wood: new T.MeshStandardMaterial({ map: T_WOOD, roughness: 0.35, metalness: 0.03, envMapIntensity: 0.6 }),
    gray: new T.MeshStandardMaterial({ map: T_GRAY, roughness: 0.55, metalness: 0.05 }),
    rubber: new T.MeshStandardMaterial({ map: T_RUB, roughness: 0.88, metalness: 0 }),
    granite: new T.MeshStandardMaterial({ map: T_GRAN, roughness: 0.62, metalness: 0.05, envMapIntensity: 0.4, color: '#d6cfc2' }),
    facade: new T.MeshStandardMaterial({ map: T_FACADE, roughness: 0.92, metalness: 0 }),
    honor: new T.MeshStandardMaterial({ map: T_HONOR, roughness: 0.55, metalness: 0.35, envMapIntensity: 0.7 }),
    white: new T.MeshStandardMaterial({ color: '#e4e1d9', roughness: 0.92, metalness: 0 }),
    whiteGloss: new T.MeshStandardMaterial({ color: '#e6e3db', roughness: 0.4, metalness: 0.02, envMapIntensity: 0.5 }),
    doorWood: new T.MeshStandardMaterial({ color: '#3a2a22', roughness: 0.44, metalness: 0.06, envMapIntensity: 0.7 }),
    blackStone: new T.MeshStandardMaterial({ color: '#26262a', roughness: 0.32, metalness: 0.14, envMapIntensity: 0.9 }),
    cream: new T.MeshStandardMaterial({ color: '#e6dfd0', roughness: 0.9 }),
    redLacquer: new T.MeshStandardMaterial({ color: '#8e2f26', roughness: 0.5, metalness: 0.05 }),
    brass: M.brass,
    dark: M.dark,
    steel2: M.steel,
    glass: new T.MeshStandardMaterial({
      color: '#d3e3ea', roughness: 0.05, metalness: 0.08, transparent: true, opacity: 0.13,
      side: T.DoubleSide, depthWrite: false, envMapIntensity: 1.5,
    }),
    glassRail: new T.MeshStandardMaterial({
      color: '#dbe7ec', roughness: 0.08, metalness: 0.04, transparent: true, opacity: 0.19,
      side: T.DoubleSide, depthWrite: false, envMapIntensity: 1.2,
    }),
    glow: new T.MeshStandardMaterial({ color: '#fffaf0', emissive: '#ffeccb', emissiveIntensity: 2.4, roughness: 0.6 }),
    leaf: M.leaf,
    leafLight: M.leafLight,
    soil: M.soil,
    concrete: M.concrete,
    stone: M.stone,
    plaster: M.plaster,
    brick: M.brick,
  }
  disposables.push(
    T_BEIGE, T_CEIL, T_STEEL, T_TRAV, T_WOOD, T_GRAY, T_RUB, T_GRAN,
    T_FACADE, T_HONOR, T_CREST, T_NAME, T_TERR,
    ...Object.values(MAT).filter((m: any) => m && !Object.values(M).includes(m)),
  )

  /** 带洞口的通高墙（外立面用）：shape 画在 (x, y) 平面，沿 z 挤出 thickness。 */
  function wall(
    u0: number, u1: number, h: number, holes: [number, number, number, number][],
    mat: any, tile = 2.4, thickness = WALL,
  ) {
    const shape = new T.Shape()
    shape.moveTo(u0, 0)
    shape.lineTo(u1, 0)
    shape.lineTo(u1, h)
    shape.lineTo(u0, h)
    shape.lineTo(u0, 0)
    for (const [a, b, c, d] of holes) {
      const p = new T.Path()
      p.moveTo(a, b)
      p.lineTo(c, b)
      p.lineTo(c, d)
      p.lineTo(a, d)
      p.lineTo(a, b)
      shape.holes.push(p)
    }
    const geo = new T.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false })
    const m = mat.clone()
    for (const k of ['map', 'normalMap']) {
      if (mat[k]) {
        m[k] = mat[k].clone()
        m[k].repeat.set(1 / tile, 1 / tile)
        m[k].offset.set(0, 0)
        m[k].needsUpdate = true
      }
    }
    disposables.push(m, m.map, m.normalMap, geo)
    const mo = new T.Mesh(geo, m)
    mo.castShadow = true
    mo.receiveShadow = true
    root.add(mo)
    return mo
  }

  /** 沿 x 的墙（进深 d 处），洞 [x0, y0, x1, y1] 用互补小盒子绕开。 */
  function wallX(w: Wing, xa: number, xb: number, d: number, ya: number, yb: number,
    holes: number[][], mat: any, thick = WALL) {
    const xs: number[] = [xa, xb]
    for (const o of holes) xs.push(o[0], o[2])
    xs.sort((p, q) => p - q)
    const zc = w.zAt(d)
    const z0 = Math.min(zc - thick / 2, zc + thick / 2)
    const z1 = Math.max(zc - thick / 2, zc + thick / 2)
    for (let i = 0; i < xs.length - 1; i++) {
      const a = xs[i], b = xs[i + 1]
      if (b - a < 0.015) continue
      const hs = holes.filter(o => o[0] < b - 0.01 && o[2] > a + 0.01)
      const ys: number[] = [ya, yb]
      for (const o of hs) ys.push(o[1], o[3])
      ys.sort((p, q) => p - q)
      for (let j = 0; j < ys.length - 1; j++) {
        const c = ys[j], dd = ys[j + 1]
        if (dd - c < 0.015) continue
        if (hs.some(o => o[0] <= a + 0.02 && o[2] >= b - 0.02 && o[1] <= c + 0.02 && o[3] >= dd - 0.02)) continue
        box(b - a, dd - c, thick, mat, (a + b) / 2, (c + dd) / 2, zc)
        solid(a, b, z0, z1, c, dd)
      }
    }
  }

  /** 沿 z 的墙（x 处，跨进深 da..db），洞 [d0, y0, d1, y1]。 */
  function wallZ(w: Wing, x: number, da: number, db: number, ya: number, yb: number,
    holes: number[][], mat: any, thick = WALL) {
    const ds: number[] = [da, db]
    for (const o of holes) ds.push(o[0], o[2])
    ds.sort((p, q) => p - q)
    for (let i = 0; i < ds.length - 1; i++) {
      const a = ds[i], b = ds[i + 1]
      if (b - a < 0.015) continue
      const hs = holes.filter(o => o[0] < b - 0.01 && o[2] > a + 0.01)
      const ys: number[] = [ya, yb]
      for (const o of hs) ys.push(o[1], o[3])
      ys.sort((p, q) => p - q)
      for (let j = 0; j < ys.length - 1; j++) {
        const c = ys[j], dd = ys[j + 1]
        if (dd - c < 0.015) continue
        if (hs.some(o => o[0] <= a + 0.02 && o[2] >= b - 0.02 && o[1] <= c + 0.02 && o[3] >= dd - 0.02)) continue
        const za = w.zAt(a), zb = w.zAt(b)
        box(thick, dd - c, Math.abs(zb - za), mat, x, (c + dd) / 2, (za + zb) / 2)
        solid(x - thick / 2, x + thick / 2, Math.min(za, zb), Math.max(za, zb), c, dd)
      }
    }
  }

  /* ------------------------------------------------- 地面 / 广场 / 院碑 --- */

  {
    // 草坪底色
    const gc = cv(256, 256)
    gc.ctx.fillStyle = '#6f815c'
    gc.ctx.fillRect(0, 0, 256, 256)
    for (let i = 0; i < 5200; i++) {
      gc.ctx.fillStyle = Math.random() > 0.5 ? 'rgba(116,138,92,0.45)' : 'rgba(78,92,62,0.4)'
      gc.ctx.fillRect(Math.random() * 256, Math.random() * 256, 2, 3)
    }
    const grassMat = new T.MeshStandardMaterial({ map: tex(gc.c, 8, 8), roughness: 0.96 })
    disposables.push(grassMat)
    plane(240, 210, grassMat, -11, -0.09, 8)
    // 两楼之间的缝：天井 + 广场 + 东端引道，一整条花岗岩
    plane(99, 15.6, tiled(MAT.granite, 99, 15.6, 3.2), -6.5, 0.004, (GAP_Z0 + GAP_Z1) / 2)
    // 红色橡胶步道：从校园路一直铺到西侧天井
    plane(93, 3.2, tiled(MAT.rubber, 93, 3.2, 1.6), -3.5, 0.012, (GAP_Z0 + GAP_Z1) / 2)
    // 步道在门前分岔，接两栋楼的大门
    plane(3.2, GAP_Z1 / 2, tiled(MAT.rubber, 3.2, GAP_Z1 / 2, 1.6), 19.6, 0.012, GAP_Z1 / 4)
    plane(3.2, GAP_Z1 / 2, tiled(MAT.rubber, 3.2, GAP_Z1 / 2, 1.6), 19.6, 0.012, GAP_Z0 + GAP_Z1 * 0.75)
  }

  {
    // 学院名牌（花岗岩卧碑，照片原样）：浅灰石面、金色院徽与院名，
    // 斜躺在广场东端的草坪边，字面朝东对着校园路来的方向。不是黑底铜牌。
    const g = new T.Group()
    g.position.set(37, 0, 11.2)
    g.rotation.y = Math.PI / 2
    root.add(g)
    const add = (w: number, h: number, d: number, mat: any, px: number, py: number, pz: number) => {
      const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat)
      m.position.set(px, py, pz)
      m.castShadow = true
      m.receiveShadow = true
      disposables.push(m.geometry)
      g.add(m)
      return m
    }
    add(4.9, 0.3, 2.6, tiled(MAT.granite, 4.9, 2.6, 3.2), 0, 0.15, 0)
    const slab = add(4.6, 2.35, 0.46, tiled(MAT.stone, 4.6, 2.35, 3.2), 0, 1.38, -0.14)
    slab.rotation.x = -0.3
    // 碑面金字：透明底 + 金色描线（院徽圆环 + 中文院名 + 英文院名）
    // 画布 1024×512：中文 6 字控制在 1006px 内、英文控制在 1010px 内，保证完整显示
    const sg = cv(1024, 512)
    const sctx = sg.ctx
    sctx.clearRect(0, 0, 1024, 512)
    const GOLD = '#c8a32b'
    sctx.strokeStyle = GOLD
    sctx.fillStyle = GOLD
    sctx.lineWidth = 11
    sctx.beginPath(); sctx.arc(128, 256, 122, 0, Math.PI * 2); sctx.stroke()
    sctx.lineWidth = 6
    sctx.beginPath(); sctx.arc(128, 256, 94, 0, Math.PI * 2); sctx.stroke()
    // 校徽里的简化门楼
    sctx.fillRect(88, 290, 80, 36)
    sctx.fillRect(98, 214, 12, 78)
    sctx.fillRect(146, 214, 12, 78)
    sctx.beginPath()
    sctx.moveTo(80, 216); sctx.lineTo(128, 170); sctx.lineTo(176, 216)
    sctx.closePath(); sctx.fill()
    sctx.font = 'bold 124px "SimSun", "STSong", "Songti SC", serif'
    sctx.textAlign = 'left'
    sctx.textBaseline = 'middle'
    sctx.fillText('建筑工程学院', 272, 200)
    sctx.font = 'italic 37px Georgia, "Times New Roman", serif'
    sctx.fillText('School of Civil Engineering and Architecture', 276, 330)
    const T_SIGN = tex(sg.c, 1, 1)
    const signMat = new T.MeshBasicMaterial({ map: T_SIGN, transparent: true, toneMapped: false })
    disposables.push(T_SIGN, signMat)
    const face = new T.Mesh(new T.PlaneGeometry(4.05, 2.02), signMat)
    face.position.set(0, 0.03, 0.235)
    slab.add(face)
    solid(35.1, 38.9, 9.8, 12.6, 0, 2.9)
  }

  {
    // 圆形柱廊（照片原样）：白柱一圈托着红砖鼓座，鼓座上两道白色线脚，
    // 顶部一片放射钢梁的玻璃格栅顶；玻璃连廊从它头顶跨过（见实景照片）
    const PX = 19.6, PZ = (GAP_Z0 + GAP_Z1) / 2, PR = 6.8
    const disk = mesh(new T.CircleGeometry(PR + 1.3, 72), tiled(MAT.granite, 16, 16, 3.2), false, true)
    disk.rotation.x = -Math.PI / 2
    disk.position.set(PX, 0.008, PZ)
    const colGeo = new T.CylinderGeometry(0.26, 0.3, 4.3, 16)
    disposables.push(colGeo)
    const NC = 14
    for (let i = 0; i < NC; i++) {
      const a = (i / NC) * Math.PI * 2
      const cx = PX + Math.cos(a) * PR
      const cz = PZ + Math.sin(a) * PR
      const col = mesh(colGeo, MAT.whiteGloss, true, true)
      col.position.set(cx, 2.15, cz)
      box(0.7, 0.16, 0.7, MAT.whiteGloss, cx, 4.38, cz, false, false)
      solid(cx - 0.3, cx + 0.3, cz - 0.3, cz + 0.3, 0, 4.4)
    }
    // 柱顶环梁
    const ring = mesh(new T.TorusGeometry(PR + 0.16, 0.2, 10, 72), MAT.whiteGloss, true, false)
    ring.rotation.x = Math.PI / 2
    ring.position.set(PX, 4.52, PZ)
    // 红砖鼓座：内外都可见的圆筒墙 + 两道白色水平线脚（砖面贴图按圆周铺满）
    const drumTex = T_FACADE.clone()
    drumTex.wrapS = T.RepeatWrapping
    drumTex.wrapT = T.RepeatWrapping
    drumTex.repeat.set(12, 1.4)
    drumTex.needsUpdate = true
    const drumMat = new T.MeshStandardMaterial({ map: drumTex, roughness: 0.9, metalness: 0, side: T.DoubleSide })
    disposables.push(drumTex, drumMat)
    const drum = mesh(new T.CylinderGeometry(PR + 0.36, PR + 0.36, 2.05, 64, 1, true), drumMat, true, false)
    drum.position.set(PX, 5.62, PZ)
    for (const yy of [5.02, 6.18]) {
      const band = mesh(new T.TorusGeometry(PR + 0.39, 0.055, 8, 72), MAT.whiteGloss, false, false)
      band.rotation.x = Math.PI / 2
      band.position.set(PX, yy, PZ)
    }
    // 玻璃格栅顶：放射钢梁从鼓座顶收向中央环 + 两圈环檩 + 带钢格纹的淡青玻璃面
    const canopyY = 6.75
    const gridCv = cv(128, 128)
    gridCv.ctx.fillStyle = 'rgba(208,230,240,0.30)'
    gridCv.ctx.fillRect(0, 0, 128, 128)
    gridCv.ctx.strokeStyle = 'rgba(232,240,248,0.95)'
    gridCv.ctx.lineWidth = 6
    gridCv.ctx.strokeRect(0, 0, 128, 128)
    const gridTex = tex(gridCv.c, 1, 1)
    gridTex.wrapS = T.RepeatWrapping
    gridTex.wrapT = T.RepeatWrapping
    gridTex.repeat.set(26, 2.4)
    const glassRoofMat = new T.MeshStandardMaterial({
      map: gridTex, color: '#e8f2f6', roughness: 0.12, metalness: 0.05,
      transparent: true, opacity: 0.62, side: T.DoubleSide, depthWrite: false,
    })
    disposables.push(gridTex, glassRoofMat)
    const glassRoof = mesh(new T.RingGeometry(2.3, PR + 0.34, 64, 1), glassRoofMat, false, false)
    glassRoof.rotation.x = -Math.PI / 2
    glassRoof.position.set(PX, canopyY, PZ)
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2
      segment(
        V(PX + Math.cos(a) * 2.3, canopyY, PZ + Math.sin(a) * 2.3),
        V(PX + Math.cos(a) * (PR + 0.3), 4.66, PZ + Math.sin(a) * (PR + 0.3)),
        0.05, MAT.steel2, false)
    }
    for (const rr of [3.7, 5.3]) {
      const purlin = mesh(new T.TorusGeometry(rr, 0.05, 8, 64), MAT.steel2, false, false)
      purlin.rotation.x = Math.PI / 2
      purlin.position.set(PX, canopyY - (rr - 2.3) * 0.12, PZ)
    }
  }

  {
    // 广场入口的砖门柱 + 两株树，把「从东边进来」这件事钉在画面上
    for (const z of [1.9, 13.7]) {
      box(0.9, 2.2, 0.9, tiled(MAT.brick, 0.9, 2.2, 0.6), 34.6, 1.1, z)
      box(1.1, 0.14, 1.1, MAT.whiteGloss, 34.6, 2.27, z)
      solid(34.1, 35.1, z - 0.45, z + 0.45, 0, 2.4)
    }
  }

  {
    // 天井里的两排行道树；抬头能看到五层连廊从头顶跨过去
    const trunkMat = new T.MeshStandardMaterial({ color: '#6a5340', roughness: 0.95 })
    const crownA = new T.MeshStandardMaterial({ color: '#4e7a4a', roughness: 0.9, flatShading: true })
    const crownB = new T.MeshStandardMaterial({ color: '#5e8c50', roughness: 0.9, flatShading: true })
    disposables.push(trunkMat, crownA, crownB)
    const trunkGeo = new T.CylinderGeometry(0.16, 0.22, 2.6, 10)
    const crownGeo = new T.IcosahedronGeometry(1.5, 1)
    disposables.push(trunkGeo, crownGeo)
    const spots: [number, number][] = []
    for (let x = -50; x <= -4; x += 6.5) for (const z of [2.8, 12.8]) spots.push([x, z])
    spots.push([40.5, 2.6], [40.5, 13.0])
    for (const [x, z] of spots) {
      const tr = new T.Mesh(trunkGeo, trunkMat)
      tr.position.set(x, 1.3, z)
      tr.castShadow = true
      root.add(tr)
      for (let i = 0; i < 3; i++) {
        const cr = new T.Mesh(crownGeo, i % 2 ? crownA : crownB)
        cr.position.set(x + (Math.random() - 0.5) * 1.6, 3.3 + i * 1.0, z + (Math.random() - 0.5) * 1.6)
        cr.scale.setScalar(0.8 + Math.random() * 0.3)
        cr.castShadow = true
        root.add(cr)
      }
      solid(x - 0.3, x + 0.3, z - 0.3, z + 0.3, 0, 2.6)
    }
  }

  /* ------------------------------------------------------ 两栋楼主体 --- */

  /** 门脸墙的 z：挤出方向永远 +z，北楼要把挤出体留在 0 的北侧。 */
  const faceWallZ = (w: Wing) => (w.dir === -1 ? w.zAt(WALL) : w.zAt(0))
  const zSpan = (w: Wing, d0: number, d1: number): [number, number] => [
    Math.min(w.zAt(d0), w.zAt(d1)), Math.max(w.zAt(d0), w.zAt(d1)),
  ]
  const boxAt = (w: Wing, xa: number, xb: number, da: number, db: number, ya: number, yb: number, mat: any, tile = 2.4, cast = true) => {
    const [za, zb] = zSpan(w, da, db)
    return box(Math.abs(xb - xa), yb - ya, Math.abs(zb - za), tile > 0 ? tiled(mat, Math.abs(xb - xa), yb - ya, tile) : mat,
      (xa + xb) / 2, (ya + yb) / 2, (za + zb) / 2, cast, true)
  }

  /** 一栋楼的外壳：门脸（含大门与五层连廊口）、背墙、山墙、屋面。 */
  const buildExterior = (w: Wing) => {
    // 门脸三段：西段 → 门厅玻璃（五层连廊口开在门厅上方的砖带上）→ 东段
    const west = wall(BLD_X0 - 0.4, LOBBY_X0, ROOF_Y, [], MAT.facade, 6)
    west.position.set(0, 0, faceWallZ(w))
    const east = wall(LOBBY_X1, BLD_X1 + 0.4, ROOF_Y, [], MAT.facade, 6)
    east.position.set(0, 0, faceWallZ(w))
    // 门厅上方（二层玻璃带以上）补砖：连廊口（PASS）上下左右分四块
    boxAt(w, LOBBY_X0, PASS_X0, 0.02, 0.26, CEIL2, ROOF_Y, MAT.facade, 6, false)
    boxAt(w, PASS_X1, LOBBY_X1, 0.02, 0.26, CEIL2, ROOF_Y, MAT.facade, 6, false)
    boxAt(w, PASS_X0, PASS_X1, 0.02, 0.26, CEIL2, BRIDGE_Y, MAT.facade, 6, false)
    boxAt(w, PASS_X0, PASS_X1, 0.02, 0.26, BRIDGE_Y + 2.8, ROOF_Y, MAT.facade, 6, false)
    // 一层门厅玻璃幕墙 + 二层玻璃带
    box(LOBBY_X1 - LOBBY_X0, 3.66, 0.06, MAT.glass, (LOBBY_X0 + LOBBY_X1) / 2, 1.83, w.zAt(0.13), false, false)
    box(LOBBY_X1 - LOBBY_X0, CEIL2 - 3.72, 0.06, MAT.glass, (LOBBY_X0 + LOBBY_X1) / 2, (3.72 + CEIL2) / 2, w.zAt(0.13), false, false)
    // 大门：门套 + 玻璃门扇 + 黑色过门石
    for (const s of [-1, 1]) {
      box(0.34, 3.3, 0.66, MAT.steel2, 19.6 + s * (2.2 + 0.17), 1.65, w.zAt(0.16), false, false)
      solid(19.6 + s * 2.2 - 0.35, 19.6 + s * 2.2 + 0.35, zSpan(w, 0, 0.32)[0], zSpan(w, 0, 0.32)[1], 0, 3.3)
    }
    box(4.76, 0.34, 0.66, MAT.steel2, 19.6, 3.13, w.zAt(0.16), false, false)
    for (const s of [-1, 1]) {
      const leaf = box(1.04, 2.86, 0.05, MAT.glass, 19.6 + s * 0.52, 1.43, w.zAt(0.1), false, false)
      box(0.05, 2.86, 0.05, MAT.steel2, 19.6 + s * 1.04, 1.43, w.zAt(0.1), false, false)
      disposables.push(leaf.geometry)
    }
    plane(4.4, 0.72, tiled(MAT.blackStone, 4.4, 0.72, 2), 19.6, 0.012, w.zAt(0.36))
    // 门脸上的院名（夜间发光字）
    {
      const np = plane(4.6, 1.15, new T.MeshBasicMaterial({ map: T_NAME, toneMapped: false }),
        19.6, 5.3, w.zAt(-0.02), -Math.PI / 2, w.dir === -1 ? 0 : Math.PI)
      disposables.push(np.material as any)
    }
    // 雨棚：两根细钢柱挑一片白板
    box(15.4, 0.16, 3.4, MAT.whiteGloss, 19.6, 3.66, w.zAt(-1.55), true, false)
    for (const x of [13.0, 26.2]) {
      box(0.14, 3.5, 0.14, MAT.steel2, x, 1.75, w.zAt(-2.8), false, false)
      solid(x - 0.2, x + 0.2, zSpan(w, -3, -2.6)[0], zSpan(w, -3, -2.6)[1], 0, 3.5)
    }
    // 门脸碰撞：门洞两侧、玻璃带、门洞上方；砖带在连廊口处分段
    const [fz0, fz1] = zSpan(w, 0, 0.32)
    solid(BLD_X0 - 0.5, DOOR_X0, fz0, fz1, 0, CEIL2)
    solid(DOOR_X1, LOBBY_X1, fz0, fz1, 0, CEIL2)
    solid(DOOR_X0, DOOR_X1, fz0, fz1, 2.9, CEIL2)
    solid(LOBBY_X0, PASS_X0, fz0, fz1, CEIL2, ROOF_Y)
    solid(PASS_X1, LOBBY_X1, fz0, fz1, CEIL2, ROOF_Y)
    solid(PASS_X0, PASS_X1, fz0, fz1, CEIL2, BRIDGE_Y)
    solid(PASS_X0, PASS_X1, fz0, fz1, BRIDGE_Y + 2.8, ROOF_Y)
    // 背面整片砖墙
    const back = wall(BLD_X0 - 0.4, BLD_X1 + 0.4, ROOF_Y, [], MAT.facade, 6)
    back.position.set(0, 0, w.dir === 1 ? w.zAt(18) : w.zAt(18))
    const [bz0, bz1] = zSpan(w, 17.98, 18.3)
    solid(BLD_X0 - 0.5, BLD_X1 + 0.5, bz0, bz1, 0, ROOF_Y)
    // 山墙
    for (const x of [BLD_X0 - 0.25, BLD_X1 + 0.25]) {
      box(0.5, ROOF_Y, 18.56, tiled(MAT.facade, 18.56, ROOF_Y, 6), x, ROOF_Y / 2, w.zAt(9))
      solid(x - 0.26, x + 0.26, zSpan(w, 0, 18)[0], zSpan(w, 0, 18)[1], 0, ROOF_Y)
    }
    // 屋面 + 女儿墙
    box(90.8, 0.5, 18.6, MAT.concrete, -11, ROOF_Y + 0.25, w.zAt(9), true, false)
    for (const d of [0.25, 17.75]) {
      box(90.8, 0.95, 0.5, tiled(MAT.facade, 90.8, 0.95, 6), -11, ROOF_Y + 0.97, w.zAt(d))
      solid(BLD_X0 - 0.5, BLD_X1 + 0.5, zSpan(w, d - 0.25, d + 0.25)[0], zSpan(w, d - 0.25, d + 0.25)[1], ROOF_Y, ROOF_Y + 1.4)
    }
  }

  /** 走廊墙上的装饰性办公室门（不可开，纯做气氛）。 */
  const doorUnit = (w: Wing, x: number, dWall: number, faceDeeper: boolean, y: number) => {
    const zl = w.zAt(dWall) + (faceDeeper ? 1 : -1) * w.dir * 0.17
    box(1.1, 0.14, 0.06, MAT.doorWood, x, y + 2.44, zl, false, false)
    for (const s of [-1, 1]) box(0.14, 2.42, 0.06, MAT.doorWood, x + s * 0.62, y + 1.21, zl, false, false)
    box(1.0, 2.32, 0.05, MAT.doorWood, x, y + 1.16, zl, false, false)
    box(0.05, 0.05, 0.05, MAT.steel2, x + 0.4, y + 1.05, zl, false, false)
  }

  /** 某栋楼的某一层：楼板、顶棚、走廊、门厅隔墙与门洞、电梯门墙、楼梯、连廊通道。 */
  const buildFloor = (w: Wing, n: number) => {
    const y = floorY(n)
    const c = ceilY(n)
    const lx = w.lift.x

    // ---- 楼板（n ≥ 2）：7 块互补矩形，让开电梯井与楼梯洞 ----
    if (n >= 2) {
      const rects: [number, number, number, number][] = [
        [BLD_X0 - 0.4, lx - 0.83, 0, 18],
        [lx + 0.83, w.fx[0], 0, 18],
        [w.fx[1], BLD_X1 + 0.4, 0, 18],
        [lx - 0.83, lx + 0.83, HALL_D, 18],
        [lx - 0.83, lx + 0.83, 0, 7.5],
        [w.fx[0], w.fx[1], ST_D1, 18],
        [w.fx[0], w.fx[1], 0, ST_D0],
      ]
      for (const [xa, xb, da, db] of rects) {
        if (xb - xa < 0.05) continue
        boxAt(w, xa, xb, da, db, y - 0.3, y, MAT.concrete, 0, false)
      }
    }

    // 游戏化收短六楼南楼西段：606 仍在走廊末端，末端之后不再铺路或放教室门。
    const corridorStart = n===6 && w.id==='S' ? R606.x0 : BLD_X0
    // ---- 行走面贴砖 + 矿棉板吊顶 ----
    const tiles: [number, number, number, number][] = [
      [GALL_X1, 33.6, 0, CORR_D0],             // 门厅 / 电梯厅 / 楼梯间（井道筒底下也有地面）
      [PASS_X0, PASS_X1, 0, CORR_D0],          // 连廊通道
      [corridorStart + 0.1, 33.6, CORR_D0, CORR_D1],  // 走廊
    ]
    for (const [xa, xb, da, db] of tiles) {
      const [za, zb] = zSpan(w, da, db)
      plane(Math.abs(xb - xa), Math.abs(zb - za), tiled(MAT.tile, Math.abs(xb - xa), Math.abs(zb - za), 1.6),
        (xa + xb) / 2, y + 0.004, (za + zb) / 2)
      plane(Math.abs(xb - xa), Math.abs(zb - za), tiled(MAT.ceil, Math.abs(xb - xa), Math.abs(zb - za), 1.8),
        (xa + xb) / 2, c - 0.02, (za + zb) / 2, Math.PI / 2)
    }

    // ---- 走廊 · 靠门厅一侧的墙（带门洞）----
    const holes: number[][] = [[17, y, 22.4, y + 2.5]]  // 门厅 ↔ 走廊
    if (n === 1) holes.push([-2, y, 0.4, y + 2.5])      // 院史陈列厅门
    if (n >= 2) holes.push([w.corrOpen[0], y, w.corrOpen[1], y + 2.5]) // 电梯厅 ↔ 走廊
    if (n === 2) holes.push([w.fx[0] + 0.12, y, w.fx[1] - 0.12, y + 2.7]) // 楼梯平台 → 二层
    if (n === 5) holes.push([PASS_X0, y, PASS_X1, y + 2.7])             // 连廊通道
    if (n === 6 && w.id === 'S') holes.push([R606.doorX - 1.3, y, R606.doorX + 1.3, y + 2.5]) // 606 教室门
    wallX(w, corridorStart, 33.6, 9.45, y, c, holes, MAT.white, 0.3)
    // ---- 走廊 · 背侧的墙 + 办公室门 ----
    wallX(w, corridorStart, 33.6, 12.75, y, c, [], MAT.white, 0.3)
    for (let x = -50.8; x <= 28.4; x += 7.2) {
      if(n===6 && w.id==='S' && x<R606.x1+1)continue
      if (n === 5 && Math.abs(x - 21.2) < 1.0) continue  // 五层让开连廊通道
      doorUnit(w, x, 12.75, false, y)
    }
    for (const x of [-50.8, -43.6, -36.4, -29.2, -22]) {
      if (n === 6 && w.id === 'S' && x<R606.x1+1) continue // 606 的真门在这里
      doorUnit(w, x, 9.45, true, y)
    }
    if (n >= 2) for (const x of [-14.8, -7.6, -0.4]) { if(n===6 && w.id==='S' && x<R606.x1+1)continue; doorUnit(w, x, 9.45, true, y) }

    if(n===6 && w.id==='S') wallZ(w, corridorStart, CORR_D0-.2, CORR_D1+.3, y, c, [], MAT.white) // 走廊尽头，606 是最后一间

    // ---- 门厅两侧隔墙（都留 2 m 宽门洞）----
    wallZ(w, 5.6, 0, HALL_D, y, c, n === 1 ? [[2.0, y, 4.4, y + 2.5]] : [], MAT.white)
    wallZ(w, 12.8, 0, HALL_D, y, c, [[2.0, y, 4.4, y + 2.5]], MAT.white)
    wallZ(w, 26.4, 0, HALL_D, y, c, [[2.2, y, 4.2, y + 2.4]], MAT.white)
    if (n === 1) wallZ(w, GALL_X0, 0, HALL_D, y, c, [], MAT.white) // 陈列厅西端墙
    if (n === 6 && w.id === 'S') { wallZ(w, R606.x0, 0, 9.45, y, c, [], MAT.white); wallZ(w, R606.x1, 0, 9.45, y, c, [], MAT.white) } // 606 教室东隔墙

    // ---- 电梯门墙：横在电梯厅里（井道镶嵌在墙后，没有独立房间）----
    wallX(w, 26.4, 33.6, LIFT_WALL_D, y, c,
      [[lx - 0.86, y, lx + 0.86, y + LINTEL]], MAT.white)

    // ---- 五层连廊通道的两面墙 ----
    if (n === 5) {
      wallZ(w, PASS_X0, 0, HALL_D, BRIDGE_Y, BRIDGE_Y + 2.9, [], MAT.white)
      wallZ(w, PASS_X1, 0, HALL_D, BRIDGE_Y, BRIDGE_Y + 2.9, [], MAT.white)
    }

    // ---- 楼梯（一层起跑 + 二层洞口栏杆）----
    if (n === 1) {
      const fw = w.fx[1] - w.fx[0]
      const cx = (w.fx[0] + w.fx[1]) / 2
      for (let i = 1; i <= 15; i++) {
        const hh = (i * F2) / 15
        const dd = ST_D0 + (i * 6) / 15
        boxAt(w, w.fx[0], w.fx[1], dd - 0.4, dd, 0, hh, MAT.white, 0, false)
        plane(fw, 0.38, tiled(MAT.blackStone, fw, 0.38, 2), cx, hh + 0.006, w.zAt(dd - 0.19))
      }
      // 两侧黑色扶手随坡上升
      for (const s of [-1, 1]) {
        const rx = cx + s * (fw / 2 - 0.05)
        segment(V(rx, 0.9, w.zAt(ST_D0 + 0.2)), V(rx, F2 + 0.98, w.zAt(ST_D1 - 0.2)), 0.028, MAT.steel2)
        segment(V(rx, 0.55, w.zAt(ST_D0 + 0.2)), V(rx, F2 + 0.63, w.zAt(ST_D1 - 0.2)), 0.028, MAT.steel2)
        box(0.06, 1.0, 0.06, MAT.steel2, rx, 0.5, w.zAt(ST_D0 + 0.24), false, false)
      }
    }
    if (n === 2) {
      // 二层洞口周围的栏杆 + 平台前沿
      const fw = w.fx[1] - w.fx[0]
      const cx = (w.fx[0] + w.fx[1]) / 2
      for (const s of [-1, 1]) {
        const rx = cx + s * (fw / 2 - 0.03)
        const [za, zb] = zSpan(w, ST_D0, ST_D1)
        box(0.06, 0.95, Math.abs(zb - za), MAT.steel2, rx, y + 0.475, (za + zb) / 2, false, false)
      }
      const [ea] = zSpan(w, ST_D0, ST_D0)
      box(fw, 0.95, 0.06, MAT.steel2, cx, y + 0.475, ea, false, false)
    }
  }

  for (const w of WINGS) {
    buildExterior(w)
    for (let n = 1; n <= FLOORS; n++) buildFloor(w, n)
  }

  /* ------------------------------------------- 一层室内（按照片装饰）--- */

  const interiorFace = (w: Wing) => (w.dir === -1 ? 0 : Math.PI)

  const buildLobbyDecor = (w: Wing, withExhibits: boolean) => {
    const face = interiorFace(w)
    // 洞石院名墙 + 校徽：门厅西墙（避开通往电梯厅 / 楼梯间的门洞）
    const zz = w.zAt(7.2)
    plane(3.9, 2.7, tiled(MAT.trav, 3.9, 2.7, 1.95), 12.86, 1.35, zz, 0, Math.PI / 2)
    const name = plane(3.2, 0.8, new T.MeshBasicMaterial({ map: T_NAME, toneMapped: false }), 12.88, 1.78, zz, 0, Math.PI / 2)
    const emblem = plane(0.6, 0.6, new T.MeshBasicMaterial({ map: T_CREST, toneMapped: false }), 12.88, 0.68, zz, 0, Math.PI / 2)
    disposables.push(name.material as any, emblem.material as any)
    if (withExhibits) {
      // 铜牌荣誉墙：门厅里、走廊门洞西侧那面墙（只有南楼有）
      const hw = plane(3.9, 2.7, tiled(MAT.honor, 3.9, 2.7, 3.9), 14.9, 1.35, w.zAt(9.28) - w.dir * 0.01, 0, face)
      disposables.push(hw.geometry)
      box(3.9, 0.06, 0.05, MAT.steel2, 14.9, 2.73, w.zAt(9.28) - w.dir * 0.05, false, false)
    }
    // 门口的疏散图 + 灯槽
    box(0.58, 0.86, 0.04, MAT.cream, 16.6, 1.85, w.zAt(0.35), false, false)
    box(0.62, 0.9, 0.03, MAT.redLacquer, 16.6, 1.85, w.zAt(0.33), false, false)
    for (const x of [16, 23.2]) box(1.7, 0.05, 0.32, MAT.glow, x, CEIL1 - 0.06, w.zAt(2.4), false, false)
  }

  const buildGalleryDecor = (w: Wing, withExhibits: boolean) => {
    // 木纹地板 + 吊顶（照片里陈列厅是深棕木地板；地面一直铺到走廊墙下）
    plane(25.6, 9.6, tiled(MAT.wood, 25.6, 9.6, 1.2), -7.2, 0.006, w.zAt(4.8))
    plane(25.6, 9.6, tiled(MAT.ceil, 25.6, 9.6, 1.8), -7.2, CEIL1 - 0.02, w.zAt(4.8), Math.PI / 2)
    if (!withExhibits) return   // 北楼的陈列厅只做空房间
    const face = interiorFace(w)
    // 走廊一侧的洞石校徽墙
    plane(7.2, 2.7, tiled(MAT.trav, 7.2, 2.7, 2.4), -14, 1.35, w.zAt(9.28) - w.dir * 0.01, 0, face)
    const emblem = plane(0.9, 0.9, new T.MeshBasicMaterial({ map: T_CREST, toneMapped: false }),
      -14, 1.45, w.zAt(9.28) - w.dir * 0.02, 0, face)
    disposables.push(emblem.material as any)
    // 西端墙：三幅院史展板（红底摄影展）
    const caseTex = tex(photoCase(), 1, 1)
    const caseMat = new T.MeshBasicMaterial({ map: caseTex, toneMapped: false })
    disposables.push(caseTex, caseMat)
    for (const d of [1.9, 4.65, 7.4]) {
      box(0.08, 1.55, 1.9, MAT.dark, -19.86, 1.5, w.zAt(d), false, false)
      const poster = plane(1.66, 1.36, caseMat, -19.8, 1.5, w.zAt(d), 0, Math.PI / 2)
      disposables.push(poster.geometry)
      box(1.74, 0.05, 0.06, MAT.glow, -19.78, 2.32, w.zAt(d), false, false)
    }
    // 大礼堂缩尺模型：花岗岩台座 + 玻璃罩
    const mx = -7.2
    const mz = w.zAt(3.4)
    box(4.4, 0.8, 3.0, tiled(MAT.granite, 4.4, 3.0, 3.2), mx, 0.4, mz)
    const glassCase = box(4.4, 1.75, 3.0, MAT.glassRail, mx, 1.68, mz, false, false)
    disposables.push(glassCase.geometry)
    // 模型本体：台基 + 礼堂 + 四柱门廊 + 绿琉璃双坡顶
    box(3.4, 0.12, 2.0, MAT.cream, mx, 0.86, mz, false, false)
    box(2.1, 0.62, 1.15, MAT.cream, mx - 0.15, 1.23, mz, false, false)
    for (const s of [-1, 1]) {
      const roof = box(1.35, 0.07, 1.3, MAT.redLacquer, mx - 0.15 + s * 0.62, 1.62, mz, false, false)
      roof.rotation.z = s * 0.52
      box(0.06, 0.07, 1.3, MAT.redLacquer, mx - 0.15 + s * 1.28, 1.45, mz, false, false)
    }
    box(0.56, 0.36, 1.05, MAT.cream, mx + 1.55, 1.06, mz, false, false)
    for (const s of [-1, 1]) {
      box(0.07, 0.56, 0.07, MAT.whiteGloss, mx + 1.55, 0.98, mz + s * 0.42, false, false)
    }
    // 两块红色展签
    for (const x of [-12.4, -1.8]) {
      box(0.05, 1.45, 0.75, MAT.doorWood, x, 0.72, w.zAt(7.9), false, false)
      box(0.06, 1.06, 0.62, MAT.redLacquer, x, 1.55, w.zAt(7.9), false, false)
    }
  }

  for (const w of WINGS) {
    buildLobbyDecor(w, w.id === 'S')
    buildGalleryDecor(w, w.id === 'S')
  }

  /* ------------------------------------ 南楼六层 606 教室（照片布局）--- */

  // 606 的交互门状态：0 关 / 1 开，角度插值；碰撞体在开门时塌掉
  let door606Angle = 0
  let door606Target = 0
  let door606Hinge: any = null
  let door606Col: Collider | null = null
  const y6 = floorY(6)
  const Z606 = WINGS[1].zAt(9.45)          // 606 门所在墙的 z（南楼走廊前墙）
  {
    const w = WINGS[1]
    const y = y6
    const x0 = R606.x0, x1 = R606.x1
    const cxm = (x0 + x1) / 2
    const c = ceilY(6)
    // 浅木色护墙板材质（照片里是米黄竖纹木板墙）
    const panelMat = MAT.wood.clone()
    panelMat.color = new T.Color('#d9c69d')
    panelMat.roughness = 0.55
    disposables.push(panelMat)
    const panel = (pw: number, ph: number, px: number, py: number, pz: number, ry: number) => {
      const m = plane(pw, ph, tiled(panelMat, pw, ph, 1.15), px, py, pz, 0, ry)
      return m
    }
    // 木地板 + 吊顶
    plane(x1 - x0, 9.0, tiled(panelMat, x1 - x0, 9.0, 1.4), cxm, y + 0.008, w.zAt(4.72))
    plane(x1 - x0, 9.0, tiled(MAT.ceil, x1 - x0, 9.0, 1.8), cxm, c - 0.02, w.zAt(4.72), Math.PI / 2)
    // 三面墙的木饰面：门脸内侧（内皮在进深 0.56）、东隔墙内侧、西山墙内侧
    panel(x1 - x0, 3.0, cxm, y + 1.55, w.zAt(0.62), 0)
    panel(9.0, 3.0, x1 - 0.16, y + 1.55, w.zAt(4.72), -Math.PI / 2)
    panel(9.0, 3.0, x0 + 0.17, y + 1.55, w.zAt(4.72), Math.PI / 2)
    // 红色中国结挂饰（门脸墙三只）
    for (const kx of [x0 + 3.5, x0 + 6.5, x0 + 9.5]) {
      box(0.34, 0.5, 0.03, MAT.redLacquer, kx, y + 2.42, w.zAt(0.66), false, false)
      box(0.1, 0.62, 0.03, MAT.redLacquer, kx, y + 2.02, w.zAt(0.66), false, false)
    }
    // 门脸墙上两台壁挂电视（黑框 + 深色屏）
    for (const tx of [x0 + 5, x0 + 9]) {
      box(1.5, 0.9, 0.06, MAT.dark, tx, y + 2.1, w.zAt(0.7), false, false)
      box(1.34, 0.74, 0.02, new T.MeshStandardMaterial({ color: '#101418', roughness: 0.2, emissive: '#1c2a38', emissiveIntensity: 0.5 }),
        tx, y + 2.1, w.zAt(0.735), false, false)
    }
    // 大屏幕：西山墙上，讲台正后方——E 触发小游戏的地方
    const scrMat = new T.MeshStandardMaterial({ color: '#0d1218', roughness: 0.16, metalness: 0.4, emissive: '#16202e', emissiveIntensity: 0.9 })
    disposables.push(scrMat)
    box(0.12, 2.14, 3.6, MAT.dark, x0 + 0.14, y + 2.02, w.zAt(4.72), false, false)
    const screenFace = plane(3.4, 1.94, scrMat, x0 + 0.22, y + 2.02, w.zAt(4.72), 0, Math.PI / 2)
    disposables.push(screenFace.geometry)
    box(0.06, 0.1, 3.6, MAT.glow, x0 + 0.24, y + 3.14, w.zAt(4.72), false, false)
    // 讲台：西端居中，长台 + 立式讲演台 + 一把椅子位（照片里没有桌椅排排坐，只留讲台）
    box(1.0, 1.06, 2.6, tiled(MAT.gray, 1.0, 1.06, 1.2), x0 + 1.3, y + 0.53, w.zAt(4.72))
    box(1.12, 0.05, 2.72, MAT.blackStone, x0 + 1.3, y + 1.09, w.zAt(4.72), false, false)
    box(0.62, 1.18, 0.78, tiled(MAT.gray, 0.62, 1.18, 1.2), x0 + 2.5, y + 0.59, w.zAt(4.0))
    box(0.7, 0.06, 0.86, MAT.blackStone, x0 + 2.5, y + 1.21, w.zAt(4.0), false, false)
    // 讲台侧的白色书写板（东隔墙上）
    box(0.05, 1.32, 2.6, MAT.whiteGloss, x1 - 0.2, y + 1.75, w.zAt(2.6), false, false)
    box(0.07, 0.06, 2.68, MAT.steel2, x1 - 0.2, y + 2.44, w.zAt(2.6), false, false)
    // 吸顶灯 + 室内点光
    for (const lx2 of [x0 + 3, x0 + 6.5, x0 + 10]) box(1.5, 0.05, 0.34, MAT.glow, lx2, c - 0.05, w.zAt(4.72), false, false)
    const roomLight = new T.PointLight('#fff2dc', 1.25, 16, 2)
    roomLight.position.set(x0 + 6, y + 2.6, w.zAt(4.72))
    root.add(roomLight)

    // 交互门：走廊前墙（z=Z606）上的实木门，铰链在西侧，往教室里开
    const hinge = new T.Group()
    hinge.position.set(R606.doorX - 1.3, y, Z606)
    root.add(hinge)
    const leaf = new T.Mesh(new T.BoxGeometry(2.52, 2.4, 0.07), MAT.doorWood)
    leaf.position.set(1.26, 1.2, 0)
    leaf.castShadow = true
    hinge.add(leaf)
    disposables.push(leaf.geometry)
    box(0.05, 0.05, 0.16, MAT.steel2, R606.doorX + 1.08, y + 1.05, Z606, false, false)
    const doorCol: Collider = { x0: R606.doorX - 1.32, x1: R606.doorX + 1.32, z0: Z606 - 0.14, z1: Z606 + 0.14, y0: y, y1: y + 2.4 }
    colliders.push(doorCol)
    door606Hinge = hinge
    door606Col = doorCol
  }

  const gateDisplay=createGateDisplay(R606.x1-3,y6,WINGS[1].zAt(4.8));root.add(gateDisplay.root)
  solid(R606.x1-4.6,R606.x1-1.4,WINGS[1].zAt(4.8)-1.3,WINGS[1].zAt(4.8)+1.3,y6,y6+.88)

  /* ------------------------------------------------------- 电梯系统 --- */
  // 门与轿厢是一个顺序状态机：idle → closing → moving → opening → idle。
  // 关键点：**门完全关严之后轿厢才开始动**，运行过程中门一直是闭合的。
  // 两栋楼各一部电梯：0 号北楼（门朝南），1 号南楼（门朝北）。

  const LIFTS = WINGS.map(w => w.lift)
  type Phase = 'idle' | 'closing' | 'moving' | 'opening'
  type Lift = {
    x: number; y: number; target: number; open: number; floor: number; phase: Phase
    spec: Wing['lift']
    doors: { mesh: any; base: number; dir: number; floor: number }[]
  }
  const lifts: Lift[] = LIFTS.map(s =>
    ({ x: s.x, y: 0, target: 0, open: 0, floor: 1, phase: 'idle' as Phase, spec: s, doors: [] }))
  const displays: ((n: number) => void)[] = []

  const carPanel = new T.MeshStandardMaterial({ color: '#cfd3d6', roughness: 0.38, metalness: 0.55, envMapIntensity: 0.8 })
  const carFrame = new T.MeshStandardMaterial({ color: '#a9adb0', roughness: 0.32, metalness: 0.72, envMapIntensity: 1.0 })
  const carFloorMat = new T.MeshStandardMaterial({ color: '#3b3f42', roughness: 0.24, metalness: 0.5 })
  disposables.push(carPanel, carFrame, carFloorMat)
  const liftShaftH = ROOF_Y + 1.2

  const doorSideZ = (S: Wing['lift']) => (S.dir === 1 ? Math.max(S.z0, S.z1) : Math.min(S.z0, S.z1))
  const backSideZ = (S: Wing['lift']) => (S.dir === 1 ? Math.min(S.z0, S.z1) : Math.max(S.z0, S.z1))

  // 井道：镶嵌在电梯门墙（进深 7.36）后面，两侧薄墙 + 顶盖，
  // 背面就是走廊墙（进深 9.45）——外面看不到任何凸出的井道房间。
  for (let i = 0; i < LIFTS.length; i++) {
    const S = LIFTS[i]
    const w = WINGS[i]
    const [sa, sb] = zSpan(w, 7.52, 9.32)
    for (const sgn of [-1, 1]) {
      box(0.12, liftShaftH, Math.abs(sb - sa), MAT.concrete, S.x + sgn * 0.89, liftShaftH / 2, (sa + sb) / 2, true, true)
      solid(S.x + sgn * 0.83, S.x + sgn * 0.95, Math.min(sa, sb), Math.max(sa, sb), 0, ROOF_Y + 1.4)
    }
    box(1.9, 0.14, Math.abs(sb - sa) + 0.2, MAT.concrete, S.x, liftShaftH + 0.07, (sa + sb) / 2, false, false)
  }

  // 轿厢
  const carGroups: any[] = []
  for (let i = 0; i < LIFTS.length; i++) {
    const S = LIFTS[i]
    const g = new T.Group()
    g.position.set(S.x, 0, 0)
    root.add(g)
    carGroups.push(g)
    const add = (w: number, h: number, d: number, mat: any, px: number, py: number, pz: number) => {
      const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat)
      m.position.set(px, py, pz)
      m.receiveShadow = true
      disposables.push(m.geometry)
      g.add(m)
      return m
    }
    const dep = Math.abs(S.z1 - S.z0)
    const zc = (S.z0 + S.z1) / 2
    const backZ = backSideZ(S)
    add(CAR.half * 2, 0.05, dep, carFloorMat, 0, 0.025, zc)
    add(CAR.half * 2, 0.08, dep, MAT.whiteGloss, 0, CAR.top, zc)
    for (const sgn of [-1, 1]) add(0.05, CAR.top, dep, carPanel, sgn * (CAR.half - 0.025), CAR.top / 2, zc)
    // 后壁：浅色钢板分缝 + 扶手 + 铭牌
    add(CAR.half * 2 - 0.12, 2.0, 0.02, carPanel, 0, 1.24, backZ + S.dir * 0.035)
    for (const sx of [-0.26, 0.26]) add(0.012, 2.0, 0.012, carFrame, sx, 1.24, backZ + S.dir * 0.05)
    add(1.28, 0.045, 0.045, carFrame, 0, 0.98, backZ + S.dir * 0.09)
    for (const sx of [-0.62, 0.62]) add(0.04, 0.04, 0.12, carFrame, sx, 0.98, backZ + S.dir * 0.07)
    add(0.34, 0.24, 0.012, MAT.cream, 0, 1.86, backZ + S.dir * 0.05)
    add(0.86, 0.03, 0.5, MAT.glow, 0, CAR.top - 0.045, zc)
    // 轿厢内选层面板：门边侧壁上（轿厢内侧），发光底板 + 两列圆形楼层按钮
    const panelZc = S.doorZ - S.dir * 0.62
    add(0.03, 0.98, 0.3, carFrame, CAR.half - 0.05, 1.26, panelZc)
    add(0.015, 0.8, 0.2, MAT.glow, CAR.half - 0.062, 1.26, panelZc)
    for (let b = 0; b < 6; b++) {
      const bm2 = new T.MeshStandardMaterial({ color: b === 0 ? '#ffb14a' : '#ded9cf', roughness: 0.35, metalness: 0.5, emissive: b === 0 ? '#663c00' : '#000000', emissiveIntensity: 0.7 })
      disposables.push(bm2)
      const btn2 = new T.Mesh(new T.CylinderGeometry(0.032, 0.032, 0.022, 14), bm2)
      btn2.rotation.z = Math.PI / 2
      btn2.position.set(CAR.half - 0.075, 1.62 - (b % 3) * 0.24, panelZc + (b < 3 ? 0.06 : -0.06))
      g.add(btn2)
      disposables.push(btn2.geometry)
    }
    const carLight = new T.PointLight('#fff4de', 1.35, 3.6, 2)
    carLight.position.set(0, CAR.top - 0.22, zc)
    g.add(carLight)
  }

  // 层门 + 门套 + 楼层显示 + 呼叫面板
  for (let i = 0; i < LIFTS.length; i++) {
    const S = LIFTS[i]
    const L = lifts[i]
    for (let n = 1; n <= FLOORS; n++) {
      const base = floorY(n)
      for (const sgn of [-1, 1]) {
        const leaf = mesh(new T.BoxGeometry(0.78, 2.36, 0.05), MAT.steel, false, false)
        leaf.position.set(S.x + sgn * 0.39, base + 1.19, S.doorZ)
        L.doors.push({ mesh: leaf, base: S.x + sgn * 0.39, dir: sgn, floor: n })
      }
      box(1.9, 0.12, 0.64, carFrame, S.x, base + 2.42, S.doorZ, false, false)
      for (const sgn of [-1, 1]) box(0.09, 2.4, 0.64, carFrame, S.x + sgn * 0.885, base + 1.2, S.doorZ, false, false)
    }
    const { c, ctx } = cv(128, 128)
    const dt2 = new T.CanvasTexture(c)
    const dm = new T.MeshBasicMaterial({ map: dt2 })
    disposables.push(dt2, dm)
    const faceZ = S.doorZ + S.dir * 0.15
    for (let n = 1; n <= FLOORS; n++) {
      const faceN = new T.Mesh(new T.PlaneGeometry(0.36, 0.36), dm)
      faceN.position.set(S.x, floorY(n) + 2.78, faceZ)
      if (S.dir === -1) faceN.rotation.y = Math.PI
      root.add(faceN)
      disposables.push(faceN.geometry)
    }
    let shown = -1
    displays.push((n: number) => {
      if (n === shown) return
      shown = n
      ctx.fillStyle = '#0b0d0f'
      ctx.fillRect(0, 0, 128, 128)
      ctx.fillStyle = '#ff4a2e'
      ctx.font = 'bold 96px Consolas, monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(String(n), 64, 70)
      dt2.needsUpdate = true
    })
    displays[i](1)
    // 呼叫面板：挂在电梯门墙上门套右侧，凸向门厅
    const wg = WINGS[i]
    const panelX = S.x + 1.16
    const panelZ = wg.zAt(LIFT_WALL_D - 0.16)
    box(0.06, 0.3, 0.16, carFrame, panelX, 1.3, panelZ, false, false)
    for (const by of [1.38, 1.22]) {
      const bm = new T.MeshStandardMaterial({ color: '#d9d5cc', roughness: 0.4, metalness: 0.6 })
      disposables.push(bm)
      const btn = mesh(new T.CylinderGeometry(0.035, 0.035, 0.02, 12), bm, false, false)
      btn.rotation.x = Math.PI / 2
      btn.position.set(panelX, by, panelZ + S.dir * 0.05)
    }
  }

  /* ------------------------------------------------------- 玻璃连廊 --- */
  {
    const bW = BRIDGE.x1 - BRIDGE.x0
    const bL = BRIDGE.z1 - BRIDGE.z0
    const bxc = (BRIDGE.x0 + BRIDGE.x1) / 2
    const bzc = (BRIDGE.z0 + BRIDGE.z1) / 2
    const bridgeGlass = new T.MeshStandardMaterial({
      color: '#cfe2e8', roughness: 0.06, metalness: 0.04, transparent: true, opacity: 0.26,
      side: T.DoubleSide, depthWrite: false, envMapIntensity: 1.2,
    })
    disposables.push(bridgeGlass)
    box(bW, 0.34, bL, MAT.concrete, bxc, BRIDGE_Y - 0.17, bzc)
    plane(bW, bL, tiled(MAT.stone, bW, bL, 2), bxc, BRIDGE_Y + 0.004, bzc)
    // 两侧通高玻璃 + 金属竖梃 + 顶棚
    for (const x of [BRIDGE.x0 - 0.05, BRIDGE.x1 + 0.05]) {
      box(0.04, 2.32, bL, bridgeGlass, x, BRIDGE_Y + 1.16, bzc, false, false)
      box(0.07, 0.1, bL, MAT.steel2, x, BRIDGE_Y + 2.36, bzc, false, false)
      solid(x - 0.03, x + 0.03, BRIDGE.z0, BRIDGE.z1, BRIDGE_Y, BRIDGE_Y + 2.4)
    }
    for (let z = BRIDGE.z0 + 1.6; z < BRIDGE.z1; z += 3.2) {
      for (const x of [BRIDGE.x0 - 0.05, BRIDGE.x1 + 0.05]) box(0.08, 2.3, 0.14, MAT.steel2, x, BRIDGE_Y + 1.15, z, false, false)
    }
    for (let z = BRIDGE.z0 + 2.0; z < BRIDGE.z1; z += 4.4) box(bW - 0.5, 0.12, 0.16, MAT.white, bxc, BRIDGE_Y + 2.39, z, false, false)
    box(bW - 0.6, 0.04, bL - 1.2, MAT.glow, bxc, BRIDGE_Y + 2.28, bzc, false, false)
    box(bW + 0.3, 0.16, bL + 0.3, MAT.concrete, bxc, BRIDGE_Y + 2.5, bzc, true, false)
    // 两端门形框（门扇常开，只做框）
    for (const ez of [BRIDGE.z0 + 0.16, BRIDGE.z1 - 0.16]) {
      box(bW, 0.12, 0.14, MAT.steel2, bxc, BRIDGE_Y + 2.36, ez, false, false)
      for (const s of [-1, 1]) box(0.09, 2.36, 0.14, MAT.steel2, bxc + s * 1.55, BRIDGE_Y + 1.2, ez, false, false)
    }
    const bridgeLight = new T.PointLight('#eef5ff', 2.6, 18, 2)
    bridgeLight.position.set(bxc, BRIDGE_Y + 2.1, bzc)
    root.add(bridgeLight)
  }

  /* ------------------------------------------------------------ 光照 --- */

  // 阴天散射为主（照片全是阴天），再补一盏方向光把体量关系拉出来；整体提亮一档
  root.add(new T.HemisphereLight('#eef2f8', '#a09d96', 1.05))
  const sun = new T.DirectionalLight('#fff3dd', 2.7)
  sun.position.set(-30, 44, 46)
  sun.target.position.set(-8, 0, 8)
  sun.castShadow = true
  sun.shadow.mapSize.set(shadowSize, shadowSize)
  sun.shadow.camera.left = -80
  sun.shadow.camera.right = 80
  sun.shadow.camera.top = 50
  sun.shadow.camera.bottom = -50
  sun.shadow.camera.near = 1
  sun.shadow.camera.far = 200
  sun.shadow.bias = -0.0007
  sun.shadow.normalBias = 0.035
  sun.shadow.radius = 1.6
  root.add(sun)
  root.add(sun.target)
  const fill = new T.DirectionalLight('#e3ebf4', 0.7)
  fill.position.set(36, 26, -42)
  root.add(fill)

  for (const w of WINGS) {
    const pl = (color: string, intensity: number, range: number, x: number, y: number, d: number) => {
      const l = new T.PointLight(color, intensity, range, 2)
      l.position.set(x, y, w.zAt(d))
      root.add(l)
    }
    pl('#fff2dc', 1.35, 17, 19.6, 2.7, 2.2)                       // 门厅
    pl('#fff2dc', 1.2, 24, -7.2, 2.55, 4.2)                        // 陈列厅
    pl('#fff0d8', 0.95, 11, w.lift.x, 2.6, 4.2)                    // 电梯厅
    pl('#fff2dc', 1.0, 16, (w.fx[0] + w.fx[1]) / 2, 3.4, 4.2)      // 楼梯间
    pl('#fff2dc', 1.15, 34, 24, 2.55, 11.1)                        // 走廊东段
    pl('#fff2dc', 1.15, 34, -32, 2.55, 11.1)                       // 走廊西段
  }

  // 浮尘：阴天的展厅里飘着的颗粒
  const dustCount = 160
  const dustPos = new Float32Array(dustCount * 3)
  const dustGeo = new T.BufferGeometry()
  dustGeo.setAttribute('position', new T.BufferAttribute(dustPos, 3))
  for (let i = 0; i < dustCount; i++) {
    dustPos[i * 3] = -46 + Math.random() * 88
    dustPos[i * 3 + 1] = 0.2 + Math.random() * 7
    dustPos[i * 3 + 2] = -12 + Math.random() * 40
  }
  const dustMat = new T.PointsMaterial({ color: '#ffffff', size: 0.025, transparent: true, opacity: 0.22, sizeAttenuation: true, depthWrite: false })
  disposables.push(dustGeo, dustMat)
  root.add(new T.Points(dustGeo, dustMat))

  /* ------------------------------------------------------------ 展签 --- */

  const hotspots: Hotspot[] = [
    {
      id: 'sign', title: '学院名牌', kicker: '01 · SIGN', x: 36.6, z: 11.2, y: 0, radius: 4.6,
      lines: ['花岗岩斜碑，金色校徽加中英文院名，立在广场最东端，正对着校园路来的方向。', '「建筑工程学院 / School of Civil Engineering and Architecture」是 2024 年 5 月更名后的院名。'],
    },
    {
      id: 'plaza', title: '入口广场', kicker: '02 · PLAZA', x: 26, z: 7.8, y: 0, radius: 6.5,
      lines: ['广场夹在两栋楼中间的最东侧，红色橡胶步道从校园路一直铺到大门，东端两根砖门柱收边。', '北楼门朝南、南楼门朝北——两扇大门隔着 15.6 m 面对面，格局完全镜像。'],
    },
    {
      id: 'court', title: '两楼间天井', kicker: '03 · COURT', x: -28, z: 7.8, y: 0, radius: 7,
      lines: ['广场往西，两栋楼之间留出一整条天井，两排行道树，抬头能看到五层连廊从头顶跨过去。', '90 m 长的东西向楼身在天井两侧展开。'],
    },
    {
      id: 'lobbyS', title: '南楼门厅', kicker: '04 · LOBBY', x: 19.6, z: 20.2, y: 0, radius: 4.4,
      lines: ['米色 800 大板砖、矿棉板吊顶、白墙与拉丝不锈钢门套，照片里门厅的原样。', '进门左手（东）是电梯厅，右手（西）是楼梯间，门厅背后是一条东西向内走廊。'],
    },
    {
      id: 'honorS', title: '铜牌荣誉墙', kicker: '05 · HONOR', x: 14.9, z: 22.3, y: 0, radius: 2.8,
      lines: ['灰木纹衬底、整面黄铜铭牌，一整张贴图还原几十块奖牌的密度。', '省优质课程、一流专业、先进集体——学院的门面墙。'],
    },
    {
      id: 'galleryS', title: '院史陈列厅', kicker: '06 · GALLERY', x: -7.2, z: 20.2, y: 0, radius: 6.5,
      lines: ['门厅西侧一整条展开面：深棕木纹地板、象牙白洞石墙、红底院史展板。', '走廊一侧开门进来，西端三幅展板讲学院历史，正中是大礼堂缩尺模型。'],
    },
    {
      id: 'modelS', title: '大礼堂缩尺模型', kicker: '07 · MODEL', x: -7.2, z: 16.4, y: 0, radius: 3.6,
      lines: ['花岗岩台座加防尘玻璃罩，里面是河南大学大礼堂的缩尺模型：台基、四柱门廊、绿琉璃双坡顶。', '建筑学系的经典测绘对象。'],
    },
    {
      id: 'lobbyN', title: '北楼门厅', kicker: '12 · LOBBY', x: 19.6, z: -4.8, y: 0, radius: 4.4,
      lines: ['与南楼镜像对称的门厅：电梯厅在东端、楼梯间在西端——正好和南楼左右互换。', '同款大板砖、洞石院名墙；照片里的展陈都在南楼，北楼是干净的空门厅。'],
    },
    {
      id: 'stairS', title: '南楼楼梯', kicker: '09 · STAIR', x: 9.6, z: 17.6, y: 0, radius: 3.4,
      lines: ['进门右手的直跑楼梯：水磨石踏步、黑色花岗岩踏步边、黑色金属扶手，一跑上二层。', '二层楼梯平台直接开向东西向走廊。'],
    },
    {
      id: 'corridorS', title: '南楼走廊', kicker: '10 · CORRIDOR', x: 0, z: 26.5, y: 0, radius: 5,
      lines: ['东西向内走廊，90 m 长，两侧深棕木门是办公室与教室。', '往西走到头是连廊通道（五层），往东经过门厅、楼梯间与电梯厅。'],
    },
    {
      id: 'bridge', title: '玻璃连廊', kicker: '11 · BRIDGE', x: 19.6, z: 7.8, y: BRIDGE_Y, radius: 5,
      lines: ['五层连廊，正对两栋楼的大门轴线，从圆形柱廊的鼓座顶上跨过，南北向连起两栋楼。', '两侧通高玻璃、白色混凝土桥身；从南楼五层门厅出来就是廊口。'],
    },
    {
      id: 'room606', title: '606 教室', kicker: '16 · ROOM 606', x: R606.x0 + 6, z: 21.6, y: floorY(6), radius: 4.5,
      lines: ['南楼六层短走廊尽头的最后一间机房教室：浅木饰面墙、成排的大屏电视、红色中国结。', '讲台前的大屏幕里藏着一个小游戏——按 E 开始，赢了能拿到一块「建筑碎片」。'],
    },
    {
      id: 'stairN', title: '北楼楼梯', kicker: '14 · STAIR', x: 9.6, z: -3.6, y: 0, radius: 3.4,
      lines: ['北楼直跑楼梯，与南楼同款做法。', '一跑上二层，平台开向走廊。'],
    },
    {
      id: 'corridorN', title: '北楼走廊', kicker: '15 · CORRIDOR', x: 0, z: -11.1, y: 0, radius: 5,
      lines: ['北楼的东西向内走廊，与南楼镜像相对。', '五层往西走到头是连廊通道，过玻璃连廊就是南楼。'],
    },
  ]

  /* --------------------------------------------------------- 行走碰撞 --- */

  function carFloorAt(x: number, z: number, feet: number): number | null {
    for (const L of lifts) {
      const S = L.spec
      // 门槛比轿厢多探 0.30 m：门厅地面与轿厢地板之间不能留缝，
      // 否则正常走速每帧 4 cm 正好会落进去，人就卡在门口。
      // 内壁各留 0.16 m：相机站在 0.78 m 边界上时，近裁剪面会把钢板切掉，从轿厢里能看见井道
      const zLo = Math.min(S.z0, S.z1)
      const zHi = Math.max(S.z0, S.z1)
      const near = S.dir > 0 ? z < zHi + 0.30 : z > zLo - 0.30
      const far = S.dir > 0 ? z > zLo + 0.16 : z < zHi - 0.16
      if (Math.abs(x - L.x) < CAR.half - 0.16 && near && far) {
        if (Math.abs(feet - L.y) < 1.3) return L.y
      }
    }
    return null
  }

  function surfaceAt(x: number, z: number, feet: number): number | null {
    const car = carFloorAt(x, z, feet)
    if (car !== null) return car
    const cands: number[] = []
    const sh = stairAt(x, z)
    if (sh !== null) cands.push(sh)
    if (inFloor1(x, z)) cands.push(0)
    // 二至六层：同一套平面，逐层给候选标高
    for (let n = 2; n <= FLOORS; n++) if (inPlate(x, z)) cands.push(floorY(n))
    if (inRect(BRIDGE, x, z)) cands.push(BRIDGE_Y)
    if (!cands.length) return null
    let best: number | null = null
    for (const h of cands) if (h <= feet + 0.62 && (best === null || h > best)) best = h
    if (best === null) return null
    if (best < feet - 1.35) return null
    if (sh !== null && Math.abs(best - sh) < 0.01 && sh > feet + 0.45) return null
    return best
  }

  function blockedAt(x: number, z: number, feet: number) {
    // 梯门：门没开够、或者轿厢不在这一层，都过不去
    for (const L of lifts) {
      if (Math.abs(x - L.x) < 0.9 && Math.abs(z - L.spec.doorZ) < 0.26) {
        if (L.open < 0.35 || Math.abs(feet - L.y) > 0.9) return true
      }
    }
    for (const c of colliders) {
      if (x > c.x0 && x < c.x1 && z > c.z0 && z < c.z1 && feet < c.y1 - 0.02 && feet + 1.7 > c.y0) return true
    }
    return false
  }

  let t = 0
  function tick(dt: number) {
    gateDisplay.tick(dt)
    t += dt
    // 606 交互门：往教室里开，开过 1/5 以后碰撞体塌掉让人通过
    if (door606Hinge && door606Col) {
      door606Angle += (door606Target - door606Angle) * Math.min(1, dt * 3.2)
      if (Math.abs(door606Target - door606Angle) < 0.002) door606Angle = door606Target
      door606Hinge.rotation.y = door606Angle * 1.78
      door606Col.y1 = door606Angle > 0.2 ? door606Col.y0 + 0.01 : y6 + 2.4
    }
    // 电梯：关门 → 走 → 到层 → 开门，运行中门始终闭合
    for (let i = 0; i < lifts.length; i++) {
      const L = lifts[i]
      const dy = L.target - L.y
      if (L.phase === 'closing') {
        L.open = Math.max(0, L.open - dt * 2.6)
        if (L.open <= 0.001) {
          L.open = 0
          L.phase = Math.abs(dy) > 0.004 ? 'moving' : 'opening'
        }
      } else if (L.phase === 'moving') {
        const step = 1.9 * dt
        if (Math.abs(dy) <= step) {
          L.y = L.target
          L.phase = 'opening'
        } else {
          L.y += Math.sign(dy) * step
        }
        // 显示跟着轿厢走：越过分层位置就刷新数字
        const f = Math.min(FLOORS, Math.max(1, Math.round(L.y / FH) + 1))
        if (f !== L.floor) {
          L.floor = f
          displays[i](f)
        }
      } else if (L.phase === 'opening') {
        L.open = Math.min(1, L.open + dt * 2.2)
        if (L.open >= 0.999) {
          L.open = 1
          L.phase = 'idle'
        }
      }
      carGroups[i].position.y = L.y
      const at = Math.min(FLOORS, Math.max(1, Math.round(L.y / FH) + 1))
      for (const d of L.doors) {
        const o = d.floor === at ? L.open : 0
        d.mesh.position.x = d.base + d.dir * o * 0.84
      }
    }
    const pos = dustGeo.attributes.position as any
    if (Math.floor(t * 30) % 2 === 0) return
    for (let i = 0; i < dustCount; i++) {
      let y = pos.array[i * 3 + 1] + dt * 0.06
      if (y > 7) y = 0.2
      pos.array[i * 3 + 1] = y
      pos.array[i * 3] += Math.sin(t * 0.3 + i) * dt * 0.02
    }
    pos.needsUpdate = true
  }

  function dispose() {
    gateDisplay.dispose()
    for (const d of disposables) if (d && typeof d.dispose === 'function') d.dispose()
    root.traverse((o: any) => { if (o.geometry && o.geometry.dispose) o.geometry.dispose() })
  }

  return {
    root,
    gateDisplay,
    hotspots,
    colliders,
    surfaceAt,
    blockedAt,
    tick,
    dispose,
    start: { x: 40, z: 7.8 },
    /** 电梯：0 号北楼、1 号南楼，每栋各一部。 */
    lifts,
    /** 站在电梯厅里或轿厢内都返回梯号，否则 -1。
     *  感应区覆盖整个电梯厅（进深 0..7.3）+ 轿厢内部（门墙后 2.2 m）——
     *  否则人进了轿厢 liftIndex 失效，按 E 选不了楼层。 */
    liftIndex(x: number, z: number, feet: number) {
      for (let i = 0; i < lifts.length; i++) {
        const L = lifts[i]
        const side = (z - L.spec.doorZ) * L.spec.dir
        if (Math.abs(x - L.x) < 3.4 && side > -2.2 && side < LIFT_WALL_D && Math.abs(feet - L.y) < 1.45) return i
      }
      return -1
    },
    /** 人是不是已经站在轿厢里。 */
    insideLift(i: number, x: number, z: number) {
      const L = lifts[i]
      const zLo = Math.min(L.spec.z0, L.spec.z1)
      const zHi = Math.max(L.spec.z0, L.spec.z1)
      return Math.abs(x - L.x) < CAR.half - 0.10 && z < zHi - 0.10 && z > zLo + 0.10
    },
    /** 呼叫 / 选层：把轿厢叫到 floor 层并开门。 */
    sendLift(i: number, floor: number) {
      const L = lifts[i]
      const n = Math.min(FLOORS, Math.max(1, Math.round(floor)))
      L.target = floorY(n)
      // 门先关，关严了 tick 才切到 moving
      L.phase = Math.abs(L.target - L.y) > 0.004 ? 'closing' : 'opening'
    },
    /** 直接把轿厢摆到某层（截图/联调用，不走动画）。 */
    snapLift(i: number, floor: number) {
      const L = lifts[i]
      const n = Math.min(FLOORS, Math.max(1, Math.round(floor)))
      L.y = floorY(n)
      L.target = L.y
      L.floor = n
      L.open = 1
      L.phase = 'idle'
      displays[i](L.floor)
      carGroups[i].position.y = L.y
      for (const d of L.doors) d.mesh.position.x = d.base + d.dir * 0.84
    },
    liftState(i: number) {
      const L = lifts[i]
      return { y: L.y, floor: L.floor, open: L.open, moving: L.phase === 'moving' || L.phase === 'closing' }
    },
    /** 606 教室：交互门（E 开/关）与大屏幕（E 启动小游戏）。 */
    door606Toggle() {
      door606Target = door606Target > 0.5 ? 0 : 1
      return door606Target > 0.5
    },
    door606Open: () => door606Target > 0.5,
    door606Near(x: number, z: number, feet: number) {
      return Math.abs(x - R606.doorX) < 2.0 && Math.abs(z - Z606) < 1.8 && Math.abs(feet - y6) < 1.5
    },
    /** 站在 606 大屏幕前面（讲台前一带）。 */
    screen606Near(x: number, z: number, feet: number) {
      return Math.hypot(x - (R606.x0 + 1.6), z - WINGS[1].zAt(4.72)) < 3.0 && Math.abs(feet - y6) < 1.5
    },
    floorCount: FLOORS,
    liftCount: lifts.length,
    zone(x: number, z: number, feet: number) {
      for (const L of lifts) {
        const zLo = Math.min(L.spec.z0, L.spec.z1)
        const zHi = Math.max(L.spec.z0, L.spec.z1)
        if (Math.abs(x - L.x) < CAR.half && z < zHi && z > zLo) return '电梯轿厢'
      }
      if (inRect(BRIDGE, x, z) && feet > 12) return '玻璃连廊'
      if (z > GAP_Z0 && z < GAP_Z1) {
        if (x > 34) return '入口引道'
        if (x > 0.5) return '入口广场'
        return '两楼间天井'
      }
      for (const w of WINGS) {
        const d = w.depth(z)
        if (d < -0.02 || d > 18.5) continue
        const pre = w.id === 'S' ? '南楼' : '北楼'
        const fl = Math.max(2, Math.min(FLOORS, Math.round(feet / FH) + 1))
        if (feet > 3) {
          if (w.id === 'S' && fl === FLOORS && x >= R606.x0 - 0.4 && x <= R606.x1 && d <= 9.45) return '南楼 · 606 教室'
          if (d <= CORR_D0) {
            if (x >= PASS_X0 && x <= PASS_X1) return `${pre} · 连廊通道`
            if (x >= LOBBY_X0 && x <= LOBBY_X1) return `${pre} · ${fl}F 门厅`
            if (x >= w.elevX[0] && x <= w.elevX[1]) return `${pre} · 电梯厅`
            if (x >= w.stairX[0] && x <= w.stairX[1]) return `${pre} · 楼梯间`
          } else if (d <= HALL_D) {
            if (x >= w.fx[0] && x <= w.fx[1]) return `${pre} · 二层楼梯平台`
          } else if (d <= CORR_D1 + 0.2) {
            return `${pre} · ${fl}F 走廊`
          }
        } else {
          if (x >= GALL_X0 && x <= GALL_X1 && d <= HALL_D) return `${pre} · 院史陈列厅`
          if (d <= CORR_D0) {
            if (x >= LOBBY_X0 && x <= LOBBY_X1) return `${pre} · 一层门厅`
            if (x >= w.elevX[0] && x <= w.elevX[1]) return `${pre} · 电梯厅`
            if (x >= w.stairX[0] && x <= w.stairX[1]) return `${pre} · 楼梯间`
          } else if (d <= HALL_D) {
            if (x >= w.fx[0] && x <= w.fx[1]) return '楼梯 · 上行'
            return `${pre} · 楼梯间`
          }
          if (d <= CORR_D1 + 0.2) return `${pre} · 一层走廊`
        }
      }
      return '入口广场'
    },
  }
}

export type Hall = ReturnType<typeof createHall>
