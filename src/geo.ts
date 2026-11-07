/**
 * 真实地理坐标 —— 全站唯一的"位置"来源。
 *
 * 坐标系：GCJ-02（高德 / 腾讯地图使用的加密坐标系）。
 * 注意：**不要**把这里的经纬度直接画到 WGS-84 的卫星影像（Esri / 天地图）上，
 * 开封一带两者相差约 500 m（东偏 ~535 m、南偏 ~96 m）。本项目所有卫星比对
 * 都是拿高德瓦片做的，坐标因此统一用 GCJ-02。
 *
 * 数据来源：
 *  - 校门、图书馆、志义体育场的点取自腾讯地图 POI（2026-11 查询）；
 *  - 16 号楼（16A/16B，建筑工程学院）取自高德卫星影像上认出的圆形柱廊，
 *    与高德"土木建筑学院"文字标注相距约 108 m（标注落在楼群西侧空地）。
 */

export type Ll = { lat: number; lon: number }

/** 校园四至（由各门与建筑点包出来，不是围墙实测线）。 */
export const CAMPUS = {
  name: '河南大学金明校区',
  south: 34.8123,
  west: 114.3040,
  north: 34.8226,
  east: 114.3145,
  /** 东西向净宽、南北向净深，米。 */
  width: 911,
  depth: 1147,
}

export const LANDSMARKS: { id: string; name: string; ll: Ll; note?: string }[] = [
  { id: 'gate', name: '西大门', ll: { lat: 34.817703, lon: 114.30458 }, note: '礼仪大门，行政楼与学术交流中心分列南北' },
  { id: 'library', name: '图书馆', ll: { lat: 34.817896, lon: 114.307759 }, note: '主楼 8 层、44.6 m，与计算机中心、公共教学楼围出马可广场' },
  { id: 'teaching', name: '综合教学楼', ll: { lat: 34.8189, lon: 114.3103 }, note: '14# 组团一带，图书馆东侧' },
  { id: 'stadium', name: '志义体育场', ll: { lat: 34.81899, lon: 114.313664 }, note: '校园东侧，紧邻 15# 组团' },
  { id: 'lake', name: '校园水系', ll: { lat: 34.8169, lon: 114.3107 }, note: '纵贯校园中部的人工水系' },
  { id: 'north', name: '北大门', ll: { lat: 34.822578, lon: 114.309277 }, note: '东京大道' },
  { id: 'east', name: '东门', ll: { lat: 34.81788, lon: 114.314545 } },
  { id: 'southwest', name: '小西门', ll: { lat: 34.812324, lon: 114.303986 } },
]

/** 建筑工程学院（16 号楼，16A + 16B）——参观主体。 */
export const SITE = {
  id: 'architecture',
  name: '建筑工程学院',
  building: '16 号楼（16A / 16B）',
  ll: { lat: 34.8149, lon: 114.30848 },
  /** 卫星影像量出来的体量，米。 */
  massing: {
    /** 16A 主楼：东西向长条，长 × 进深。 */
    slabLength: 90,
    slabDepth: 15,
    /** 圆形柱廊直径（照片 14 根白柱那一圈）。 */
    porticoDiameter: 24,
    /** 16A 与 16B 之间的玻璃连廊跨度。 */
    bridgeSpan: 16,
    /** 层数；调研只做到 1–2 层室内，3–6 层未建模。 */
    floors: 6,
    /** 楼群长轴方位角（正北为 0°，顺时针）。校区路网整体比正南北偏约 10°。 */
    axisBearing: 100,
  },
}

const M_PER_DEG_LAT = 111320
const mPerDegLon = (lat: number) => 111320 * Math.cos((lat * Math.PI) / 180)

/** 从 from 到 to 的东向/北向位移（米）、直线距离与方位角（正北 0°，顺时针）。 */
export function offset(from: Ll, to: Ll) {
  const east = (to.lon - from.lon) * mPerDegLon(from.lat)
  const north = (to.lat - from.lat) * M_PER_DEG_LAT
  const distance = Math.hypot(east, north)
  const bearing = (Math.atan2(east, north) * 180) / Math.PI
  return { east, north, distance, bearing: (bearing + 360) % 360 }
}

/** 十六方位中文名，用来写"西门东南 475 米"这种话。 */
export function bearingName(deg: number) {
  const names = ['正北', '东北偏北', '东北', '东北偏东', '正东', '东南偏东', '东南', '东南偏南',
    '正南', '西南偏南', '西南', '西南偏西', '正西', '西北偏西', '西北', '西北偏北']
  return names[Math.round(deg / 22.5) % 16]
}

/** 以西门为原点的相对位置描述，HUD 与文档共用。 */
export const SITE_FROM_GATE = (() => {
  const gate = LANDSMARKS[0].ll
  const o = offset(gate, SITE.ll)
  return { ...o, text: `西门${bearingName(o.bearing)} ${Math.round(o.distance)} m` }
})()

export const SITE_COORD_TEXT = `北纬 ${SITE.ll.lat.toFixed(4)}° 东经 ${SITE.ll.lon.toFixed(4)}°`
