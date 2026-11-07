import spriteFrames from '../sprite-frames.json'
import type { Character } from '../content'
import { groundHeight, maxHeight } from './engine'
import type { PlayerState, Prop, RoomConfig, Vec } from './types'

export type RoomArt = { boy: CanvasImageSource; girl: CanvasImageSource; zhuxiaozhi: CanvasImageSource }

const WALL_KINDS = new Set(['blackboard', 'clock', 'window', 'bulletin', 'screen', 'classdoor'])

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
  ctx.fill()
}

function shadow(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height = 5) {
  ctx.fillStyle = 'rgba(52,38,22,.20)'
  ctx.beginPath()
  ctx.ellipse(x, y, width, height, 0, 0, Math.PI * 2)
  ctx.fill()
}

function drawTerrazzo(ctx: CanvasRenderingContext2D, ix: number, iy: number, iw: number, ih: number, seed: number) {
  ctx.fillStyle = '#cfcec5'
  ctx.fillRect(ix, iy, iw, ih)
  for (let i = 0; i < 300; i++) {
    const x = ix + ((i * 137 + seed * 53) % iw)
    const y = iy + ((i * 211 + seed * 97) % ih)
    ctx.fillStyle = i % 3 === 0 ? 'rgba(148,146,138,.34)' : 'rgba(255,255,255,.55)'
    ctx.fillRect(x, y, i % 7 === 0 ? 2 : 1, i % 7 === 0 ? 2 : 1)
  }
  ctx.fillStyle = 'rgba(138,138,130,.20)'
  for (let x = ix; x < ix + iw; x += 96) ctx.fillRect(Math.round(x), iy, 1, ih)
  for (let y = iy; y < iy + ih; y += 96) ctx.fillRect(ix, Math.round(y), iw, 1)
}

/** 阶梯教室：每一级台面整体上移 z，前沿再压一条 dz 高的立面，露出的那条边就是台阶。 */
function drawFloor(ctx: CanvasRenderingContext2D, cfg: RoomConfig) {
  const { wall, size } = cfg
  const top = cfg.topWall ?? wall
  const ix = wall
  const iw = size.w - wall * 2
  const bands = cfg.steps ?? [{ y0: top, y1: size.h - wall, z: 0 }]

  for (let i = 0; i < bands.length; i++) {
    const band = bands[i]
    const prev = i === 0 ? 0 : bands[i - 1].z
    const sy = band.y0 - band.z
    const ih = band.y1 - band.y0
    ctx.save()
    ctx.beginPath()
    ctx.rect(ix, sy, iw, ih)
    ctx.clip()
    drawTerrazzo(ctx, ix, sy, iw, ih, i)
    ctx.restore()

    const dz = band.z - prev
    if (dz > 0) {
      // 立面画得比实际高差更高一点，纯粹为了让俯视图里看得出「台阶」。
      const faceH = dz * 1.8
      const faceTop = sy - (faceH - dz)
      ctx.fillStyle = 'rgba(70,70,62,.12)'
      ctx.fillRect(ix, faceTop - 4, iw, 4)
      ctx.fillStyle = '#e7e5dc'
      ctx.fillRect(ix, faceTop, iw, faceH)
      ctx.fillStyle = 'rgba(255,255,255,.9)'
      ctx.fillRect(ix, faceTop, iw, 1.5)
      ctx.fillStyle = 'rgba(96,96,88,.42)'
      ctx.fillRect(ix, faceTop + faceH - 2, iw, 2)
    }
  }

  const glow = ctx.createRadialGradient(size.w * 0.5, size.h * 0.45, 30, size.w * 0.5, size.h * 0.45, size.w * 0.68)
  glow.addColorStop(0, 'rgba(255,246,212,.44)')
  glow.addColorStop(1, 'rgba(255,236,186,0)')
  ctx.fillStyle = glow
  ctx.fillRect(ix, top, iw, size.h - top - wall)
}

function drawLightPool(ctx: CanvasRenderingContext2D) {
  ctx.save()
  ctx.filter = 'blur(11px)'
  ctx.globalAlpha = 0.34
  ctx.fillStyle = '#ffeab4'
  ctx.beginPath()
  ctx.moveTo(26, 134)
  ctx.lineTo(322, 180)
  ctx.lineTo(300, 330)
  ctx.lineTo(26, 276)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

/** 房间以外的舞台背景：一块压暗的木地板延续，避免宽屏上出现大片死黑边。 */
function drawBackdrop(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.fillStyle = '#2b2318'
  ctx.fillRect(0, 0, width, height)
  for (let x = 0; x < width; x += 52) {
    ctx.fillStyle = x % 104 ? 'rgba(255,240,205,.024)' : 'rgba(0,0,0,.12)'
    ctx.fillRect(x, 0, 26, height)
  }
  const glow = ctx.createRadialGradient(
    width / 2,
    height * 0.44,
    Math.min(width, height) * 0.12,
    width / 2,
    height * 0.44,
    Math.max(width, height) * 0.62,
  )
  glow.addColorStop(0, 'rgba(255,224,158,.15)')
  glow.addColorStop(1, 'rgba(255,224,158,0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, width, height)
}

function drawBackWall(ctx: CanvasRenderingContext2D, cfg: RoomConfig) {
  const { wall, size } = cfg
  const top = cfg.topWall ?? wall
  ctx.fillStyle = '#e7dfc9'
  ctx.fillRect(0, 0, size.w, top)
  ctx.fillStyle = '#d6caab'
  ctx.fillRect(0, 0, size.w, 7)
  ctx.fillStyle = 'rgba(255,251,235,.55)'
  ctx.fillRect(0, 7, size.w, 2)
  ctx.fillStyle = 'rgba(176,139,92,.55)'
  ctx.fillRect(0, top - 5, size.w, 5)
  ctx.fillStyle = 'rgba(160,146,112,.22)'
  for (let x = 0; x < size.w; x += 96) ctx.fillRect(x, 7, 1, top - 12)
  ctx.fillStyle = 'rgba(150,124,84,.16)'
  ctx.fillRect(0, top * 0.52, size.w, 1)
}

function drawSideWalls(ctx: CanvasRenderingContext2D, cfg: RoomConfig) {
  const { wall, size } = cfg
  const top = cfg.topWall ?? wall
  const height = size.h - top - wall - maxHeight(cfg)
  ctx.fillStyle = '#e3dac2'
  ctx.fillRect(0, top, wall, height)
  ctx.fillRect(size.w - wall, top, wall, height)
  ctx.fillStyle = 'rgba(160,146,112,.20)'
  for (let y = top; y < top + height; y += 84) {
    ctx.fillRect(0, y, wall, 1)
    ctx.fillRect(size.w - wall, y, wall, 1)
  }
  ctx.fillStyle = 'rgba(150,124,84,.30)'
  ctx.fillRect(wall - 4, top, 4, height)
  ctx.fillRect(size.w - wall, top, 4, height)
}

function drawFrontWall(ctx: CanvasRenderingContext2D, cfg: RoomConfig) {
  const { wall, size } = cfg
  const top = size.h - wall - maxHeight(cfg)
  ctx.fillStyle = '#ded4ba'
  ctx.fillRect(0, top, size.w, wall)
  ctx.fillStyle = 'rgba(255,250,232,.6)'
  ctx.fillRect(0, top, size.w, 3)
  ctx.fillStyle = 'rgba(150,124,84,.28)'
  ctx.fillRect(0, top + 3, size.w, 2)
}

function drawBlackboard(ctx: CanvasRenderingContext2D, prop: Prop, solved = false) {
  const { x, y, w, h } = prop
  ctx.fillStyle = '#6b4f31'
  ctx.fillRect(x - 6, y - 5, w + 12, h + 11)
  ctx.fillStyle = '#7d5c39'
  ctx.fillRect(x - 6, y - 5, w + 12, 3)
  ctx.fillStyle = '#2e5544'
  ctx.fillRect(x, y, w, h)
  ctx.fillStyle = 'rgba(255,255,255,.05)'
  ctx.fillRect(x, y, w, 5)

  ctx.fillStyle = '#24463a'
  const third = w / 3
  ctx.fillRect(x + third, y, 2, h)
  ctx.fillRect(x + third * 2, y, 2, h)

  ctx.save()
  ctx.fillStyle = 'rgba(236,232,216,.88)'
  ctx.font = 'bold 10px "Songti SC", "SimSun", serif'
  ctx.textBaseline = 'middle'
  if (solved) {
    ctx.fillText('∫₀² (3x²+2x)dx = ?', x + 18, y + h / 2)
    ctx.strokeStyle = 'rgba(236,232,216,.30)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(x + 14, y + h - 8)
    ctx.lineTo(x + 132, y + h - 9)
    ctx.stroke()
  } else {
    ctx.fillText('3x² + 2x', x + 18, y + h * 0.36)
    ctx.fillStyle = 'rgba(236,232,216,.60)'
    ctx.fillText('dx', x + 96, y + h * 0.36)
    ctx.fillStyle = 'rgba(236,232,216,.75)'
    ctx.font = 'bold 13px "Songti SC", "SimSun", serif'
    ctx.fillText('= ?', x + 132, y + h * 0.42)
    ctx.strokeStyle = 'rgba(236,232,216,.34)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(x + 14, y + h - 9)
    ctx.lineTo(x + 96, y + h - 10)
    ctx.stroke()
    ctx.fillStyle = 'rgba(236,232,216,.30)'
    ctx.fillRect(x + 152, y + h * 0.30, 62, 2)
    ctx.fillRect(x + 160, y + h * 0.48, 44, 2)
  }
  ctx.restore()

  ctx.fillStyle = '#6b4f31'
  ctx.fillRect(x - 6, y + h + 4, w + 12, 5)
  ctx.fillStyle = '#efe9d6'
  ctx.fillRect(x + 40, y + h + 5, 10, 3)
  ctx.fillRect(x + 56, y + h + 5, 7, 3)
}

function drawClock(ctx: CanvasRenderingContext2D, prop: Prop) {
  const cx = prop.x + prop.w / 2
  const cy = prop.y + prop.h / 2
  ctx.fillStyle = '#f4efdd'
  ctx.beginPath()
  ctx.arc(cx, cy, 8.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#9d8a63'
  ctx.lineWidth = 1
  ctx.stroke()
  ctx.strokeStyle = '#6b5c42'
  ctx.beginPath()
  ctx.moveTo(cx, cy)
  ctx.lineTo(cx, cy - 5)
  ctx.moveTo(cx, cy)
  ctx.lineTo(cx + 3.5, cy + 1.5)
  ctx.stroke()
}

function drawWindow(ctx: CanvasRenderingContext2D, prop: Prop) {
  const { x, y, w, h } = prop
  ctx.fillStyle = '#efe7d2'
  ctx.fillRect(x - 2, y - 4, w + 4, h + 8)
  const sky = ctx.createLinearGradient(x, y, x + w, y + h)
  sky.addColorStop(0, 'rgba(214,236,247,.95)')
  sky.addColorStop(0.55, 'rgba(180,216,234,.95)')
  sky.addColorStop(1, 'rgba(206,231,242,.95)')
  ctx.fillStyle = sky
  ctx.fillRect(x, y, w, h)
  ctx.fillStyle = 'rgba(255,255,255,.5)'
  ctx.beginPath()
  ctx.moveTo(x, y + h * 0.55)
  ctx.lineTo(x + w, y + h * 0.32)
  ctx.lineTo(x + w, y + h * 0.44)
  ctx.lineTo(x, y + h * 0.67)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#e5dcc4'
  ctx.fillRect(x, y + h / 2 - 1.5, w, 3)
  ctx.fillRect(x + w / 2 - 1.5, y, 3, h)
  ctx.strokeStyle = 'rgba(120,96,62,.45)'
  ctx.lineWidth = 1
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1)

  if (prop.curtain) {
    const top = h * 0.34
    const bottom = h * 0.24
    ctx.fillStyle = '#7d9cc1'
    ctx.fillRect(x - 4, y - 6, w + 8, top + 6)
    ctx.fillRect(x - 4, y + h - bottom, w + 8, bottom + 6)
    ctx.fillStyle = 'rgba(255,255,255,.20)'
    for (let cy = y - 4; cy < y - 6 + top; cy += 5) ctx.fillRect(x - 4, cy, w + 8, 2)
    for (let cy = y + h - bottom + 2; cy < y + h + 4; cy += 5) ctx.fillRect(x - 4, cy, w + 8, 2)
    ctx.fillStyle = 'rgba(40,56,80,.22)'
    ctx.fillRect(x - 4, y - 6 + top - 2, w + 8, 2)
    ctx.fillRect(x - 4, y + h - bottom - 2, w + 8, 2)
    ctx.fillStyle = '#c9bda0'
    ctx.fillRect(x - 7, y - 7, w + 14, 3)
  }
}

function drawBulletin(ctx: CanvasRenderingContext2D, prop: Prop) {
  const { x, y, w, h } = prop
  ctx.fillStyle = '#8d6740'
  ctx.fillRect(x - 2, y - 2, w + 4, h + 4)
  ctx.fillStyle = '#c99a63'
  ctx.fillRect(x, y, w, h)
  ctx.fillStyle = '#f6f2e3'
  ctx.fillRect(x + 4, y + 8, w - 8, 20)
  ctx.fillRect(x + 4, y + 34, w - 8, 16)
  ctx.fillStyle = '#efe6cd'
  ctx.beginPath()
  ctx.moveTo(x + 4, y + 58)
  ctx.lineTo(x + w - 4, y + 56)
  ctx.lineTo(x + w - 4, y + 74)
  ctx.lineTo(x + 10, y + 80)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = 'rgba(120,90,58,.35)'
  for (let i = 0; i < 3; i++) ctx.fillRect(x + 7, y + 13 + i * 5, w - 14, 1)
}

function drawPodium(ctx: CanvasRenderingContext2D, prop: Prop) {
  const { x, y, w, h } = prop
  shadow(ctx, x + w / 2, y + h + 16, w * 0.52, 6)
  ctx.fillStyle = '#9e7a4e'
  ctx.fillRect(x + 3, y + h, w - 6, 16)
  ctx.fillStyle = '#b8935f'
  ctx.fillRect(x, y, w, h)
  ctx.fillStyle = '#d3ac78'
  ctx.fillRect(x, y, w, h - 5)
  ctx.fillStyle = 'rgba(255,244,212,.55)'
  ctx.fillRect(x + 3, y + 3, w - 6, 4)
  ctx.fillStyle = 'rgba(120,88,52,.28)'
  ctx.fillRect(x + w / 2 - 0.5, y + 6, 1, h - 11)
  ctx.fillStyle = '#8a6636'
  ctx.fillRect(x + w / 2 - 7, y + h - 8, 14, 3)
  ctx.fillStyle = '#efe6cb'
  ctx.fillRect(x + 12, y + 8, 12, 7)
}

function drawDesk(ctx: CanvasRenderingContext2D, prop: Prop) {
  const { x, y, w, h } = prop
  const cx = x + w / 2
  shadow(ctx, cx, y + h + 22, w * 0.46, 5)
  ctx.fillStyle = '#a87a4c'
  ctx.fillRect(cx - 14, y + h + 2, 28, 15)
  ctx.fillStyle = '#b98a58'
  ctx.fillRect(cx - 14, y + h + 2, 28, 6)
  ctx.fillStyle = '#9c7043'
  ctx.fillRect(cx - 13, y + h + 15, 26, 4)
  ctx.fillStyle = '#a8825230'
  ctx.fillRect(cx - 2, y + h + 17, 3, 5)

  ctx.fillStyle = '#c39b68'
  ctx.fillRect(x, y + h - 4, w, 4)
  ctx.fillStyle = '#d6b184'
  ctx.fillRect(x, y, w, h - 3)
  ctx.fillStyle = '#e6c69c'
  ctx.fillRect(x + 2, y + 2, w - 4, 4)
  ctx.strokeStyle = 'rgba(118,84,48,.34)'
  ctx.lineWidth = 1
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 4)
  const seed = Number(prop.id.replace(/\D/g, '')) || 0
  if (seed % 2 === 1) {
    ctx.fillStyle = '#7d9459'
    ctx.fillRect(x + 13, y + 9, 17, 11)
    ctx.fillStyle = '#eae4cf'
    ctx.fillRect(x + 14, y + 10, 15, 9)
    ctx.fillStyle = 'rgba(120,140,90,.55)'
    ctx.fillRect(x + 16, y + 13, 11, 1)
    ctx.fillRect(x + 16, y + 16, 8, 1)
  } else {
    ctx.fillStyle = '#d9c9a6'
    ctx.fillRect(x + w - 26, y + 10, 14, 2)
  }
  ctx.fillStyle = 'rgba(122,88,52,.20)'
  ctx.fillRect(x, y + h - 7, w, 3)
  ctx.fillStyle = '#8a6636'
  ctx.fillRect(x + 6, y + h - 1, 3, 6)
  ctx.fillRect(x + w - 9, y + h - 1, 3, 6)
}

function drawCabinet(ctx: CanvasRenderingContext2D, prop: Prop) {
  const { x, y, w, h } = prop
  shadow(ctx, x + w / 2, y + h + 16, w * 0.5, 6)
  ctx.fillStyle = '#9c7448'
  ctx.fillRect(x, y + h, w, 12)
  ctx.fillStyle = '#b18155'
  ctx.fillRect(x, y, w, h)
  ctx.fillStyle = '#c9a173'
  ctx.fillRect(x + 3, y + 3, w / 2 - 5, h - 9)
  ctx.fillRect(x + w / 2 + 2, y + 3, w / 2 - 5, h - 9)
  ctx.fillStyle = 'rgba(255,246,220,.35)'
  ctx.fillRect(x + 3, y + 3, w - 6, 3)
  ctx.fillStyle = '#7d5a34'
  ctx.fillRect(x + w / 2 - 6, y + h / 2 - 5, 3, 10)
  ctx.fillRect(x + w / 2 + 3, y + h / 2 - 5, 3, 10)

  ctx.fillStyle = '#4c4438'
  ctx.fillRect(x + w - 22, y + 8, 15, 12)
  ctx.fillStyle = '#8fbf9a'
  for (let i = 0; i < 3; i++) ctx.fillRect(x + w - 19 + i * 4, y + 11, 2, 2)
  for (let i = 0; i < 3; i++) ctx.fillRect(x + w - 19 + i * 4, y + 15, 2, 2)
}

function drawPlant(ctx: CanvasRenderingContext2D, prop: Prop) {
  const { x, y, w, h } = prop
  const cx = x + w / 2
  shadow(ctx, cx, y + h + 2, w * 0.5, 4)
  ctx.fillStyle = '#4f7d4e'
  ctx.beginPath()
  ctx.ellipse(cx - 6, y + 2, 7, 6, -0.4, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(cx + 7, y + 4, 6, 5, 0.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#5f9059'
  ctx.beginPath()
  ctx.ellipse(cx, y - 2, 6, 6, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#b5714a'
  ctx.fillRect(cx - 8, y + 8, 16, h - 8)
  ctx.fillStyle = '#c9855b'
  ctx.fillRect(cx - 8, y + 8, 16, 3)
}

function drawDoor(ctx: CanvasRenderingContext2D, prop: Prop) {
  const { x, y, w, h } = prop
  ctx.fillStyle = '#8d6740'
  ctx.fillRect(x - 3, y - 3, w + 6, h + 3)
  ctx.fillStyle = '#b98a58'
  ctx.fillRect(x, y, w / 2 - 1, h)
  ctx.fillRect(x + w / 2 + 1, y, w / 2 - 1, h)
  ctx.fillStyle = '#cfe3ee'
  ctx.fillRect(x + 6, y + 6, w / 2 - 14, h * 0.5)
  ctx.fillRect(x + w / 2 + 8, y + 6, w / 2 - 14, h * 0.5)
  ctx.fillStyle = '#7d5a34'
  ctx.fillRect(x + w / 2 - 6, y + h * 0.66, 3, 8)
  ctx.fillRect(x + w / 2 + 3, y + h * 0.66, 3, 8)
}

function drawBooth(ctx: CanvasRenderingContext2D, prop: Prop) {
  const { x, y, w, h } = prop
  const cx = x + w / 2
  ctx.fillStyle = 'rgba(52,38,22,.12)'
  ctx.beginPath()
  ctx.ellipse(cx, y + h + 12, w * 0.34, 4, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#c9b189'
  ctx.fillRect(x, y - 13, w, 8)
  ctx.fillRect(x, y - 13, 6, h + 14)
  ctx.fillRect(x + w - 6, y - 13, 6, h + 14)
  ctx.fillStyle = '#d8c39d'
  ctx.fillRect(x, y - 13, w, 3)
  ctx.fillStyle = '#a8825230'
  ctx.fillRect(x + 6, y + h - 6, w - 12, 4)

  ctx.fillStyle = '#cba97a'
  ctx.fillRect(x + 6, y + h - 6, w - 12, 6)
  ctx.fillStyle = '#d9bb90'
  ctx.fillRect(x + 6, y, w - 12, h - 6)
  ctx.fillStyle = '#e9cfa8'
  ctx.fillRect(x + 8, y + 2, w - 16, 4)
  ctx.strokeStyle = 'rgba(118,84,48,.3)'
  ctx.lineWidth = 1
  ctx.strokeRect(x + 6.5, y + 0.5, w - 13, h - 7)

  ctx.fillStyle = '#46554f'
  ctx.fillRect(x + 14, y + 9, 28, 18)
  ctx.fillStyle = '#9fd8b4'
  ctx.fillRect(x + 16, y + 11, 24, 14)
  ctx.fillStyle = 'rgba(255,255,255,.55)'
  ctx.fillRect(x + 18, y + 14, 12, 1.5)
  ctx.fillRect(x + 18, y + 18, 17, 1.5)

  ctx.strokeStyle = '#5c5346'
  ctx.lineWidth = 1.6
  ctx.beginPath()
  ctx.arc(x + w - 26, y + 20, 7, Math.PI * 0.95, Math.PI * 2.05)
  ctx.stroke()
  ctx.fillStyle = '#5c5346'
  ctx.fillRect(x + w - 34, y + 20, 5, 9)
  ctx.fillRect(x + w - 21, y + 20, 5, 9)
}

function drawGate(ctx: CanvasRenderingContext2D, prop: Prop, open: boolean) {
  const { x, y, w, h } = prop
  const baseY = y + h
  ctx.fillStyle = 'rgba(52,38,22,.16)'
  ctx.beginPath()
  ctx.ellipse(x + w / 2, baseY - 3, w * 0.58, 5, 0, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = '#d5d0c1'
  ctx.fillRect(x, baseY - 10, w, 10)
  ctx.fillStyle = '#c2bcac'
  ctx.fillRect(x, baseY - 10, w, 2)

  ctx.fillStyle = '#b3bcc1'
  ctx.fillRect(x, baseY - 72, 12, 62)
  ctx.fillRect(x + w - 12, baseY - 72, 12, 62)
  ctx.fillStyle = '#cbd3d7'
  ctx.fillRect(x, baseY - 72, 4, 62)
  ctx.fillRect(x + w - 12, baseY - 72, 4, 62)
  ctx.fillStyle = '#9aa4aa'
  ctx.fillRect(x, baseY - 12, 12, 4)
  ctx.fillRect(x + w - 12, baseY - 12, 12, 4)

  ctx.fillStyle = '#c6ced2'
  ctx.fillRect(x - 3, baseY - 80, 18, 8)
  ctx.fillRect(x + w - 15, baseY - 80, 18, 8)

  if (open) {
    ctx.fillStyle = 'rgba(140,132,118,.45)'
    ctx.fillRect(x + 12, baseY - 46, 6, 14)
    ctx.fillRect(x + w - 18, baseY - 46, 6, 14)
  } else {
    ctx.fillStyle = '#d5765f'
    ctx.fillRect(x + 12, baseY - 48, w - 24, 7)
    ctx.fillStyle = '#b85d49'
    ctx.fillRect(x + 12, baseY - 43, w - 24, 2)
  }

  ctx.fillStyle = open ? '#7fc27f' : '#e08a6a'
  ctx.beginPath()
  ctx.arc(x + w / 2, baseY - 60, 3.6, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = '#5b6560'
  ctx.fillRect(x + w - 20, baseY - 34, 13, 16)
  ctx.fillStyle = open ? '#9fe0ad' : '#f0b48f'
  ctx.fillRect(x + w - 18, baseY - 32, 9, 5)
}

function drawScreen(ctx: CanvasRenderingContext2D, prop: Prop) {
  const { x, y, w, h } = prop
  ctx.fillStyle = '#3c4a44'
  ctx.fillRect(x - 4, y - 4, w + 8, h + 8)
  ctx.fillStyle = '#1f2c27'
  ctx.fillRect(x, y, w, h)
  ctx.fillStyle = 'rgba(255,255,255,.04)'
  ctx.fillRect(x, y, w, 5)

  ctx.save()
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'center'
  ctx.fillStyle = '#9fd8b4'
  if (prop.text) {
    ctx.font = 'bold 10px Arial, sans-serif'
    ctx.fillText(prop.text, x + w / 2, y + h / 2)
  } else {
    ctx.font = '9px Arial, sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText('LANGUAGE LAB  ·  ORAL CHECK', x + 12, y + 14)
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = i < 2 ? '#6fb487' : 'rgba(120,160,135,.25)'
      ctx.fillRect(x + w - 88 + i * 16, y + 26, 12, 12)
    }
    ctx.fillStyle = 'rgba(159,216,180,.35)'
    ctx.fillRect(x + 12, y + h - 10, w - 24, 2)
  }
  ctx.restore()
}

function drawStairs(ctx: CanvasRenderingContext2D, prop: Prop) {
  const { x, y, w, h } = prop
  const step = h / 5
  shadow(ctx, x + w / 2, y + h + 4, w * 0.5, 4)
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i % 2 ? '#c8b28e' : '#d5c09e'
    ctx.fillRect(x + i * 1.5, y + i * step, w - i * 3, step)
    ctx.fillStyle = 'rgba(120,88,52,.18)'
    ctx.fillRect(x + i * 1.5, y + i * step + step - 2, w - i * 3, 2)
  }
  ctx.strokeStyle = '#8d6740'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(x - 2, y)
  ctx.lineTo(x - 2, y + h)
  ctx.moveTo(x + w + 2, y)
  ctx.lineTo(x + w + 2, y + h)
  ctx.stroke()
}

function drawBench(ctx: CanvasRenderingContext2D, prop: Prop) {
  const { x, y, w, h } = prop
  const deskH = 13
  const seatY = y + deskH + 5
  const seatH = Math.max(10, h - deskH - 7)

  ctx.fillStyle = 'rgba(58,56,50,.18)'
  ctx.fillRect(x + 5, y + h + 1, w - 10, 5)

  ctx.fillStyle = '#9aa0a4'
  for (let lx = x + 16; lx < x + w - 16; lx += 94) {
    ctx.fillRect(lx, y + deskH, 5, h - deskH)
    ctx.fillRect(lx - 4, y + h - 3, 13, 3)
  }
  ctx.fillStyle = '#b6bcc0'
  ctx.fillRect(x + 8, y + h - 9, w - 16, 2)

  const seats = Math.max(3, Math.round(w / 94))
  const seatW = w / seats
  for (let i = 0; i < seats; i++) {
    const sx = x + i * seatW + 7
    const sw = seatW - 14
    ctx.fillStyle = '#b98a58'
    ctx.beginPath()
    rr(ctx, sx, seatY, sw, seatH, 3)
    ctx.fillStyle = 'rgba(255,240,214,.24)'
    ctx.fillRect(sx, seatY, sw, 2)
    ctx.fillStyle = '#a3764a'
    ctx.fillRect(sx, seatY + seatH - 3, sw, 3)
  }

  ctx.fillStyle = '#c49a6c'
  ctx.fillRect(x, y, w, deskH)
  ctx.fillStyle = '#dcb98c'
  ctx.fillRect(x + 1, y + 1, w - 2, 3)
  ctx.fillStyle = '#a8845a'
  ctx.fillRect(x, y + deskH - 1, w, 2)
  ctx.strokeStyle = 'rgba(120,92,58,.34)'
  ctx.lineWidth = 1
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, deskH)

  ctx.fillStyle = '#efe9d6'
  ctx.fillRect(x + 16, y + 4, 20, 5)
  if (seats > 2) {
    ctx.fillStyle = '#7fa8c9'
    ctx.fillRect(x + w - 58, y + 3, 8, 7)
  }
}


function drawClassDoor(ctx: CanvasRenderingContext2D, prop: Prop) {
  const { x, y, w, h } = prop
  const open = !!prop.to
  ctx.fillStyle = '#8d6740'
  ctx.fillRect(x - 3, y - 3, w + 6, h + 3)
  ctx.fillStyle = open ? '#d8b57e' : '#b99a6c'
  ctx.fillRect(x, y, w, h)
  ctx.fillStyle = open ? 'rgba(255,238,186,.9)' : '#c7d9e2'
  ctx.fillRect(x + 8, y + 4, w - 16, h * 0.44)
  if (open) {
    ctx.fillStyle = 'rgba(62,52,34,.42)'
    ctx.fillRect(x + 2, y + 3, 7, h - 6)
    ctx.fillStyle = 'rgba(255,236,180,.35)'
    ctx.fillRect(x, y + h - 4, w, 4)
  }
  ctx.fillStyle = '#7d5a34'
  ctx.fillRect(x + w - 10, y + h * 0.64, 3, 6)
  ctx.fillStyle = '#f4efdd'
  ctx.fillRect(x + w / 2 - 14, y - 12, 28, 12)
  ctx.save()
  ctx.fillStyle = '#4a5a4a'
  ctx.font = 'bold 8px Arial, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(prop.plate ?? '', x + w / 2, y - 6)
  ctx.restore()
}

function drawBox(ctx: CanvasRenderingContext2D, prop: Prop, open: boolean) {
  const { x, y, w, h } = prop
  if (!open) {
    const pulse = 0.28 + Math.sin(Date.now() / 620) * 0.12
    const halo = ctx.createRadialGradient(x + w / 2, y + h / 2, 2, x + w / 2, y + h / 2, 46)
    halo.addColorStop(0, `rgba(240,200,110,${pulse})`)
    halo.addColorStop(1, 'rgba(240,200,110,0)')
    ctx.fillStyle = halo
    ctx.beginPath()
    ctx.arc(x + w / 2, y + h / 2, 46, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.fillStyle = 'rgba(52,38,22,.22)'
  ctx.fillRect(x + 2, y + h, w - 4, 4)
  ctx.fillStyle = '#8d6740'
  ctx.fillRect(x, y + 2, w, h - 2)
  ctx.fillStyle = '#b08a5e'
  ctx.fillRect(x + 2, y + 4, w - 4, h - 8)
  ctx.fillStyle = '#3d3a32'
  ctx.fillRect(x + 7, y + 7, w - 14, 9)
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = '#cfc7ac'
    ctx.fillRect(x + 10 + i * 7, y + 9, 4, 5)
  }
  if (open) {
    ctx.fillStyle = '#c9a173'
    ctx.fillRect(x - 3, y - 10, w + 6, 9)
    ctx.fillStyle = '#efe6c8'
    ctx.fillRect(x + 8, y - 4, w - 16, 3)
  } else {
    ctx.fillStyle = '#c9a173'
    ctx.fillRect(x - 2, y - 3, w + 4, 7)
    ctx.fillStyle = '#d9b86c'
    ctx.fillRect(x + w / 2 - 3, y + h - 8, 6, 5)
  }
}

function drawTeacher(ctx: CanvasRenderingContext2D, x: number, y: number) {
  shadow(ctx, x, y, 10, 3.5)
  ctx.fillStyle = '#3f4a44'
  ctx.fillRect(x - 8, y - 17, 6, 17)
  ctx.fillRect(x + 2, y - 17, 6, 17)
  ctx.fillStyle = '#2f3833'
  ctx.fillRect(x - 9, y - 4, 8, 4)
  ctx.fillRect(x + 1, y - 4, 8, 4)

  ctx.fillStyle = '#e8e2d2'
  ctx.fillRect(x - 9, y - 35, 18, 19)
  ctx.fillStyle = '#6a7a6c'
  ctx.fillRect(x - 9, y - 35, 5, 19)
  ctx.fillRect(x + 4, y - 35, 5, 19)
  ctx.fillStyle = '#e8e2d2'
  ctx.fillRect(x - 12, y - 33, 4, 14)
  ctx.fillRect(x + 8, y - 33, 4, 14)
  ctx.fillStyle = '#e0b48a'
  ctx.fillRect(x - 12, y - 20, 4, 4)
  ctx.fillRect(x + 8, y - 20, 4, 4)

  ctx.fillStyle = '#b98a58'
  ctx.fillRect(x + 7, y - 26, 10, 8)
  ctx.fillStyle = '#eae4cf'
  ctx.fillRect(x + 8, y - 25, 8, 6)

  ctx.fillStyle = '#e0b48a'
  ctx.fillRect(x - 6, y - 48, 12, 14)
  ctx.fillStyle = '#3a3230'
  ctx.fillRect(x - 7, y - 51, 14, 7)
  ctx.fillRect(x - 7, y - 46, 2, 5)
  ctx.fillRect(x + 5, y - 46, 2, 5)
  ctx.fillStyle = '#4a4a44'
  ctx.fillRect(x - 5, y - 42, 4, 2)
  ctx.fillRect(x + 1, y - 42, 4, 2)
}

export function drawNpc(
  ctx: CanvasRenderingContext2D,
  art: RoomArt,
  npc: { sprite: string; at: Vec; name: string },
  time: number,
) {
  const bob = Math.sin(time * 1.5) * 1.1
  const x = npc.at.x
  const y = npc.at.y + bob
  if (npc.sprite === 'zhuxiaozhi') {
    shadow(ctx, x, npc.at.y, 13, 4)
    ctx.drawImage(art.zhuxiaozhi, x - 21, y - 60, 42, 60)
  } else {
    drawTeacher(ctx, x, y)
  }
  ctx.save()
  ctx.font = '10px "PingFang SC", "Microsoft YaHei", sans-serif'
  ctx.textAlign = 'center'
  ctx.lineWidth = 3
  ctx.strokeStyle = '#f8f1d9'
  ctx.strokeText(npc.name, x, y - 66)
  ctx.fillStyle = '#35553d'
  ctx.fillText(npc.name, x, y - 66)
  ctx.restore()
}

function drawFloorProp(ctx: CanvasRenderingContext2D, prop: Prop, open: boolean) {
  switch (prop.kind) {
    case 'podium':
      drawPodium(ctx, prop)
      break
    case 'desk':
      drawDesk(ctx, prop)
      break
    case 'cabinet':
      drawCabinet(ctx, prop)
      break
    case 'plant':
      drawPlant(ctx, prop)
      break
    case 'booth':
      drawBooth(ctx, prop)
      break
    case 'gate':
      drawGate(ctx, prop, open)
      break
    case 'stairs':
      drawStairs(ctx, prop)
      break
    case 'bench':
      drawBench(ctx, prop)
      break
    case 'box':
      drawBox(ctx, prop, open)
      break
    default:
      break
  }
}

function drawWallProp(ctx: CanvasRenderingContext2D, prop: Prop, assembled: boolean) {
  switch (prop.kind) {
    case 'blackboard':
      drawBlackboard(ctx, prop, assembled)
      break
    case 'clock':
      drawClock(ctx, prop)
      break
    case 'window':
      drawWindow(ctx, prop)
      break
    case 'bulletin':
      drawBulletin(ctx, prop)
      break
    case 'screen':
      drawScreen(ctx, prop)
      break
    case 'classdoor':
      drawClassDoor(ctx, prop)
      break
    default:
      break
  }
}

export function drawPlayerSprite(ctx: CanvasRenderingContext2D, image: CanvasImageSource, player: PlayerState, character: Character) {
  const sheet = spriteFrames[character]
  const row = sheet.directions.indexOf(player.direction)
  const column = player.moving ? Math.floor(player.distance / 17) % 4 : 1
  const frame = sheet.frames[row * 4 + column]
  const w = frame.width * sheet.scale
  const h = frame.height * sheet.scale
  const feet = player.y - player.z
  shadow(ctx, player.x, feet - 1, 9 - player.z * 0.05, 3.5)
  ctx.drawImage(image, frame.x, frame.y, frame.width, frame.height, Math.round(player.x - w / 2), Math.round(feet - h), w, h)
}

function drawDust(ctx: CanvasRenderingContext2D, cfg: RoomConfig, time: number) {
  for (let i = 0; i < 14; i++) {
    const seedX = (i * 97) % Math.round(cfg.size.w)
    const seedY = (i * 61) % Math.round(cfg.size.h)
    const x = seedX + Math.sin(time * 0.35 + i) * 14
    const y = seedY + Math.cos(time * 0.28 + i * 1.7) * 10
    const top = cfg.topWall ?? cfg.wall
    if (x < cfg.wall || x > cfg.size.w - cfg.wall || y < top || y > cfg.size.h - cfg.wall) continue
    ctx.globalAlpha = 0.20 + Math.sin(time * 0.9 + i) * 0.12
    ctx.fillStyle = '#fff6d8'
    ctx.fillRect(x, y, 1.4, 1.4)
  }
  ctx.globalAlpha = 1
}

export function renderRoom(
  ctx: CanvasRenderingContext2D,
  cfg: RoomConfig,
  art: RoomArt,
  player: PlayerState,
  character: Character,
  width: number,
  height: number,
  time: number,
  state: { done: boolean; talkative: boolean },
) {
  ctx.clearRect(0, 0, width, height)
  drawBackdrop(ctx, width, height)

  const maxZ = maxHeight(cfg)
  const viewH = cfg.size.h + maxZ
  const zoom = Math.min(width / cfg.size.w, height / viewH)
  const ox = (width - cfg.size.w * zoom) / 2
  const oy = (height - viewH * zoom) / 2 + maxZ * zoom
  const roomWidth = cfg.size.w * zoom
  const roomHeight = cfg.size.h * zoom
  const frameY = oy - maxZ * zoom
  const frameH = viewH * zoom

  ctx.save()
  ctx.filter = 'blur(18px)'
  ctx.fillStyle = 'rgba(0,0,0,.46)'
  ctx.fillRect(ox + 5, frameY + 10, roomWidth, frameH)
  ctx.restore()

  ctx.save()
  ctx.translate(ox, oy)
  ctx.scale(zoom, zoom)
  ctx.imageSmoothingEnabled = false

  drawFloor(ctx, cfg)
  if (!cfg.steps) drawLightPool(ctx)
  drawBackWall(ctx, cfg)
  drawSideWalls(ctx, cfg)
  for (const prop of cfg.props) if (WALL_KINDS.has(prop.kind)) drawWallProp(ctx, prop, state.done)

  const stack: { depth: number; paint: () => void }[] = []
  for (const prop of cfg.props) {
    if (WALL_KINDS.has(prop.kind) || prop.kind === 'door') continue
    const depth = prop.kind === 'desk' ? prop.y + prop.h + 22 : prop.y + prop.h + 14
    const lift = groundHeight(prop.y, cfg)
    stack.push({
      depth,
      paint: () => {
        ctx.save()
        ctx.translate(0, -lift)
        drawFloorProp(ctx, prop, state.done)
        ctx.restore()
      },
    })
  }
  if (cfg.npc) {
    const npc = cfg.npc
    const lift = groundHeight(npc.at.y, cfg)
    stack.push({
      depth: npc.at.y,
      paint: () => {
        ctx.save()
        ctx.translate(0, -lift)
        drawNpc(ctx, art, npc, time)
        ctx.restore()
      },
    })
  }
  stack.push({ depth: player.y, paint: () => drawPlayerSprite(ctx, art[character], player, character) })
  stack.sort((a, b) => a.depth - b.depth)
  for (const item of stack) item.paint()

  drawFrontWall(ctx, cfg)
  const door = cfg.props.find(p => p.kind === 'door')
  if (door) {
    ctx.save()
    ctx.translate(0, -maxHeight(cfg))
    drawDoor(ctx, door)
    ctx.restore()
  }
  drawDust(ctx, cfg, time)
  ctx.restore()

  ctx.strokeStyle = 'rgba(255,236,190,.14)'
  ctx.lineWidth = 1
  ctx.strokeRect(ox + 0.5, frameY + 0.5, roomWidth - 1, frameH - 1)

  const vignette = ctx.createRadialGradient(
    width / 2,
    height / 2,
    Math.min(width, height) * 0.34,
    width / 2,
    height / 2,
    Math.max(width, height) * 0.72,
  )
  vignette.addColorStop(0, 'rgba(38,28,16,0)')
  vignette.addColorStop(1, 'rgba(38,28,16,.30)')
  ctx.fillStyle = vignette
  ctx.fillRect(0, 0, width, height)
}
