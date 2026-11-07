import T from '../three-vendor'

/* ------------------------------------------------------------------ 画布 --- */

export const clamp255 = (v: number) => Math.max(0, Math.min(255, v | 0))

export function cv(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return { c, ctx: c.getContext('2d') as CanvasRenderingContext2D }
}

export function tex(c: HTMLCanvasElement, rx = 1, ry = 1) {
  const t = new T.CanvasTexture(c)
  t.wrapS = t.wrapT = T.RepeatWrapping
  t.repeat.set(rx, ry)
  t.colorSpace = T.SRGBColorSpace
  t.anisotropy = 8
  return t
}

export function speckle(ctx: CanvasRenderingContext2D, w: number, h: number, count: number, alpha: number) {
  for (let i = 0; i < count; i++) {
    const shade = Math.random() > 0.5 ? 255 : 0
    ctx.fillStyle = `rgba(${shade},${shade},${shade},${alpha * (0.3 + Math.random())})`
    ctx.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1 + Math.random() * 2)
  }
}

/** 米色 800×800 抛光砖，一张贴图 = 3.2 m（4 块）。 */
export function tileBeige(size = 512) {
  const { c, ctx } = cv(size, size)
  const n = 4
  const s = size / n
  ctx.fillStyle = '#bdb5a3'
  ctx.fillRect(0, 0, size, size)
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const t = 0.955 + Math.random() * 0.075
      ctx.fillStyle = `rgb(${clamp255(226 * t)},${clamp255(217 * t)},${clamp255(200 * t)})`
      ctx.fillRect(i * s + 1.4, j * s + 1.4, s - 2.8, s - 2.8)
      for (let k = 0; k < 8; k++) {
        ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,250,0.07)' : 'rgba(148,138,118,0.05)'
        ctx.beginPath()
        ctx.arc(i * s + Math.random() * s, j * s + Math.random() * s, s * (0.12 + Math.random() * 0.3), 0, Math.PI * 2)
        ctx.fill()
      }
      // 砖面本身的高光带，让抛光感成立
      const g = ctx.createLinearGradient(i * s, j * s, i * s + s, j * s + s)
      g.addColorStop(0, 'rgba(255,255,255,0.10)')
      g.addColorStop(0.5, 'rgba(255,255,255,0)')
      g.addColorStop(1, 'rgba(255,255,255,0.05)')
      ctx.fillStyle = g
      ctx.fillRect(i * s + 1.4, j * s + 1.4, s - 2.8, s - 2.8)
    }
  }
  speckle(ctx, size, size, 1400, 0.035)
  return c
}

/** 矿棉板吊顶：600×600，T 型龙骨。一张贴图 = 1.8 m（3 格）。 */
export function ceilingBoard(size = 384) {
  const { c, ctx } = cv(size, size)
  const n = 3
  const s = size / n
  ctx.fillStyle = '#d8d4c9'
  ctx.fillRect(0, 0, size, size)
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      ctx.fillStyle = Math.random() > 0.5 ? '#eeeae1' : '#e9e5db'
      ctx.fillRect(i * s + 1, j * s + 1, s - 2, s - 2)
      for (let k = 0; k < 90; k++) {
        ctx.fillStyle = Math.random() > 0.5 ? 'rgba(190,185,172,0.5)' : 'rgba(255,255,255,0.6)'
        ctx.fillRect(i * s + Math.random() * s, j * s + Math.random() * s, 1.5, 1.5)
      }
    }
  }
  return c
}

/** 拉丝不锈钢：竖向细拉丝。 */
export function stainless(size = 512) {
  const { c, ctx } = cv(size, size)
  const g = ctx.createLinearGradient(0, 0, 0, size)
  g.addColorStop(0, '#b9bcc0')
  g.addColorStop(0.42, '#d3d6da')
  g.addColorStop(0.55, '#c2c5c9')
  g.addColorStop(1, '#a8abb0')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  for (let i = 0; i < 2600; i++) {
    const y = Math.random() * size
    ctx.strokeStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.16)' : 'rgba(90,94,100,0.13)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(size, y + (Math.random() - 0.5) * 2)
    ctx.stroke()
  }
  return c
}

/** 象牙白洞石：横向层理 + 细孔。 */
export function travertine(size = 512) {
  const { c, ctx } = cv(size, size)
  ctx.fillStyle = '#e3d8c4'
  ctx.fillRect(0, 0, size, size)
  for (let i = 0; i < 120; i++) {
    const y = Math.random() * size
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,252,244,0.35)' : 'rgba(186,170,145,0.22)'
    ctx.fillRect(0, y, size, 1 + Math.random() * 7)
  }
  for (let i = 0; i < 700; i++) {
    ctx.fillStyle = `rgba(150,136,112,${0.08 + Math.random() * 0.16})`
    ctx.beginPath()
    ctx.ellipse(Math.random() * size, Math.random() * size, 1 + Math.random() * 2.4, 0.8 + Math.random() * 1.6, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  speckle(ctx, size, size, 1200, 0.03)
  return c
}

/** 深棕木纹地板砖（陈列厅）。 */
export function woodTile(size = 512) {
  const { c, ctx } = cv(size, size)
  const rows = 8
  for (let r = 0; r < rows; r++) {
    const y = (r * size) / rows
    const h = size / rows
    const tone = 0.86 + Math.random() * 0.26
    ctx.fillStyle = `rgb(${clamp255(128 * tone)},${clamp255(100 * tone)},${clamp255(78 * tone)})`
    ctx.fillRect(0, y, size, h - 1.5)
    ctx.strokeStyle = 'rgba(52,32,16,0.26)'
    ctx.lineWidth = 1
    for (let g = 0; g < 14; g++) {
      const gy = y + Math.random() * h
      ctx.beginPath()
      ctx.moveTo(0, gy)
      for (let x = 0; x <= size; x += 40) ctx.lineTo(x, gy + Math.sin(x * 0.02 + r) * 1.6)
      ctx.stroke()
    }
    ctx.fillStyle = 'rgba(38,22,10,0.34)'
    ctx.fillRect(0, y + h - 1.5, size, 1.5)
  }
  speckle(ctx, size, size, 700, 0.035)
  return c
}

/** 灰木纹瓷砖（荣誉墙底色）。 */
export function grayWood(size = 512) {
  const { c, ctx } = cv(size, size)
  ctx.fillStyle = '#8e8a83'
  ctx.fillRect(0, 0, size, size)
  for (let r = 0; r < 6; r++) {
    const y = (r * size) / 6
    const h = size / 6
    const tone = 0.9 + Math.random() * 0.18
    ctx.fillStyle = `rgb(${clamp255(150 * tone)},${clamp255(146 * tone)},${clamp255(138 * tone)})`
    ctx.fillRect(0, y, size, h - 1)
    for (let g = 0; g < 18; g++) {
      const gy = y + Math.random() * h
      ctx.strokeStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.10)' : 'rgba(70,68,64,0.12)'
      ctx.beginPath()
      ctx.moveTo(0, gy)
      for (let x = 0; x <= size; x += 56) ctx.lineTo(x, gy + Math.sin(x * 0.014 + r * 2) * 2.4)
      ctx.stroke()
    }
  }
  return c
}

/** 红色橡胶步道。 */
export function rubber(size = 256) {
  const { c, ctx } = cv(size, size)
  ctx.fillStyle = '#a8503f'
  ctx.fillRect(0, 0, size, size)
  for (let i = 0; i < 5200; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(196,110,92,0.5)' : 'rgba(120,52,42,0.4)'
    ctx.fillRect(Math.random() * size, Math.random() * size, 1.6, 1.6)
  }
  return c
}

/** 浅灰花岗岩大板（柱廊与广场）。 */
export function granitePaving(size = 512) {
  const { c, ctx } = cv(size, size)
  const n = 4
  const s = size / n
  ctx.fillStyle = '#b3b1aa'
  ctx.fillRect(0, 0, size, size)
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const t = 0.94 + Math.random() * 0.12
      ctx.fillStyle = `rgb(${clamp255(192 * t)},${clamp255(190 * t)},${clamp255(184 * t)})`
      ctx.fillRect(i * s + 1.6, j * s + 1.6, s - 3.2, s - 3.2)
      for (let k = 0; k < 220; k++) {
        ctx.fillStyle = Math.random() > 0.5 ? 'rgba(90,90,88,0.35)' : 'rgba(240,240,236,0.4)'
        ctx.fillRect(i * s + Math.random() * s, j * s + Math.random() * s, 1.4, 1.4)
      }
    }
  }
  return c
}

/** 环向木纹条板（柱廊吊顶）：同心圆细条纹。 */
export function slatRing(size = 512) {
  const { c, ctx } = cv(size, size)
  ctx.fillStyle = '#6d4433'
  ctx.fillRect(0, 0, size, size)
  const cx = size / 2
  const cy = size / 2
  for (let r = 2; r < size * 0.72; r += 7) {
    ctx.strokeStyle = 'rgba(150,96,70,0.75)'
    ctx.lineWidth = 3.2
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.stroke()
    ctx.strokeStyle = 'rgba(38,22,16,0.42)'
    ctx.lineWidth = 1.4
    ctx.beginPath()
    ctx.arc(cx, cy, r + 3.6, 0, Math.PI * 2)
    ctx.stroke()
  }
  return c
}

/** 红砖 + 白框窗的外立面贴图：一张 = 6 m × 6 m。 */
export function brickFacade(size = 512) {
  const { c, ctx } = cv(size, size)
  const rows = 34
  const bh = size / rows
  ctx.fillStyle = '#b9a894'
  ctx.fillRect(0, 0, size, size)
  const cols = 8
  const bw = size / cols
  for (let r = 0; r < rows; r++) {
    const off = r % 2 ? bw * 0.5 : 0
    for (let i = -1; i <= cols; i++) {
      const x = i * bw + off + 1.5
      const y = r * bh + 1.5
      const s = 0.86 + Math.random() * 0.28
      ctx.fillStyle = `rgb(${clamp255(168 * s)},${clamp255(96 * s)},${clamp255(74 * s)})`
      ctx.fillRect(x, y, bw - 3, bh - 3)
    }
  }
  // 两樘白框窗
  const win = (wx: number, wy: number, ww: number, wh: number) => {
    ctx.fillStyle = '#e8e6df'
    ctx.fillRect(wx - 7, wy - 7, ww + 14, wh + 14)
    const g = ctx.createLinearGradient(wx, wy, wx + ww, wy + wh)
    g.addColorStop(0, '#4a5560')
    g.addColorStop(0.45, '#7d8b96')
    g.addColorStop(1, '#39424b')
    ctx.fillStyle = g
    ctx.fillRect(wx, wy, ww, wh)
    ctx.fillStyle = '#e8e6df'
    ctx.fillRect(wx + ww / 2 - 3, wy, 6, wh)
    ctx.fillRect(wx, wy + wh * 0.46, ww, 6)
  }
  win(size * 0.1, size * 0.12, size * 0.28, size * 0.34)
  win(size * 0.56, size * 0.12, size * 0.28, size * 0.34)
  win(size * 0.1, size * 0.62, size * 0.28, size * 0.3)
  win(size * 0.56, size * 0.62, size * 0.28, size * 0.3)
  return c
}

/** 铜牌荣誉墙：整面一张贴图（7.2 m × 2.7 m），省掉几十个 mesh。 */
export function honorsWall(w = 1024, h = 384) {
  const { c, ctx } = cv(w, h)
  // 灰木纹底
  const base = grayWood()
  const pat = ctx.createPattern(base, 'repeat')
  if (pat) {
    ctx.fillStyle = pat
    ctx.fillRect(0, 0, w, h)
  }
  ctx.fillStyle = 'rgba(56,54,50,0.22)'
  ctx.fillRect(0, 0, w, h)
  const cols = 9
  const rows = 4
  const pw = Math.round(w / cols - 14)
  const ph = Math.round(h / rows - 22)
  const gx = (w - cols * pw) / (cols + 1)
  const gy = (h - rows * ph) / (rows + 1)
  for (let r = 0; r < rows; r++) {
    for (let i = 0; i < cols; i++) {
      const x = gx + i * (pw + gx)
      const y = gy + r * (ph + gy)
      const g = ctx.createLinearGradient(x, y, x + pw, y + ph)
      g.addColorStop(0, '#d3b273')
      g.addColorStop(0.3, '#b08a4b')
      g.addColorStop(0.58, '#dcbe83')
      g.addColorStop(1, '#a17d3c')
      ctx.fillStyle = g
      ctx.fillRect(x, y, pw, ph)
      // 牌面只留一圈很细的凹凸边，别做成画框
      ctx.strokeStyle = 'rgba(255,246,214,0.5)'
      ctx.lineWidth = 1
      ctx.strokeRect(x + 2.5, y + 2, pw - 5, ph - 4)
      ctx.strokeStyle = 'rgba(84,60,24,0.4)'
      ctx.strokeRect(x + 4, y + 3.5, pw - 8, ph - 7)
      // 牌面字迹：只画横线，远看像密排小字
      ctx.strokeStyle = 'rgba(70,50,20,0.5)'
      for (let l = 0; l < 3; l++) {
        ctx.lineWidth = l === 0 ? 3 : 1.3
        const lw = l === 0 ? pw * 0.42 : pw * (0.44 + Math.random() * 0.3)
        ctx.beginPath()
        ctx.moveTo(x + (pw - lw) / 2, y + ph * 0.34 + l * (ph * 0.2))
        ctx.lineTo(x + (pw + lw) / 2, y + ph * 0.34 + l * (ph * 0.2))
        ctx.stroke()
      }
    }
  }
  return c
}

/** 水磨石：浅灰底 + 细石粒，楼梯踏面用。 */
export function terrazzo(size = 256) {
  const { c, ctx } = cv(size, size)
  ctx.fillStyle = '#cecbc0'
  ctx.fillRect(0, 0, size, size)
  for (let i = 0; i < 2800; i++) {
    const r = Math.random()
    ctx.fillStyle = r > 0.74 ? 'rgba(112,110,102,0.5)' : r > 0.42 ? 'rgba(248,246,238,0.7)' : 'rgba(158,156,146,0.42)'
    const w = 1 + Math.random() * 2.2
    ctx.fillRect(Math.random() * size, Math.random() * size, w, w)
  }
  return c
}

/** 青瓦屋面：竖向瓦垄 + 极淡的横缝，贴到四坡屋面上正好顺坡。 */
export function roofTiles(size = 256) {
  const { c, ctx } = cv(size, size)
  ctx.fillStyle = '#565b60'
  ctx.fillRect(0, 0, size, size)
  const n = 24
  const w = size / n
  for (let i = 0; i < n; i++) {
    const t = 0.84 + Math.random() * 0.32
    ctx.fillStyle = `rgb(${Math.round(92 * t)},${Math.round(97 * t)},${Math.round(103 * t)})`
    ctx.fillRect(i * w + 1, 0, w - 2, size)
    ctx.fillStyle = 'rgba(28,32,36,0.55)'
    ctx.fillRect(i * w + w - 2, 0, 2, size)
  }
  for (let y = 0; y < size; y += size / 9) {
    ctx.fillStyle = 'rgba(255,255,255,0.055)'
    ctx.fillRect(0, y, size, 2)
  }
  return c
}

/** 透明底金属字（院名、楼层号之类）。 */
export function metalText(text: string, en: string | null, w = 1024, h = 256, color = '#4d4f52', font = '700 128px "Songti SC","SimSun",serif') {
  const { c, ctx } = cv(w, h)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = color
  ctx.font = font
  ctx.fillText(text, w / 2, en ? h * 0.42 : h / 2)
  if (en) {
    ctx.fillStyle = color
    ctx.font = '400 34px "Microsoft YaHei",sans-serif'
    ctx.fillText(en, w / 2, h * 0.78)
  }
  return c
}

/** 金属字带一点高光边，让它像凸出来的字而不是印上去的。 */
export function metalTextLit(text: string, en: string | null, w = 1024, h = 256) {
  const { c, ctx } = cv(w, h)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = '700 128px "Songti SC","SimSun",serif'
  ctx.fillStyle = 'rgba(255,246,220,0.95)'
  ctx.fillText(text, w / 2 + 3, (en ? h * 0.42 : h / 2) + 3)
  ctx.fillStyle = '#6d5227'
  ctx.fillText(text, w / 2, en ? h * 0.42 : h / 2)
  if (en) {
    ctx.font = '400 32px "Microsoft YaHei",sans-serif'
    ctx.fillStyle = '#7d6438'
    ctx.fillText(en, w / 2, h * 0.78)
  }
  return c
}

/** 校徽（简化：深蓝圆 + 白环 + 1912）。 */
export function crest(size = 256) {
  const { c, ctx } = cv(size, size)
  const r = size / 2
  ctx.fillStyle = '#1d3f74'
  ctx.beginPath()
  ctx.arc(r, r, r - 2, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#e3c98a'
  ctx.lineWidth = size * 0.035
  ctx.beginPath()
  ctx.arc(r, r, r * 0.82, 0, Math.PI * 2)
  ctx.stroke()
  ctx.strokeStyle = 'rgba(227,201,138,0.75)'
  ctx.lineWidth = size * 0.014
  ctx.beginPath()
  ctx.arc(r, r, r * 0.66, 0, Math.PI * 2)
  ctx.stroke()
  ctx.fillStyle = '#f2e6c8'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `700 ${size * 0.26}px "Songti SC","SimSun",serif`
  ctx.fillText('1912', r, r * 1.06)
  ctx.font = `400 ${size * 0.07}px "Microsoft YaHei",sans-serif`
  ctx.fillText('HENAN UNIVERSITY', r, r * 1.44)
  return c
}

/** 优秀毕业生易拉宝。 */
export function graduateBanner(w = 256, h = 640) {
  const { c, ctx } = cv(w, h)
  const g = ctx.createLinearGradient(0, 0, 0, h)
  g.addColorStop(0, '#233a5c')
  g.addColorStop(0.55, '#1b2c46')
  g.addColorStop(1, '#31496b')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = '#e6ecf5'
  ctx.font = '700 20px "Microsoft YaHei",sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('优秀毕业生', w / 2, 46)
  ctx.font = '400 13px "Microsoft YaHei",sans-serif'
  ctx.fillStyle = 'rgba(214,226,242,0.6)'
  ctx.fillText('建筑工程学院', w / 2, 70)
  // 人像框
  ctx.fillStyle = '#c9d4e2'
  ctx.fillRect(w / 2 - 42, 96, 84, 108)
  ctx.fillStyle = '#8fa0b6'
  ctx.beginPath()
  ctx.arc(w / 2, 138, 26, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(w / 2, 205, 38, 30, 0, Math.PI, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#f0f4fa'
  ctx.font = '700 17px "Microsoft YaHei",sans-serif'
  ctx.fillText('2024 届', w / 2, 236)
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = `rgba(196,212,232,${0.14 + Math.random() * 0.14})`
    ctx.fillRect(24, 262 + i * 17, w - 48 - Math.random() * 46, 5)
  }
  ctx.fillStyle = 'rgba(226,236,248,0.5)'
  ctx.fillRect(24, h - 46, 40, 2)
  return c
}

/** 尽端展柜的红底摄影展：小图网格 + 通栏标题。 */
export function photoCase(w = 512, h = 340) {
  const { c, ctx } = cv(w, h)
  ctx.fillStyle = '#9d2c25'
  ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = '#7d1f1a'
  ctx.fillRect(0, 0, w, 46)
  ctx.fillStyle = '#f3e2c4'
  ctx.font = '700 24px "Microsoft YaHei",sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('土木建筑学院 · 摄影作品展', w / 2, 31)
  const cols = 5
  const rows = 3
  const gw = (w - 60) / cols
  const gh = (h - 90) / rows
  for (let r = 0; r < rows; r++) {
    for (let i = 0; i < cols; i++) {
      const x = 30 + i * gw + 5
      const y = 60 + r * gh + 5
      const t = 0.75 + Math.random() * 0.5
      const g = ctx.createLinearGradient(x, y, x + gw - 10, y + gh - 10)
      g.addColorStop(0, `rgba(${clamp255(120 * t)},${clamp255(140 * t)},${clamp255(150 * t)},1)`)
      g.addColorStop(1, `rgba(${clamp255(70 * t)},${clamp255(86 * t)},${clamp255(94 * t)},1)`)
      ctx.fillStyle = g
      ctx.fillRect(x, y, gw - 10, gh - 10)
      ctx.fillStyle = 'rgba(255,255,255,0.7)'
      ctx.fillRect(x, y + gh - 18, gw - 10, 3)
    }
  }
  return c
}
