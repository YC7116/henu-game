/**
 * ⚠️ DEPRECATED —— 本文件已不被任何模块引用，仅作决策留痕保留。
 *
 * 拿到 23 张学院实景照片后，照片证明"圆洞中庭 + 24 级大楼梯 + 17 m 跨中庭连廊"
 * 这套空间并不存在，实际是圆形柱廊 → 玻璃门厅 → 2.8 m 走廊 → 直跑梯 → 玻璃连廊。
 * 现行实现见 `./building.ts`。这里的常量、材质与展签数据都**不要再改**，
 * 改了也不会出现在画面里。
 */

import T from '../three-vendor'
import type { Art } from './art'

/**
 * 建筑工程学院 · 室内参观场景（初版艺术重建，已废弃）
 *
 * The hall is assembled procedurally so the tour can ship without any binary
 * model files: a 34 × 26 m two-storey atrium, a 24-step feature stair inside
 * the void, a sky bridge, a circular portal at the entrance and a glazed
 * vestibule. Dimensions are design values chosen for comfortable walking —
 * NOT a survey of the real building.
 */

export type Collider = { x0: number; x1: number; z0: number; z1: number; y0: number; y1: number }
export type Hotspot = { id: string; title: string; kicker: string; lines: string[]; note?: string; x: number; z: number; y: number; radius: number }

export const F2 = 4.4
export const CEIL = 8.8
export const HX = 17
export const ZS = 14
export const ZN = -12
const VOID = { x0: -8, x1: 8, z0: -6, z1: 6 }
const STAIR = { x0: -6.6, x1: -4.2, z0: -2.6, z1: 5.4 }
const BRIDGE = { x0: -8.6, x1: 8.6, z0: -5.0, z1: -2.6 }
const PORTAL_R = 3.2

const stairHeight = (z: number) => {
  const t = (STAIR.z1 - z) / (STAIR.z1 - STAIR.z0)
  return Math.max(0, Math.min(1, t)) * F2
}

function upperFloor(x: number, z: number) {
  if (Math.abs(x) > 16.6 || z < -11.5 || z > 13.5) return false
  if (x > VOID.x0 && x < VOID.x1 && z > VOID.z0 && z < VOID.z1) return false
  if (Math.abs(x) < 3.7 && z >= VOID.z1) return false
  return true
}
const inBridge = (x: number, z: number) => x > BRIDGE.x0 && x < BRIDGE.x1 && z > BRIDGE.z0 && z < BRIDGE.z1
const inStair = (x: number, z: number) => x > STAIR.x0 - 0.06 && x < STAIR.x1 + 0.06 && z > STAIR.z0 && z < STAIR.z1

export function insidePlan(x: number, z: number) {
  if (z >= 13.45 && z <= 14.3) return Math.abs(x) < 2.9
  const hall = Math.abs(x) < 16.55 && z > -11.45 && z < 13.6
  const vest = Math.abs(x) < 6.6 && z > 13.6 && z < 19.6
  return hall || vest
}

/* ------------------------------------------------------------------------ */

export function createHall(art: Art, shadowSize = 2048) {
  const M = art.mats
  const root = new T.Group()
  const colliders: Collider[] = []
  const animated: { mesh: any; speed: number; axis: 'y' | 'x' }[] = []
  const disposables: any[] = []

  const matCache = new Map<string, any>()
  function tiled(base: any, w: number, h: number, tile = 2.4) {
    const key = `${base.uuid}_${w.toFixed(2)}_${h.toFixed(2)}`
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
    disposables.push(m, m.map, m.normalMap)
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
    const m = mesh(new T.CylinderGeometry(radius, radius, len, 8, 1), mat, cast, false)
    m.position.copy(a).addScaledVector(dir, 0.5)
    m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), dir.normalize())
    return m
  }
  const V = (x: number, y: number, z: number) => new T.Vector3(x, y, z)

  /* ---------------------------------------------------------- floors ----- */

  plane(34, 26, tiled(M.floor, 34, 26, 4), 0, 0, 1).receiveShadow = true
  plane(14, 6.2, tiled(M.floor, 14, 6.2, 4), 0, 0, 17)
  // floor medallion under the atrium void
  const medallion = new T.Mesh(new T.RingGeometry(0.9, 2.6, 64), new T.MeshStandardMaterial({ color: '#b99a63', roughness: 0.42, metalness: 0.6 }))
  medallion.rotation.x = -Math.PI / 2
  medallion.position.set(0, 0.012, 0)
  medallion.receiveShadow = true
  root.add(medallion)
  disposables.push(medallion.geometry, medallion.material)

  /* ------------------------------------------------- level 2 + roof ----- */

  const ring = [
    { w: 34, d: 6, x: 0, z: -9 },
    { w: 13.3, d: 7.5, x: -10.35, z: 9.75 },
    { w: 13.3, d: 7.5, x: 10.35, z: 9.75 },
    { w: 9, d: 12, x: -12.5, z: 0 },
    { w: 9, d: 12, x: 12.5, z: 0 },
  ]
  for (const s of ring) {
    box(s.w, 0.42, s.d, tiled(M.concrete, s.w, s.d, 2), s.x, F2 - 0.21, s.z)
    plane(s.w - 0.04, s.d - 0.04, tiled(M.floor, s.w, s.d, 4), s.x, F2 + 0.006, s.z)
    box(s.w, 0.4, s.d, M.ceiling, s.x, CEIL - 0.2, s.z)
  }
  // slab edge fascia
  for (const [w, d, x, z] of [[34, 0.3, 0, -6.1], [13.3, 0.3, -10.35, 6.05], [13.3, 0.3, 10.35, 6.05], [9, 0.3, -12.5, -6.1], [9, 0.3, 12.5, -6.1]]) {
    box(w, 0.55, d, M.stone, x, F2 - 0.2, z, false, false)
  }
  // recessed warm strip washing the balcony edge
  const stripMat = new T.MeshStandardMaterial({ color: '#ffe7bb', emissive: '#ffcf94', emissiveIntensity: 1.5, roughness: 0.7 })
  disposables.push(stripMat)
  for (const [w, x, z, ry] of [[15.4, 0, -6.0, 0], [8.2, -7.9, 0, Math.PI / 2], [8.2, 7.9, 0, Math.PI / 2]]) {
    const s = mesh(new T.BoxGeometry(w, 0.09, 0.16), stripMat, false, false)
    s.position.set(x, F2 - 0.36, z)
    s.rotation.y = ry
  }

  /* ------------------------------------------------------- skylight ----- */

  const skyGlass = mesh(new T.PlaneGeometry(16, 12), M.glass, false, false)
  skyGlass.rotation.x = -Math.PI / 2
  skyGlass.position.set(0, CEIL + 0.05, 0)
  for (let z = -6; z <= 6; z += 2) box(16.4, 0.62, 0.26, M.steel, 0, CEIL + 0.4, z, true, false)
  for (let x = -8; x <= 8; x += 2) box(0.26, 0.62, 12.4, M.steel, x, CEIL + 0.42, 0, true, false)
  for (const [x, z] of [[-8, -6], [8, -6], [-8, 6], [8, 6]]) box(0.4, 0.5, 0.4, M.steel, x, CEIL + 0.28, z)

  /* ---------------------------------------------------------- walls ----- */
  const brickWall = (w: number, h: number) => tiled(M.brick, w, h, 2.4)

  function longWall(axis: 'x' | 'z', at: number) {
    const len = axis === 'x' ? 34 : 26
    const center = axis === 'x' ? 0 : 1
    const piers = axis === 'x' ? 9 : 7
    const gapBetween = 4
    for (let i = 0; i < piers; i++) {
      const t = -((len / 2) - 1.0) + i * gapBetween
      const px = axis === 'x' ? t : at
      const pz = axis === 'x' ? at : center + t
      box(1.0, CEIL, 0.5, brickWall(1.0, CEIL), px, CEIL / 2, pz)
    }
    for (let i = 0; i < piers - 1; i++) {
      const t = -((len / 2) - 3.0) + i * gapBetween
      const px = axis === 'x' ? t : at
      const pz = axis === 'x' ? at : center + t
      const g = mesh(new T.BoxGeometry(axis === 'x' ? 3.0 : 0.08, 6.3, axis === 'x' ? 0.08 : 3.0), M.glass, false, false)
      g.position.set(px, 3.35, pz)
    }
    // stone plinth + brick band above the glazing
    if (axis === 'x') {
      box(34, 0.55, 0.62, tiled(M.stone, 34, 0.62, 2), 0, 0.27, at)
      box(34, 2.3, 0.56, brickWall(34, 2.3), 0, 7.65, at)
      box(34, 0.16, 0.72, M.stone, 0, 6.44, at)
    } else {
      box(0.62, 0.55, 26, tiled(M.stone, 26, 0.62, 2), at, 0.27, 1)
      box(0.56, 2.3, 26, brickWall(26, 2.3), at, 7.65, 1)
      box(0.72, 0.16, 26, M.stone, at, 6.44, 1)
    }
    // mullions inside each glass bay
    for (let i = 0; i < piers - 1; i++) {
      for (const off of [-0.75, 0.75]) {
        const t = -((len / 2) - 3.0) + i * gapBetween + off
        const px = axis === 'x' ? t : at
        const pz = axis === 'x' ? at : center + t
        box(axis === 'x' ? 0.1 : 0.14, 6.3, axis === 'x' ? 0.14 : 0.1, M.steel, px, 3.35, pz, false, false)
      }
    }
  }
  longWall('x', ZN + 0.25)
  longWall('z', -HX + 0.25)
  longWall('z', HX - 0.25)

  /* ------------------------------------- south wall + circular portal --- */

  const wallShape = new T.Shape()
  wallShape.moveTo(-17, 0)
  wallShape.lineTo(17, 0)
  wallShape.lineTo(17, CEIL)
  wallShape.lineTo(-17, CEIL)
  wallShape.lineTo(-17, 0)
  const hole = new T.Path()
  hole.absarc(0, PORTAL_R, PORTAL_R, 0, Math.PI * 2, true)
  wallShape.holes.push(hole)
  const portalGeo = new T.ExtrudeGeometry(wallShape, { depth: 0.55, bevelEnabled: false, curveSegments: 48 })
  const portalMat = tiled(M.brick, 2.4, 2.4, 2.4)
  portalMat.map.repeat.set(1 / 2.4, 1 / 2.4)
  if (portalMat.normalMap) portalMat.normalMap.repeat.set(1 / 2.4, 1 / 2.4)
  const portalWall = mesh(portalGeo, portalMat)
  portalWall.position.set(0, 0, ZS - 0.55)
  const ringMesh = mesh(new T.TorusGeometry(PORTAL_R, 0.13, 20, 112), M.brass)
  ringMesh.position.set(0, PORTAL_R, ZS - 0.56)
  for (const zz of [ZS - 0.562, ZS - 0.012]) {
    const frame = mesh(new T.RingGeometry(PORTAL_R + 0.13, PORTAL_R + 0.52, 80), M.stone)
    frame.position.set(0, PORTAL_R, zz)
  }
  box(2 * (PORTAL_R + 0.6), 0.06, 0.62, M.stone, 0, 0.03, ZS - 0.28, false, true)

  const sign = mesh(new T.PlaneGeometry(5.8, 1.45), new T.MeshBasicMaterial({ map: art.signageTex, toneMapped: false }), false, false)
  sign.position.set(0, 7.4, ZS - 0.58)
  sign.rotation.y = Math.PI

  /* ------------------------------------------------------- vestibule ---- */

  for (const [w, d, x, z] of [[14, 0.1, 0, 19.9], [0.1, 6, -6.9, 17], [0.1, 6, 6.9, 17]]) {
    const g = mesh(new T.BoxGeometry(w, CEIL, d), M.glass, false, false)
    g.position.set(x, CEIL / 2, z)
  }
  for (let i = -6; i <= 6; i += 2) {
    box(0.12, CEIL, 0.12, M.steel, i, CEIL / 2, 19.9, false, false)
  }
  for (let i = 0; i <= 6; i += 2) {
    box(0.12, CEIL, 0.12, M.steel, -6.9, CEIL / 2, 14 + i, false, false)
    box(0.12, CEIL, 0.12, M.steel, 6.9, CEIL / 2, 14 + i, false, false)
  }
  const vestRoof = mesh(new T.BoxGeometry(14.2, 0.12, 6.2), M.glass, false, false)
  vestRoof.position.set(0, CEIL + 0.18, 17)
  for (let i = -6; i <= 6; i += 2) box(0.2, 0.42, 6.2, M.steel, i, CEIL - 0.05, 17, true, false)
  for (let i = 0; i <= 6; i += 2) box(14.2, 0.36, 0.18, M.steel, 0, CEIL - 0.02, 14 + i, true, false)
  // entrance canopy shadow line
  box(14.6, 0.18, 0.5, M.stone, 0, 2.9, 19.85, false, false)
  // reception bench in the vestibule
  box(5.2, 0.45, 0.9, tiled(M.wood, 5.2, 0.9, 2), -3.2, 0.23, 17.6)
  colliders.push({ x0: -5.9, x1: -0.5, z0: 17.1, z1: 18.1, y0: 0, y1: 0.5 })

  /* --------------------------------------------------------- columns ---- */

  const columnSpots: [number, number][] = [[-8.9, -6.9], [8.9, -6.9], [-8.9, 6.9], [8.9, 6.9], [-8.9, 0], [8.9, 0]]
  for (const [x, z] of columnSpots) {
    box(0.86, 1.45, 0.86, brickWall(1.7, 1.45), x, 0.72, z)
    box(1.0, 0.14, 1.0, M.stone, x, 1.5, z)
    box(0.72, CEIL - 1.6, 0.72, tiled(M.plaster, 0.72, 7, 2), x, 1.6 + (CEIL - 1.6) / 2, z)
    box(0.92, 0.12, 0.92, M.brass, x, CEIL - 1.55, z, false, false)
    colliders.push({ x0: x - 0.5, x1: x + 0.5, z0: z - 0.5, z1: z + 0.5, y0: 0, y1: CEIL })
  }

  /* ------------------------------------------------------- stag ---- */

  const steps = 24
  const rise = F2 / steps
  const run = (STAIR.z1 - STAIR.z0) / steps
  for (let i = 0; i < steps; i++) {
    const h = (i + 1) * rise
    const z = STAIR.z1 - (i + 0.5) * run
    box(2.4, h, run + 0.01, tiled(M.concrete, 2.4, 1, 2), (STAIR.x0 + STAIR.x1) / 2, h / 2, z)
    const tread = box(2.42, 0.06, run * 0.94, tiled(M.wood, 2.4, run, 1.2), (STAIR.x0 + STAIR.x1) / 2, h + 0.02, z, true, true)
    tread.receiveShadow = true
  }
  // stair balustrade
  for (const sx of [STAIR.x0 - 0.04, STAIR.x1 + 0.04]) {
    const a = V(sx, 0.0 + 1.05, STAIR.z1 + 0.1)
    const b = V(sx, F2 + 1.05, STAIR.z0 - 0.1)
    segment(a, b, 0.045, M.brass)
    for (let i = 0; i <= 8; i++) {
      const t = i / 8
      const z = STAIR.z1 + 0.1 + (STAIR.z0 - 0.1 - (STAIR.z1 + 0.1)) * t
      const y = 1.05 + (F2) * t
      segment(V(sx, stairHeightAt(z) + 0.02, z), V(sx, y, z), 0.028, M.steel, false)
    }
    const glass = mesh(new T.BoxGeometry(0.03, 1.0, Math.hypot(STAIR.z1 - STAIR.z0, F2)), M.glassRail, false, false)
    glass.position.set(sx, F2 / 2 + 0.55, (STAIR.z0 + STAIR.z1) / 2)
    glass.rotation.x = Math.atan2(F2, STAIR.z1 - STAIR.z0)
  }
  function stairHeightAt(z: number) {
    return stairHeight(z)
  }

  /* ---------------------------------------------------------- bridge ---- */

  const deck = box(BRIDGE.x1 - BRIDGE.x0, 0.34, BRIDGE.z1 - BRIDGE.z0, tiled(M.concrete, 17.2, 2.4, 2), 0, F2 - 0.17, (BRIDGE.z0 + BRIDGE.z1) / 2)
  deck.receiveShadow = true
  const deckTop = plane(BRIDGE.x1 - BRIDGE.x0, BRIDGE.z1 - BRIDGE.z0, tiled(M.wood, 17, 2.4, 1.2), 0, F2 + 0.005, (BRIDGE.z0 + BRIDGE.z1) / 2)
  deckTop.receiveShadow = true
  for (const bz of [BRIDGE.z0 - 0.05, BRIDGE.z1 + 0.05]) {
    // the south balustrade leaves a gap where the feature stair arrives
    const south = bz > (BRIDGE.z0 + BRIDGE.z1) / 2
    const gaps = south ? [[BRIDGE.x0, STAIR.x0 - 0.1], [STAIR.x1 + 0.1, BRIDGE.x1]] : [[BRIDGE.x0, BRIDGE.x1]]
    for (const [gx0, gx1] of gaps) {
      const len = gx1 - gx0
      const cx = (gx0 + gx1) / 2
      const gr = mesh(new T.BoxGeometry(len, 0.95, 0.03), M.glassRail, false, false)
      gr.position.set(cx, F2 + 0.5, bz)
      box(len, 0.09, 0.13, M.wood, cx, F2 + 1.0, bz, false, false)
      for (let x = gx0 + 0.2; x <= gx1 - 0.2; x += 2.1) box(0.07, 0.95, 0.07, M.steel, x, F2 + 0.48, bz, false, false)
      colliders.push({ x0: gx0, x1: gx1, z0: bz - 0.16, z1: bz + 0.16, y0: F2, y1: F2 + 1.2 })
    }
  }
  for (let x = -8; x <= 8; x += 4) {
    for (const hz of [BRIDGE.z0 + 0.25, BRIDGE.z1 - 0.25]) segment(V(x, CEIL - 0.05, hz), V(x, F2 + 0.4, hz), 0.03, M.steel, false)
  }
  // strip lighting under the bridge
  const under = mesh(new T.BoxGeometry(16.6, 0.06, 0.12), stripMat, false, false)
  under.position.set(0, F2 - 0.4, -3.8)

  /* ------------------------------------------------- balcony railings --- */

  function railing(x0: number, z0: number, x1: number, z1: number) {
    const len = Math.hypot(x1 - x0, z1 - z0)
    const cx = (x0 + x1) / 2
    const cz = (z0 + z1) / 2
    const horizontal = Math.abs(x1 - x0) > Math.abs(z1 - z0)
    const g = mesh(new T.BoxGeometry(horizontal ? len : 0.03, 0.92, horizontal ? 0.03 : len), M.glassRail, false, false)
    g.position.set(cx, F2 + 0.48, cz)
    const cap = mesh(new T.BoxGeometry(horizontal ? len : 0.12, 0.08, horizontal ? 0.12 : len), M.wood, false, false)
    cap.position.set(cx, F2 + 0.97, cz)
    const posts = Math.max(2, Math.round(len / 1.6))
    for (let i = 0; i <= posts; i++) {
      const t = i / posts
      const px = x0 + (x1 - x0) * t
      const pz = z0 + (z1 - z0) * t
      box(0.06, 0.95, 0.06, M.steel, px, F2 + 0.47, pz, false, false)
    }
    colliders.push({
      x0: Math.min(x0, x1) - 0.14, x1: Math.max(x0, x1) + 0.14,
      z0: Math.min(z0, z1) - 0.14, z1: Math.max(z0, z1) + 0.14,
      y0: F2, y1: F2 + 1.2,
    })
  }
  railing(VOID.x0, VOID.z0, VOID.x1, VOID.z0)
  railing(VOID.x0, VOID.z1, -3.7, VOID.z1)
  railing(3.7, VOID.z1, VOID.x1, VOID.z1)
  railing(VOID.x0, VOID.z0, VOID.x0, BRIDGE.z0)
  railing(VOID.x0, BRIDGE.z1, VOID.x0, VOID.z1)
  railing(VOID.x1, VOID.z0, VOID.x1, BRIDGE.z0)
  railing(VOID.x1, BRIDGE.z1, VOID.x1, VOID.z1)
  railing(-3.7, VOID.z1, -3.7, 13.4)
  railing(3.7, VOID.z1, 3.7, 13.4)

  /* ----------------------------------------------------- exhibitions ---- */

  function panelFrame(tex: any, x: number, y: number, z: number, ry: number, w = 1.9, h = 2.7) {
    const g = new T.Group()
    const glassPanel = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ map: tex, toneMapped: false }))
    g.add(glassPanel)
    const frame = new T.Mesh(new T.BoxGeometry(w + 0.16, h + 0.16, 0.08), M.dark)
    frame.position.z = -0.05
    g.add(frame)
    g.position.set(x, y, z)
    g.rotation.y = ry
    root.add(g)
    disposables.push(glassPanel.geometry, glassPanel.material, frame.geometry)
    g.traverse((o: any) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false } })
    return g
  }
  panelFrame(art.panels[0], -5.2, 2.1, ZN + 0.98, 0)
  panelFrame(art.panels[1], 0, 2.1, ZN + 0.98, 0)
  panelFrame(art.panels[2], 5.2, 2.1, ZN + 0.98, 0)
  panelFrame(art.panels[3], 16.05, 2.1, 5.5, -Math.PI / 2)
  // a long display wall behind the north panels
  box(18, 3.4, 0.18, tiled(M.wood, 18, 3.4, 2), 0, 1.7, ZN + 0.8, true, true)
  // 展墙顶部的暗藏灯槽：木饰面收口 + 一条暖光灯带（自发光，不新增光源）
  // 墙体正面在 ZN+0.89 附近，灯槽要再往室内推一点才看得见。
  box(18, 0.2, 0.05, M.dark, 0, 3.16, ZN + 0.94, false, false)
  box(17.6, 0.045, 0.05, M.glowWarm, 0, 3.08, ZN + 0.965, false, false)
  box(18, 0.2, 0.13, tiled(M.wood, 18, 0.2, 3), 0, 3.34, ZN + 0.9, false, false)

  /* --------------------------------------- 实验室设备展示柜（示意） ---- */
  // 依据学院公开简介：实验空间分布在金明校区十六组团 A、B、D 座，
  // 设有土建基础、岩土工程、建筑技术、结构工程等实验室，
  // 拥有三向六自由度振动台等设备。柜内设备为示意陈列，不是实测布置。
  function glassPane(w: number, h: number, x: number, y: number, z: number, ry = 0) {
    const g = mesh(new T.PlaneGeometry(w, h), M.glass, false, false)
    g.position.set(x, y, z)
    g.rotation.y = ry
  }
  function showcase(cx: number) {
    // 柜体贴在 18 米木展墙两端（x=±7.7），背后是实墙，不会透出室外。
    const cz = -10.69
    const top = 0.94
    // 基座：深色踢脚 + 混凝土柜身 + 石材台面，别做成一块大水泥墩
    box(2.02, 0.09, 0.87, M.dark, cx, 0.045, cz, false, true)
    box(1.96, 0.76, 0.83, tiled(M.concrete, 1.96, 0.76, 1.4), cx, 0.47, cz)
    box(2.06, 0.07, 0.9, tiled(M.stone, 2.06, 0.9, 1.2), cx, 0.885, cz, false, true)
    // 只做正面一块玻璃 + 钢框，避免多层透明面互相叠加成一块灰板
    glassPane(1.92, 1.4, cx, top + 0.76, cz + 0.44)
    for (const dx of [-0.98, 0.98]) box(0.06, 1.46, 0.88, M.steel, cx + dx, top + 0.74, cz, false, false)
    box(2.02, 0.06, 0.88, M.steel, cx, top + 1.47, cz, false, false)
    // 柜内浅色背板 + 顶部灯带，让设备剪影看得清
    box(1.9, 1.36, 0.02, M.ceiling, cx, top + 0.76, cz - 0.4, false, false)
    box(1.72, 0.05, 0.05, M.glowWarm, cx, top + 1.4, cz + 0.3, false, false)
    // 说明铜牌挪到基座正面，不要挡住展品
    box(1.44, 0.13, 0.02, M.brass, cx, 0.55, cz + 0.43, false, false)
    box(1.5, 0.02, 0.03, M.dark, cx, 0.47, cz + 0.435, false, false)
    colliders.push({ x0: cx - 1.04, x1: cx + 1.04, z0: cz - 0.46, z1: cz + 0.46, y0: 0, y1: 2.45 })
    return { x: cx, z: cz, floor: top + 0.07 }
  }

  // 01 · 三向六自由度振动台
  {
    const c = showcase(-7.7)
    const f = c.floor
    // 台面抬到 0.22 m，下面六个作动器才看得见
    for (const [dx, dz] of [[-0.5, -0.28], [0.5, -0.28], [-0.5, 0.28], [0.5, 0.28], [-0.5, 0], [0.5, 0]]) {
      segment(V(c.x + dx, f, c.z + dz * 0.75), V(c.x + dx * 0.8, f + 0.26, c.z + dz * 0.64), 0.045, M.steel, false)
    }
    box(1.34, 0.1, 0.82, M.steel, c.x, f + 0.26, c.z)
    // 两层缩尺框架试件
    box(0.62, 0.05, 0.42, M.concrete, c.x, f + 0.34, c.z, false, true)
    for (const dx of [-0.22, 0.22]) for (const dz of [-0.13, 0.13]) box(0.045, 0.5, 0.045, M.steel, c.x + dx, f + 0.61, c.z + dz, false, false)
    box(0.66, 0.05, 0.42, M.concrete, c.x, f + 0.88, c.z, false, true)
    box(0.26, 0.18, 0.22, M.brass, c.x, f + 0.7, c.z, false, false)
  }

  // 02 · 压力试验机（四柱式，含液压缸、上下压板与数显控制柜）
  {
    const c = showcase(7.7)
    const f = c.floor
    // 底座
    box(0.86, 0.12, 0.5, M.dark, c.x, f + 0.06, c.z, false, true)
    box(0.72, 0.06, 0.44, M.steel, c.x, f + 0.14, c.z)
    // 四根立柱（细一点，别像画框）
    for (const dx of [-0.3, 0.3]) for (const dz of [-0.16, 0.16]) box(0.055, 0.82, 0.055, M.steel, c.x + dx, f + 0.57, c.z + dz, false, false)
    // 上横梁 + 液压缸 + 上压板
    box(0.72, 0.1, 0.42, M.steel, c.x, f + 1.0, c.z)
    box(0.2, 0.2, 0.2, M.steel, c.x, f + 0.86, c.z, false, false)
    box(0.03, 0.14, 0.03, M.brass, c.x, f + 0.7, c.z, false, false)
    box(0.26, 0.035, 0.26, M.steel, c.x, f + 0.62, c.z, false, false)
    // 试块（混凝土立方体）+ 下压板
    box(0.15, 0.15, 0.15, M.concrete, c.x, f + 0.25, c.z)
    box(0.26, 0.035, 0.26, M.steel, c.x, f + 0.16, c.z, false, false)
    // 侧边控制柜：柜体 + 数显屏 + 手轮
    box(0.3, 0.62, 0.26, M.print, c.x + 0.56, f + 0.31, c.z - 0.02)
    box(0.2, 0.14, 0.015, M.glowWarm, c.x + 0.56, f + 0.5, c.z + 0.12, false, false)
    box(0.02, 0.02, 0.02, M.brass, c.x + 0.56, f + 0.3, c.z + 0.12, false, false)
    box(0.1, 0.1, 0.03, M.steel, c.x + 0.56, f + 0.18, c.z + 0.12, false, false)
  }

  /* ------------------------------------------------------- furniture ---- */

  // reception desk
  const desk = box(4.4, 1.05, 1.0, tiled(M.wood, 4.4, 1.0, 1.4), -6.0, 0.52, 11.6)
  box(4.7, 0.1, 1.25, M.stone, -6.0, 1.1, 11.6)
  colliders.push({ x0: -8.3, x1: -3.7, z0: 11.05, z1: 12.15, y0: 0, y1: 1.2 })
  // bench + planters
  for (const [x, z] of [[12.6, 9.4], [12.6, 2.4]]) {
    box(2.6, 0.12, 0.8, tiled(M.wood, 2.6, 0.8, 1.4), x, 0.46, z)
    box(2.4, 0.4, 0.7, M.steel, x, 0.22, z)
    colliders.push({ x0: x - 1.4, x1: x + 1.4, z0: z - 0.5, z1: z + 0.5, y0: 0, y1: 0.6 })
  }
  function planter(x: number, z: number, r = 0.85) {
    const pot = mesh(new T.CylinderGeometry(r, r * 0.82, 0.62, 20), M.stone)
    pot.position.set(x, 0.31, z)
    const soil = mesh(new T.CylinderGeometry(r * 0.92, r * 0.92, 0.06, 20), M.soil, false, false)
    soil.position.set(x, 0.62, z)
    for (let i = 0; i < 5; i++) {
      const leaf = mesh(new T.IcosahedronGeometry(0.42 + Math.random() * 0.3, 0), i % 2 ? M.leaf : M.leafLight)
      leaf.position.set(x + (Math.random() - 0.5) * 0.9, 1.0 + Math.random() * 0.75, z + (Math.random() - 0.5) * 0.9)
      leaf.rotation.set(Math.random(), Math.random(), Math.random())
    }
    colliders.push({ x0: x - r, x1: x + r, z0: z - r, z1: z + r, y0: 0, y1: 1.4 })
  }
  planter(-12.4, 9.6)
  planter(9.2, 11.2, 1.0)
  planter(-13.6, -4.2)
  planter(13.8, -8.6, 0.95)

  /* --------------------------------------------- structural scale model -- */

  const plinthTop = 0.55
  box(3.6, plinthTop, 3.6, tiled(M.stone, 3.6, 3.6, 2), 0, plinthTop / 2, 0)
  colliders.push({ x0: -1.85, x1: 1.85, z0: -1.85, z1: 1.85, y0: 0, y1: 1.0 })
  const modelRoot = new T.Group()
  modelRoot.position.set(0, plinthTop + 0.02, 0)
  root.add(modelRoot)
  const modelMat = new T.MeshStandardMaterial({ color: '#8e9296', roughness: 0.34, metalness: 0.9, envMapIntensity: 0.9 })
  disposables.push(modelMat)
  const H3 = 2.9
  const plan = [[-1.3, -1.1], [1.3, -1.1], [1.3, 1.1], [-1.3, 1.1]]
  for (const [px, pz] of plan) {
    const m = new T.Mesh(new T.BoxGeometry(0.1, H3, 0.1), modelMat)
    m.position.set(px, H3 / 2, pz)
    m.castShadow = true
    modelRoot.add(m)
  }
  const plateMat = new T.MeshStandardMaterial({ color: '#d9d2c2', roughness: 0.6, metalness: 0.05 })
  disposables.push(plateMat)
  for (let level = 1; level <= 3; level++) {
    const y = (H3 / 3) * level
    const slab = new T.Mesh(new T.BoxGeometry(2.62, 0.05, 2.22), plateMat)
    slab.position.y = y - 0.07
    slab.castShadow = true
    slab.receiveShadow = true
    modelRoot.add(slab)
    for (let i = 0; i < plan.length; i++) {
      const a = plan[i]
      const b = plan[(i + 1) % plan.length]
      const seg = new T.Mesh(new T.BoxGeometry(Math.hypot(b[0] - a[0], b[1] - a[1]), 0.07, 0.07), modelMat)
      seg.position.set((a[0] + b[0]) / 2, y, (a[1] + b[1]) / 2)
      seg.rotation.y = -Math.atan2(b[1] - a[1], b[0] - a[0])
      seg.castShadow = true
      modelRoot.add(seg)
    }
  }
  for (let i = 0; i < 4; i++) {
    const a = plan[i]
    const b = plan[(i + 1) % 4]
    const seg = new T.Mesh(new T.CylinderGeometry(0.02, 0.02, Math.hypot(b[0] - a[0], H3, b[1] - a[1]), 6), modelMat)
    seg.position.set((a[0] + b[0]) / 2, H3 / 2, (a[1] + b[1]) / 2)
    const dir = new T.Vector3(b[0] - a[0], H3, b[1] - a[1]).normalize()
    seg.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), dir)
    seg.castShadow = true
    modelRoot.add(seg)
  }
  const plate = new T.Mesh(new T.BoxGeometry(2.7, 0.02, 2.3), new T.MeshStandardMaterial({ color: '#efe9dc', roughness: 0.7 }))
  plate.position.y = 0.01
  plate.receiveShadow = true
  modelRoot.add(plate)

  /* --------------------------------------------------- hologram model --- */

  const holoRoot = new T.Group()
  holoRoot.position.set(11.4, 0, 6.4)
  root.add(holoRoot)
  box(2.4, 0.42, 2.4, tiled(M.stone, 2.4, 2.4, 2), 11.4, 0.21, 6.4)
  colliders.push({ x0: 10.2, x1: 12.6, z0: 5.2, z1: 7.6, y0: 0, y1: 1.2 })
  const holoBuilding = new T.Group()
  holoBuilding.position.y = 0.55
  holoRoot.add(holoBuilding)
  const holoMat = new T.LineBasicMaterial({ color: '#7fd4ff', transparent: true, opacity: 0.85 })
  disposables.push(holoMat)
  const blocks: [number, number, number, number, number, number][] = [
    [-0.55, 0.45, -0.4, 1.0, 0.9, 0.9],
    [0.5, 0.7, 0.35, 0.9, 1.4, 0.8],
    [-0.2, 1.25, 0.5, 0.7, 0.7, 0.6],
  ]
  for (const [x, y, z, w, h, d] of blocks) {
    const geo = new T.BoxGeometry(w, h, d)
    const edges = new T.EdgesGeometry(geo)
    const line = new T.LineSegments(edges, holoMat)
    line.position.set(x, y, z)
    holoBuilding.add(line)
    const fill = new T.Mesh(geo, M.blueprint)
    fill.position.set(x, y, z)
    holoBuilding.add(fill)
    disposables.push(geo, edges)
  }
  animated.push({ mesh: holoBuilding, speed: 0.32, axis: 'y' })
  const holoLight = new T.PointLight('#59b8ff', 6, 9, 2)
  holoLight.position.set(11.4, 2.0, 6.4)
  root.add(holoLight)

  /* ----------------------------------------------------------- lights --- */

  const hemi = new T.HemisphereLight('#e8e2d6', '#6f5638', 0.32)
  root.add(hemi)

  const sun = new T.DirectionalLight('#ffe8bd', 3.8)
  sun.position.set(7, 38, 15)
  sun.target.position.set(0, 0, -1)
  sun.castShadow = true
  sun.shadow.mapSize.set(shadowSize, shadowSize)
  sun.shadow.camera.left = -24
  sun.shadow.camera.right = 24
  sun.shadow.camera.top = 24
  sun.shadow.camera.bottom = -24
  sun.shadow.camera.near = 1
  sun.shadow.camera.far = 95
  sun.shadow.bias = -0.0006
  sun.shadow.normalBias = 0.02
  sun.shadow.radius = 0.6
  root.add(sun)
  root.add(sun.target)

  const fill = new T.DirectionalLight('#cdd6e2', 0.18)
  fill.position.set(-18, 12, -16)
  root.add(fill)

  const spot = new T.SpotLight('#ffdda8', 26, 18, 0.46, 0.85, 1.9)
  spot.position.set(0, 8.4, 0)
  spot.target.position.set(0, 0.6, 0)
  root.add(spot)
  root.add(spot.target)

  const pendantSpots: [number, number][] = [[-5.6, 8.6], [5.6, 8.6], [-11.5, -3.2]]
  for (const [x, z] of pendantSpots) {
    const stem = mesh(new T.CylinderGeometry(0.02, 0.02, 1.5, 6), M.steel, false, false)
    stem.position.set(x, F2 - 0.75, z)
    const shade = mesh(new T.CylinderGeometry(0.42, 0.5, 0.34, 18, 1, true), M.wood)
    shade.position.set(x, F2 - 1.55, z)
    const bulb = mesh(new T.SphereGeometry(0.15, 12, 8), M.glowWarm, false, false)
    bulb.position.set(x, F2 - 1.68, z)
    const lamp = new T.PointLight('#ffc489', 9, 13, 2)
    lamp.position.set(x, F2 - 1.75, z)
    root.add(lamp)
    const sprite = new T.Sprite(new T.SpriteMaterial({ map: art.glowTex, color: '#ffd9a0', transparent: true, opacity: 0.42, depthWrite: false, blending: T.AdditiveBlending }))
    sprite.scale.set(2.2, 2.2, 1)
    sprite.position.set(x, F2 - 1.68, z)
    root.add(sprite)
    disposables.push(sprite.material)
  }

  /* ------------------------------------------------------- particles ---- */

  const dustCount = 320
  const dustPos = new Float32Array(dustCount * 3)
  const dustSeed = new Float32Array(dustCount)
  for (let i = 0; i < dustCount; i++) {
    dustPos[i * 3] = (Math.random() - 0.5) * 16
    dustPos[i * 3 + 1] = Math.random() * 8.6
    dustPos[i * 3 + 2] = (Math.random() - 0.5) * 12
    dustSeed[i] = Math.random() * Math.PI * 2
  }
  const dustGeo = new T.BufferGeometry()
  dustGeo.setAttribute('position', new T.BufferAttribute(dustPos, 3))
  const dustMat = new T.PointsMaterial({
    size: 0.045, map: art.dustTex, transparent: true, opacity: 0.55,
    depthWrite: false, blending: T.AdditiveBlending, sizeAttenuation: true,
  })
  const dust = new T.Points(dustGeo, dustMat)
  root.add(dust)
  disposables.push(dustGeo, dustMat)

  /* ------------------------------------------------------- exterior ----- */

  const lawn = new T.Mesh(new T.PlaneGeometry(220, 220), new T.MeshStandardMaterial({ color: '#7d9a63', roughness: 0.95 }))
  lawn.rotation.x = -Math.PI / 2
  lawn.position.y = -0.08
  lawn.receiveShadow = true
  root.add(lawn)
  disposables.push(lawn.geometry, lawn.material)
  const forest: [number, number][] = [[-24, 4], [-21, -14], [-11, -20], [5, -21], [20, -13], [24, 3], [21, 17], [-6, 24], [-19, 21], [12, 25], [-27, 14], [27, -4]]
  const trunkMat = new T.MeshStandardMaterial({ color: '#6a5340', roughness: 0.95 })
  const crownMatA = new T.MeshStandardMaterial({ color: '#4e7a4a', roughness: 0.9, flatShading: true })
  const crownMatB = new T.MeshStandardMaterial({ color: '#5e8c50', roughness: 0.9, flatShading: true })
  disposables.push(trunkMat, crownMatA, crownMatB)
  const trunkGeo = new T.CylinderGeometry(0.32, 0.44, 4.6, 8)
  const crownGeo = new T.IcosahedronGeometry(2.4, 0)
  disposables.push(trunkGeo, crownGeo)
  const crowns: any[] = []
  for (const [x, z] of forest) {
    const trunk = new T.Mesh(trunkGeo, trunkMat)
    trunk.position.set(x, 2.3, z)
    trunk.castShadow = true
    root.add(trunk)
    for (let i = 0; i < 3; i++) {
      const crown = new T.Mesh(crownGeo, i % 2 ? crownMatA : crownMatB)
      crown.position.set(x + (Math.random() - 0.5) * 2.4, 5.0 + i * 1.2 + Math.random(), z + (Math.random() - 0.5) * 2.4)
      crown.scale.setScalar(0.85 + Math.random() * 0.3)
      crown.castShadow = true
      root.add(crown)
      crowns.push(crown)
    }
  }
  // exterior plaza + hedge line so the vestibule glass has something to reflect
  const plaza = new T.Mesh(new T.PlaneGeometry(28, 10), new T.MeshStandardMaterial({ color: '#b3ac9d', roughness: 0.9 }))
  plaza.rotation.x = -Math.PI / 2
  plaza.position.set(0, -0.06, 26)
  plaza.receiveShadow = true
  root.add(plaza)

  /* -------------------------------------------------- contact shading --- */

  const aoMat = new T.MeshBasicMaterial({ map: art.aoTex, transparent: true, opacity: 0.5, depthWrite: false })
  disposables.push(aoMat)
  const aoStrip = (w: number, x: number, z: number, ry: number) => {
    const m = new T.Mesh(new T.PlaneGeometry(w, 1.1), aoMat)
    m.rotation.set(-Math.PI / 2, 0, ry)
    m.position.set(x, 0.014, z)
    root.add(m)
  }
  aoStrip(33, 0, ZN + 1.1, 0)
  aoStrip(33, 0, ZS - 1.1, Math.PI)
  aoStrip(25, -HX + 1.1, 1, -Math.PI / 2)
  aoStrip(25, HX - 1.1, 1, Math.PI / 2)

  /* ---------------------------------------------------------- hotspots -- */

  const hotspots: Hotspot[] = [
    {
      id: 'portal', title: '圆形入口', kicker: '01 · ENTRANCE', x: 0, z: 15.4, y: 0, radius: 3.4,
      lines: ['4.6 米直径的圆洞，把门厅和中庭剪成一幅画框。', '站在圆心抬头，天窗、连廊、楼梯会一次对齐——这是建筑里常见的“收口”手法。'],
      note: '圆洞尺寸与做法为艺术重建，非实测图纸。',
    },
    {
      id: 'model', title: '结构模型', kicker: '02 · STRUCTURE', x: 0, z: 0, y: 0, radius: 2.8,
      lines: ['四根柱、三道圈梁、四面斜撑，把 2.9 米高的模型撑住。', '斜撑把水平力导到基础，连廊能悬空，靠的也是同一套传力逻辑。'],
    },
    {
      id: 'panel', title: '识图展墙', kicker: '03 · EXHIBITION', x: 0, z: -10.4, y: 0, radius: 3.2,
      lines: ['三块展板分别讲识图、结构与材料。', '先找轴线，再找标高，最后看构件怎么接——这是读一张图的顺序。'],
      note: '展陈文字为本项目编写的教学示意，不是学院正式文本。',
    },
    {
      id: 'brick', title: '红砖与幕墙', kicker: '04 · FACADE', x: -15.2, z: 4.0, y: 0, radius: 2.9,
      lines: ['砖墙用 240 毫米模数一层层叠出厚度，窗洞收进 500 毫米做窗台。', '外侧的玻璃幕墙把树影留在立面上，白天与夜晚是两张不同的脸。'],
    },
    {
      id: 'hologram', title: '数字建筑模型', kicker: '05 · MODEL', x: 11.4, z: 6.4, y: 0, radius: 2.6,
      lines: ['筑小智手里那栋蓝色小楼，在这里放大成了等身的体块。', '体块研究先不谈材料，只看体量、比例和它们之间的空隙。'],
    },
    {
      id: 'bridge', title: '空中连廊', kicker: '06 · BRIDGE', x: 0, z: -3.8, y: F2, radius: 3.0,
      lines: ['17 米长的连廊横跨中庭，两侧玻璃栏板只到 1 米高。', '吊杆把桥面拉住，栏杆把人留住——结构与人，各管一半。'],
    },
  ]

  /* ----------------------------------------------------------------------- */

  function surfaceAt(x: number, z: number, feet: number): number | null {
    if (!insidePlan(x, z)) return null
    const cands = [0]
    if (inStair(x, z)) cands.push(stairHeight(z))
    if (upperFloor(x, z)) cands.push(F2)
    if (inBridge(x, z)) cands.push(F2)
    let best: number | null = null
    for (const h of cands) if (h <= feet + 0.62 && (best === null || h > best)) best = h
    if (best === null) return null
    if (best < feet - 1.35) return null
    if (inStair(x, z)) {
      const h = stairHeight(z)
      if (h > feet + 0.45) return null
      return h
    }
    return best
  }

  function blockedAt(x: number, z: number, feet: number) {
    for (const c of colliders) {
      if (x > c.x0 && x < c.x1 && z > c.z0 && z < c.z1 && feet < c.y1 - 0.02 && feet + 1.7 > c.y0) return true
    }
    return false
  }

  let t = 0
  let dustClock = 0
  function tick(dt: number) {
    t += dt
    for (const a of animated) a.mesh.rotation[a.axis] += a.speed * dt
    // 灰尘每 3 帧才重算一次并上传，视觉上看不出差别，但省下每帧的属性上传。
    dustClock += 1
    if (dustClock < 3) return
    const step = dt * dustClock
    dustClock = 0
    const pos = dustGeo.attributes.position as any
    for (let i = 0; i < dustCount; i++) {
      let y = pos.array[i * 3 + 1] + step * (0.05 + (dustSeed[i] % 0.06))
      if (y > 8.6) y = 0.2
      pos.array[i * 3 + 1] = y
      pos.array[i * 3] += Math.sin(t * 0.4 + dustSeed[i]) * step * 0.06
    }
    pos.needsUpdate = true
  }

  function dispose() {
    for (const d of disposables) if (d && typeof d.dispose === 'function') d.dispose()
    root.traverse((o: any) => { if (o.geometry && o.geometry.dispose) o.geometry.dispose() })
  }

  return {
    root,
    hotspots,
    colliders,
    surfaceAt,
    blockedAt,
    insidePlan,
    tick,
    dispose,
    start: { x: 0, z: 18.9 },
    zone(x: number, z: number, feet: number) {
      if (z > 13.55) return '入口门厅'
      if (feet > 3.2) return inBridge(x, z) ? '空中连廊' : '二层回廊'
      return '一层中庭'
    },
  }
}

export type Hall = ReturnType<typeof createHall>
