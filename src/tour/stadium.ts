import T from '../three-vendor'

/**
 * 志义体育场 · 艺术重建（室外场景）
 *
 * 与 `hall.ts` 同一套美术规格：MeshStandardMaterial + 程序化贴图、
 * 暖阳方向光 + 半球光、PCFSoft 阴影、PMREM 环境反射、ACES 0.8。
 * 尺寸依据卫星影像与实况照片估算（八道环形跑道 · 百米直道 / 105×68 内场 / 单侧罩棚看台），
 * 属于艺术重建，不是测绘成果。
 */

export const DIM = {
  straight: 100,
  rInner: 36.5,
  laneW: 1.22,
  lanes: 8,
  pitchL: 105,
  pitchW: 68,
  apronL: 200,
  apronW: 146,
}

export type Stadium = ReturnType<typeof createStadium>

function color(hex: string) {
  return new T.Color(hex)
}

function canvasTex(key: string, size: number, draw: (ctx: CanvasRenderingContext2D, s: number) => void, repeat: [number, number]) {
  const c = document.createElement('canvas')
  c.width = c.height = size
  draw(c.getContext('2d') as CanvasRenderingContext2D, size)
  const t = new T.CanvasTexture(c)
  t.colorSpace = T.SRGBColorSpace
  t.wrapS = T.RepeatWrapping
  t.wrapT = T.RepeatWrapping
  t.repeat.set(repeat[0], repeat[1])
  t.anisotropy = 8
  t.name = key
  return t
}

function seeded(seed: number) {
  let s = seed
  return () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648
}

export function createStadium(shadowSize = 2048) {
  const scene = new T.Scene()
  scene.background = color('#cfd9e2')
  scene.fog = new T.Fog('#c9d6e0', 300, 1150)

  const trackTex = canvasTex('track', 256, (ctx, S) => {
    const r = seeded(7)
    ctx.fillStyle = '#8d3d2b'
    ctx.fillRect(0, 0, S, S)
    for (let i = 0; i < 5200; i++) {
      const x = r() * S
      const y = r() * S
      ctx.fillStyle = r() > 0.55 ? 'rgba(214,150,120,0.26)' : 'rgba(80,45,32,0.24)'
      ctx.fillRect(x, y, 1 + r() * 1.6, 1 + r() * 1.6)
    }
  }, [26, 26])

  const apronTex = canvasTex('apron', 256, (ctx, S) => {
    const r = seeded(13)
    ctx.fillStyle = '#a9674c'
    ctx.fillRect(0, 0, S, S)
    for (let i = 0; i < 4200; i++) {
      ctx.fillStyle = r() > 0.5 ? 'rgba(220,190,170,0.20)' : 'rgba(110,70,55,0.18)'
      ctx.fillRect(r() * S, r() * S, 2, 2)
    }
  }, [30, 22])

  const turfTex = canvasTex('turf', 256, (ctx, S) => {
    const r = seeded(11)
    ctx.fillStyle = '#5f8f52'
    ctx.fillRect(0, 0, S, S)
    for (let i = 0; i < 3800; i++) {
      ctx.fillStyle = r() > 0.5 ? 'rgba(120,160,105,0.4)' : 'rgba(70,105,65,0.35)'
      ctx.fillRect(r() * S, r() * S, 1.5, 1.5)
    }
  }, [18, 12])

  const concTex = canvasTex('conc', 256, (ctx, S) => {
    const r = seeded(23)
    ctx.fillStyle = '#cfc7b4'
    ctx.fillRect(0, 0, S, S)
    for (let i = 0; i < 2600; i++) {
      ctx.fillStyle = r() > 0.5 ? 'rgba(255,255,255,0.22)' : 'rgba(120,112,98,0.16)'
      ctx.fillRect(r() * S, r() * S, 2, 2)
    }
  }, [12, 12])

  const seatTex = (base: string, seed: number) => canvasTex('seat' + base, 128, (ctx, S) => {
    const r = seeded(seed)
    ctx.fillStyle = base
    ctx.fillRect(0, 0, S, S)
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 8; x++) {
        ctx.fillStyle = 'rgba(0,0,0,0.15)'
        ctx.fillRect(x * 16 + 2, y * 32 + 2, 12, 26)
        ctx.fillStyle = 'rgba(255,255,255,0.13)'
        ctx.fillRect(x * 16 + 3, y * 32 + 3, 10, 6)
      }
      ctx.fillStyle = 'rgba(0,0,0,0.05)'
      ctx.fillRect(0, y * 32 + 30 + r() * 1, S, 1)
    }
  }, [10, 4])

  const winTex = canvasTex('win', 256, (ctx, S) => {
    ctx.fillStyle = '#e6dcc8'
    ctx.fillRect(0, 0, S, S)
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 6; x++) {
        const px = 10 + x * 41
        const py = 12 + y * 60
        ctx.fillStyle = '#7f9db8'
        ctx.fillRect(px, py, 30, 40)
        ctx.fillStyle = 'rgba(255,255,255,0.5)'
        ctx.fillRect(px, py, 30, 8)
        ctx.fillStyle = 'rgba(60,70,80,0.25)'
        ctx.fillRect(px, py + 38, 30, 3)
      }
    }
  }, [3, 2])

  const boardTex = (text: string) => canvasTex('board' + text, 512, (ctx, S) => {
    ctx.fillStyle = '#2f3b45'
    ctx.fillRect(0, 0, S, S)
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'
    ctx.lineWidth = 6
    ctx.strokeRect(14, 14, S - 28, S - 28)
    ctx.fillStyle = '#f4efe2'
    ctx.font = 'bold 74px "Microsoft YaHei", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, S / 2, S / 2)
  }, [1, 1])

  const M = {
    lawn: new T.MeshStandardMaterial({ color: '#7d9a63', roughness: 0.96 }),
    track: new T.MeshStandardMaterial({ map: trackTex, roughness: 0.9 }),
    apron: new T.MeshStandardMaterial({ map: apronTex, roughness: 0.9 }),
    turf: new T.MeshStandardMaterial({ map: turfTex, roughness: 0.94 }),
    line: new T.MeshStandardMaterial({ color: '#f2eee2', roughness: 0.75 }),
    conc: new T.MeshStandardMaterial({ map: concTex, roughness: 0.86 }),
    concDark: new T.MeshStandardMaterial({ color: '#b3aa95', roughness: 0.88 }),
    seatBlue: new T.MeshStandardMaterial({ map: seatTex('#4f74a8', 31), roughness: 0.76 }),
    seatRed: new T.MeshStandardMaterial({ map: seatTex('#b0524a', 32), roughness: 0.76 }),
    seatYellow: new T.MeshStandardMaterial({ map: seatTex('#d9b25f', 33), roughness: 0.76 }),
    roof: new T.MeshStandardMaterial({ color: '#c9d1d6', roughness: 0.55, metalness: 0.22 }),
    steel: new T.MeshStandardMaterial({ color: '#9aa3a8', roughness: 0.42, metalness: 0.72 }),
    steelDark: new T.MeshStandardMaterial({ color: '#7b858a', roughness: 0.5, metalness: 0.6 }),
    trunk: new T.MeshStandardMaterial({ color: '#6a5340', roughness: 0.95 }),
    crownA: new T.MeshStandardMaterial({ color: '#4e7a4a', roughness: 0.9, flatShading: true }),
    crownB: new T.MeshStandardMaterial({ color: '#5e8c50', roughness: 0.9, flatShading: true }),
    crownC: new T.MeshStandardMaterial({ color: '#436b42', roughness: 0.9, flatShading: true }),
    wall: new T.MeshStandardMaterial({ color: '#e0d6c2', roughness: 0.8 }),
    brick: new T.MeshStandardMaterial({ color: '#a9735c', roughness: 0.86 }),
    win: new T.MeshStandardMaterial({ map: winTex, roughness: 0.55 }),
    lamp: new T.MeshStandardMaterial({ color: '#fff3d4', emissive: '#ffe3a8', emissiveIntensity: 1.4, roughness: 0.6 }),
    mast: new T.MeshStandardMaterial({ color: '#b9bec2', roughness: 0.45, metalness: 0.55 }),
    white: new T.MeshStandardMaterial({ color: '#f4f1e6', roughness: 0.8 }),
    dark: new T.MeshStandardMaterial({ color: '#3a3f42', roughness: 0.8 }),
  }

  const world = new T.Group()
  scene.add(world)
  const disposables: any[] = []
  const track = (obj: any) => {
    obj.traverse((o: any) => {
      if (o.isMesh) {
        disposables.push(o.geometry)
        for (const m of Array.isArray(o.material) ? o.material : [o.material]) if (m) disposables.push(m)
      }
    })
  }
  const add = (mesh: any, cast = true, receive = true) => {
    mesh.castShadow = cast
    mesh.receiveShadow = receive
    world.add(mesh)
    track(mesh)
    return mesh
  }

  // ---- 光照（与 hall.ts 同步的规格）----
  const hemi = new T.HemisphereLight('#e8e2d6', '#6f5638', 0.22)
  scene.add(hemi)
  const sun = new T.DirectionalLight('#ffd9a3', 4.3)
  sun.position.set(-140, 86, 66)
  sun.castShadow = true
  sun.shadow.mapSize.set(shadowSize, shadowSize)
  const sc = sun.shadow.camera
  sc.left = -160
  sc.right = 160
  sc.top = 160
  sc.bottom = -160
  sc.near = 20
  sc.far = 460
  sun.shadow.bias = -0.0005
  sun.shadow.normalBias = 0.03
  sun.shadow.radius = 2.2
  scene.add(sun)
  scene.add(sun.target)
  const fill = new T.DirectionalLight('#cdd6e2', 0.22)
  fill.position.set(90, 70, -120)
  scene.add(fill)

  // ---- 天空穹顶（渐变 + 太阳光晕）----
  {
    const skyGeo = new T.SphereGeometry(900, 32, 16)
    const skyMat = new T.ShaderMaterial({
      side: T.BackSide,
      depthWrite: false,
      uniforms: {
        top: { value: new T.Color('#5b86bd') },
        mid: { value: new T.Color('#cfe0ea') },
        bottom: { value: new T.Color('#e8dfc9') },
      },
      vertexShader: 'varying vec3 vPos; void main(){ vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: [
        'varying vec3 vPos;',
        'uniform vec3 top; uniform vec3 mid; uniform vec3 bottom;',
        'void main(){',
        '  float h = normalize(vPos).y;',
        '  vec3 c = mix(bottom, mid, smoothstep(-0.05, 0.28, h));',
        '  c = mix(c, top, smoothstep(0.25, 0.85, h));',
        '  gl_FragColor = vec4(c, 1.0);',
        '}',
      ].join('\n'),
    })
    const sky = new T.Mesh(skyGeo, skyMat)
    sky.frustumCulled = false
    scene.add(sky)
  }
  // ---- 地面 ----
  const lawn = new T.Mesh(new T.PlaneGeometry(1800, 1800), M.lawn)
  lawn.rotation.x = -Math.PI / 2
  lawn.receiveShadow = true
  world.add(lawn)

  const mkBox = (w: number, h: number, d: number, mat: any, x: number, y: number, z: number, cast = true) => {
    const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat)
    m.position.set(x, y, z)
    return add(m, cast, true)
  }

  // 红区 + 混凝土包边
  mkBox(DIM.apronL, 0.5, DIM.apronW, M.apron, 0, 0.25, 0, false)
  mkBox(DIM.apronL + 2.6, 0.4, DIM.apronW + 2.6, M.concDark, 0, 0.2, 0, false)

  // 跑道环
  const capsuleShape = (r: number) => {
    const s = new T.Shape()
    const h = DIM.straight / 2
    s.absarc(h, 0, r, -Math.PI / 2, Math.PI / 2, false)
    s.absarc(-h, 0, r, Math.PI / 2, (Math.PI * 3) / 2, false)
    s.closePath()
    return s
  }
  const rOuter = DIM.rInner + DIM.laneW * DIM.lanes
  const ringShape = capsuleShape(rOuter)
  ringShape.holes.push(new T.Path().setFromPoints(capsuleShape(DIM.rInner).getPoints(180)))
  const ring = new T.Mesh(new T.ExtrudeGeometry(ringShape, { depth: 0.12, bevelEnabled: false }), M.track)
  ring.rotation.x = -Math.PI / 2
  ring.position.y = 0.52
  add(ring, false, true)

  // 分道线
  const laneMat = new T.MeshStandardMaterial({ color: '#efe7d6', roughness: 0.7, side: T.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 })
  const laneLine = (r: number, width = 0.045) => {
    const pts: any[] = []
    const h = DIM.straight / 2
    for (let k = 0; k <= 60; k++) {
      const t = -Math.PI / 2 + (Math.PI * k) / 60
      pts.push(new T.Vector3(h + Math.cos(t) * r, 0.66, Math.sin(t) * r))
    }
    for (let k = 0; k <= 60; k++) {
      const t = Math.PI / 2 + (Math.PI * k) / 60
      pts.push(new T.Vector3(-h + Math.cos(t) * r, 0.66, Math.sin(t) * r))
    }
    pts.push(pts[0].clone())
    const pos: number[] = []
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i]
      const b = pts[i + 1]
      const dx = b.x - a.x
      const dz = b.z - a.z
      const len = Math.hypot(dx, dz) || 1e-6
      const nx = (-dz / len) * width * 0.5
      const nz = (dx / len) * width * 0.5
      pos.push(a.x + nx, a.y, a.z + nz, b.x + nx, b.y, b.z + nz, b.x - nx, b.y, b.z - nz)
      pos.push(a.x + nx, a.y, a.z + nz, b.x - nx, b.y, b.z - nz, a.x - nx, a.y, a.z - nz)
    }
    const g = new T.BufferGeometry()
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3))
    g.computeVertexNormals()
    const m = new T.Mesh(g, laneMat)
    world.add(m)
    disposables.push(g)
  }
  for (let i = 0; i <= DIM.lanes; i++) laneLine(DIM.rInner + i * DIM.laneW)

  // 内场
  mkBox(DIM.pitchL, 0.2, DIM.pitchW, M.turf, 0, 0.62, 0, false)
  for (let i = 0; i < 12; i += 2) {
    const w = DIM.pitchL / 12
    const s = new T.Mesh(new T.PlaneGeometry(w, DIM.pitchW), new T.MeshStandardMaterial({
      color: '#587f4c', roughness: 0.95, transparent: true, opacity: 0.5,
    }))
    s.rotation.x = -Math.PI / 2
    s.position.set(-DIM.pitchL / 2 + w / 2 + i * w, 0.73, 0)
    add(s, false, true)
  }
  {
    const L = DIM.pitchL / 2
    const W = DIM.pitchW / 2
    const y = 0.78
    const seg = (pts: any[], w = 0.12) => {
      const pos: number[] = []
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i]
        const b = pts[i + 1]
        const dx = b.x - a.x
        const dz = b.z - a.z
        const len = Math.hypot(dx, dz) || 1e-6
        const nx = (-dz / len) * w * 0.5
        const nz = (dx / len) * w * 0.5
        pos.push(a.x + nx, y, a.z + nz, b.x + nx, y, b.z + nz, b.x - nx, y, b.z - nz)
        pos.push(a.x + nx, y, a.z + nz, b.x - nx, y, b.z - nz, a.x - nx, y, a.z - nz)
      }
      const g = new T.BufferGeometry()
      g.setAttribute('position', new T.Float32BufferAttribute(pos, 3))
      g.computeVertexNormals()
      const m = new T.Mesh(g, laneMat)
      world.add(m)
      disposables.push(g)
    }
    const V = (x: number, z: number) => new T.Vector3(x, y, z)
    seg([V(-L, -W), V(L, -W), V(L, W), V(-L, W), V(-L, -W)])
    seg([V(0, -W), V(0, W)])
    const circle: any[] = []
    for (let i = 0; i <= 48; i++) {
      const t = (i / 48) * Math.PI * 2
      circle.push(V(Math.cos(t) * 9.15, Math.sin(t) * 9.15))
    }
    seg(circle, 0.1)
    for (const sgn of [-1, 1]) {
      const bx = sgn * L
      seg([V(bx, -20.15), V(bx - sgn * 16.5, -20.15), V(bx - sgn * 16.5, 20.15), V(bx, 20.15)])
      seg([V(bx, -9.15), V(bx - sgn * 5.5, -9.15), V(bx - sgn * 5.5, 9.15), V(bx, 9.15)], 0.1)
    }
  }

  // ---- 看台（-Z 侧）----
  const STAND = { len: 132, rows: 12, rise: 0.62, depth: 0.92, front: -(rOuter + 9) }
  {
    const { len, rows, rise, depth, front } = STAND
    const totalH = rows * rise
    const back = mkBox(len, totalH + 2.6, 1.2, M.conc, 0, (totalH + 2.6) / 2, front - rows * depth - 0.6)
    back.castShadow = true
    const segs = [
      { x0: -len / 2, x1: -len / 6, mat: M.seatYellow },
      { x0: -len / 6, x1: len / 6, mat: M.seatRed },
      { x0: len / 6, x1: len / 2, mat: M.seatBlue },
    ]
    for (let r = 0; r < rows; r++) {
      const z = front - r * depth
      const y = r * rise
      const tread = mkBox(len, 0.14, depth, M.conc, 0, y + rise, z - depth / 2)
      tread.receiveShadow = true
      for (const s of segs) {
        const riser = mkBox(s.x1 - s.x0, rise, 0.1, s.mat, (s.x0 + s.x1) / 2, y + rise / 2, z, false)
        riser.receiveShadow = true
        mkBox(s.x1 - s.x0, 0.34, 0.34, s.mat, (s.x0 + s.x1) / 2, y + rise + 0.17, z - depth + 0.3)
      }
    }
    for (const ax of [-len / 2 + 6, -len / 6, len / 6, len / 2 - 6]) {
      mkBox(2.0, totalH + 0.3, rows * depth, M.concDark, ax, (totalH + 0.3) / 2, front - (rows * depth) / 2)
    }
    mkBox(len, 1.5, 0.5, M.white, 0, 0.55, front + 0.2)
    for (let i = -len / 2; i <= len / 2; i += 3) {
      const post = new T.Mesh(new T.CylinderGeometry(0.055, 0.055, 1.05, 6), M.steel)
      post.position.set(i, 1.85, front + 0.2)
      world.add(post)
      disposables.push(post.geometry)
    }
    const rail = new T.Mesh(new T.CylinderGeometry(0.07, 0.07, len, 8), M.steel)
    rail.rotation.z = Math.PI / 2
    rail.position.set(0, 2.35, front + 0.2)
    world.add(rail)

    const roofY = totalH + 7.2
    const roofDepth = rows * depth + 6
    mkBox(len + 6, 0.45, roofDepth, M.roof, 0, roofY, front - roofDepth / 2 + 2.4)
    mkBox(len + 6, 0.9, 0.4, M.steelDark, 0, roofY - 0.55, front + 2.6)
    for (let x = -len / 2 + 4; x <= len / 2 - 4; x += 16) {
      const col = new T.Mesh(new T.CylinderGeometry(0.28, 0.34, roofY - totalH, 8), M.steelDark)
      col.position.set(x, totalH + (roofY - totalH) / 2, front - rows * depth + 2.6)
      col.castShadow = true
      world.add(col)
    }
    for (let x = -len / 2; x <= len / 2; x += 4) {
      mkBox(0.18, 0.2, roofDepth, M.steel, x, roofY - 0.32, front - roofDepth / 2 + 2.4, false)
    }
  }


  // ---- 灯杆 ----
  for (const x of [-DIM.apronL / 2 + 12, DIM.apronL / 2 - 12]) {
    for (const z of [-DIM.apronW / 2 + 10, DIM.apronW / 2 - 10]) {
      const g = new T.Group()
      const pole = new T.Mesh(new T.CylinderGeometry(0.34, 0.5, 30, 8), M.mast)
      pole.position.y = 15
      pole.castShadow = true
      g.add(pole)
      const head = new T.Mesh(new T.BoxGeometry(6.4, 3.2, 0.7), M.steelDark)
      head.position.set(0, 30.4, 0.4)
      g.add(head)
      const lamps = new T.Mesh(new T.BoxGeometry(5.8, 2.6, 0.24), M.lamp)
      lamps.position.set(0, 30.4, 0.82)
      g.add(lamps)
      g.position.set(x, 0, z)
      world.add(g)
    }
  }

  // ---- 围网 / 人行道 / 绿篱 ----
  {
    const fenceMat = new T.MeshStandardMaterial({ color: '#8fa08f', roughness: 0.8, transparent: true, opacity: 0.32 })
    const mk = (w: number, d: number, x: number, z: number) => {
      const f = new T.Mesh(new T.BoxGeometry(w, 3.2, d), fenceMat)
      f.position.set(x, 1.6, z)
      f.castShadow = false
      world.add(f)
    }
    mk(DIM.apronL + 10, 0.12, 0, -DIM.apronW / 2 - 5)
    mk(DIM.apronL + 10, 0.12, 0, DIM.apronW / 2 + 5)
    mk(0.12, DIM.apronW + 10, -DIM.apronL / 2 - 5, 0)
    mk(0.12, DIM.apronW + 10, DIM.apronL / 2 + 5, 0)

    const walkMat = new T.MeshStandardMaterial({ color: '#c9c0a9', roughness: 0.92 })
    const hedgeMat = new T.MeshStandardMaterial({ color: '#5d7f4d', roughness: 0.95, flatShading: true })
    const wo = 4.2
    const x0 = DIM.apronL / 2 + wo / 2
    const z0 = DIM.apronW / 2 + wo / 2
    const strip = (w: number, d: number, x: number, z: number, mat: any, h: number, y: number) => {
      const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat)
      m.position.set(x, y, z)
      m.receiveShadow = true
      world.add(m)
    }
    strip(DIM.apronL + wo * 2, wo, 0, -z0, walkMat, 0.18, 0.09)
    strip(DIM.apronL + wo * 2, wo, 0, z0, walkMat, 0.18, 0.09)
    strip(wo, DIM.apronW, -x0, 0, walkMat, 0.18, 0.09)
    strip(wo, DIM.apronW, x0, 0, walkMat, 0.18, 0.09)
    const hz = z0 + 3.2
    const hx = x0 + 3.2
    strip(DIM.apronL + 26, 1.7, 0, -hz, hedgeMat, 1.15, 0.58)
    strip(DIM.apronL + 26, 1.7, 0, hz, hedgeMat, 1.15, 0.58)
    strip(1.7, DIM.apronW + 20, -hx, 0, hedgeMat, 1.15, 0.58)
    strip(1.7, DIM.apronW + 20, hx, 0, hedgeMat, 1.15, 0.58)
  }

  // ---- 树 ----
  const tree = (x: number, z: number, s = 1) => {
    const g = new T.Group()
    const trunk = new T.Mesh(new T.CylinderGeometry(0.28 * s, 0.4 * s, 3.2 * s, 6), M.trunk)
    trunk.position.y = 1.6 * s
    trunk.castShadow = true
    g.add(trunk)
    const mats = [M.crownA, M.crownB, M.crownC]
    for (let i = 0; i < 3; i++) {
      const crown = new T.Mesh(new T.IcosahedronGeometry((3.3 - i * 0.5) * s, 1), mats[i % 3])
      crown.position.y = (4.0 + i * 1.5) * s
      crown.rotation.y = i * 1.1
      crown.castShadow = true
      g.add(crown)
    }
    g.position.set(x, 0, z)
    world.add(g)
  }
  {
    const r = seeded(97)
    for (let i = -7; i <= 7; i++) {
      tree(i * 17 + r() * 4, -DIM.apronW / 2 - 16 - r() * 8, 1 + r() * 0.25)
      tree(i * 17 + r() * 4, DIM.apronW / 2 + 14 + r() * 8, 1 + r() * 0.25)
    }
    for (let i = -3; i <= 3; i++) {
      tree(-DIM.apronL / 2 - 16 - r() * 8, i * 20 + r() * 4, 1 + r() * 0.2)
      tree(DIM.apronL / 2 + 16 + r() * 8, i * 20 + r() * 4, 1 + r() * 0.2)
    }
  }

  // ---- 背景建筑 ----
  const building = (x: number, z: number, w: number, d: number, h: number, mat: any) => {
    mkBox(w, h, d, mat, x, h / 2, z)
    mkBox(w + 1.6, 0.6, d + 1.6, M.concDark, x, h + 0.3, z, false)
    mkBox(w * 0.9, h * 0.62, d + 0.24, M.win, x, h * 0.55, z, false)
  }
  building(-120, -150, 60, 26, 17, M.wall)
  building(-40, -168, 46, 22, 14, M.brick)
  building(60, -158, 70, 24, 19, M.wall)
  building(150, -126, 40, 22, 12, M.brick)

  // ---- 看台细节：雨棚灯带、座席观众（实例化）、通道口 ----
  {
    const { len, rows, rise, depth, front } = STAND
    const totalH = rows * rise
    const roofY = totalH + 7.2

    // 雨棚下沿暖色灯带
    const stripMat = new T.MeshStandardMaterial({ color: '#ffe7bb', emissive: '#ffcf94', emissiveIntensity: 1.1, roughness: 0.7 })
    mkBox(len - 8, 0.18, 0.18, stripMat, 0, roofY - 1.1, front - 0.4, false)

    // 观众：InstancedMesh，按排按段上色
    const count = 1400
    const bodyGeo = new T.CylinderGeometry(0.24, 0.2, 0.62, 6)
    const seatBody = new T.InstancedMesh(bodyGeo, new T.MeshStandardMaterial({ roughness: 0.85, vertexColors: false }), count)
    seatBody.castShadow = true
    seatBody.receiveShadow = true
    const dummy = new T.Object3D()
    const palette = ['#e8e2d4', '#2f4f74', '#8d3b32', '#3f5c46', '#c4a45c', '#6d7f8f', '#d9d2c2', '#5a4a6b']
    const rnd = seeded(20261107)
    let idx = 0
    for (let r = 0; r < rows - 1 && idx < count; r++) {
      const z = front - (r + 0.55) * depth
      const y = (r + 1) * rise + 0.28
      for (let x = -len / 2 + 3; x < len / 2 - 3 && idx < count; x += 1.35) {
        if (rnd() < 0.28) continue
        dummy.position.set(x + (rnd() - 0.5) * 0.4, y, z + (rnd() - 0.5) * 0.25)
        dummy.rotation.y = (rnd() - 0.5) * 0.8
        dummy.scale.setScalar(0.9 + rnd() * 0.25)
        dummy.updateMatrix()
        seatBody.setMatrixAt(idx, dummy.matrix)
        seatBody.setColorAt(idx, new T.Color(palette[Math.floor(rnd() * palette.length)]))
        idx++
      }
    }
    seatBody.count = idx
    seatBody.instanceMatrix.needsUpdate = true
    if (seatBody.instanceColor) seatBody.instanceColor.needsUpdate = true
    world.add(seatBody)
    disposables.push(bodyGeo, seatBody.material)

    // 主席台（看台中段，白色体块 + 栏杆）
    mkBox(24, 2.6, 3.2, M.white, 0, totalH + 0.9, front - depth * 2.2)
    mkBox(24.6, 0.24, 3.6, M.concDark, 0, totalH + 2.3, front - depth * 2.2, false)

    // 通道口（黑开口）
    for (const ax of [-len / 2 + 6, -len / 6, len / 6, len / 2 - 6]) {
      mkBox(2.0, 1.9, 0.3, M.dark, ax, 0.95, front - depth * rows + 1.1, false)
    }
  }

  // ---- 计分塔 / 校名立牌 ----
  {
    const towerMat = new T.MeshStandardMaterial({ color: '#5b626a', roughness: 0.6, metalness: 0.35 })
    const x = DIM.apronL / 2 - 6
    const z = -DIM.apronW / 2 + 22
    mkBox(1.1, 16, 1.1, towerMat, x, 8, z)
    const panelTex = canvasTex('score', 512, (ctx, S) => {
      ctx.fillStyle = '#12181d'
      ctx.fillRect(0, 0, S, S)
      ctx.fillStyle = '#ff9f4a'
      ctx.font = 'bold 96px "Microsoft YaHei", sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('金明杯', S / 2, 190)
      ctx.fillStyle = '#e8e2d4'
      ctx.font = 'bold 64px "Microsoft YaHei", sans-serif'
      ctx.fillText('100m 直道', S / 2, 300)
      ctx.fillStyle = '#7fd6a0'
      ctx.font = 'bold 56px monospace'
      ctx.fillText('00:00.0', S / 2, 400)
    }, [1, 1])
    const panel = new T.Mesh(new T.BoxGeometry(9, 5.2, 0.4), new T.MeshStandardMaterial({ map: panelTex, emissive: '#243040', emissiveIntensity: 0.6, roughness: 0.5 }))
    panel.position.set(x, 18.4, z)
    panel.castShadow = true
    world.add(panel)
    disposables.push(panel.geometry, panel.material)
  }

  // ---- 起点 / 终点 / 分道标记 ----
  {
    const lineMat = new T.MeshStandardMaterial({ color: '#f6f2e6', roughness: 0.7 })
    const startZ = 0
    mkBox(DIM.laneW * DIM.lanes, 0.02, 0.3, lineMat, 0, 0.68, startZ, false)
    mkBox(DIM.laneW * DIM.lanes, 0.02, 0.12, lineMat, 0, 0.68, startZ + DIM.straight / 2 + DIM.rInner, false)
    // 弯道处 200m 标记
    for (const sx of [-1, 1]) {
      mkBox(0.4, 0.02, DIM.laneW * DIM.lanes, lineMat, sx * (DIM.straight / 2), 0.68, -DIM.rInner - 6, false)
    }
    // 起跑器小方块
    for (let i = 0; i < DIM.lanes; i++) {
      const lane = DIM.rInner + i * DIM.laneW + DIM.laneW / 2
      mkBox(0.7, 0.1, 0.45, new T.MeshStandardMaterial({ color: '#3c4a55', roughness: 0.8 }), -DIM.straight / 2 + 0.4, 0.72, lane - DIM.rInner - DIM.laneW * 0, false)
    }
  }

    // 分道号码（贴地）
    for (let i = 0; i < DIM.lanes; i++) {
      const numTex = canvasTex('lane' + i, 128, (ctx, S) => {
        ctx.clearRect(0, 0, S, S)
        ctx.fillStyle = '#f6f2e6'
        ctx.font = 'bold 92px "Songti SC", "SimSun", serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(String(i + 1), S / 2, S / 2)
      }, [1, 1])
      const laneZ = DIM.rInner + i * DIM.laneW + DIM.laneW / 2
      const num = new T.Mesh(
        new T.PlaneGeometry(1.35, 1.35),
        new T.MeshBasicMaterial({ map: numTex, transparent: true, depthWrite: false }),
      )
      num.rotation.x = -Math.PI / 2
      // 贴近起跑线（直道起点），跑者站在号码正后方
      num.position.set(-DIM.straight / 2 + 2.6, 0.7, laneZ)
      world.add(num)
    }
  // ---- 场边设施：帐篷、长椅、垃圾桶、旗杆 ----
  {
    const tentMat = new T.MeshStandardMaterial({ color: '#e8e2d4', roughness: 0.85 })
    for (let i = 0; i < 3; i++) {
      const x = -60 + i * 34
      const z = DIM.apronW / 2 - 6
      const top = new T.Mesh(new T.ConeGeometry(4.2, 2.2, 4), new T.MeshStandardMaterial({ color: '#d8cfb8', roughness: 0.9 }))
      top.rotation.y = Math.PI / 4
      top.position.set(x, 3.4, z)
      top.castShadow = true
      world.add(top)
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          mkBox(0.12, 2.4, 0.12, tentMat, x + sx * 2.6, 1.2, z + sz * 2.6, false)
        }
      }
    }
    // 长椅
    for (let i = 0; i < 6; i++) {
      const x = -70 + i * 28
      const z = DIM.apronW / 2 + 8
      mkBox(2.6, 0.12, 0.5, M.dark, x, 0.55, z)
      mkBox(0.12, 0.5, 0.5, M.steel, x - 1.1, 0.28, z, false)
      mkBox(0.12, 0.5, 0.5, M.steel, x + 1.1, 0.28, z, false)
    }
    // 旗杆 + 旗
    const flagMat = new T.MeshStandardMaterial({ color: '#b0392f', roughness: 0.85, side: T.DoubleSide })
    for (const x of [-DIM.apronL / 2 - 6, DIM.apronL / 2 + 6]) {
      const pole = new T.Mesh(new T.CylinderGeometry(0.1, 0.12, 12, 6), M.mast)
      pole.position.set(x, 6, DIM.apronW / 2 + 6)
      world.add(pole)
      const flag = new T.Mesh(new T.PlaneGeometry(2.4, 1.6), flagMat)
      flag.position.set(x + 1.2, 10.6, DIM.apronW / 2 + 6)
      world.add(flag)
    }
  }

  // ---- 绿篱旁的灌木 ----
  {
    const r = seeded(64)
    for (let i = -8; i <= 8; i++) {
      const x = i * 14 + r() * 3
      for (const z of [-(DIM.apronW / 2 + 22), DIM.apronW / 2 + 21]) {
        const b = new T.Mesh(new T.IcosahedronGeometry(1.5 + r() * 0.9, 0), i % 2 ? M.crownB : M.crownC)
        b.position.set(x, 0.9, z)
        b.rotation.y = r() * 3
        b.castShadow = true
        world.add(b)
      }
    }
  }
  // ---- 场边广告板 + 旗阵 + 内场活动人群（让跑道两侧不空）----
  {
    const boardTex = canvasTex('boards', 1024, (ctx, S) => {
      ctx.fillStyle = '#f2ede0'
      ctx.fillRect(0, 0, S, S)
      const texts = ['河南大学', '明德新民', '止于至善', '金明校区', '志义体育场', '筑小智']
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      for (let i = 0; i < 6; i++) {
        const x = (i % 3) * (S / 3) + S / 6
        const y = Math.floor(i / 3) * (S / 2) + S / 4
        ctx.fillStyle = i % 2 ? '#2b503b' : '#8a6a2f'
        ctx.font = 'bold 54px "Songti SC", "SimSun", serif'
        ctx.fillText(texts[i], x, y)
      }
    }, [3, 1])
    const boardMat = new T.MeshBasicMaterial({ map: boardTex, side: T.DoubleSide, toneMapped: true })
    // 场外广告墙（放在红区之外、人行道边，不挡跑道视线）
    for (let i = -3; i <= 3; i++) {
      const b = new T.Mesh(new T.BoxGeometry(9.0, 1.05, 0.14), boardMat)
      b.position.set(i * 11.6, 0.58, -(DIM.apronW / 2 + 7.5))
      b.castShadow = true
      world.add(b)
    }

    // 旗阵（跑道外侧一圈小彩旗）
    const flagMat = new T.MeshBasicMaterial({ color: '#c0392b', side: T.DoubleSide })
    const flagMat2 = new T.MeshBasicMaterial({ color: '#e8c14a', side: T.DoubleSide })
    const r = seeded(31)
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2
      const rad = DIM.apronL / 2 + 4.5
      const x = Math.cos(a) * rad
      const z = Math.sin(a) * (DIM.apronW / 2 + 4.5)
      const pole = new T.Mesh(new T.CylinderGeometry(0.045, 0.05, 5.2, 5), M.mast)
      pole.position.set(x, 2.6, z)
      world.add(pole)
      const fl = new T.Mesh(new T.PlaneGeometry(1.1, 0.7), r() > 0.5 ? flagMat : flagMat2)
      fl.position.set(x + 0.55, 4.6, z)
      world.add(fl)
    }

    // 内场练球的人 + 场边散步的人
    const bodyMats = ['#2f6f9e', '#c0392b', '#e8e2d4', '#3f5c46', '#8a6a2f'].map(
      (c) => new T.MeshStandardMaterial({ color: c, roughness: 0.85 }),
    )
    const skinMat = new T.MeshStandardMaterial({ color: '#e2b48f', roughness: 0.9 })
    const people: Array<[number, number]> = [
      [-24, -14], [-16, 6], [-6, 18], [4, -22], [12, 10], [22, -6],
      [30, 16], [-30, 22], [8, 30], [-12, -26], [36, -18], [18, 24],
      [-40, 4], [44, 8],
    ]
    const r3 = seeded(123)
    for (const [px, pz] of people) {
      const g = new T.Group()
      const body = new T.Mesh(new T.CylinderGeometry(0.2, 0.17, 0.62, 6), bodyMats[Math.floor(r3() * bodyMats.length)])
      body.position.y = 1.08
      body.castShadow = true
      g.add(body)
      const head = new T.Mesh(new T.IcosahedronGeometry(0.15, 0), skinMat)
      head.position.y = 1.55
      head.castShadow = true
      g.add(head)
      for (const sx of [-1, 1]) {
        const leg = new T.Mesh(new T.CylinderGeometry(0.07, 0.06, 0.72, 5), new T.MeshStandardMaterial({ color: '#33414a', roughness: 0.9 }))
        leg.position.set(sx * 0.11, 0.36, 0)
        leg.castShadow = true
        g.add(leg)
      }
      g.position.set(px, 0.66, pz)
      g.rotation.y = r3() * Math.PI * 2
      world.add(g)
    }
  }
  // ---- 云（billboard 精灵，给天空一点层次）----
  {
    const cloudTex = canvasTex('cloud', 256, (ctx, S) => {
      ctx.clearRect(0, 0, S, S)
      const r = seeded(9)
      for (let i = 0; i < 26; i++) {
        const cx = S * (0.15 + r() * 0.7)
        const cy = S * (0.35 + r() * 0.3)
        const rad = S * (0.06 + r() * 0.12)
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad)
        g.addColorStop(0, 'rgba(255,255,255,0.85)')
        g.addColorStop(1, 'rgba(255,255,255,0)')
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(cx, cy, rad, 0, Math.PI * 2)
        ctx.fill()
      }
    }, [1, 1])
    const cloudMat = new T.MeshBasicMaterial({ map: cloudTex, transparent: true, depthWrite: false, opacity: 0.9 })
    const r2 = seeded(77)
    for (let i = 0; i < 9; i++) {
      const ang = (i / 9) * Math.PI * 2 + r2() * 0.4
      const rad = 260 + r2() * 180
      const c = new T.Mesh(new T.PlaneGeometry(150 + r2() * 90, 70 + r2() * 40), cloudMat)
      c.position.set(Math.cos(ang) * rad, 120 + r2() * 60, Math.sin(ang) * rad)
      c.lookAt(0, 40, 0)
      world.add(c)
    }
  }
  // ---- 跑步用的理想线（第 4 道中心），返回等距采样点 ----
  const laneR = DIM.rInner + DIM.laneW * 3.5
  const pathPoints: any[] = []
  const arc = (cx: number, cz: number, a0: number, a1: number, steps: number) => {
    for (let i = 0; i <= steps; i++) {
      const t = a0 + ((a1 - a0) * i) / steps
      pathPoints.push(new T.Vector3(cx + Math.cos(t) * laneR, 0, cz + Math.sin(t) * laneR))
    }
  }
  const h = DIM.straight / 2
  arc(h, 0, -Math.PI / 2, Math.PI / 2, 180)   // 顶端弯（x=+h 侧）
  arc(-h, 0, Math.PI / 2, (Math.PI * 3) / 2, 180) // 底端弯
  pathPoints.push(pathPoints[0].clone())
  const cum: number[] = [0]
  for (let i = 1; i < pathPoints.length; i++) {
    cum.push(cum[i - 1] + pathPoints[i].distanceTo(pathPoints[i - 1]))
  }
  const lapLength = cum[cum.length - 1]

  const wrap = (d: number) => ((d % lapLength) + lapLength) % lapLength

  function indexAt(d: number) {
    let lo = 1
    let hi = cum.length - 1
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (cum[mid] < d) lo = mid + 1
      else hi = mid
    }
    return lo
  }

  function posAt(s: number) {
    const d = wrap(s)
    const i = indexAt(d)
    const a = pathPoints[i - 1]
    const b = pathPoints[i]
    const segLen = cum[i] - cum[i - 1] || 1e-6
    const t = (d - cum[i - 1]) / segLen
    return a.clone().lerp(b, t)
  }

  // 切线用中心差分：跨段连续，弯道不会一格一格地跳
  function tangentAt(s: number) {
    const e = 0.6
    const p0 = posAt(s - e)
    const p1 = posAt(s + e)
    return p1.sub(p0).normalize()
  }

  function sampleAt(s: number) {
    return { pos: posAt(s), tan: tangentAt(s), index: indexAt(wrap(s)) }
  }

  // ---- 100 m 直道冲刺的道具：起跑器、终点门架、锥桶、计时牌、摄影记者 ----
  const SPRINT = { start: Math.PI * laneR * 2 + DIM.straight, length: 100 }

  function frameAt(s: number) {
    const { pos, tan } = sampleAt(s)
    const n = new T.Vector3(-tan.z, 0, tan.x) // 指向弯道外侧
    return { pos, tan, n }
  }

  {
    const { pos, tan, n } = frameAt(SPRINT.start)
    const yaw = Math.atan2(tan.x, tan.z)
    const lineW = DIM.laneW * DIM.lanes
    // 起跑器（8 道）
    const blockMat = new T.MeshStandardMaterial({ color: '#3a4a52', roughness: 0.7, metalness: 0.35 })
    for (let i = 0; i < DIM.lanes; i++) {
      const off = (i - 3) * DIM.laneW
      const b = new T.Group()
      for (const [dx, dh] of [[-0.35, 0.14], [0.15, 0.2]] as Array<[number, number]>) {
        const pad = new T.Mesh(new T.BoxGeometry(0.24, 0.06, 0.42), blockMat)
        pad.position.set(dx, dh, 0)
        pad.rotation.x = -0.5
        pad.castShadow = true
        b.add(pad)
      }
      b.position.copy(pos).addScaledVector(n, off)
      b.position.y = 0.7
      b.rotation.y = yaw + Math.PI / 2
      world.add(b)
    }
        // 起跑线（8 道一条白线）
        const sLine = new T.Mesh(new T.PlaneGeometry(lineW, 0.14), new T.MeshBasicMaterial({ color: '#f7f2e4' }))
        sLine.rotation.x = -Math.PI / 2
        sLine.rotation.z = -yaw
        sLine.position.copy(pos).setY(0.649)
        world.add(sLine)

        // 50 m 分段标记线
        const mid = frameAt(SPRINT.start + 50)
        const mLine = new T.Mesh(new T.PlaneGeometry(lineW, 0.12), new T.MeshBasicMaterial({ color: 'rgba(247,242,228,0.75)', transparent: true }))
        mLine.rotation.x = -Math.PI / 2
        mLine.rotation.z = -Math.atan2(mid.tan.x, mid.tan.z)
        mLine.position.copy(mid.pos).setY(0.649)
        world.add(mLine)

        // 分道号码（起跑线后侧，贴地）
        for (let i = 0; i < DIM.lanes; i++) {
          const numTex = canvasTex('sprintnum', 128, (ctx, S) => {
            ctx.clearRect(0, 0, S, S)
            ctx.fillStyle = '#f4efe1'
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.font = 'bold 92px "PingFang SC", sans-serif'
            ctx.fillText(String(i + 1), S / 2, S / 2 + 4)
          }, [1, 1])
          const num = new T.Mesh(new T.PlaneGeometry(0.9, 0.9), new T.MeshBasicMaterial({ map: numTex, transparent: true, depthWrite: false }))
          num.rotation.x = -Math.PI / 2
          num.rotation.z = -yaw
          const off = (i - 4.5) * DIM.laneW
          num.position.copy(pos).addScaledVector(n, off).addScaledVector(tan, -0.55)
          num.position.y = 0.6495
          world.add(num)
        }

    // 终点线 + 门架 + 横幅
    const fin = frameAt(SPRINT.start + SPRINT.length)
    const finYaw = Math.atan2(fin.tan.x, fin.tan.z)
    const startLine = new T.Mesh(new T.PlaneGeometry(lineW, 0.16), new T.MeshBasicMaterial({ color: '#f7f2e4' }))
    startLine.rotation.x = -Math.PI / 2
    startLine.rotation.z = -finYaw
    startLine.position.copy(fin.pos).setY(0.649)
    world.add(startLine)

    const bannerTex = canvasTex('banner', 1024, (ctx, S) => {
      // 画布正方形、横幅 12.2 x 2.2：横向压缩 5.55 倍后贴上去字宽还原、字高不受影响
      ctx.fillStyle = '#24452f'
      ctx.fillRect(0, 0, S, S)
      const midY = S / 2
      const XS = 5.55
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.save()
      ctx.translate(S / 2, midY)
      ctx.scale(1 / XS, 1)
      const titleSize = S * 0.34
      ctx.font = 'bold ' + titleSize + 'px "Noto Sans SC", "Microsoft YaHei", "PingFang SC", sans-serif'
      ctx.lineWidth = titleSize * 0.09
      ctx.lineJoin = 'round'
      ctx.strokeStyle = 'rgba(8, 22, 14, 0.6)'
      ctx.strokeText('金明杯 · 100 m', 0, -S * 0.13)
      ctx.fillStyle = '#f8f3e4'
      ctx.fillText('金明杯 · 100 m', 0, -S * 0.13)
      ctx.strokeStyle = 'rgba(206, 168, 82, 0.9)'
      ctx.lineWidth = S * 0.006
      ctx.beginPath()
      ctx.moveTo(-S * 0.2, S * 0.06)
      ctx.lineTo(S * 0.2, S * 0.06)
      ctx.stroke()
      ctx.font = '600 ' + (S * 0.085) + 'px "Noto Sans SC", "Microsoft YaHei", sans-serif'
      ctx.fillStyle = '#d9bb72'
      ctx.fillText('河南大学 · 志义体育场', 0, S * 0.17)
      ctx.restore()
    }, [1, 1])
    // 横幅正反两面各挂一张平面，避免从背面看是镜像字
    for (const face of [1, -1]) {
      const banner = new T.Mesh(
        new T.PlaneGeometry(lineW + 2.4, 2.2),
        new T.MeshBasicMaterial({ map: bannerTex, side: T.FrontSide }),
      )
      banner.position.copy(fin.pos).addScaledVector(fin.tan, 0.2 * face)
      banner.position.y = 4.4
      banner.rotation.y = finYaw + (face === 1 ? Math.PI : 0)
      world.add(banner)
    }

    const postMat = new T.MeshStandardMaterial({ color: '#5c6670', roughness: 0.5, metalness: 0.4 })
    for (const side of [-1, 1]) {
      const p = new T.Mesh(new T.CylinderGeometry(0.11, 0.13, 4.6, 8), postMat)
      p.position.copy(fin.pos).addScaledVector(fin.n, side * (lineW / 2 + 1.2))
      p.position.y = 2.3
      p.castShadow = true
      world.add(p)
    }

    // 计时牌（终点侧后方）
    const boardTex2 = canvasTex('timer', 512, (ctx, S) => {
      ctx.fillStyle = '#14191d'
      ctx.fillRect(0, 0, S, S)
      ctx.fillStyle = '#ff9f4a'
      ctx.textAlign = 'center'
      ctx.font = 'bold 92px monospace'
      ctx.fillText('0.00', S / 2, 190)
      ctx.fillStyle = '#8fd0a6'
      ctx.font = 'bold 44px "PingFang SC", sans-serif'
      ctx.fillText('100 m 计时', S / 2, 300)
      ctx.fillText('金明杯', S / 2, 372)
    }, [1, 1])
    const timer = new T.Mesh(new T.BoxGeometry(3.4, 2.4, 0.2), new T.MeshBasicMaterial({ map: boardTex2 }))
    timer.position.copy(fin.pos).addScaledVector(fin.n, -(lineW / 2 + 3.4))
    timer.position.y = 1.7
    timer.rotation.y = finYaw + Math.PI / 2
    world.add(timer)

    // 锥桶（沿直道边线）
    const coneMat = new T.MeshStandardMaterial({ color: '#d8752f', roughness: 0.85 })
    for (let i = 0; i < 12; i++) {
      const s = SPRINT.start - 4 + i * 8.4
      const f2 = frameAt(s)
      for (const side of [-1, 1]) {
        const cone = new T.Mesh(new T.ConeGeometry(0.22, 0.52, 8), coneMat)
        cone.position.copy(f2.pos).addScaledVector(f2.n, side * (lineW / 2 + 1.4))
        cone.position.y = 0.95
        cone.castShadow = true
        world.add(cone)
      }
    }

    // 摄影记者 + 志愿者（终点附近）
    const personShirt = new T.MeshStandardMaterial({ color: '#c0392b', roughness: 0.85 })
    const personSkin = new T.MeshStandardMaterial({ color: '#e2b48f', roughness: 0.9 })
    const shots: Array<[number, number, number]> = [
      [SPRINT.start + SPRINT.length - 3, lineW / 2 + 2.6, 1],
      [SPRINT.start + SPRINT.length + 2.4, -(lineW / 2 + 2.8), 1],
      [SPRINT.start - 2, lineW / 2 + 3.0, 0],
      [SPRINT.start + 40, -(lineW / 2 + 3.2), 0],
    ]
    for (const [s, lateral, isCrew] of shots) {
      const f3 = frameAt(s)
      const g = new T.Group()
      const body = new T.Mesh(new T.CylinderGeometry(0.2, 0.17, 0.62, 6), isCrew ? personShirt : new T.MeshStandardMaterial({ color: '#2f6f9e', roughness: 0.85 }))
      body.position.y = 1.08
      body.castShadow = true
      g.add(body)
      const head = new T.Mesh(new T.IcosahedronGeometry(0.15, 0), personSkin)
      head.position.y = 1.55
      head.castShadow = true
      g.add(head)
      for (const sx of [-1, 1]) {
        const leg = new T.Mesh(new T.CylinderGeometry(0.07, 0.06, 0.72, 5), new T.MeshStandardMaterial({ color: '#33414a', roughness: 0.9 }))
        leg.position.set(sx * 0.11, 0.36, 0)
        leg.castShadow = true
        g.add(leg)
      }
      if (isCrew) {
        const camBody = new T.Mesh(new T.BoxGeometry(0.34, 0.24, 0.5), new T.MeshStandardMaterial({ color: '#20262b', roughness: 0.6 }))
        camBody.position.set(0, 1.2, 0.42)
        g.add(camBody)
        const lens = new T.Mesh(new T.CylinderGeometry(0.1, 0.1, 0.26, 10), new T.MeshStandardMaterial({ color: '#3b444c', roughness: 0.5, metalness: 0.5 }))
        lens.rotation.x = Math.PI / 2
        lens.position.set(0, 1.2, 0.72)
        g.add(lens)
        for (const sx of [-1, 1]) {
          const tripodLeg = new T.Mesh(new T.CylinderGeometry(0.03, 0.03, 1.1, 4), new T.MeshStandardMaterial({ color: '#2a3138', roughness: 0.7 }))
          tripodLeg.position.set(sx * 0.22, 0.55, 0.3)
          tripodLeg.rotation.z = sx * 0.16
          g.add(tripodLeg)
        }
      }
      g.position.copy(f3.pos).addScaledVector(f3.n, lateral)
      g.position.y = 0.66
      g.rotation.y = Math.atan2(-f3.n.x, -f3.n.z) + (isCrew ? 0 : Math.PI)
      world.add(g)
    }
  }
  function dispose() {
    for (const d of disposables) d?.dispose?.()
    for (const key of ['track', 'apron', 'turf', 'conc', 'win']) {
      // canvas textures are referenced by materials above; dispose via traversal
      void key
    }
    scene.traverse((o: any) => {
      if (o.isMesh) {
        o.geometry?.dispose?.()
        const mat = o.material
        for (const m of Array.isArray(mat) ? mat : [mat]) {
          if (!m) continue
          m.map?.dispose?.()
          m.dispose?.()
        }
      }
    })
  }

  return { scene, sun, hemi, sampleAt, lapLength, laneR, SPRINT, dispose }
}
