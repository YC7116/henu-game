/**
 * 奶蛙（milk frog）· 精细版
 *
 * 依据：https://neta.art/app/milk-frog-wiki + `stadium-3d/refs/frog/` 实拍图 + 用户提供的等身立牌图。
 * 造型要点：
 *  - 梨形**高个子**：下腹最鼓、往上收肩、脑袋和身体连成一体没有脖子
 *  - 凸起的圆眼、眼白泛绿、瞳孔是小小一枚黑点
 *  - 大块奶油色肚皮；手脚**修长**、深橄榄褐色
 *  - 站姿略驼背前倾，笑起来捧腹、颤抖、笑到脱力
 *
 * 动画：一口气笑 3.2 秒（吸气 → 爆发 → 抖动 → 脱力收），
 * 再接一套空手道（行礼 → 三战立ち → 上段受 → 中段突き → 收势），共 6.8 秒。
 */

type AnyThree = any

export type FrogRig = {
  root: AnyThree
  pose: (phase: number, amount: number) => void
  showcase: (t: number) => void
  idle: () => void
}

const COL = {
  skin: '#efc63c',
  skinDeep: '#d9a92a',
  belly: '#f6e8bd',
  sclera: '#c9d68a',
  iris: '#8f9a3f',
  pupil: '#141008',
  gum: '#5a2626',
  mouth: '#3f1717',
  teeth: '#fbf7ea',
  tongue: '#d4696b',
  limb: '#6d5a2e',
  limbLight: '#8a743a',
}

const HIP_Y = 0.34
const SHOULDER_Y = 1.12

/** 平滑插值 */
const smooth = (x: number) => {
  const t = Math.max(0, Math.min(1, x))
  return t * t * (3 - 2 * t)
}
/** 区间映射并缓动 */
const seg = (t: number, a: number, b: number) => smooth((t - a) / Math.max(0.0001, b - a))

export function buildFrog(T: AnyThree): FrogRig {
  const root = new T.Group()

  // ---------- 程序化皮肤贴图（细颗粒 + 微斑） ----------
  const skinTex = (() => {
    const S = 256
    const cv = document.createElement('canvas')
    cv.width = S
    cv.height = S
    const g = cv.getContext('2d')!
    g.fillStyle = COL.skin
    g.fillRect(0, 0, S, S)
    let seed = 20261107
    const rnd = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648
      return seed / 2147483648
    }
    for (let i = 0; i < 2600; i++) {
      const x = rnd() * S
      const y = rnd() * S
      const r = 0.4 + rnd() * 1.5
      g.fillStyle = rnd() > 0.5 ? 'rgba(214,166,44,0.30)' : 'rgba(255,236,150,0.30)'
      g.beginPath()
      g.arc(x, y, r, 0, Math.PI * 2)
      g.fill()
    }
    for (let i = 0; i < 34; i++) {
      g.fillStyle = 'rgba(206,158,40,0.20)'
      g.beginPath()
      g.ellipse(rnd() * S, rnd() * S, 4 + rnd() * 10, 3 + rnd() * 7, rnd() * Math.PI, 0, Math.PI * 2)
      g.fill()
    }
    const tex = new T.CanvasTexture(cv)
    tex.wrapS = tex.wrapT = T.RepeatWrapping
    tex.repeat.set(2, 2)
    tex.anisotropy = 4
    return tex
  })()

  const bellyTex = (() => {
    const S = 256
    const cv = document.createElement('canvas')
    cv.width = S
    cv.height = S
    const g = cv.getContext('2d')!
    const grad = g.createRadialGradient(S * 0.5, S * 0.62, S * 0.05, S * 0.5, S * 0.55, S * 0.52)
    grad.addColorStop(0, '#fdf6dd')
    grad.addColorStop(0.72, COL.belly)
    grad.addColorStop(1, 'rgba(248,238,201,0)')
    g.fillStyle = grad
    g.fillRect(0, 0, S, S)
    const tex = new T.CanvasTexture(cv)
    tex.anisotropy = 4
    return tex
  })()

  const skinMat = new T.MeshPhysicalMaterial({
    color: 0xffffff,
    map: skinTex,
    roughness: 0.5,
    metalness: 0,
    clearcoat: 0.38,
    clearcoatRoughness: 0.55,
    sheen: 0.85,
    sheenColor: new T.Color('#fff2b0'),
    sheenRoughness: 0.55,
  })
  const skinDeepMat = new T.MeshStandardMaterial({ color: COL.skinDeep, roughness: 0.7 })
  const bellyMat = new T.MeshStandardMaterial({
    map: bellyTex,
    transparent: true,
    roughness: 0.6,
    depthWrite: false,
  })
  const scleraMat = new T.MeshPhysicalMaterial({ color: COL.sclera, roughness: 0.34, clearcoat: 0.5 })
  const irisMat = new T.MeshStandardMaterial({ color: COL.iris, roughness: 0.4 })
  const pupilMat = new T.MeshStandardMaterial({ color: COL.pupil, roughness: 0.12 })
  const mouthMat = new T.MeshStandardMaterial({ color: COL.mouth, roughness: 0.9 })
  const gumMat = new T.MeshStandardMaterial({ color: COL.gum, roughness: 0.75 })
  const teethMat = new T.MeshStandardMaterial({ color: COL.teeth, roughness: 0.42 })
  const tongueMat = new T.MeshStandardMaterial({ color: COL.tongue, roughness: 0.55 })
  const limbMat = new T.MeshStandardMaterial({ color: COL.limb, roughness: 0.66 })
  const limbLightMat = new T.MeshStandardMaterial({ color: COL.limbLight, roughness: 0.66 })

  // ---------- 身体：梨形旋转体（躯干 + 头连成一体） ----------
  const profile: Array<[number, number]> = [
    [0.0, 0.24],
    [0.2, 0.25],
    [0.34, 0.3],
    [0.42, 0.42],
    [0.455, 0.6],
    [0.462, 0.78],
    [0.452, 0.94],
    [0.428, 1.06],
    [0.395, 1.16],
    [0.355, 1.24],
    [0.315, 1.31],
    [0.3, 1.38],
    [0.302, 1.46],
    [0.292, 1.55],
    [0.262, 1.62],
    [0.19, 1.68],
    [0.09, 1.72],
    [0.0, 1.735],
  ]
  const body = new T.Mesh(
    new T.LatheGeometry(profile.map(([r, y]) => new T.Vector2(r, y)), 64),
    skinMat,
  )
  body.castShadow = true
  root.add(body)

  // 背部略深的一块，压出体积
  const nape = new T.Mesh(new T.SphereGeometry(0.3, 28, 20), skinDeepMat)
  nape.scale.set(1.03, 1.05, 0.42)
  nape.position.set(0, 1.02, -0.2)
  root.add(nape)

  // ---------- 奶油色肚皮（软边贴图） ----------
  const belly = new T.Mesh(new T.SphereGeometry(1, 40, 28), bellyMat)
  belly.scale.set(0.34, 0.4, 0.2)
  belly.position.set(0, 0.86, 0.32)
  belly.renderOrder = 2
  root.add(belly)

  // ---------- 脸 ----------
  const face = new T.Group()
  face.position.set(0, 1.5, 0)
  root.add(face)

  // 眼睛做成 2D 贴图（画布手绘：淡绿眼白 + 深色虹膜 + 小瞳 + 高光 + 上眼睑弧），贴在脸的表面
  const eyeTex = (() => {
    const S = 256
    const cv = document.createElement('canvas')
    cv.width = S
    cv.height = S
    const g = cv.getContext('2d') as CanvasRenderingContext2D
    g.clearRect(0, 0, S, S)
    // 眼白
    g.save()
    g.translate(S / 2, S / 2)
    g.beginPath()
    g.ellipse(0, 0, S * 0.4, S * 0.42, 0, 0, Math.PI * 2)
    g.fillStyle = '#d8e455'
    g.fill()
    // 虹膜
    g.beginPath()
    g.ellipse(0, S * 0.02, S * 0.2, S * 0.21, 0, 0, Math.PI * 2)
    g.fillStyle = '#bcc65a'
    g.fill()
    // 瞳孔
    g.beginPath()
    g.ellipse(0, S * 0.02, S * 0.118, S * 0.128, 0, 0, Math.PI * 2)
    g.fillStyle = '#2b2410'
    g.fill()
    // 高光
    g.beginPath()
    g.ellipse(-S * 0.05, -S * 0.06, S * 0.045, S * 0.05, 0, 0, Math.PI * 2)
    g.fillStyle = 'rgba(255,255,255,0.92)'
    g.fill()
    // 上眼睑压一条深色弧，做眼神
    g.beginPath()
    g.ellipse(0, -S * 0.06, S * 0.4, S * 0.36, 0, Math.PI * 1.05, Math.PI * 1.95)
    g.lineWidth = S * 0.03
    g.strokeStyle = 'rgba(96,78,28,0.38)'
    g.stroke()
    g.restore()
    const tex = new T.CanvasTexture(cv)
    tex.anisotropy = 4
    return tex
  })()

  const eyeMat = new T.MeshBasicMaterial({ map: eyeTex, transparent: true, depthWrite: false })
  ;(eyeMat as any).toneMapped = false
  const eyeQuads: AnyThree[] = []
  for (const side of [-1, 1]) {
    const q = new T.Mesh(new T.PlaneGeometry(0.215, 0.203), eyeMat)
    q.position.set(side * 0.132, 0.086, 0.284)
    q.rotation.y = side * 0.26
    face.add(q)
    eyeQuads.push(q)
  }

  // 闭嘴常态：一条上弯的笑弧（大笑时才切到张嘴组）
  const smileArc = new T.Mesh(
    new T.TorusGeometry(0.128, 0.006, 8, 56, Math.PI * 0.98),
    new T.MeshStandardMaterial({ color: '#5b4526', roughness: 0.55 }),
  )
  smileArc.rotation.z = Math.PI + Math.PI * 0.04
  smileArc.position.set(0, -0.018, 0.29)
  face.add(smileArc)

  // 嘴：可开合的上下唇 + 口腔 + 牙龈 + 牙 + 舌头
  const mouthGroup = new T.Group()
  mouthGroup.position.set(0, -0.085, 0.288)
  face.add(mouthGroup)

  const mouthCavity = new T.Mesh(new T.SphereGeometry(1, 32, 22), mouthMat)
  mouthCavity.scale.set(0.152, 0.066, 0.045)
  mouthCavity.position.z = -0.028
  mouthGroup.add(mouthCavity)

  const gumTop = new T.Mesh(new T.SphereGeometry(1, 26, 14), gumMat)
  gumTop.scale.set(0.12, 0.022, 0.034)
  gumTop.position.set(0, 0.042, -0.005)
  mouthGroup.add(gumTop)

  const gumBottom = new T.Mesh(new T.SphereGeometry(1, 26, 14), gumMat)
  gumBottom.scale.set(0.112, 0.019, 0.032)
  gumBottom.position.set(0, -0.044, -0.005)
  mouthGroup.add(gumBottom)

  for (let i = -2; i <= 2; i++) {
    const tooth = new T.Mesh(new T.BoxGeometry(0.026, 0.026, 0.016), teethMat)
    tooth.position.set(i * 0.04, 0.019, 0.011)
    tooth.rotation.z = -i * 0.03
    mouthGroup.add(tooth)
  }
  for (let i = -2; i <= 2; i++) {
    const tooth = new T.Mesh(new T.BoxGeometry(0.024, 0.021, 0.014), teethMat)
    tooth.position.set(i * 0.037, -0.023, 0.009)
    mouthGroup.add(tooth)
  }

  const tongue = new T.Mesh(new T.SphereGeometry(1, 24, 16), tongueMat)
  tongue.scale.set(0.075, 0.026, 0.04)
  tongue.position.set(0, -0.026, -0.012)
  mouthGroup.add(tongue)

  const lipGroup = new T.Group()
  mouthGroup.add(lipGroup)
  const lipTop = new T.Mesh(new T.TorusGeometry(0.145, 0.007, 8, 40, Math.PI), gumMat)
  lipTop.rotation.z = Math.PI
  lipTop.position.set(0, 0.004, 0.012)
  lipTop.scale.set(1, 0.72, 1)
  lipGroup.add(lipTop)

  const lipBottom = new T.Mesh(new T.TorusGeometry(0.138, 0.006, 8, 40, Math.PI), gumMat)
  lipBottom.position.set(0, -0.004, 0.012)
  lipBottom.scale.set(1, 0.68, 1)
  lipGroup.add(lipBottom)


  // ---------- 手臂：肩/肘/腕 + 四指（两节） ----------
  const makeArm = (side: number) => {
    const shoulder = new T.Group()
    shoulder.position.set(side * 0.3, SHOULDER_Y - 0.12, 0.24)
    shoulder.rotation.z = side * 0.24
    root.add(shoulder)

    const shoulderBall = new T.Mesh(new T.SphereGeometry(0.072, 20, 16), skinMat)
    shoulderBall.position.set(side * -0.01, 0.01, 0)
    shoulder.add(shoulderBall)

    const upper = new T.Mesh(new T.CapsuleGeometry(0.062, 0.2, 8, 18), skinMat)
    upper.position.y = -0.11
    shoulder.add(upper)

    const elbow = new T.Group()
    elbow.position.y = -0.22
    shoulder.add(elbow)
    const elbowBall = new T.Mesh(new T.SphereGeometry(0.058, 16, 12), skinMat)
    elbowBall.position.y = -0.22
    shoulder.add(elbowBall)

    const lower = new T.Mesh(new T.CapsuleGeometry(0.056, 0.24, 8, 18), skinMat)
    lower.position.y = -0.13
    elbow.add(lower)

    const wrist = new T.Group()
    wrist.position.y = -0.27
    elbow.add(wrist)
    const wristBall = new T.Mesh(new T.SphereGeometry(0.05, 16, 12), skinMat)
    wristBall.position.y = -0.27
    elbow.add(wristBall)

    const palm = new T.Mesh(new T.SphereGeometry(0.066, 20, 16), limbLightMat)
    palm.scale.set(1.28, 0.86, 1.06)
    wrist.add(palm)

    for (let f = 0; f < 4; f++) {
      const a = (f - 1.5) * 0.3
      const knuckle = new T.Group()
      knuckle.position.set(Math.sin(a) * 0.052, -0.038, Math.cos(a) * 0.042)
      knuckle.rotation.z = Math.sin(a) * 0.42
      wrist.add(knuckle)

      const f1 = new T.Mesh(new T.CapsuleGeometry(0.021, 0.028, 4, 10), limbLightMat)
      f1.position.y = -0.022
      knuckle.add(f1)

      const mid = new T.Group()
      mid.position.y = -0.04
      knuckle.add(mid)

      const f2 = new T.Mesh(new T.CapsuleGeometry(0.018, 0.026, 4, 10), limbLightMat)
      f2.position.y = -0.02
      mid.add(f2)
      mid.rotation.x = -0.4
    }
    return { shoulder, elbow, wrist }
  }

  // ---------- 腿：髋/膝/踝 + 四趾 ----------
  const makeLeg = (side: number) => {
    const hip = new T.Group()
    hip.position.set(side * 0.165, HIP_Y, 0.01)
    hip.rotation.z = side * 0.08
    root.add(hip)

    const hipBall = new T.Mesh(new T.SphereGeometry(0.135, 20, 16), skinMat)
    hipBall.position.set(0, 0.01, 0)
    hip.add(hipBall)

    const thigh = new T.Mesh(new T.CapsuleGeometry(0.135, 0.1, 8, 18), skinMat)
    thigh.position.y = -0.08
    hip.add(thigh)

    const knee = new T.Group()
    knee.position.y = -0.16
    hip.add(knee)
    const kneeBall = new T.Mesh(new T.SphereGeometry(0.104, 18, 14), skinMat)
    kneeBall.position.y = -0.16
    hip.add(kneeBall)

    const calf = new T.Mesh(new T.CapsuleGeometry(0.108, 0.1, 8, 18), skinMat)
    calf.position.y = -0.07
    knee.add(calf)

    const ankle = new T.Group()
    ankle.position.y = -0.13
    knee.add(ankle)
    const ankleBall = new T.Mesh(new T.SphereGeometry(0.075, 16, 12), skinMat)
    ankleBall.position.y = -0.13
    knee.add(ankleBall)

    const foot = new T.Group()
    foot.position.set(0, -0.035, 0.035)
    ankle.add(foot)

    const sole = new T.Mesh(new T.SphereGeometry(1, 24, 18), limbLightMat)
    sole.scale.set(0.152, 0.05, 0.225)
    sole.position.set(0, -0.01, 0.055)
    foot.add(sole)

    for (let t = 0; t < 4; t++) {
      const a = (t - 1.5) * 0.32
      const toe = new T.Mesh(new T.CapsuleGeometry(0.026, 0.055, 4, 10), limbLightMat)
      toe.rotation.x = Math.PI / 2
      toe.position.set(Math.sin(a) * 0.066, -0.016, 0.185)
      foot.add(toe)
    }
    return { hip, knee, ankle }
  }

  const armL = makeArm(-1)
  const armR = makeArm(1)
  const legL = makeLeg(-1)
  const legR = makeLeg(1)

  root.traverse((o: AnyThree) => {
    if (o.isMesh) {
      o.castShadow = true
      o.receiveShadow = false
    }
  })

  const setBlink = (v: number) => {
    // 贴图眼睛用纵向压扁来眨眼
    for (const q of eyeQuads) q.scale.y = Math.max(0.06, 1 - v * 0.96)
  }

  const setMouth = (open: number, width: number, smile: number) => {
    const isOpen = open > 0.08
    mouthGroup.visible = isOpen
    lipGroup.visible = false
    smileArc.visible = !isOpen
    if (isOpen) {
      mouthGroup.scale.set(width * (1 + open * 0.05), 0.5 + open * 0.62, 1)
      lipGroup.scale.set(1 + open * 0.06, 0.5 + open * 0.55, 1)
      mouthGroup.position.y = -0.075 - open * 0.01
    }
    // 闭嘴时笑弧随情绪变浅深与宽窄
    smileArc.scale.set(0.88 + smile * 0.22, 0.82 + smile * 0.3, 1)
    smileArc.position.y = -0.036 + smile * 0.006
  }

  const t0 = typeof performance !== 'undefined' ? performance.now() : 0
  const now = () => ((typeof performance !== 'undefined' ? performance.now() : 0) - t0) / 1000

  const idleBase = () => {
    // 抱臂站立：手臂抬到胸口上方、前伸后横向抱回
    armL.shoulder.position.set(-0.26, 1.16, 0.3)
    armR.shoulder.position.set(0.26, 1.16, 0.3)
    armL.shoulder.rotation.set(-1.34, 0, 0.2)
    armR.shoulder.rotation.set(-0.96, 0, -0.22)
    armL.elbow.rotation.set(0, 0, 1.52)
    armR.elbow.rotation.set(0, 0, -1.58)
    armL.wrist.rotation.set(0, 0, 0.15)
    armR.wrist.rotation.set(0, 0, -0.15)
    legL.hip.rotation.set(0, 0, 0.1)
    legR.hip.rotation.set(0, 0, -0.1)
    legL.knee.rotation.x = 0.08
    legR.knee.rotation.x = 0.08
    legL.ankle.rotation.x = -0.08
    legR.ankle.rotation.x = -0.08
    root.traverse((o: any) => { if (o.isMesh) o.castShadow = false })
  root.scale.setScalar(0.95)
  }

  const idle = () => {
    idleBase()
    const t = now()
    const breathe = Math.sin(t * 1.6) * 0.012
    root.rotation.x = 0.05 + breathe * 0.4
    root.rotation.z = Math.sin(t * 0.9) * 0.012
    body.scale.set(1 + breathe * 0.6, 1 + breathe, 1 + breathe * 0.6)
    belly.scale.set(0.3 + breathe * 0.2, 0.36 + breathe * 0.3, 0.2)
    const blinkPhase = t % 3.4
    setBlink(blinkPhase < 0.12 ? Math.sin((blinkPhase / 0.12) * Math.PI) : 0)
    setMouth(0, 1, 0.15)
    armL.shoulder.rotation.x = -1.34 + Math.sin(t * 1.3) * 0.012
    armR.shoulder.rotation.x = -0.96 - Math.sin(t * 1.3) * 0.012
  }

  /** 跑：大步幅、身体前倾、手臂反向摆动、脚掌翻转 */
  const pose = (phase: number, amount: number) => {
    idleBase()
    const s = Math.sin(phase)
    const c = Math.cos(phase)
    const a = Math.max(0, Math.min(1, amount))

    legL.hip.rotation.x = s * 1.05 * a
    legR.hip.rotation.x = -s * 1.05 * a
    legL.hip.rotation.z = 0.1
    legR.hip.rotation.z = -0.1
    legL.knee.rotation.x = 0.1 + Math.max(0, -s) * 1.15 * a
    legR.knee.rotation.x = 0.1 + Math.max(0, s) * 1.15 * a
    legL.ankle.rotation.x = -0.1 - s * 0.35 * a
    legR.ankle.rotation.x = -0.1 + s * 0.35 * a

    armL.shoulder.position.set(-0.3, SHOULDER_Y - 0.12, 0.24)
    armR.shoulder.position.set(0.3, SHOULDER_Y - 0.12, 0.24)
    armL.shoulder.rotation.x = 0.34 - s * 0.42 * a
    armR.shoulder.rotation.x = 0.34 + s * 0.42 * a
    armL.shoulder.rotation.z = 1.02
    armR.shoulder.rotation.z = -1.02
    armL.elbow.rotation.set(-0.7, 0, 0.42)
    armR.elbow.rotation.set(-0.7, 0, -0.42)
    armL.wrist.rotation.x = 0.2 * a
    armR.wrist.rotation.x = 0.2 * a

    root.position.y = Math.abs(s) * 0.075 * a
    root.rotation.x = 0.06 * a
    root.rotation.z = c * 0.05 * a
    // 弹性（squash & stretch）：触地压扁、横向鼓出来，体积基本守恒
    const sq = 1 - Math.abs(s) * 0.07 * a
    const wide = 1 / Math.sqrt(sq)
    body.scale.set(wide, sq, wide)
    belly.scale.set(0.3 * wide, 0.36 * sq, 0.2 * wide)

    setBlink(0)
    setMouth(0.06 * a, 1, 0.3)
  }

  /**
   * 赛前展示（t: 0→1，共 6.8 秒）
   *  0.00–3.20 捧腹大笑：吸气蓄势 → 爆发大笑 → 抖动 → 脱力
   *  3.20–6.80 空手道：行礼 → 三战立ち → 上段受 → 中段突き → 收势
   */
  // 赛前展示：抱臂站立（照参考图的"标准姿势"），带呼吸、眨眼和偶尔点头
  const showcase = (t: number) => {
    idleBase()
    const breathe = Math.sin(t * 2.6) * 0.011
    root.rotation.x = 0.03 + breathe * 0.5
    root.rotation.z = Math.sin(t * 1.2) * 0.012
    body.scale.set(1 + breathe * 0.6, 1 + breathe, 1 + breathe * 0.6)
    belly.scale.set(0.34 * (1 + breathe * 0.6), 0.4 * (1 + breathe), 0.2)
    const nod = Math.pow(Math.max(0, Math.sin(t * 1.9 - 0.8)), 4)
    face.rotation.x = 0.02 + nod * 0.1
    setBlink(t % 3.2 < 0.1 ? 0.9 : 0)
    setMouth(0, 1, 0.55 + nod * 0.2)
    armL.shoulder.rotation.x += Math.sin(t * 2.3) * 0.012
    armR.shoulder.rotation.x += Math.sin(t * 2.3 + 1.1) * 0.012
  }
  // 身高对齐：奶蛙略矮于 1.75 m 的跑者，避免看起来像巨人
  root.traverse((o: any) => { if (o.isMesh) o.castShadow = false })
  root.scale.setScalar(0.95)

  idle()
  return { root, pose, showcase, idle }
}
