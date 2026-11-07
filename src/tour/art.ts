import T from '../three-vendor'

/**
 * Procedural art for the first-person building tour.
 *
 * Everything here is generated at runtime on a 2D canvas: brick, terrazzo,
 * oak, plaster, concrete, exhibition panels and the exhibition signage.
 * No binary assets are added to the repository, and the material set stays
 * consistent with the warm pixel-art palette used by the campus map.
 */

const clamp255 = (v: number) => Math.max(0, Math.min(255, v | 0))

function cv(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return { c, ctx: c.getContext('2d') as CanvasRenderingContext2D }
}

function texture(c: HTMLCanvasElement, rx = 1, ry = 1, srgb = true) {
  const t = new T.CanvasTexture(c)
  t.wrapS = t.wrapT = T.RepeatWrapping
  t.repeat.set(rx, ry)
  if (srgb) t.colorSpace = T.SRGBColorSpace
  t.anisotropy = 8
  return t
}

/** Convert a greyscale height canvas into a tangent-space normal map. */
function normalFromHeight(src: HTMLCanvasElement, strength = 2.4) {
  const W = src.width
  const H = src.height
  const data = (src.getContext('2d') as CanvasRenderingContext2D).getImageData(0, 0, W, H).data
  const out = cv(W, H)
  const image = out.ctx.createImageData(W, H)
  const d = image.data
  const at = (x: number, y: number) => data[((((y % H) + H) % H) * W + (((x % W) + W) % W)) * 4] / 255
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength
      const nx = -dx
      const ny = -dy
      const len = Math.hypot(nx, ny, 1)
      const i = (y * W + x) * 4
      d[i] = (nx / len * 0.5 + 0.5) * 255
      d[i + 1] = (ny / len * 0.5 + 0.5) * 255
      d[i + 2] = (1 / len * 0.5 + 0.5) * 255
      d[i + 3] = 255
    }
  }
  out.ctx.putImageData(image, 0, 0)
  return out.c
}

function speckle(ctx: CanvasRenderingContext2D, w: number, h: number, count: number, alpha: number) {
  for (let i = 0; i < count; i++) {
    const shade = Math.random() > 0.5 ? 255 : 0
    ctx.fillStyle = `rgba(${shade},${shade},${shade},${alpha * (0.25 + Math.random())})`
    ctx.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1 + Math.random() * 2)
  }
}

/* ---------------------------------------------------------------- brick --- */

function brick(canvasSize = 512, rows = 30) {
  const alb = cv(canvasSize, canvasSize)
  const hgt = cv(canvasSize, canvasSize)
  const canvasWidth = canvasSize
  const canvasHeight = canvasSize
  alb.ctx.fillStyle = '#c3b39c'
  alb.ctx.fillRect(0, 0, canvasWidth, canvasHeight)
  hgt.ctx.fillStyle = '#5c5c5c'
  hgt.ctx.fillRect(0, 0, canvasWidth, canvasHeight)

  const bh = canvasHeight / rows
  const cols = 8
  const bw = canvasWidth / cols
  for (let r = 0; r < rows; r++) {
    const off = r % 2 ? bw * 0.5 : 0
    for (let i = -1; i <= cols; i++) {
      const x = i * bw + off + 2
      const y = r * bh + 2
      const w = bw - 4
      const h = bh - 4
      const s = 0.8 + Math.random() * 0.3
      alb.ctx.fillStyle = `rgb(${clamp255(154 * s)},${clamp255(88 * s)},${clamp255(67 * s)})`
      alb.ctx.fillRect(x, y, w, h)
      for (let k = 0; k < 10; k++) {
        alb.ctx.fillStyle = Math.random() > 0.5 ? `rgba(60,28,20,${0.04 + Math.random() * 0.08})` : `rgba(240,205,175,${0.03 + Math.random() * 0.06})`
        alb.ctx.fillRect(x + Math.random() * w, y + Math.random() * h, 2 + Math.random() * 6, 1 + Math.random() * 3)
      }
      alb.ctx.fillStyle = 'rgba(255,232,208,0.16)'
      alb.ctx.fillRect(x, y, w, Math.max(1, bh * 0.06))
      alb.ctx.fillStyle = 'rgba(38,16,10,0.22)'
      alb.ctx.fillRect(x, y + h - Math.max(1, bh * 0.09), w, Math.max(1, bh * 0.09))
      hgt.ctx.fillStyle = '#e6e6e6'
      hgt.ctx.fillRect(x, y, w, h)
      hgt.ctx.fillStyle = 'rgba(0,0,0,0.35)'
      hgt.ctx.fillRect(x, y + h - 3, w, 3)
    }
  }
  speckle(alb.ctx, canvasWidth, canvasHeight, 2200, 0.05)
  return { map: alb.c, normal: normalFromHeight(hgt.c, 2.2) }
}

/* ------------------------------------------------------------- terrazzo --- */

function terrazzo(size = 512) {
  const { c, ctx } = cv(size, size)
  ctx.fillStyle = '#d3c8b3'
  ctx.fillRect(0, 0, size, size)
  // large-scale mottling so a 4 m tile never looks like a flat colour
  for (let i = 0; i < 260; i++) {
    const r = 26 + Math.random() * 120
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,252,244,0.14)' : 'rgba(146,133,110,0.10)'
    ctx.beginPath()
    ctx.arc(Math.random() * size, Math.random() * size, r, 0, Math.PI * 2)
    ctx.fill()
  }
  const chips = ['#c0b49c', '#a99e89', '#cdc5b0', '#b3b3a4', '#e8dfca', '#93876f', '#c6b79e', '#d8cdb4']
  for (let i = 0; i < 7000; i++) {
    ctx.fillStyle = chips[(Math.random() * chips.length) | 0]
    ctx.globalAlpha = 0.22 + Math.random() * 0.3
    ctx.fillRect(Math.random() * size, Math.random() * size, 1.4 + Math.random() * 4.6, 1.4 + Math.random() * 3.6)
  }
  ctx.globalAlpha = 1
  speckle(ctx, size, size, 1600, 0.05)
  // brass expansion joints on a 2 m grid (tile represents 4 m)
  ctx.strokeStyle = 'rgba(168,132,74,0.9)'
  ctx.lineWidth = 3
  ctx.strokeRect(0, 0, size, size)
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(size / 2, 0)
  ctx.lineTo(size / 2, size)
  ctx.moveTo(0, size / 2)
  ctx.lineTo(size, size / 2)
  ctx.stroke()
  return c
}

/* ----------------------------------------------------------------- wood --- */

function wood(size = 512) {
  const { c, ctx } = cv(size, size)
  ctx.fillStyle = '#b0855b'
  ctx.fillRect(0, 0, size, size)
  const planks = 6
  for (let p = 0; p < planks; p++) {
    const y = (p * size) / planks
    const h = size / planks
    const tone = 0.88 + Math.random() * 0.22
    ctx.fillStyle = `rgb(${clamp255(176 * tone)},${clamp255(132 * tone)},${clamp255(92 * tone)})`
    ctx.fillRect(0, y, size, h - 2)
    ctx.strokeStyle = 'rgba(72,44,24,0.28)'
    ctx.lineWidth = 1.5
    for (let g = 0; g < 26; g++) {
      const gy = y + Math.random() * h
      ctx.beginPath()
      ctx.moveTo(0, gy)
      for (let x = 0; x <= size; x += 32) ctx.lineTo(x, gy + Math.sin(x * 0.02 + p) * 2.2)
      ctx.stroke()
    }
    ctx.fillStyle = 'rgba(52,30,14,0.35)'
    ctx.fillRect(0, y + h - 2, size, 2)
  }
  speckle(ctx, size, size, 900, 0.04)
  return c
}

/* -------------------------------------------------------------- plaster --- */

function plaster(size = 256, base = '#efe8da') {
  const { c, ctx } = cv(size, size)
  ctx.fillStyle = base
  ctx.fillRect(0, 0, size, size)
  for (let i = 0; i < 2600; i++) {
    const shade = Math.random() > 0.5 ? 255 : 120
    ctx.fillStyle = `rgba(${shade},${shade},${shade},${0.02 + Math.random() * 0.05})`
    ctx.fillRect(Math.random() * size, Math.random() * size, 1 + Math.random() * 3, 1 + Math.random() * 3)
  }
  return c
}

function concrete(size = 256) {
  const { c, ctx } = cv(size, size)
  ctx.fillStyle = '#b4aea3'
  ctx.fillRect(0, 0, size, size)
  for (let i = 0; i < 90; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.10)' : 'rgba(70,66,58,0.09)'
    ctx.beginPath()
    ctx.arc(Math.random() * size, Math.random() * size, 8 + Math.random() * 40, 0, Math.PI * 2)
    ctx.fill()
  }
  speckle(ctx, size, size, 3000, 0.05)
  return c
}

/* --------------------------------------------------------------- panels --- */

function panel(opts: { kicker: string; title: string; lines: string[]; note?: string; hue?: string }) {
  const W = 512
  const H = 720
  const { c, ctx } = cv(W, H)
  const hue = opts.hue || '#8c5a41'
  ctx.fillStyle = '#f7f2e4'
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(22, 22, W - 44, H - 44)
  ctx.fillStyle = hue
  ctx.fillRect(22, 22, W - 44, 8)
  ctx.fillStyle = 'rgba(60,50,38,0.85)'
  ctx.font = '600 15px "Microsoft YaHei", sans-serif'
  ctx.fillText(opts.kicker, 46, 92)
  ctx.fillStyle = '#2f2a22'
  ctx.font = '700 40px "Songti SC", "SimSun", serif'
  const titleChars = opts.title.split('')
  let line = ''
  let ty = 152
  for (const ch of titleChars) {
    if (ctx.measureText(line + ch).width > 420) {
      ctx.fillText(line, 46, ty)
      ty += 52
      line = ch
    } else line += ch
  }
  ctx.fillText(line, 46, ty)
  let y = ty + 62
  ctx.fillStyle = 'rgba(120,104,80,0.5)'
  ctx.fillRect(46, y - 34, 120, 2)
  ctx.font = '400 17px "Microsoft YaHei", sans-serif'
  ctx.fillStyle = 'rgba(58,50,40,0.86)'
  for (const text of opts.lines) {
    let buf = ''
    for (const ch of text) {
      if (ctx.measureText(buf + ch).width > 404) {
        ctx.fillText(buf, 46, y)
        y += 30
        buf = ch
      } else buf += ch
    }
    ctx.fillText(buf, 46, y)
    y += 44
  }
  if (opts.note) {
    ctx.fillStyle = 'rgba(126,111,88,0.9)'
    ctx.font = '400 14px "Microsoft YaHei", sans-serif'
    let buf = ''
    let ny = H - 96
    for (const ch of opts.note) {
      if (ctx.measureText(buf + ch).width > 400) {
        ctx.fillText(buf, 46, ny)
        ny += 24
        buf = ch
      } else buf += ch
    }
    ctx.fillText(buf, 46, ny)
  }
  ctx.fillStyle = hue
  ctx.fillRect(46, H - 52, 44, 3)
  ctx.fillStyle = 'rgba(90,80,64,0.75)'
  ctx.font = '500 13px "Microsoft YaHei", sans-serif'
  ctx.fillText('HENU · ARCHITECTURE', 46, H - 30)
  return c
}

function signage() {
  const W = 1024
  const H = 256
  const { c, ctx } = cv(W, H)
  ctx.fillStyle = '#3f2a22'
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = '#e8d5ae'
  ctx.font = '700 88px "Songti SC", "SimSun", serif'
  ctx.textAlign = 'center'
  ctx.fillText('建筑工程学院', W / 2, 118)
  ctx.font = '400 26px "Microsoft YaHei", sans-serif'
  ctx.fillStyle = 'rgba(232,213,174,0.72)'
  ctx.fillText('SCHOOL OF ARCHITECTURE AND CIVIL ENGINEERING', W / 2, 168)
  ctx.fillStyle = 'rgba(232,213,174,0.4)'
  ctx.fillRect(W / 2 - 90, 196, 180, 2)
  return c
}

/* --------------------------------------------------------------- misc ----- */

function radial(size: number, inner: string, outer: string) {
  const { c, ctx } = cv(size, size)
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, inner)
  g.addColorStop(1, outer)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  return c
}

function aoStrip(size = 128) {
  const { c, ctx } = cv(size, 8)
  const g = ctx.createLinearGradient(0, 0, 0, 8)
  g.addColorStop(0, 'rgba(24,20,14,0.5)')
  g.addColorStop(1, 'rgba(24,20,14,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, 8)
  return c
}

function skyEquirect() {
  const W = 1024
  const H = 512
  const { c, ctx } = cv(W, H)
  const g = ctx.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, '#4d7fb8')
  g.addColorStop(0.34, '#8fb8dc')
  g.addColorStop(0.52, '#d7e4ee')
  g.addColorStop(0.58, '#d9d2bd')
  g.addColorStop(1, '#8e9a7c')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)
  const sun = ctx.createRadialGradient(660, 168, 0, 660, 168, 210)
  sun.addColorStop(0, 'rgba(255,246,224,0.95)')
  sun.addColorStop(0.35, 'rgba(255,238,200,0.35)')
  sun.addColorStop(1, 'rgba(255,238,200,0)')
  ctx.fillStyle = sun
  ctx.fillRect(0, 0, W, H)
  for (let i = 0; i < 26; i++) {
    ctx.fillStyle = `rgba(255,255,255,${0.12 + Math.random() * 0.2})`
    const x = Math.random() * W
    const y = 40 + Math.random() * 130
    ctx.beginPath()
    ctx.ellipse(x, y, 40 + Math.random() * 90, 8 + Math.random() * 14, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  const t = new T.CanvasTexture(c)
  t.mapping = T.EquirectangularReflectionMapping
  t.colorSpace = T.SRGBColorSpace
  return t
}

/* ------------------------------------------------------------- assembly --- */

export type Art = ReturnType<typeof createArt>

export function createArt() {
  const brickArt = brick()
  const brickMap = texture(brickArt.map, 1, 1)
  const brickNormal = texture(brickArt.normal)
  brickNormal.colorSpace = T.NoColorSpace

  const terr = texture(terrazzo(), 1, 1)
  const woodTex = texture(wood())
  const plasterTex = texture(plaster())
  const concreteTex = texture(concrete())

  const mats = {
    floor: new T.MeshStandardMaterial({ map: terr, roughness: 0.42, metalness: 0.05, envMapIntensity: 0.45 }),
    brick: new T.MeshStandardMaterial({ map: brickMap, normalMap: brickNormal, normalScale: new T.Vector2(0.6, 0.6), roughness: 0.9, metalness: 0 }),
    brickDark: new T.MeshStandardMaterial({ map: brickMap, normalMap: brickNormal, normalScale: new T.Vector2(0.5, 0.5), roughness: 0.94, color: '#a1a1a1' }),
    wood: new T.MeshStandardMaterial({ map: woodTex, color: '#d3bd9c', roughness: 0.46, metalness: 0.03, envMapIntensity: 0.55 }),
    plaster: new T.MeshStandardMaterial({ map: plasterTex, roughness: 0.95, metalness: 0, color: '#ece5d6' }),
    concrete: new T.MeshStandardMaterial({ map: concreteTex, roughness: 0.8, metalness: 0.02, color: '#d9d3c7' }),
    stone: new T.MeshStandardMaterial({ color: '#8d8880', roughness: 0.72, metalness: 0.04 }),
    steel: new T.MeshStandardMaterial({ color: '#6e7276', roughness: 0.38, metalness: 0.92, envMapIntensity: 1 }),
    brass: new T.MeshStandardMaterial({ color: '#b08d55', roughness: 0.4, metalness: 1, envMapIntensity: 1 }),
    glass: new T.MeshStandardMaterial({
      color: '#cfe3ee', roughness: 0.06, metalness: 0.1, transparent: true, opacity: 0.16,
      side: T.DoubleSide, depthWrite: false, envMapIntensity: 1.6,
    }),
    glassRail: new T.MeshStandardMaterial({
      color: '#dbe9ef', roughness: 0.1, metalness: 0.05, transparent: true, opacity: 0.2,
      side: T.DoubleSide, depthWrite: false, envMapIntensity: 1.2,
    }),
    leaf: new T.MeshStandardMaterial({ color: '#4b7446', roughness: 0.86, metalness: 0 }),
    leafLight: new T.MeshStandardMaterial({ color: '#6c9757', roughness: 0.8, metalness: 0 }),
    soil: new T.MeshStandardMaterial({ color: '#4a3c2d', roughness: 1 }),
    dark: new T.MeshStandardMaterial({ color: '#2c2823', roughness: 0.7 }),
    glowWarm: new T.MeshStandardMaterial({ color: '#fff3d2', emissive: '#ffdca0', emissiveIntensity: 2.6, roughness: 0.6 }),
    glowBlue: new T.MeshStandardMaterial({ color: '#bfe6ff', emissive: '#5fbcff', emissiveIntensity: 2.2, roughness: 0.5 }),
    blueprint: new T.MeshStandardMaterial({
      color: '#2f7fc4', emissive: '#2a7fd0', emissiveIntensity: 0.9, transparent: true, opacity: 0.34,
      roughness: 0.2, metalness: 0.1, side: T.DoubleSide, depthWrite: false,
    }),
    print: new T.MeshStandardMaterial({ color: '#f6f1e3', roughness: 0.8, metalness: 0 }),
    ceiling: new T.MeshStandardMaterial({ color: '#e9e2d3', roughness: 1, metalness: 0 }),
    hallFloor: new T.MeshStandardMaterial({ map: terr, roughness: 0.36, metalness: 0.06, envMapIntensity: 0.55 }),
  }

  return {
    mats,
    sky: skyEquirect(),
    glowTex: texture(radial(128, 'rgba(255,244,214,0.95)', 'rgba(255,244,214,0)'), 1, 1),
    dustTex: texture(radial(48, 'rgba(255,250,235,0.9)', 'rgba(255,250,235,0)'), 1, 1),
    aoTex: texture(aoStrip(), 1, 1),
    signageTex: texture(signage(), 1, 1),
    panels: [
      texture(panel({ kicker: 'EXHIBITION 01', title: '学院 · 1931—2024', hue: '#8c5a41', lines: ['1931 年，校长许心武创办土木系；2002 年成立土木建筑学院；2024 年 5 月更名为建筑工程学院。', '教学与实验大楼约两万平方米，实验室分布在金明校区十六组团 A、B、D 座。'], note: '沿革依据学院公开简介整理；空间与展陈为本项目编写。' }), 1, 1),
      texture(panel({ kicker: 'EXHIBITION 02', title: '结构 · 力的路径', hue: '#3f5f6b', lines: ['荷载从板到梁，从梁到柱，再落到基础。', '连廊之所以能悬在空中，是因为力被这一段段接力传下去。'], note: '展陈内容为教学示意，非学院正式文本。' }), 1, 1),
      texture(panel({ kicker: 'EXHIBITION 03', title: '材料 · 砖与玻璃', hue: '#7a6440', lines: ['砖以 240 毫米为基本模数，一块块叠出厚度与温度。', '玻璃把光线引进来，也把校园的树影留在立面上。'], note: '展陈内容为教学示意，非学院正式文本。' }), 1, 1),
      texture(panel({ kicker: 'EXHIBITION 04', title: '光影 · 一天四次', hue: '#5c6b4a', lines: ['早晨的光斜而软，中午的光短而硬。', '傍晚把窗格拉长成影子，夜里则反过来，由室内照亮院子。'], note: '展陈内容为教学示意，非学院正式文本。' }), 1, 1),
    ],
  }
}
