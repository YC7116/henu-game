// 极简 GLB 读取器：只支持静态网格（POSITION / NORMAL / 索引 / PBR baseColor）
// 奶蛙模型由 Blender 导出，不含骨骼与动画，这里把它包成和程序化 rig 相同的接口。
import T from '../three-vendor'
import { asset } from '../asset-path'

export type FrogRig = {
  root: any
  pose: (phase: number, amount: number) => void
  showcase: (t: number) => void
  idle: () => void
}

type Parsed = { group: any; height: number; arms: { left?: any; right?: any }; legs: { left?: any; right?: any } }

function readAccessor(gltf: any, bin: DataView, index: number) {
  const acc = gltf.accessors[index]
  const bv = gltf.bufferViews[acc.bufferView]
  const compSize = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 }[acc.componentType as number] || 4
  const numComp = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[acc.type as string] || 1
  const base = (bv.byteOffset || 0) + (acc.byteOffset || 0)
  const stride = bv.byteStride || compSize * numComp
  const out = new Float32Array(acc.count * numComp)
  for (let i = 0; i < acc.count; i++) {
    for (let c = 0; c < numComp; c++) {
      const off = base + i * stride + c * compSize
      let v = 0
      switch (acc.componentType) {
        case 5126: v = bin.getFloat32(off, true); break
        case 5125: v = bin.getUint32(off, true); break
        case 5123: v = bin.getUint16(off, true); break
        case 5122: v = bin.getInt16(off, true); break
        case 5121: v = bin.getUint8(off); break
        case 5120: v = bin.getInt8(off); break
      }
      out[i * numComp + c] = v
    }
  }
  return { data: out, size: numComp }
}

function applyVertexTint(geo: any, mode: 'arm' | 'leg' | 'body') {
  const pos = geo.getAttribute('position')
  const n = pos.count
  const arr = new Float32Array(n * 3)
  // 顶点色与材质 baseColor 相乘：白色=保持原色（黄身/白肚），tan=手脚加深
  const white = new T.Color(0xffffff)
  const tan = new T.Color(0xa87c48)
  const darkTan = new T.Color(0x6a4a22)
  for (let i = 0; i < n; i++) {
    const y = pos.getY(i)
    // 用网格局部坐标：手臂 y=-0.02(手) .. 0.21(肩)；腿 y=-0.10(脚) .. 0.10(髋)
  const t = mode === 'arm'
      ? Math.min(1, Math.max(0, (0.045 - y) / 0.09))
      : mode === 'leg'
        ? Math.min(1, Math.max(0, (-0.02 - y) / 0.08))
        : 0
    const c = white.clone().lerp(mode === 'leg' ? darkTan : tan, t * t)
    arr[i * 3] = c.r
    arr[i * 3 + 1] = c.g
    arr[i * 3 + 2] = c.b
  }
  geo.setAttribute('color', new T.BufferAttribute(arr, 3))
}

function buildFromGLB(buffer: ArrayBuffer): Parsed {
  const dv = new DataView(buffer)
  const magic = dv.getUint32(0, true)
  if (magic !== 0x46546c67) throw new Error('not a glb')
  let off = 12
  let json: any = null
  let bin: DataView | null = null
  while (off < dv.byteLength) {
    const len = dv.getUint32(off, true)
    const type = dv.getUint32(off + 4, true)
    const start = off + 8
    if (type === 0x4e4f534a) {
      json = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, start, len)))
    } else if (type === 0x004e4942) {
      bin = new DataView(buffer, start, len)
    }
    off = start + len
  }
  if (!json || !bin) throw new Error('bad glb')

  const group = new T.Group()
  const materials: any[] = (json.materials || []).map((m: any) => {
    const pbr = m.pbrMetallicRoughness || {}
    const c = pbr.baseColorFactor || [0.9, 0.75, 0.2, 1]
    const mat = new T.MeshStandardMaterial({
      color: new T.Color().setRGB(c[0], c[1], c[2]),
      roughness: pbr.roughnessFactor ?? 0.45,
      metalness: pbr.metallicFactor ?? 0,
      vertexColors: true,
    })
    mat.name = m.name || 'mat'
    return mat
  })

  const addMesh = (meshIndex: number, matIndex: number, nodeName = '') => {
    const mesh = json.meshes[meshIndex]
    for (const prim of mesh.primitives) {
      if (prim.attributes.POSITION === undefined) continue
      const pos = readAccessor(json, bin!, prim.attributes.POSITION)
      const geo = new T.BufferGeometry()
      geo.setAttribute('position', new T.BufferAttribute(pos.data, 3))
      if (prim.attributes.NORMAL !== undefined) {
        const nrm = readAccessor(json, bin!, prim.attributes.NORMAL)
        geo.setAttribute('normal', new T.BufferAttribute(nrm.data, 3))
      }
      if (prim.indices !== undefined) {
        const idx = readAccessor(json, bin!, prim.indices)
        geo.setIndex(new T.BufferAttribute(new Uint32Array(idx.data), 1))
      } else {
        geo.computeVertexNormals()
      }
      const mIndex = prim.material !== undefined ? prim.material : matIndex
      const material = materials[mIndex] || new T.MeshStandardMaterial({ color: 0xe8c53a })
      applyVertexTint(geo, nodeName.indexOf('Arm') === 0 ? 'arm' : nodeName.indexOf('Leg') === 0 ? 'leg' : 'body')
      const m = new T.Mesh(geo, material)
      m.frustumCulled = false
      group.add(m)
    }
  }

  const nodes = json.nodes || []
  const arms: { left?: any; right?: any } = {}
  const legs: { left?: any; right?: any } = {}
  let meshNodeCount = 0
  for (const node of nodes) {
    if (node.mesh === undefined) continue
    meshNodeCount++
    const holder = new T.Group()
    holder.name = node.name || `node${meshNodeCount}`
    if (node.translation) holder.position.set(node.translation[0], node.translation[1], node.translation[2])
    if (node.scale) holder.scale.set(node.scale[0], node.scale[1], node.scale[2])
    if (node.rotation) holder.quaternion.set(node.rotation[0], node.rotation[1], node.rotation[2], node.rotation[3])
    const before = group.children.length
    addMesh(node.mesh, 0, node.name || '')
    const added = group.children.splice(before)
    for (const c of added) holder.add(c)
    group.add(holder)

    // ArmL / ArmR：包一层以肩端为支点的 pivot，供运行时摆臂
    const nm = String(node.name || '')
    if (nm === 'ArmL' || nm === 'ArmR' || nm === 'LegL' || nm === 'LegR') {
      const bb = new T.Box3().setFromObject(holder)
      const c = new T.Vector3()
      bb.getCenter(c)
      const pivot = new T.Group()
      pivot.name = nm + 'Pivot'
      pivot.position.set(c.x, bb.max.y - 0.015, c.z)
      holder.position.sub(pivot.position)
      group.remove(holder)
      pivot.add(holder)
      group.add(pivot)
      if (nm === 'ArmL') arms.left = pivot
      else if (nm === 'ArmR') arms.right = pivot
      else if (nm === 'LegL') legs.left = pivot
      else legs.right = pivot
    }
  }
  if (meshNodeCount === 0) {
    for (let i = 0; i < (json.meshes || []).length; i++) addMesh(i, 0, '')
  }

  const box = new T.Box3().setFromObject(group)
  const size = new T.Vector3()
  box.getSize(size)
  return { group, height: size.y || 1.9, arms, legs }
}

export function buildFrogFromGLB(): FrogRig {
  const root = new T.Group()
  root.name = 'frog-glb'
  const state = { loaded: false, baseY: 0 }
  const arms: { left?: any; right?: any } = {}
  const legs: { left?: any; right?: any } = {}
  fetch(asset('/assets/models/milk-frog.glb'))
    .then((r) => r.arrayBuffer())
    .then((buf) => {
      const parsed = buildFromGLB(buf)
      const inner = parsed.group
      const s = 1.72 / parsed.height
      inner.scale.setScalar(s)
      const box = new T.Box3().setFromObject(inner)
      inner.position.y -= box.min.y
      root.add(inner)
      arms.left = parsed.arms.left
      arms.right = parsed.arms.right
      legs.left = parsed.legs.left
      legs.right = parsed.legs.right
      state.loaded = true
      state.baseY = inner.position.y
    })
    .catch((e) => console.warn('[frog-glb]', e))

  const pose = (phase: number, amount: number) => {
    const bob = Math.abs(Math.sin(phase)) * 0.06 * amount
    root.position.y = bob
    root.rotation.z = Math.sin(phase * 0.5) * 0.06 * amount
    root.rotation.x = 0.04 * amount
    // 只有手臂这一个关节：前后摆臂
    const swing = Math.sin(phase) * 0.85 * amount
    if (arms.left) arms.left.rotation.x = swing
    if (arms.right) arms.right.rotation.x = -swing
    if (arms.left) arms.left.rotation.z = 0.06 * amount
    if (arms.right) arms.right.rotation.z = -0.06 * amount
    // 腿：与手臂反相摆动，抬脚时略微后蹬
    const step = Math.sin(phase) * 0.62 * amount
    if (legs.left) legs.left.rotation.x = -step
    if (legs.right) legs.right.rotation.x = step
  }
  const showcase = (t: number) => {
    root.position.y = Math.sin(t * 2.4) * 0.015
    root.rotation.z = Math.sin(t * 1.2) * 0.01
    root.rotation.x = 0.02
    const s = Math.sin(t * 1.6) * 0.12
    if (arms.left) arms.left.rotation.x = s
    if (arms.right) arms.right.rotation.x = -s
    if (legs.left) legs.left.rotation.x = 0
    if (legs.right) legs.right.rotation.x = 0
  }
  const idle = () => {
    root.position.y = Math.sin(performance.now() / 900) * 0.006
    root.rotation.z = 0
    root.rotation.x = 0
    if (arms.left) arms.left.rotation.set(0, 0, 0)
    if (arms.right) arms.right.rotation.set(0, 0, 0)
    if (legs.left) legs.left.rotation.set(0, 0, 0)
    if (legs.right) legs.right.rotation.set(0, 0, 0)
  }
  return { root, pose, showcase, idle }
}
